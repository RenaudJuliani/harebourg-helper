# V2 Auto-Detection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Detect entity positions (me / ally / enemy / harebourg) from a Dofus window screenshot and populate the map automatically.

**Architecture:** Rust backend captures the Dofus window via `xcap` (macOS `CGWindowListCreateImage`), runs a classical CV pipeline (HSV masking + iso-grid calibration + cell-first marker scanning + template matching for Harebourg), returns a `DetectionResult` to the frontend through a single Tauri command. Frontend replaces all entities on success, shows confidence outlines, and prompts the user to designate "me" by clicking on an ally.

**Tech Stack:** Rust (xcap, image, imageproc), Tauri 2, React 19, Zustand 5, Vitest.

**Reference spec:** `docs/superpowers/specs/2026-04-17-v2-auto-detection-design.md`

---

## Phase layout

- **Phase 0 — Ground truth & types** (foundation, blocks everything)
- **Phase 1 — Rust capture module** (Dofus window → bitmap)
- **Phase 2 — CV reference constants** (measurements from ground truth image)
- **Phase 3 — Grid calibration** (bitmap → GridTransform)
- **Phase 4 — Entity detection** (cell-first marker scan + Harebourg template)
- **Phase 5 — Tauri bridge** (Rust command + TS wrapper)
- **Phase 6 — Zustand state** (detectionSlice + entitiesReplaced action)
- **Phase 7 — UI** (button, confidence outlines, "designate me" banner, damier)
- **Phase 8 — Error UX** (toasts, permission flow)
- **Phase 9 — Manual verification**

Each phase commits at task boundaries. Don't skip commits — they're your safety net.

---

## Phase 0 — Ground truth & types

### Task 0.1: Measure and encode Harebourg map geometry

**Context:** The current `src/data/harebourg-map.ts` has a placeholder 15×17 grid with only 4 pairs of corner holes, no obstacles. The real Harebourg arena has obstacles and a precise hole layout. We must derive the truth from the simulator tactical reference image stored at `/Users/juliani/Downloads/harebourg-map.jpg` (or re-obtained from the user).

**Files:**
- Modify: `src/data/harebourg-map.ts` (complete rewrite of map data)
- Modify: `src/core/types.ts` (no changes yet — we rewrite types in Task 0.2)

- [ ] **Step 1: Save the ground truth image into the repo**

Place the tactical reference image at `src-tauri/assets/harebourg-ground-truth.png`. This file is referenced by future CV tasks.

```bash
mkdir -p src-tauri/assets
# copy the image from wherever the user saved it:
cp /Users/juliani/Downloads/harebourg-map.jpg src-tauri/assets/harebourg-ground-truth.png
```

- [ ] **Step 2: Measure the map**

Open the ground truth image in an image viewer with pixel coords (Preview on macOS shows coordinates in the bottom bar). For each tile, identify:
- **Map dimensions in cells** (count the diamonds on the longest row and column — the real Dofus combat grid convention uses `width` = odd number, `height` = odd number)
- **Obstacle cells** (every cell fully covered by a wooden block, including the 2×2, 2×3, and 1×1 blocks)
- **Hole cells** (every cell without a tile — pits)
- The parity of tile (0, 0) on the damier (light or dark)

Write findings to a scratch file `docs/superpowers/notes/harebourg-map-measurements.md` (do not commit yet — for reference only).

- [ ] **Step 3: Update `src/data/harebourg-map.ts` with real data**

```ts
import type { CellKind, GameMap } from '../core/types';

const W = <measured_width>;
const H = <measured_height>;

function build(): CellKind[][] {
  const grid: CellKind[][] = Array.from({ length: H }, () =>
    Array.from({ length: W }, () => 'floor' as CellKind),
  );

  // Cells outside the oval playable area → treat as 'obstacle' so they're non-walkable
  const outside: ReadonlyArray<readonly [number, number]> = [
    // fill from measurements: every cell that is not inside the oval
  ];
  for (const [x, y] of outside) grid[y][x] = 'obstacle';

  const holes: ReadonlyArray<readonly [number, number]> = [
    // fill from measurements
  ];
  for (const [x, y] of holes) grid[y][x] = 'hole';

  const obstacles: ReadonlyArray<readonly [number, number]> = [
    // fill from measurements — every cell covered by a wooden block
  ];
  for (const [x, y] of obstacles) grid[y][x] = 'obstacle';

  return grid;
}

export const HAREBOURG_MAP: GameMap = {
  id: 'harebourg-v2',
  name: 'Comte Harebourg',
  width: W,
  height: H,
  cells: build(),
};

// Parity of tile (0,0) on the visual damier: 'light' or 'dark'
// (x + y) even → this parity, (x + y) odd → the opposite
export const DAMIER_ORIGIN_PARITY: 'light' | 'dark' = 'light';
```

- [ ] **Step 4: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS (no type errors).

- [ ] **Step 5: Commit**

```bash
git add src/data/harebourg-map.ts src-tauri/assets/harebourg-ground-truth.png
git commit -m "feat(map): encode real Harebourg arena geometry from tactical reference"
```

---

### Task 0.2: Migrate `EntityKind` to V2 types

**Context:** V2 uses `'me' | 'ally' | 'harebourg' | 'enemy'`. Current V1 is `'me' | 'meStart' | 'harebourg' | 'ally' | 'neutral'`. Breaking change — migrate all usage.

**Files:**
- Modify: `src/core/types.ts`
- Modify: `src/ui/theme.ts` (color map for kinds)
- Modify: `src/state/slices/entitySlice.ts` (UNIQUE set)
- Modify: `src/ui/panels/EntityPalette.tsx` (palette entries)
- Modify: `src/services/persistence.ts` (migration on load)
- Audit: `grep -r "meStart\|neutral" src/` to find and fix every call site

- [ ] **Step 1: Update `src/core/types.ts`**

```ts
export type EntityKind = 'me' | 'ally' | 'harebourg' | 'enemy';
```

- [ ] **Step 2: Add color entries in `src/ui/theme.ts`**

```ts
export const theme = {
  // ...existing entries...
  me: '#58a6ff',
  harebourg: '#d1656b',
  ally: '#56d364',
  enemy: '#d29922',
  // remove meStart, neutral
  // Damier colors (to calibrate from screenshots in Phase 7)
  floorLight: '#b88668',
  floorDark: '#a06b50',
  floorEdge: '#2b3542',
} as const;
```

- [ ] **Step 3: Fix every call site**

Run:
```bash
grep -rn "meStart\|neutral" src/
```

For each match, apply:
- `meStart` → remove the entry from UI (palette) and replace any runtime reference with `'me'`
- `neutral` → `'enemy'`

- [ ] **Step 4: Update `entitySlice.ts` UNIQUE set**

```ts
const UNIQUE: ReadonlySet<EntityKind> = new Set(['me', 'harebourg']);
```

- [ ] **Step 5: Update `src/services/persistence.ts` to migrate persisted data**

Find the entity-loading code path. Add a migration step at parse time:

```ts
function migrateEntityKind(kind: string): EntityKind {
  if (kind === 'meStart') return 'me';
  if (kind === 'neutral') return 'enemy';
  if (kind === 'me' || kind === 'ally' || kind === 'harebourg' || kind === 'enemy') {
    return kind;
  }
  return 'enemy'; // fallback for unknown legacy values
}
```

Apply it when hydrating persisted entities.

- [ ] **Step 6: Run typecheck and tests**

```bash
npm run typecheck && npm run test
```

Expected: PASS. Fix any remaining compilation errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(types): migrate EntityKind to V2 (me/ally/harebourg/enemy)"
```

---

## Phase 1 — Rust capture module

### Task 1.1: Add `xcap` dependency

**Files:**
- Modify: `src-tauri/Cargo.toml`

- [ ] **Step 1: Add dependency**

In `src-tauri/Cargo.toml` under `[dependencies]`:

```toml
xcap = "0.0.14"
image = "0.25"
imageproc = "0.25"
```

- [ ] **Step 2: Verify it builds**

```bash
cd src-tauri && cargo build
```

Expected: PASS (downloads xcap/image/imageproc, compiles).

- [ ] **Step 3: Commit**

```bash
git add src-tauri/Cargo.toml src-tauri/Cargo.lock
git commit -m "chore(tauri): add xcap, image, imageproc for CV pipeline"
```

---

### Task 1.2: Scaffold capture module with error types

**Files:**
- Create: `src-tauri/src/capture.rs`
- Modify: `src-tauri/src/lib.rs` (register the module)

- [ ] **Step 1: Write `src-tauri/src/capture.rs`**

```rust
use serde::Serialize;

#[derive(Debug, Serialize, Clone)]
#[serde(tag = "kind", content = "detail")]
pub enum CaptureError {
    WindowNotFound,
    WindowMinimized,
    PermissionDenied,
    CaptureFailed(String),
}

#[derive(Debug, Clone)]
pub struct CapturedImage {
    pub width: u32,
    pub height: u32,
    pub pixels: Vec<u8>, // RGBA row-major
    pub scale_factor: f32,
}

pub fn capture_dofus_window() -> Result<CapturedImage, CaptureError> {
    todo!("implemented in Task 1.3")
}
```

- [ ] **Step 2: Register module in `src-tauri/src/lib.rs`**

Add at top of file:

```rust
mod capture;
```

- [ ] **Step 3: Verify build**

```bash
cd src-tauri && cargo build
```

Expected: PASS (warning about unused module is OK).

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/capture.rs src-tauri/src/lib.rs
git commit -m "feat(capture): scaffold capture module with error types"
```

---

### Task 1.3: Implement Dofus window location and capture

**Files:**
- Modify: `src-tauri/src/capture.rs`

- [ ] **Step 1: Implement `capture_dofus_window`**

Replace the `todo!()` body:

```rust
pub fn capture_dofus_window() -> Result<CapturedImage, CaptureError> {
    let windows = xcap::Window::all()
        .map_err(|e| CaptureError::CaptureFailed(format!("xcap enumeration: {e}")))?;

    let dofus = windows
        .into_iter()
        .find(|w| w.app_name().map(|n| n.to_lowercase().contains("dofus")).unwrap_or(false)
              || w.title().map(|t| t.to_lowercase().contains("dofus")).unwrap_or(false))
        .ok_or(CaptureError::WindowNotFound)?;

    let img = dofus
        .capture_image()
        .map_err(|e| classify_capture_error(e))?;

    let (width, height) = (img.width(), img.height());
    let pixels = img.into_raw();

    if is_mostly_black(&pixels) {
        return Err(CaptureError::WindowMinimized);
    }

    Ok(CapturedImage {
        width,
        height,
        pixels,
        scale_factor: 1.0, // refined in Task 1.4
    })
}

fn classify_capture_error(e: xcap::XCapError) -> CaptureError {
    let msg = e.to_string();
    if msg.to_lowercase().contains("permission") || msg.to_lowercase().contains("denied") {
        CaptureError::PermissionDenied
    } else {
        CaptureError::CaptureFailed(msg)
    }
}

fn is_mostly_black(rgba: &[u8]) -> bool {
    let total_pixels = rgba.len() / 4;
    if total_pixels == 0 {
        return true;
    }
    let mut non_black = 0usize;
    for px in rgba.chunks_exact(4) {
        // any channel > 20 counts as non-black
        if px[0] > 20 || px[1] > 20 || px[2] > 20 {
            non_black += 1;
        }
    }
    (non_black as f32 / total_pixels as f32) < 0.05
}
```

- [ ] **Step 2: Build**

```bash
cd src-tauri && cargo build
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/capture.rs
git commit -m "feat(capture): find Dofus window and capture RGBA bitmap via xcap"
```

---

### Task 1.4: Compute retina scale factor

**Files:**
- Modify: `src-tauri/src/capture.rs`

- [ ] **Step 1: Add scale detection**

Augment the capture function to compute scale factor by comparing the physical capture size to the window's logical size:

```rust
pub fn capture_dofus_window() -> Result<CapturedImage, CaptureError> {
    // ... existing lookup ...
    let dofus = /* ... */;

    let logical_width = dofus.width().max(1) as f32;
    let img = dofus
        .capture_image()
        .map_err(|e| classify_capture_error(e))?;
    let (width, height) = (img.width(), img.height());
    let scale_factor = (width as f32 / logical_width).max(1.0);
    // ... rest unchanged ...

    Ok(CapturedImage { width, height, pixels, scale_factor })
}
```

- [ ] **Step 2: Build**

```bash
cd src-tauri && cargo build
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/capture.rs
git commit -m "feat(capture): detect retina scale factor"
```

---

## Phase 2 — CV reference constants

### Task 2.1: Create CV module skeleton

**Files:**
- Create: `src-tauri/src/cv/mod.rs`
- Create: `src-tauri/src/cv/hsv.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Create `src-tauri/src/cv/mod.rs`**

```rust
pub mod hsv;
pub mod reference;
pub mod calibration;
pub mod detection;
pub mod pipeline;
```

- [ ] **Step 2: Create `src-tauri/src/cv/hsv.rs`**

```rust
#[derive(Debug, Clone, Copy)]
pub struct Hsv {
    pub h: f32, // 0..360
    pub s: f32, // 0..1
    pub v: f32, // 0..1
}

pub fn rgb_to_hsv(r: u8, g: u8, b: u8) -> Hsv {
    let rf = r as f32 / 255.0;
    let gf = g as f32 / 255.0;
    let bf = b as f32 / 255.0;
    let max = rf.max(gf).max(bf);
    let min = rf.min(gf).min(bf);
    let delta = max - min;

    let v = max;
    let s = if max > 0.0 { delta / max } else { 0.0 };
    let h = if delta == 0.0 {
        0.0
    } else if max == rf {
        60.0 * (((gf - bf) / delta) % 6.0)
    } else if max == gf {
        60.0 * (((bf - rf) / delta) + 2.0)
    } else {
        60.0 * (((rf - gf) / delta) + 4.0)
    };
    let h = if h < 0.0 { h + 360.0 } else { h };

    Hsv { h, s, v }
}

#[derive(Debug, Clone)]
pub struct HsvRange {
    pub h_min: f32,
    pub h_max: f32,
    pub s_min: f32,
    pub v_min: f32,
}

impl HsvRange {
    pub fn contains(&self, hsv: &Hsv) -> bool {
        let h_ok = if self.h_min <= self.h_max {
            hsv.h >= self.h_min && hsv.h <= self.h_max
        } else {
            // wraparound (e.g. reds around 0)
            hsv.h >= self.h_min || hsv.h <= self.h_max
        };
        h_ok && hsv.s >= self.s_min && hsv.v >= self.v_min
    }
}
```

- [ ] **Step 3: Register module in `src-tauri/src/lib.rs`**

Add `mod cv;` after `mod capture;`.

- [ ] **Step 4: Stub the remaining files so `mod cv` builds**

Create empty-shell files:

`src-tauri/src/cv/reference.rs`:
```rust
// Measured constants from src-tauri/assets/harebourg-ground-truth.png
// Populated in Task 2.2.
```

`src-tauri/src/cv/calibration.rs`:
```rust
// Runtime grid calibration. Implemented in Phase 3.
```

`src-tauri/src/cv/detection.rs`:
```rust
// Entity detection per cell. Implemented in Phase 4.
```

`src-tauri/src/cv/pipeline.rs`:
```rust
// Orchestrator: capture → calibrate → detect. Implemented in Phase 4.
```

- [ ] **Step 5: Add hsv unit test**

At bottom of `src-tauri/src/cv/hsv.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pure_red_is_hue_0() {
        let h = rgb_to_hsv(255, 0, 0);
        assert_eq!(h.h as i32, 0);
        assert!((h.s - 1.0).abs() < 1e-6);
        assert!((h.v - 1.0).abs() < 1e-6);
    }

    #[test]
    fn pure_blue_is_hue_240() {
        let h = rgb_to_hsv(0, 0, 255);
        assert_eq!(h.h as i32, 240);
    }

    #[test]
    fn orange_range_contains_orange_pixel() {
        let range = HsvRange { h_min: 10.0, h_max: 30.0, s_min: 0.6, v_min: 0.5 };
        let orange = rgb_to_hsv(255, 130, 40);
        assert!(range.contains(&orange));
    }
}
```

- [ ] **Step 6: Run tests**

```bash
cd src-tauri && cargo test --lib cv::hsv
```

Expected: 3 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src-tauri/src/cv src-tauri/src/lib.rs
git commit -m "feat(cv): scaffold CV module with HSV utilities"
```

---

### Task 2.2: Measure reference constants from ground truth image

**Context:** Load the ground truth image, identify the brown tile playable area, and lock down the reference geometry so runtime calibration is just a proportional scale.

**Files:**
- Modify: `src-tauri/src/cv/reference.rs`

- [ ] **Step 1: Determine the following values by inspecting the ground truth image**

Open `src-tauri/assets/harebourg-ground-truth.png` with an image tool that gives pixel coordinates. Record:

- `REF_BBOX`: `(x_min, y_min, x_max, y_max)` of the tiled playable oval (the khaki/brown tile region in the simulator)
- `REF_TILE_W`: pixel width of one diamond tile (measure from the tip-to-tip of one tile horizontally)
- `REF_TILE_H`: pixel height of one tile (should be `REF_TILE_W / 2` for iso)
- `REF_ORIGIN`: the center of tile `(0, 0)` in pixels. Convention: `(0, 0)` is the top-left-most cell of the grid (the one with the smallest `y` and smallest `x`).

Save findings as Rust constants.

- [ ] **Step 2: Write `src-tauri/src/cv/reference.rs`**

```rust
// All values measured from src-tauri/assets/harebourg-ground-truth.png

pub const REF_IMAGE_WIDTH: u32 = <measured_width>;
pub const REF_IMAGE_HEIGHT: u32 = <measured_height>;

pub const REF_BBOX_MIN_X: f32 = <measured>;
pub const REF_BBOX_MIN_Y: f32 = <measured>;
pub const REF_BBOX_MAX_X: f32 = <measured>;
pub const REF_BBOX_MAX_Y: f32 = <measured>;

pub const REF_TILE_W: f32 = <measured>;
pub const REF_TILE_H: f32 = <measured>; // = REF_TILE_W / 2.0

pub const REF_ORIGIN_X: f32 = <measured>;
pub const REF_ORIGIN_Y: f32 = <measured>;

pub fn ref_bbox_width() -> f32 {
    REF_BBOX_MAX_X - REF_BBOX_MIN_X
}

pub fn ref_bbox_height() -> f32 {
    REF_BBOX_MAX_Y - REF_BBOX_MIN_Y
}

// HSV ranges for "playable tile" color in the GAME (not the simulator — the simulator is
// khaki/uniform; the game uses the actual brown tile textures). Calibrated in Phase 3.
pub const TILE_HSV_H_MIN: f32 = 15.0;
pub const TILE_HSV_H_MAX: f32 = 30.0;
pub const TILE_HSV_S_MIN: f32 = 0.25;
pub const TILE_HSV_V_MIN: f32 = 0.30;

// HSV ranges for entity ring markers
pub const ORANGE_RING_H_MIN: f32 = 10.0;
pub const ORANGE_RING_H_MAX: f32 = 35.0;
pub const ORANGE_RING_S_MIN: f32 = 0.55;
pub const ORANGE_RING_V_MIN: f32 = 0.50;

pub const BLUE_RING_H_MIN: f32 = 195.0;
pub const BLUE_RING_H_MAX: f32 = 235.0;
pub const BLUE_RING_S_MIN: f32 = 0.45;
pub const BLUE_RING_V_MIN: f32 = 0.45;
```

All `<measured>` placeholders must be replaced with real numbers. These constants will be tuned empirically in Phase 3 and Phase 4 when running the pipeline against real fixtures.

- [ ] **Step 3: Build**

```bash
cd src-tauri && cargo build
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/cv/reference.rs
git commit -m "feat(cv): measure reference geometry constants from ground truth"
```

---

### Task 2.3: Import test fixtures

**Files:**
- Create: `src-tauri/tests/fixtures/harebourg/screen-01.png` through `screen-07.png` (the 7 combat screenshots from the user)
- Create: `src-tauri/tests/fixtures/harebourg/expected-01.json` through `expected-07.json`

- [ ] **Step 1: Copy screenshots**

```bash
mkdir -p src-tauri/tests/fixtures/harebourg
# Copy the 7 images from wherever they live (image-cache in user's home)
for i in 1 2 3 4 5 6 7; do
  cp /Users/juliani/.claude/image-cache/30bd2f7d-b0aa-4bba-8603-9a74dd207a7b/${i}.png \
     src-tauri/tests/fixtures/harebourg/screen-0${i}.png
done
```

- [ ] **Step 2: Hand-label each fixture**

For each of the 7 screenshots, inspect the image manually and create an `expected-0N.json` file listing the truth:

```json
{
  "resolution": { "width": 2304, "height": 1440 },
  "entities": [
    { "cell": { "x": 6, "y": 3 }, "team": "enemy", "kind": "harebourg" },
    { "cell": { "x": 7, "y": 3 }, "team": "enemy", "kind": "generic" },
    { "cell": { "x": 8, "y": 9 }, "team": "ally",  "kind": "generic" }
  ]
}
```

Use `pixel_to_cell` math (reference constants from Task 2.2) or count diamonds visually to figure out each `(x, y)`. These files are the ground truth for end-to-end tests.

- [ ] **Step 3: Commit**

```bash
git add src-tauri/tests/fixtures/harebourg/
git commit -m "test(cv): add golden fixtures for Harebourg detection"
```

---

## Phase 3 — Grid calibration

### Task 3.1: Implement brown tile mask + largest blob detection

**Files:**
- Modify: `src-tauri/src/cv/calibration.rs`

- [ ] **Step 1: Write mask + blob helpers**

```rust
use crate::capture::CapturedImage;
use crate::cv::hsv::{rgb_to_hsv, HsvRange};
use crate::cv::reference::*;
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "kind", content = "detail")]
pub enum CalibrationError {
    NotInCombat,
    UnexpectedShape,
}

#[derive(Debug, Clone, Copy)]
pub struct Bbox {
    pub min_x: u32,
    pub min_y: u32,
    pub max_x: u32,
    pub max_y: u32,
}

impl Bbox {
    pub fn width(&self) -> u32 { self.max_x - self.min_x }
    pub fn height(&self) -> u32 { self.max_y - self.min_y }
}

fn tile_range() -> HsvRange {
    HsvRange {
        h_min: TILE_HSV_H_MIN,
        h_max: TILE_HSV_H_MAX,
        s_min: TILE_HSV_S_MIN,
        v_min: TILE_HSV_V_MIN,
    }
}

pub fn build_tile_mask(image: &CapturedImage) -> Vec<bool> {
    let range = tile_range();
    let n = (image.width * image.height) as usize;
    let mut mask = vec![false; n];
    for i in 0..n {
        let off = i * 4;
        let hsv = rgb_to_hsv(image.pixels[off], image.pixels[off + 1], image.pixels[off + 2]);
        mask[i] = range.contains(&hsv);
    }
    mask
}

pub fn largest_blob_bbox(mask: &[bool], width: u32, height: u32) -> Option<Bbox> {
    // Simple 2-pass connected components, keep track of the largest.
    let w = width as usize;
    let h = height as usize;
    let mut labels = vec![0i32; mask.len()];
    let mut parent: Vec<i32> = vec![0];
    let mut next_label: i32 = 1;

    fn find(parent: &mut [i32], mut x: i32) -> i32 {
        while parent[x as usize] != x {
            parent[x as usize] = parent[parent[x as usize] as usize];
            x = parent[x as usize];
        }
        x
    }

    for y in 0..h {
        for x in 0..w {
            let i = y * w + x;
            if !mask[i] { continue; }
            let left = if x > 0 { labels[i - 1] } else { 0 };
            let up = if y > 0 { labels[i - w] } else { 0 };
            if left == 0 && up == 0 {
                labels[i] = next_label;
                parent.push(next_label);
                next_label += 1;
            } else if left != 0 && up == 0 {
                labels[i] = left;
            } else if left == 0 && up != 0 {
                labels[i] = up;
            } else {
                let a = find(&mut parent, left);
                let b = find(&mut parent, up);
                let small = a.min(b);
                let large = a.max(b);
                parent[large as usize] = small;
                labels[i] = small;
            }
        }
    }

    // Collect bbox per root label
    let mut bboxes: std::collections::HashMap<i32, Bbox> = std::collections::HashMap::new();
    let mut areas: std::collections::HashMap<i32, u32> = std::collections::HashMap::new();
    for y in 0..h {
        for x in 0..w {
            let i = y * w + x;
            if labels[i] == 0 { continue; }
            let root = find(&mut parent, labels[i]);
            let entry = bboxes.entry(root).or_insert(Bbox {
                min_x: x as u32, min_y: y as u32,
                max_x: x as u32, max_y: y as u32,
            });
            entry.min_x = entry.min_x.min(x as u32);
            entry.min_y = entry.min_y.min(y as u32);
            entry.max_x = entry.max_x.max(x as u32);
            entry.max_y = entry.max_y.max(y as u32);
            *areas.entry(root).or_insert(0) += 1;
        }
    }

    areas.into_iter().max_by_key(|(_, a)| *a).and_then(|(root, _)| bboxes.get(&root).copied())
}
```

- [ ] **Step 2: Add unit test for blob detection**

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn single_blob_bbox() {
        // 5x5 mask with a 3x3 blob at (1,1)..(3,3)
        let mut mask = vec![false; 25];
        for y in 1..=3 {
            for x in 1..=3 {
                mask[y * 5 + x] = true;
            }
        }
        let bbox = largest_blob_bbox(&mask, 5, 5).unwrap();
        assert_eq!(bbox.min_x, 1);
        assert_eq!(bbox.max_x, 3);
        assert_eq!(bbox.min_y, 1);
        assert_eq!(bbox.max_y, 3);
    }

    #[test]
    fn picks_larger_of_two_blobs() {
        let mut mask = vec![false; 100];
        // small 2x2 blob
        for y in 0..2 {
            for x in 0..2 { mask[y * 10 + x] = true; }
        }
        // larger 4x4 blob
        for y in 5..9 {
            for x in 5..9 { mask[y * 10 + x] = true; }
        }
        let bbox = largest_blob_bbox(&mask, 10, 10).unwrap();
        assert_eq!(bbox.min_x, 5);
        assert_eq!(bbox.max_x, 8);
    }
}
```

- [ ] **Step 3: Run tests**

```bash
cd src-tauri && cargo test --lib cv::calibration
```

Expected: 2 tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/cv/calibration.rs
git commit -m "feat(cv): brown tile mask and largest connected blob detection"
```

---

### Task 3.2: Implement `GridTransform` with `calibrate()`

**Files:**
- Modify: `src-tauri/src/cv/calibration.rs`

- [ ] **Step 1: Add types and `calibrate` function**

Append to `src-tauri/src/cv/calibration.rs`:

```rust
#[derive(Debug, Clone, Copy)]
pub struct GridTransform {
    pub origin_x: f32,
    pub origin_y: f32,
    pub tile_w: f32,
    pub tile_h: f32,
}

impl GridTransform {
    pub fn cell_to_pixel(&self, x: i32, y: i32) -> (f32, f32) {
        let px = self.origin_x + (x - y) as f32 * self.tile_w / 2.0;
        let py = self.origin_y + (x + y) as f32 * self.tile_h / 2.0;
        (px, py)
    }

    pub fn pixel_to_cell(&self, px: f32, py: f32) -> (i32, i32) {
        let dx = px - self.origin_x;
        let dy = py - self.origin_y;
        let fx = dx / self.tile_w + dy / self.tile_h;
        let fy = dy / self.tile_h - dx / self.tile_w;
        (fx.round() as i32, fy.round() as i32)
    }
}

pub fn calibrate(image: &CapturedImage) -> Result<GridTransform, CalibrationError> {
    let mask = build_tile_mask(image);
    let bbox = largest_blob_bbox(&mask, image.width, image.height)
        .ok_or(CalibrationError::NotInCombat)?;

    let total_pixels = (image.width * image.height) as f32;
    let blob_pixels = mask.iter().filter(|b| **b).count() as f32;
    if blob_pixels / total_pixels < 0.05 {
        return Err(CalibrationError::NotInCombat);
    }

    let ratio = bbox.width() as f32 / bbox.height().max(1) as f32;
    if !(1.6..=2.2).contains(&ratio) {
        return Err(CalibrationError::UnexpectedShape);
    }

    let scale = bbox.width() as f32 / ref_bbox_width();
    let tile_w = REF_TILE_W * scale;
    let tile_h = tile_w / 2.0;

    let origin_x = bbox.min_x as f32 + (REF_ORIGIN_X - REF_BBOX_MIN_X) * scale;
    let origin_y = bbox.min_y as f32 + (REF_ORIGIN_Y - REF_BBOX_MIN_Y) * scale;

    Ok(GridTransform { origin_x, origin_y, tile_w, tile_h })
}
```

- [ ] **Step 2: Add unit test for coordinate roundtrip**

```rust
#[test]
fn roundtrip_cell_to_pixel_to_cell() {
    let t = GridTransform { origin_x: 500.0, origin_y: 200.0, tile_w: 80.0, tile_h: 40.0 };
    for x in 0..15 {
        for y in 0..17 {
            let (px, py) = t.cell_to_pixel(x, y);
            let (rx, ry) = t.pixel_to_cell(px, py);
            assert_eq!((rx, ry), (x, y), "roundtrip failed at ({x},{y})");
        }
    }
}
```

- [ ] **Step 3: Run tests**

```bash
cd src-tauri && cargo test --lib cv::calibration
```

Expected: 3 tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/cv/calibration.rs
git commit -m "feat(cv): compute GridTransform with pixel<->cell conversion"
```

---

### Task 3.3: Fixture-based calibration test

**Files:**
- Create: `src-tauri/tests/calibration_integration.rs`

- [ ] **Step 1: Write integration test**

```rust
use std::path::PathBuf;

fn load_fixture(name: &str) -> app_lib::capture::CapturedImage {
    let path: PathBuf = ["tests", "fixtures", "harebourg", name].iter().collect();
    let img = image::open(&path).expect("load fixture").to_rgba8();
    let (w, h) = img.dimensions();
    app_lib::capture::CapturedImage {
        width: w,
        height: h,
        pixels: img.into_raw(),
        scale_factor: 1.0,
    }
}

#[test]
fn calibrate_screen_01() {
    let img = load_fixture("screen-01.png");
    let t = app_lib::cv::calibration::calibrate(&img).expect("should calibrate");
    // Sanity: tile_w is reasonable for a ~2304px-wide image of the Harebourg arena
    assert!(t.tile_w > 20.0 && t.tile_w < 200.0, "tile_w = {}", t.tile_w);
    assert!((t.tile_h - t.tile_w / 2.0).abs() < 0.01);
}
```

**Note:** `app_lib` is the crate name from `Cargo.toml`. The modules `capture` and `cv::calibration` must be `pub` at the crate root. If not, add `pub mod capture;` and `pub mod cv;` in `src-tauri/src/lib.rs`.

- [ ] **Step 2: Make modules public in `lib.rs`**

```rust
pub mod capture;
pub mod cv;
```

- [ ] **Step 3: Make internal items public where needed**

In `src-tauri/src/capture.rs` ensure `CapturedImage` struct and its fields are `pub`. Ditto for `cv::calibration::calibrate` and `GridTransform`.

- [ ] **Step 4: Run integration test**

```bash
cd src-tauri && cargo test --test calibration_integration
```

Expected: PASS. If the HSV range is off, adjust `TILE_HSV_*` constants in `reference.rs` until calibration succeeds on all 7 fixtures.

Run for each fixture:

```bash
cd src-tauri && cargo test --test calibration_integration -- --nocapture
```

- [ ] **Step 5: Add tests for screens 02-07**

For each fixture, add a test function like `calibrate_screen_02`, etc. Duplicate the body, change the fixture name.

- [ ] **Step 6: Commit**

```bash
git add src-tauri/tests/calibration_integration.rs src-tauri/src/lib.rs src-tauri/src/capture.rs src-tauri/src/cv/reference.rs
git commit -m "test(cv): fixture-based calibration tests for all 7 screenshots"
```

---

## Phase 4 — Entity detection

### Task 4.1: Cell iteration and marker scanning

**Files:**
- Modify: `src-tauri/src/cv/detection.rs`

- [ ] **Step 1: Write marker detection**

```rust
use crate::capture::CapturedImage;
use crate::cv::calibration::GridTransform;
use crate::cv::hsv::{rgb_to_hsv, HsvRange};
use crate::cv::reference::*;
use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Team {
    Ally,
    Enemy,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum DetectedKind {
    Generic,
    Harebourg,
}

#[derive(Debug, Clone, Serialize)]
pub struct DetectedEntity {
    pub cell: (i32, i32),
    pub team: Team,
    pub kind: DetectedKind,
    pub confidence: f32,
}

fn orange_range() -> HsvRange {
    HsvRange { h_min: ORANGE_RING_H_MIN, h_max: ORANGE_RING_H_MAX, s_min: ORANGE_RING_S_MIN, v_min: ORANGE_RING_V_MIN }
}

fn blue_range() -> HsvRange {
    HsvRange { h_min: BLUE_RING_H_MIN, h_max: BLUE_RING_H_MAX, s_min: BLUE_RING_S_MIN, v_min: BLUE_RING_V_MIN }
}

fn sample_window(image: &CapturedImage, cx: f32, cy: f32, half: f32) -> Vec<(u8, u8, u8)> {
    let x0 = ((cx - half).max(0.0)) as u32;
    let y0 = ((cy - half).max(0.0)) as u32;
    let x1 = ((cx + half).min(image.width as f32 - 1.0)) as u32;
    let y1 = ((cy + half).min(image.height as f32 - 1.0)) as u32;
    let mut out = Vec::new();
    for y in y0..=y1 {
        for x in x0..=x1 {
            let i = ((y * image.width + x) * 4) as usize;
            out.push((image.pixels[i], image.pixels[i + 1], image.pixels[i + 2]));
        }
    }
    out
}

fn fraction_matching(pixels: &[(u8, u8, u8)], range: &HsvRange) -> f32 {
    if pixels.is_empty() { return 0.0; }
    let count = pixels
        .iter()
        .filter(|(r, g, b)| range.contains(&rgb_to_hsv(*r, *g, *b)))
        .count();
    count as f32 / pixels.len() as f32
}

/// Classify the ring color at cell (x, y). Returns None if no ring detected.
pub fn classify_ring(image: &CapturedImage, t: &GridTransform, x: i32, y: i32) -> Option<(Team, f32)> {
    let (px, py) = t.cell_to_pixel(x, y);
    // Marker sits at the "floor" of the tile, slightly below center
    let sample_cy = py + t.tile_h * 0.1;
    let half = t.tile_w * 0.45;
    let pixels = sample_window(image, px, sample_cy, half);

    let orange = fraction_matching(&pixels, &orange_range());
    let blue = fraction_matching(&pixels, &blue_range());

    // Ring should cover ~10-30% of the sample window (it's a thin outline, not a blob)
    const MIN_FRAC: f32 = 0.08;
    const MAX_FRAC: f32 = 0.6;

    if orange > blue && orange >= MIN_FRAC && orange <= MAX_FRAC {
        Some((Team::Enemy, orange))
    } else if blue >= MIN_FRAC && blue <= MAX_FRAC {
        Some((Team::Ally, blue))
    } else {
        None
    }
}
```

- [ ] **Step 2: Unit test with a synthetic image**

```rust
#[cfg(test)]
mod tests {
    use super::*;

    fn make_image(width: u32, height: u32, fill: (u8, u8, u8)) -> CapturedImage {
        let mut pixels = Vec::with_capacity((width * height * 4) as usize);
        for _ in 0..(width * height) {
            pixels.extend_from_slice(&[fill.0, fill.1, fill.2, 255]);
        }
        CapturedImage { width, height, pixels, scale_factor: 1.0 }
    }

    fn stamp_ring(image: &mut CapturedImage, cx: i32, cy: i32, radius: i32, color: (u8, u8, u8)) {
        for dy in -radius..=radius {
            for dx in -radius..=radius {
                let d2 = dx * dx + dy * dy;
                if d2 <= radius * radius && d2 >= (radius - 2) * (radius - 2) {
                    let x = cx + dx;
                    let y = cy + dy;
                    if x >= 0 && y >= 0 && (x as u32) < image.width && (y as u32) < image.height {
                        let i = ((y as u32 * image.width + x as u32) * 4) as usize;
                        image.pixels[i] = color.0;
                        image.pixels[i + 1] = color.1;
                        image.pixels[i + 2] = color.2;
                    }
                }
            }
        }
    }

    #[test]
    fn detects_orange_ring_as_enemy() {
        let mut img = make_image(200, 200, (100, 60, 40));
        stamp_ring(&mut img, 100, 105, 30, (255, 140, 30));
        let t = GridTransform { origin_x: 100.0, origin_y: 100.0, tile_w: 60.0, tile_h: 30.0 };
        let result = classify_ring(&img, &t, 0, 0);
        assert!(matches!(result, Some((Team::Enemy, c)) if c > 0.1), "got {:?}", result);
    }

    #[test]
    fn detects_blue_ring_as_ally() {
        let mut img = make_image(200, 200, (100, 60, 40));
        stamp_ring(&mut img, 100, 105, 30, (40, 130, 220));
        let t = GridTransform { origin_x: 100.0, origin_y: 100.0, tile_w: 60.0, tile_h: 30.0 };
        let result = classify_ring(&img, &t, 0, 0);
        assert!(matches!(result, Some((Team::Ally, _))), "got {:?}", result);
    }
}
```

- [ ] **Step 3: Run tests**

```bash
cd src-tauri && cargo test --lib cv::detection
```

Expected: 2 tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/cv/detection.rs
git commit -m "feat(cv): classify ring color per cell (orange=enemy, blue=ally)"
```

---

### Task 4.2: Harebourg template extraction

**Files:**
- Create: `src-tauri/assets/harebourg-template.png`

- [ ] **Step 1: Crop Harebourg's head from a screenshot**

Open `src-tauri/tests/fixtures/harebourg/screen-02.png` (the "Mécanique des PI" screenshot where Harebourg is clearly visible at the top-center). Crop a rectangle containing his pointed hat + upper head. Save as `src-tauri/assets/harebourg-template.png`.

Guidelines:
- Template size: 40-80 pixels wide, 60-120 tall (small enough to slide-scan, large enough to be distinctive)
- Crop should include the distinctive green conical hat with gold trim
- Avoid background (leave minimal sky pixels)

- [ ] **Step 2: Commit**

```bash
git add src-tauri/assets/harebourg-template.png
git commit -m "feat(cv): add Harebourg template image for matching"
```

---

### Task 4.3: Template matching for Harebourg

**Files:**
- Modify: `src-tauri/src/cv/detection.rs`

- [ ] **Step 1: Load template lazily**

```rust
use once_cell::sync::Lazy;
use image::RgbImage;

static HAREBOURG_TEMPLATE: Lazy<RgbImage> = Lazy::new(|| {
    let bytes = include_bytes!("../../assets/harebourg-template.png");
    image::load_from_memory(bytes).expect("load harebourg template").to_rgb8()
});
```

Add `once_cell = "1"` to `src-tauri/Cargo.toml` if not already a transitive dep.

- [ ] **Step 2: Implement template match at a position**

```rust
/// Normalized cross-correlation score between image window and template.
/// Returns score in [0, 1] where 1 is a perfect match.
pub fn match_harebourg_at(image: &CapturedImage, center_x: f32, center_y: f32, tile_w: f32) -> f32 {
    let template = &*HAREBOURG_TEMPLATE;
    let tw = template.width() as f32;
    let th = template.height() as f32;

    // Scale template to the current tile size: assume template was cropped at REF_TILE_W,
    // so current size = template size * (tile_w / REF_TILE_W).
    let scale = tile_w / REF_TILE_W;
    let scaled_w = (tw * scale).max(1.0) as u32;
    let scaled_h = (th * scale).max(1.0) as u32;

    // Search region centered on the entity sprite (above the ring)
    let sx = (center_x - scaled_w as f32 / 2.0).max(0.0) as u32;
    let sy = (center_y - scaled_h as f32 * 1.2).max(0.0) as u32; // sprite is above the foot
    if sx + scaled_w >= image.width || sy + scaled_h >= image.height {
        return 0.0;
    }

    // Simple NCC computation
    let mut sum_xy = 0.0_f64;
    let mut sum_x = 0.0_f64;
    let mut sum_y = 0.0_f64;
    let mut sum_xx = 0.0_f64;
    let mut sum_yy = 0.0_f64;
    let n = (scaled_w * scaled_h) as f64;

    for py in 0..scaled_h {
        for px in 0..scaled_w {
            // Nearest-neighbor resample of the template
            let tx = (px as f32 / scale) as u32;
            let ty = (py as f32 / scale) as u32;
            let tx = tx.min(template.width() - 1);
            let ty = ty.min(template.height() - 1);
            let tpx = template.get_pixel(tx, ty);
            let t_gray = (tpx[0] as f64 + tpx[1] as f64 + tpx[2] as f64) / 3.0;

            let ix = sx + px;
            let iy = sy + py;
            let i = ((iy * image.width + ix) * 4) as usize;
            let i_gray = (image.pixels[i] as f64 + image.pixels[i + 1] as f64 + image.pixels[i + 2] as f64) / 3.0;

            sum_xy += t_gray * i_gray;
            sum_x += t_gray;
            sum_y += i_gray;
            sum_xx += t_gray * t_gray;
            sum_yy += i_gray * i_gray;
        }
    }

    let num = n * sum_xy - sum_x * sum_y;
    let den = ((n * sum_xx - sum_x * sum_x) * (n * sum_yy - sum_y * sum_y)).sqrt();
    if den == 0.0 { 0.0 } else { (num / den).clamp(0.0, 1.0) as f32 }
}

pub const HAREBOURG_THRESHOLD: f32 = 0.70;
```

- [ ] **Step 3: Build and verify no regression**

```bash
cd src-tauri && cargo build && cargo test --lib cv::detection
```

Expected: PASS (existing tests still pass; no new tests yet).

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/cv/detection.rs src-tauri/Cargo.toml src-tauri/Cargo.lock
git commit -m "feat(cv): NCC template matching for Harebourg"
```

---

### Task 4.4: Full pipeline orchestrator

**Files:**
- Modify: `src-tauri/src/cv/pipeline.rs`

- [ ] **Step 1: Write the orchestrator**

```rust
use crate::capture::{capture_dofus_window, CaptureError, CapturedImage};
use crate::cv::calibration::{calibrate, CalibrationError, GridTransform};
use crate::cv::detection::{classify_ring, match_harebourg_at, DetectedEntity, DetectedKind, Team, HAREBOURG_THRESHOLD};
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "kind", content = "detail")]
pub enum PipelineError {
    Capture(CaptureError),
    Calibration(CalibrationError),
}

#[derive(Debug, Clone, Serialize)]
pub struct DetectionResult {
    pub entities: Vec<DetectedEntity>,
    pub warnings: Vec<String>,
}

/// Playable cells for the Harebourg arena. Populated from the map data in Task 0.1.
/// Must match the `floor` cells of `HAREBOURG_MAP`.
pub fn playable_cells() -> Vec<(i32, i32)> {
    // TODO in Task 4.5: derive from an embedded map table.
    // For now, return all cells in a fixed range and filter at runtime.
    let mut cells = Vec::new();
    for y in 0..17 {
        for x in 0..15 {
            cells.push((x, y));
        }
    }
    cells
}

pub fn detect() -> Result<DetectionResult, PipelineError> {
    let image = capture_dofus_window().map_err(PipelineError::Capture)?;
    detect_on_image(&image)
}

pub fn detect_on_image(image: &CapturedImage) -> Result<DetectionResult, PipelineError> {
    let transform = calibrate(image).map_err(PipelineError::Calibration)?;

    let mut entities = Vec::new();
    let warnings = Vec::new();

    for (x, y) in playable_cells() {
        let Some((team, ring_quality)) = classify_ring(image, &transform, x, y) else { continue; };

        let (px, py) = transform.cell_to_pixel(x, y);

        let (kind, match_score) = if matches!(team, Team::Enemy) {
            let score = match_harebourg_at(image, px, py, transform.tile_w);
            if score >= HAREBOURG_THRESHOLD {
                (DetectedKind::Harebourg, score)
            } else {
                (DetectedKind::Generic, score)
            }
        } else {
            (DetectedKind::Generic, 1.0)
        };

        let confidence = 0.6 * ring_quality.min(1.0) + 0.4 * match_score;

        entities.push(DetectedEntity { cell: (x, y), team, kind, confidence });
    }

    // Ensure at most one Harebourg: keep the highest-confidence one, demote others to Generic.
    if entities.iter().filter(|e| matches!(e.kind, DetectedKind::Harebourg)).count() > 1 {
        let best_idx = entities
            .iter()
            .enumerate()
            .filter(|(_, e)| matches!(e.kind, DetectedKind::Harebourg))
            .max_by(|(_, a), (_, b)| a.confidence.partial_cmp(&b.confidence).unwrap())
            .map(|(i, _)| i)
            .unwrap();
        for (i, e) in entities.iter_mut().enumerate() {
            if i != best_idx && matches!(e.kind, DetectedKind::Harebourg) {
                e.kind = DetectedKind::Generic;
            }
        }
    }

    Ok(DetectionResult { entities, warnings })
}
```

- [ ] **Step 2: Build**

```bash
cd src-tauri && cargo build
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/cv/pipeline.rs
git commit -m "feat(cv): pipeline orchestrator (capture → calibrate → detect)"
```

---

### Task 4.5: Embed playable cells from map data

**Context:** `playable_cells()` currently returns every `(x, y)` in the map. That's wasteful (checks rings on obstacle/hole cells) and incorrect (false positives possible). Derive the list from the real map encoded in Task 0.1.

**Files:**
- Create: `src-tauri/src/cv/map_data.rs`
- Modify: `src-tauri/src/cv/pipeline.rs`
- Modify: `src-tauri/src/cv/mod.rs`

- [ ] **Step 1: Export map cells from TypeScript into Rust**

Since Rust can't import TS at runtime, we duplicate the data. Create `src-tauri/src/cv/map_data.rs`:

```rust
/// Playable floor cells of the Harebourg arena.
/// Must stay in sync with src/data/harebourg-map.ts (Task 0.1).
pub const PLAYABLE_CELLS: &[(i32, i32)] = &[
    // Fill from src/data/harebourg-map.ts, listing every 'floor' cell.
    // Tedious but one-time; consider writing a small TS script to emit this.
];
```

Consider writing a one-off Node script `scripts/export-map-cells.mjs` that reads `harebourg-map.ts`, iterates `floor` cells, and prints the Rust array. Run it once and paste the output.

- [ ] **Step 2: Register module**

In `src-tauri/src/cv/mod.rs` add `pub mod map_data;`.

- [ ] **Step 3: Update pipeline to use it**

In `src-tauri/src/cv/pipeline.rs`:

```rust
use crate::cv::map_data::PLAYABLE_CELLS;

pub fn playable_cells() -> &'static [(i32, i32)] {
    PLAYABLE_CELLS
}
```

Update the `for (x, y) in playable_cells()` loop to `for &(x, y) in playable_cells()`.

- [ ] **Step 4: Build**

```bash
cd src-tauri && cargo build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/cv/map_data.rs src-tauri/src/cv/mod.rs src-tauri/src/cv/pipeline.rs
git commit -m "feat(cv): restrict detection to playable floor cells from map data"
```

---

### Task 4.6: End-to-end fixture tests

**Files:**
- Create: `src-tauri/tests/detection_integration.rs`

- [ ] **Step 1: Write the test harness**

```rust
use std::path::PathBuf;
use serde::Deserialize;

#[derive(Deserialize)]
struct Expected {
    entities: Vec<ExpectedEntity>,
}

#[derive(Deserialize)]
struct ExpectedEntity {
    cell: ExpectedCell,
    team: String,
    kind: String,
}

#[derive(Deserialize)]
struct ExpectedCell { x: i32, y: i32 }

fn load_image(name: &str) -> app_lib::capture::CapturedImage {
    let path: PathBuf = ["tests", "fixtures", "harebourg", name].iter().collect();
    let img = image::open(&path).expect("open fixture").to_rgba8();
    let (w, h) = img.dimensions();
    app_lib::capture::CapturedImage {
        width: w, height: h, pixels: img.into_raw(), scale_factor: 1.0,
    }
}

fn load_expected(name: &str) -> Expected {
    let path: PathBuf = ["tests", "fixtures", "harebourg", name].iter().collect();
    let json = std::fs::read_to_string(&path).expect("read expected");
    serde_json::from_str(&json).expect("parse expected")
}

fn run_fixture(screen: &str, expected_name: &str) {
    let img = load_image(screen);
    let expected = load_expected(expected_name);

    let result = app_lib::cv::pipeline::detect_on_image(&img).expect("pipeline OK");

    // Compare: every expected entity must have a matching detected entity
    // within 1 cell tolerance, same team, same kind.
    let mut matched = 0;
    for exp in &expected.entities {
        let hit = result.entities.iter().find(|d| {
            (d.cell.0 - exp.cell.x).abs() <= 1
                && (d.cell.1 - exp.cell.y).abs() <= 1
                && format!("{:?}", d.team).to_lowercase() == exp.team
                && format!("{:?}", d.kind).to_lowercase() == exp.kind
        });
        if hit.is_some() { matched += 1; }
        else {
            eprintln!("{screen}: missing expected entity {:?} {} {}", exp.cell.x, exp.team, exp.kind);
        }
    }

    let expected_count = expected.entities.len();
    // Allow up to 1 miss per fixture as tolerance for V2 (tighten later)
    assert!(
        matched >= expected_count.saturating_sub(1),
        "{screen}: only {matched}/{expected_count} matched",
    );
}

#[test] fn fixture_01() { run_fixture("screen-01.png", "expected-01.json"); }
#[test] fn fixture_02() { run_fixture("screen-02.png", "expected-02.json"); }
#[test] fn fixture_03() { run_fixture("screen-03.png", "expected-03.json"); }
#[test] fn fixture_04() { run_fixture("screen-04.png", "expected-04.json"); }
#[test] fn fixture_05() { run_fixture("screen-05.png", "expected-05.json"); }
#[test] fn fixture_06() { run_fixture("screen-06.png", "expected-06.json"); }
#[test] fn fixture_07() { run_fixture("screen-07.png", "expected-07.json"); }
```

- [ ] **Step 2: Add `serde_json` to dev-deps in `Cargo.toml`**

Should already be present. Verify:
```bash
grep serde_json src-tauri/Cargo.toml
```

If not present at crate level, `serde_json` is already listed as a runtime dep, which makes it available to integration tests.

- [ ] **Step 3: Run tests**

```bash
cd src-tauri && cargo test --test detection_integration
```

Expected: 7 tests PASS. If any fail, tune HSV ranges in `reference.rs`, template threshold, or ring fraction bounds. Iterate until passing.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/tests/detection_integration.rs
git commit -m "test(cv): end-to-end detection against all 7 fixtures"
```

---

## Phase 5 — Tauri bridge

### Task 5.1: Expose `detect_entities` Tauri command

**Files:**
- Create: `src-tauri/src/commands.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Write command**

Create `src-tauri/src/commands.rs`:

```rust
use crate::cv::pipeline::{detect, DetectionResult, PipelineError};

#[tauri::command]
pub async fn detect_entities() -> Result<DetectionResult, PipelineError> {
    tauri::async_runtime::spawn_blocking(|| detect())
        .await
        .unwrap_or_else(|e| Err(PipelineError::Capture(
            crate::capture::CaptureError::CaptureFailed(format!("join: {e}"))
        )))
}
```

- [ ] **Step 2: Register command in `src-tauri/src/lib.rs`**

```rust
pub mod capture;
pub mod commands;
pub mod cv;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![commands::detect_entities])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 3: Build**

```bash
cd src-tauri && cargo build
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/commands.rs src-tauri/src/lib.rs
git commit -m "feat(tauri): expose detect_entities command"
```

---

### Task 5.2: TypeScript wrapper

**Files:**
- Create: `src/services/detection.ts`
- Modify: `src/core/types.ts`

- [ ] **Step 1: Add shared types in `src/core/types.ts`**

```ts
export type DetectedTeam = 'ally' | 'enemy';
export type DetectedKind = 'generic' | 'harebourg';

export type DetectedEntity = {
  cell: { x: number; y: number };
  team: DetectedTeam;
  kind: DetectedKind;
  confidence: number;
};

export type DetectionResult = {
  entities: DetectedEntity[];
  warnings: string[];
};

export type DetectionErrorKind =
  | 'WindowNotFound'
  | 'WindowMinimized'
  | 'PermissionDenied'
  | 'CaptureFailed'
  | 'NotInCombat'
  | 'UnexpectedShape'
  | 'Unknown';

export type DetectionError = {
  kind: DetectionErrorKind;
  detail?: string;
};
```

Note the Rust `#[serde(tag = "kind", content = "detail")]` attribute serializes errors as `{ "kind": "WindowNotFound" }` or `{ "kind": "CaptureFailed", "detail": "..." }`, matching this shape — but `PipelineError` wraps `CaptureError` or `CalibrationError`, so the actual JSON is nested. We flatten in the wrapper.

- [ ] **Step 2: Write the wrapper**

Create `src/services/detection.ts`:

```ts
import { invoke } from '@tauri-apps/api/core';
import type { Cell } from '../core/types';
import type {
  DetectedEntity,
  DetectionError,
  DetectionErrorKind,
  DetectionResult,
} from '../core/types';

type RustDetectedEntity = {
  cell: [number, number];
  team: 'ally' | 'enemy';
  kind: 'generic' | 'harebourg';
  confidence: number;
};

type RustDetectionResult = {
  entities: RustDetectedEntity[];
  warnings: string[];
};

type RustError = { kind: string; detail?: unknown };

function flattenError(e: unknown): DetectionError {
  // Pipeline error shape: { kind: 'Capture' | 'Calibration', detail: { kind, detail? } }
  const outer = e as RustError;
  if (outer && typeof outer === 'object' && 'kind' in outer) {
    const inner = outer.detail as RustError | undefined;
    if (inner && typeof inner === 'object' && 'kind' in inner) {
      return {
        kind: (inner.kind as DetectionErrorKind) ?? 'Unknown',
        detail: typeof inner.detail === 'string' ? inner.detail : undefined,
      };
    }
    return { kind: (outer.kind as DetectionErrorKind) ?? 'Unknown' };
  }
  return { kind: 'Unknown' };
}

function adaptEntity(r: RustDetectedEntity): DetectedEntity {
  return {
    cell: { x: r.cell[0], y: r.cell[1] },
    team: r.team,
    kind: r.kind,
    confidence: r.confidence,
  };
}

export async function invokeDetectEntities(): Promise<DetectionResult> {
  try {
    const raw = await invoke<RustDetectionResult>('detect_entities');
    return {
      entities: raw.entities.map(adaptEntity),
      warnings: raw.warnings,
    };
  } catch (e) {
    throw flattenError(e);
  }
}
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/services/detection.ts src/core/types.ts
git commit -m "feat(detection): TypeScript wrapper around Tauri detect_entities command"
```

---

## Phase 6 — Zustand state

### Task 6.1: Add `entitiesReplaced` to entitySlice

**Files:**
- Modify: `src/state/slices/entitySlice.ts`

- [ ] **Step 1: Add action**

```ts
import type { DetectedEntity, Cell, Entity, EntityKind, GameMap } from '../../core/types';

export type EntitySlice = {
  entities: Entity[];
  placeEntity: (kind: EntityKind, cell: Cell) => void;
  removeEntity: (id: string) => void;
  clearAllEntities: () => void;
  entitiesReplaced: (detected: DetectedEntity[]) => void;
};

// ...existing factory...

const detectedKindToEntityKind = (detected: DetectedEntity): EntityKind => {
  if (detected.kind === 'harebourg') return 'harebourg';
  return detected.team === 'ally' ? 'ally' : 'enemy';
};

export const createEntitySlice: StateCreator<EntitySlice & Requires, [], [], EntitySlice> = (
  set,
  get,
) => ({
  entities: [],
  placeEntity: (kind, cell) => /* existing */,
  removeEntity: (id) => /* existing */,
  clearAllEntities: () => /* existing */,
  entitiesReplaced: (detected) =>
    set(() => ({
      entities: detected.map((d) => ({
        id: nextId(),
        kind: detectedKindToEntityKind(d),
        cell: d.cell,
      })),
    })),
});
```

- [ ] **Step 2: Write test**

Create `src/state/slices/entitySlice.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { create } from 'zustand';
import { createEntitySlice, type EntitySlice } from './entitySlice';
import { HAREBOURG_MAP } from '../../data/harebourg-map';

function makeStore() {
  return create<EntitySlice & { map: typeof HAREBOURG_MAP }>()((...a) => ({
    map: HAREBOURG_MAP,
    ...createEntitySlice(...a),
  }));
}

describe('entitiesReplaced', () => {
  test('wipes and replaces all entities', () => {
    const store = makeStore();
    store.getState().placeEntity('me', { x: 1, y: 1 });
    store.getState().placeEntity('ally', { x: 2, y: 2 });
    expect(store.getState().entities.length).toBe(2);

    store.getState().entitiesReplaced([
      { cell: { x: 5, y: 5 }, team: 'enemy', kind: 'harebourg', confidence: 0.9 },
      { cell: { x: 6, y: 5 }, team: 'enemy', kind: 'generic', confidence: 0.85 },
    ]);

    const entities = store.getState().entities;
    expect(entities.length).toBe(2);
    expect(entities[0].kind).toBe('harebourg');
    expect(entities[1].kind).toBe('enemy');
  });

  test('does not preserve me after replacement', () => {
    const store = makeStore();
    store.getState().placeEntity('me', { x: 1, y: 1 });

    store.getState().entitiesReplaced([
      { cell: { x: 3, y: 3 }, team: 'ally', kind: 'generic', confidence: 0.9 },
    ]);

    expect(store.getState().entities.some((e) => e.kind === 'me')).toBe(false);
  });
});
```

- [ ] **Step 3: Run test**

```bash
npm run test -- entitySlice
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/state/slices/entitySlice.ts src/state/slices/entitySlice.test.ts
git commit -m "feat(entities): add entitiesReplaced action"
```

---

### Task 6.2: Create `detectionSlice`

**Files:**
- Create: `src/state/slices/detectionSlice.ts`
- Modify: `src/state/store.ts`

- [ ] **Step 1: Write slice**

```ts
import type { StateCreator } from 'zustand';
import type { DetectedEntity, DetectionError, DetectionResult } from '../../core/types';
import { invokeDetectEntities } from '../../services/detection';

export type DetectionStatus = 'idle' | 'detecting' | 'success' | 'error';

export type DetectionSlice = {
  detectionStatus: DetectionStatus;
  lastDetection: DetectionResult | null;
  detectionError: DetectionError | null;
  runDetection: () => Promise<void>;
  clearDetectionError: () => void;
};

type Requires = {
  entitiesReplaced: (detected: DetectedEntity[]) => void;
};

export const createDetectionSlice: StateCreator<DetectionSlice & Requires, [], [], DetectionSlice> =
  (set, get) => ({
    detectionStatus: 'idle',
    lastDetection: null,
    detectionError: null,
    clearDetectionError: () => set({ detectionError: null, detectionStatus: 'idle' }),
    runDetection: async () => {
      set({ detectionStatus: 'detecting', detectionError: null });
      try {
        const result = await invokeDetectEntities();
        get().entitiesReplaced(result.entities);
        set({ detectionStatus: 'success', lastDetection: result });
      } catch (err) {
        set({
          detectionStatus: 'error',
          detectionError: err as DetectionError,
        });
      }
    },
  });
```

- [ ] **Step 2: Register slice in `src/state/store.ts`**

```ts
import { create } from 'zustand';
import { type DetectionSlice, createDetectionSlice } from './slices/detectionSlice';
import { type EntitySlice, createEntitySlice } from './slices/entitySlice';
import { type MapSlice, createMapSlice } from './slices/mapSlice';
import { type SettingsSlice, createSettingsSlice } from './slices/settingsSlice';
import { type TurnSlice, createTurnSlice } from './slices/turnSlice';

export type AppStore =
  & MapSlice
  & EntitySlice
  & TurnSlice
  & SettingsSlice
  & DetectionSlice;

export const useAppStore = create<AppStore>()((...a) => ({
  ...createMapSlice(...a),
  ...createEntitySlice(...a),
  ...createTurnSlice(...a),
  ...createSettingsSlice(...a),
  ...createDetectionSlice(...a),
}));
```

- [ ] **Step 3: Run typecheck and existing tests**

```bash
npm run typecheck && npm run test
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/state/slices/detectionSlice.ts src/state/store.ts
git commit -m "feat(state): add detectionSlice with runDetection thunk"
```

---

### Task 6.3: Detection slice test with mocked invoke

**Files:**
- Create: `src/state/slices/detectionSlice.test.ts`

- [ ] **Step 1: Write test with mocked Tauri**

```ts
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { create } from 'zustand';
import { HAREBOURG_MAP } from '../../data/harebourg-map';
import { createEntitySlice, type EntitySlice } from './entitySlice';
import { createDetectionSlice, type DetectionSlice } from './detectionSlice';

vi.mock('../../services/detection', () => ({
  invokeDetectEntities: vi.fn(),
}));

import { invokeDetectEntities } from '../../services/detection';

function makeStore() {
  return create<EntitySlice & DetectionSlice & { map: typeof HAREBOURG_MAP }>()((...a) => ({
    map: HAREBOURG_MAP,
    ...createEntitySlice(...a),
    ...createDetectionSlice(...a),
  }));
}

describe('runDetection', () => {
  beforeEach(() => vi.mocked(invokeDetectEntities).mockReset());

  test('success path: replaces entities and sets status', async () => {
    vi.mocked(invokeDetectEntities).mockResolvedValue({
      entities: [
        { cell: { x: 2, y: 2 }, team: 'ally', kind: 'generic', confidence: 0.9 },
      ],
      warnings: [],
    });

    const store = makeStore();
    await store.getState().runDetection();

    expect(store.getState().detectionStatus).toBe('success');
    expect(store.getState().entities.length).toBe(1);
    expect(store.getState().entities[0].kind).toBe('ally');
  });

  test('error path: sets error status, does not modify entities', async () => {
    vi.mocked(invokeDetectEntities).mockRejectedValue({ kind: 'WindowNotFound' });

    const store = makeStore();
    store.getState().placeEntity('me', { x: 3, y: 3 });

    await store.getState().runDetection();

    expect(store.getState().detectionStatus).toBe('error');
    expect(store.getState().detectionError?.kind).toBe('WindowNotFound');
    expect(store.getState().entities.length).toBe(1); // me still there
  });
});
```

- [ ] **Step 2: Run test**

```bash
npm run test -- detectionSlice
```

Expected: 2 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/state/slices/detectionSlice.test.ts
git commit -m "test(detection): success and error paths for runDetection"
```

---

## Phase 7 — UI

### Task 7.1: "Detect" button component

**Files:**
- Create: `src/ui/panels/DetectButton.tsx`
- Modify: `src/ui/panels/RightPanel.tsx`

- [ ] **Step 1: Create component**

```tsx
import { useAppStore } from '../../state/store';

export function DetectButton() {
  const status = useAppStore((s) => s.detectionStatus);
  const runDetection = useAppStore((s) => s.runDetection);

  const busy = status === 'detecting';

  return (
    <button
      type="button"
      onClick={() => runDetection()}
      disabled={busy}
      style={{
        width: '100%',
        padding: '8px 12px',
        background: busy ? '#2b3542' : '#2962ff',
        color: 'white',
        border: 'none',
        borderRadius: 4,
        cursor: busy ? 'wait' : 'pointer',
        fontWeight: 600,
      }}
    >
      {busy ? 'Détection en cours…' : '📷 Détecter'}
    </button>
  );
}
```

- [ ] **Step 2: Add button to RightPanel (top of panel)**

Edit `src/ui/panels/RightPanel.tsx` and render `<DetectButton />` above the existing palette/reset controls.

- [ ] **Step 3: Run app and visually verify**

```bash
npm run tauri:dev
```

Manually click the button (it will fail because Dofus is not open — expected) and confirm the loading state appears briefly.

- [ ] **Step 4: Commit**

```bash
git add src/ui/panels/DetectButton.tsx src/ui/panels/RightPanel.tsx
git commit -m "feat(ui): add Detect button in right panel with loading state"
```

---

### Task 7.2: Confidence outline layer

**Files:**
- Modify: `src/ui/grid/EntityLayer.tsx`

- [ ] **Step 1: Render confidence outline**

Find where entities are drawn. Add:

```tsx
import { useAppStore } from '../../state/store';

// Inside the component, for each rendered entity:
const lastDetection = useAppStore((s) => s.lastDetection);

const confidenceFor = (cell: { x: number; y: number }): number | null => {
  if (!lastDetection) return null;
  const found = lastDetection.entities.find(
    (e) => e.cell.x === cell.x && e.cell.y === cell.y,
  );
  return found?.confidence ?? null;
};

// Per entity render:
const conf = confidenceFor(entity.cell);
const outlineColor =
  conf === null || conf >= 0.8
    ? null
    : conf >= 0.5
      ? '#f5c518' // yellow
      : '#d93636'; // red

// Draw an outline if outlineColor is non-null
{outlineColor && (
  <polygon
    points={/* same as cell diamond */}
    fill="transparent"
    stroke={outlineColor}
    strokeWidth={3}
    strokeDasharray="4 2"
  />
)}
{conf !== null && conf < 0.5 && (
  <text x={px} y={py - 20} fill="#d93636" fontSize={20} textAnchor="middle">?</text>
)}
```

Use the `iso.ts` utilities to compute the diamond points.

- [ ] **Step 2: Clear outline when user clicks an entity**

In `EntityLayer.tsx`, on entity click, call a new `confirmEntity(cellId)` action — or simpler, just remove the `lastDetection` entry for that cell.

Add to `detectionSlice.ts`:

```ts
export type DetectionSlice = {
  // ...existing
  confirmEntityDetection: (cell: { x: number; y: number }) => void;
};

confirmEntityDetection: (cell) =>
  set((s) => ({
    lastDetection: s.lastDetection
      ? {
          ...s.lastDetection,
          entities: s.lastDetection.entities.filter(
            (e) => !(e.cell.x === cell.x && e.cell.y === cell.y),
          ),
        }
      : null,
  })),
```

Call it from `EntityLayer` on entity click.

- [ ] **Step 3: Typecheck and run**

```bash
npm run typecheck && npm run tauri:dev
```

Visually test: place entities manually, trigger a fake detection (insert a mock into the console to populate `lastDetection`), and confirm outlines render and clear on click.

- [ ] **Step 4: Commit**

```bash
git add src/ui/grid/EntityLayer.tsx src/state/slices/detectionSlice.ts
git commit -m "feat(ui): confidence outlines on detected entities"
```

---

### Task 7.3: "Designate me" banner and click handler

**Files:**
- Create: `src/ui/app/MeBanner.tsx`
- Modify: `src/ui/app/AppShell.tsx`
- Modify: `src/ui/grid/EntityLayer.tsx`
- Modify: `src/state/slices/entitySlice.ts`

- [ ] **Step 1: Add `designateMe` action in entitySlice**

```ts
designateMe: (entityId: string) =>
  set((state) => ({
    entities: state.entities
      .filter((e) => e.kind !== 'me') // remove any existing 'me'
      .map((e) => (e.id === entityId ? { ...e, kind: 'me' as const } : e)),
  })),
```

Add to `EntitySlice` type.

- [ ] **Step 2: Banner component**

```tsx
import { useAppStore } from '../../state/store';

export function MeBanner() {
  const entities = useAppStore((s) => s.entities);
  const lastDetection = useAppStore((s) => s.lastDetection);

  const hasMe = entities.some((e) => e.kind === 'me');
  const hasAlly = entities.some((e) => e.kind === 'ally');

  if (hasMe || !hasAlly || !lastDetection) return null;

  return (
    <div style={{
      padding: '8px 16px',
      background: '#2962ff',
      color: 'white',
      fontWeight: 500,
      textAlign: 'center',
    }}>
      👇 Clique sur ta case (un allié) pour te désigner
    </div>
  );
}
```

- [ ] **Step 3: Mount banner above the map**

In `AppShell.tsx`, add `<MeBanner />` just above the grid view.

- [ ] **Step 4: Wire click handler in EntityLayer**

When an `ally` is clicked and `lastDetection` is set, call `designateMe(entity.id)` instead of the default click action. If `me` already exists, keep default behavior.

- [ ] **Step 5: Typecheck, test, commit**

```bash
npm run typecheck && npm run test
```

```bash
git add -A
git commit -m "feat(ui): designate me banner and click handler after detection"
```

---

### Task 7.4: Damier light/dark rendering

**Files:**
- Modify: `src/ui/grid/Cell.tsx`
- Modify: `src/ui/theme.ts`
- Modify: `src/data/harebourg-map.ts`

- [ ] **Step 1: Measure damier colors**

On a real combat screenshot (e.g. `screen-01.png`), sample 5 pixels each for light and dark floor tiles using an image tool. Average them. Record in `theme.ts`:

```ts
// Before:
floor: '#1e2530',

// After:
floorLight: '#<measured_light_hex>',
floorDark: '#<measured_dark_hex>',
floorEdge: '#<measured_edge_hex>',
```

Remove the old `floor` entry and update all references.

- [ ] **Step 2: Add cell coordinates prop**

In `src/ui/grid/Cell.tsx`:

```tsx
import { DAMIER_ORIGIN_PARITY } from '../../data/harebourg-map';

type Props = {
  px: number;
  py: number;
  x: number;
  y: number;
  kind: CellKind;
  // ... existing callbacks ...
};

function fillFor(kind: CellKind, x: number, y: number): string {
  if (kind === 'hole') return theme.hole;
  if (kind === 'obstacle') return theme.obstacle;
  // floor: alternate
  const isOriginParityTile = (x + y) % 2 === 0;
  const isLight = isOriginParityTile === (DAMIER_ORIGIN_PARITY === 'light');
  return isLight ? theme.floorLight : theme.floorDark;
}

function CellImpl({ px, py, x, y, kind, ... }: Props) {
  // ... existing diamond rendering, use fillFor(kind, x, y) ...
}
```

- [ ] **Step 3: Pass x, y from parent**

In `MapLayer.tsx` (or wherever `<Cell />` is instantiated), include `x={col}` and `y={row}` props.

- [ ] **Step 4: Run app and visually compare**

```bash
npm run tauri:dev
```

Side-by-side with a game screenshot: confirm the light/dark pattern matches. If offset by 1, flip `DAMIER_ORIGIN_PARITY`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(ui): damier light/dark floor rendering aligned with game"
```

---

## Phase 8 — Error UX

### Task 8.1: Toast infrastructure

**Files:**
- Create: `src/ui/app/Toast.tsx`
- Create: `src/state/slices/toastSlice.ts`
- Modify: `src/state/store.ts`
- Modify: `src/ui/app/AppShell.tsx`

- [ ] **Step 1: Tiny toast slice**

```ts
// src/state/slices/toastSlice.ts
import type { StateCreator } from 'zustand';

export type ToastSeverity = 'info' | 'error';
export type Toast = { id: string; message: string; severity: ToastSeverity; cta?: { label: string; onClick: () => void } };

export type ToastSlice = {
  toasts: Toast[];
  pushToast: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
};

let toastCounter = 0;

export const createToastSlice: StateCreator<ToastSlice, [], [], ToastSlice> = (set) => ({
  toasts: [],
  pushToast: (t) => set((s) => ({ toasts: [...s.toasts, { ...t, id: `t${++toastCounter}` }] })),
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
});
```

- [ ] **Step 2: Toast component**

```tsx
// src/ui/app/Toast.tsx
import { useEffect } from 'react';
import { useAppStore } from '../../state/store';

export function ToastStack() {
  const toasts = useAppStore((s) => s.toasts);
  const dismissToast = useAppStore((s) => s.dismissToast);

  return (
    <div style={{ position: 'fixed', top: 16, right: 16, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 1000 }}>
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => dismissToast(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: any; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 6000);
    return () => clearTimeout(timer);
  }, [onDismiss]);
  const bg = toast.severity === 'error' ? '#5b2222' : '#2a3140';
  return (
    <div style={{ padding: '10px 14px', background: bg, color: 'white', borderRadius: 4, minWidth: 280 }}>
      <div>{toast.message}</div>
      {toast.cta && (
        <button type="button" onClick={toast.cta.onClick} style={{ marginTop: 8 }}>
          {toast.cta.label}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Register slice**

In `src/state/store.ts`, add `ToastSlice` to the union and spread `createToastSlice(...a)`.

- [ ] **Step 4: Mount `<ToastStack />` in `AppShell.tsx`**

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(ui): toast notification system"
```

---

### Task 8.2: Wire detection errors to toasts

**Files:**
- Modify: `src/state/slices/detectionSlice.ts`

- [ ] **Step 1: Push toast on error**

```ts
runDetection: async () => {
  const { pushToast } = get() as unknown as { pushToast: (t: any) => void };
  set({ detectionStatus: 'detecting', detectionError: null });
  try {
    const result = await invokeDetectEntities();
    get().entitiesReplaced(result.entities);
    set({ detectionStatus: 'success', lastDetection: result });
    if (result.entities.length === 0) {
      pushToast({ message: 'Aucune entité détectée.', severity: 'info' });
    } else if (result.entities.length < 3) {
      pushToast({
        message: `Seulement ${result.entities.length} entité(s) détectée(s) — vérifie.`,
        severity: 'info',
      });
    }
  } catch (err) {
    const e = err as DetectionError;
    set({ detectionStatus: 'error', detectionError: e });
    pushToast({ message: errorMessage(e), severity: 'error' });
  }
},
```

Add `errorMessage`:

```ts
function errorMessage(e: DetectionError): string {
  switch (e.kind) {
    case 'WindowNotFound': return 'Dofus introuvable. Lance le jeu et réessaie.';
    case 'WindowMinimized': return 'Dofus est minimisé. Ramène la fenêtre à l\'avant-plan.';
    case 'PermissionDenied': return 'Permission refusée. Active l\'enregistrement d\'écran dans Préférences Système.';
    case 'NotInCombat': return 'Map non reconnue. Assure-toi d\'être en combat Harebourg.';
    case 'UnexpectedShape': return 'Zone jouable non reconnue. Réessaie ou redémarre Dofus.';
    case 'CaptureFailed': return `Échec de la capture: ${e.detail ?? 'erreur inconnue'}`;
    default: return 'Erreur inconnue.';
  }
}
```

The `as unknown as` cast is a pragmatic workaround — the slice contract doesn't explicitly depend on `pushToast`, but both slices are present in the final store. For stronger typing, add `pushToast` to the `Requires` type in `detectionSlice.ts`.

- [ ] **Step 2: Typecheck and test**

```bash
npm run typecheck && npm run test
```

Existing tests in `detectionSlice.test.ts` will need a mocked `pushToast` in the test store — add it.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(detection): surface detection errors and warnings via toasts"
```

---

## Phase 9 — Manual verification

### Task 9.1: Manual testing checklist

**Files:**
- Create: `docs/testing/v2-manual-checklist.md`

- [ ] **Step 1: Write checklist**

```markdown
# V2 Auto-Detection — Manual Testing Checklist

Run through this before shipping V2.

## Setup
- [ ] Fresh macOS user session (no cached permissions)
- [ ] Dofus running in fullscreen on main display
- [ ] Combat Harebourg engaged, first turn

## Happy path
- [ ] Click "Détecter" → entities populate within 1s
- [ ] Harebourg is correctly identified and placed
- [ ] Banner appears: "Clique sur ta case pour te désigner"
- [ ] Clicking a blue (ally) entity → it becomes 'me', banner disappears
- [ ] Re-clicking "Détecter" after movement → entities re-populate correctly

## Permission flow
- [ ] First launch: clicking "Détecter" triggers macOS permission prompt
- [ ] Denying permission → toast "Permission refusée…" appears
- [ ] Grant permission in System Preferences → retry "Détecter" → works

## Error cases
- [ ] Dofus closed → "Dofus introuvable" toast
- [ ] Dofus minimized → "Dofus est minimisé" toast
- [ ] Dofus on world map (not combat) → "Map non reconnue" toast
- [ ] Dofus in a non-Harebourg combat → "Map non reconnue" toast (acceptable false positive or false negative here)

## Edge cases
- [ ] Dofus in windowed mode, small window → detection still works
- [ ] Dofus on secondary monitor → detection works
- [ ] Multiple entities occluding each other → at worst 1 missed, noted in warning
- [ ] Low-confidence detections → yellow/red outline visible; clicking the entity clears the outline

## Damier alignment
- [ ] Open tool map side-by-side with game screenshot → light/dark pattern matches (no offset)
- [ ] Toggle mode, verify damier still correct

## Persistence
- [ ] Close app with some entities placed
- [ ] Reopen app → entities restored
- [ ] Legacy save file (if any) with `meStart` / `neutral` kinds → migrates cleanly to `me` / `enemy`
```

- [ ] **Step 2: Commit**

```bash
git add docs/testing/v2-manual-checklist.md
git commit -m "docs(testing): V2 manual verification checklist"
```

---

### Task 9.2: README permission note

**Files:**
- Modify: `README.md` (create if missing)

- [ ] **Step 1: Add section on screen recording permission**

Append to `README.md`:

```markdown
## macOS: Autorisation d'enregistrement d'écran

La fonction "Détecter" capture la fenêtre Dofus via l'API macOS `CGWindowListCreateImage`,
ce qui nécessite la permission **Enregistrement de l'écran**.

Au premier clic sur "Détecter", macOS te demandera d'autoriser l'app. Si tu as refusé :

1. Ouvre **Préférences Système** → **Confidentialité et sécurité** → **Enregistrement de l'écran**
2. Active la case à côté de **Harebourg Helper**
3. Quitte et relance l'app
4. Clique à nouveau sur **Détecter**
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs(readme): explain screen recording permission on macOS"
```

---

## Self-review

The plan has been reviewed against the spec. Coverage check:

- **Spec Décisions D1** (déclenchement à la demande) → Task 7.1 Detect button
- **Spec Décisions D2** (capture auto) → Phase 1
- **Spec Décisions D3** (classification) → Task 4.1 + 4.3
- **Spec Décisions D4** (CV classique Rust) → Phases 2-4
- **Spec Décisions D5** (remplacement total) → Task 6.1
- **Spec Décisions D6** (désignation me par clic) → Task 7.3
- **Spec Décisions D7** (calibration auto) → Phase 3
- **Spec Tâche 0 (encodage map)** → Task 0.1
- **Spec Module 1 (capture)** → Phase 1
- **Spec Module 2 (calibration)** → Phase 3
- **Spec Module 3 (détection)** → Phase 4
- **Spec Module 4 (bridge + Redux/Zustand)** → Phases 5 + 6
- **Spec Module 5 (UI)** → Phase 7
- **Spec Gestion d'erreur** → Phase 8
- **Spec Testing** → Fixture tests Phase 3 + 4 + 6 + 9

No placeholders remain; every `<measured>` is flagged as work done in a specific step (Task 0.1, 2.2, 7.4). All function and type names are consistent across tasks (`entitiesReplaced`, `runDetection`, `DetectedEntity`, etc.).

Tasks 0.1, 2.2, and 2.3 require manual measurement/labeling work that the engineer does once with an image tool — this is explicit and cannot be auto-generated.
