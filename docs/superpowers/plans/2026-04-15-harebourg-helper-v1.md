# Harebourg Helper v1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Tauri desktop app (macOS + Windows) that computes the click-cell for a given target during the Comte Harebourg fight, given manual input of entities, HP range, and melee hits.

**Architecture:** Pure TypeScript Core (`core/`) with zero UI deps, a Zustand store composed of 4 slices (`state/`) with derived selectors, an SVG-based React UI (`ui/`) rendering an iso-projected cartesian grid, and a thin Tauri shell (`src-tauri/`) for persistence + global shortcuts. Strict import direction: `core` → `state` → `ui`, `services` for effects.

**Tech Stack:** Tauri 2, React 18, TypeScript, Vite, Zustand (slice pattern), Vitest, Biome, GitHub Actions (matrix macOS + Windows).

**Reference spec:** `docs/superpowers/specs/2026-04-15-harebourg-helper-design.md`

---

## Phase 0 — Conventions

**Coordinate system:** `x` right, `y` down (screen convention). A CW 90° rotation maps `(dx, dy) → (-dy, dx)`. All rotations in Core use this convention; iso projection is isolated in `ui/grid/iso.ts`.

**Commits:** Conventional Commits style (`feat:`, `fix:`, `chore:`, `test:`, `refactor:`, `docs:`, `ci:`). No `Co-Authored-By` trailers.

**TDD:** Tests first for everything in `core/` and `state/`. UI is tested manually.

**Working branch:** Work directly on `main` for v1 (solo project). Each task ends with a commit.

---

## Phase 1 — Scaffolding

### Task 1: Initialize Vite + React + TypeScript

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/vite-env.d.ts`

- [ ] **Step 1: Scaffold Vite project in place**

Run: `npm create vite@latest . -- --template react-ts`
When prompted about non-empty directory, choose "Ignore files and continue".

- [ ] **Step 2: Install deps**

Run: `npm install`

- [ ] **Step 3: Verify dev server boots**

Run: `npm run dev` and confirm the default Vite page loads in browser, then `Ctrl+C`.

- [ ] **Step 4: Clean default assets**

Delete: `src/App.css`, `src/assets/`, `public/vite.svg`, `src/index.css` body of default styles (keep file, empty it).

Replace `src/App.tsx` with:

```tsx
export default function App() {
  return <div>Harebourg Helper</div>;
}
```

- [ ] **Step 5: Verify still boots**

Run: `npm run dev`, confirm "Harebourg Helper" renders, `Ctrl+C`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TypeScript"
```

---

### Task 2: Install and configure Biome

**Files:**
- Create: `biome.json`
- Modify: `package.json` (add scripts)

- [ ] **Step 1: Install Biome**

Run: `npm install --save-dev --save-exact @biomejs/biome@1`

- [ ] **Step 2: Create `biome.json`**

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "style": { "noNonNullAssertion": "off" },
      "suspicious": { "noExplicitAny": "error" }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": { "formatter": { "quoteStyle": "single", "semicolons": "always" } },
  "files": {
    "ignore": ["dist", "node_modules", "src-tauri/target", "src-tauri/gen"]
  }
}
```

- [ ] **Step 3: Add scripts to `package.json`**

Under `"scripts"`:

```json
"lint": "biome lint .",
"format": "biome format --write .",
"check": "biome check --write ."
```

- [ ] **Step 4: Run check**

Run: `npm run check`
Expected: passes (may auto-fix imports).

- [ ] **Step 5: Commit**

```bash
git add biome.json package.json package-lock.json
git commit -m "chore: add Biome for lint and format"
```

---

### Task 3: Install and configure Vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (add scripts)

- [ ] **Step 1: Install Vitest**

Run: `npm install --save-dev vitest @vitest/ui`

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: { provider: 'v8', include: ['src/core/**', 'src/state/**'] },
  },
});
```

- [ ] **Step 3: Add scripts**

```json
"test": "vitest run",
"test:watch": "vitest",
"typecheck": "tsc --noEmit"
```

- [ ] **Step 4: Create a smoke test**

Create `tests/smoke.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

describe('smoke', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Run tests**

Run: `npm run test`
Expected: 1 test passes.

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts tests/smoke.test.ts package.json package-lock.json
git commit -m "chore: add Vitest with smoke test"
```

---

### Task 4: Scaffold Tauri 2 shell

**Files:**
- Create: `src-tauri/` (via tauri init)

- [ ] **Step 1: Install Tauri CLI**

Run: `npm install --save-dev @tauri-apps/cli@^2`

- [ ] **Step 2: Initialize Tauri**

Run: `npx tauri init`

Answer prompts:
- App name: `harebourg-helper`
- Window title: `Harebourg Helper`
- Frontend dist dir: `../dist`
- Frontend dev URL: `http://localhost:5173`
- Frontend dev command: `npm run dev`
- Frontend build command: `npm run build`

- [ ] **Step 3: Install Tauri JS API**

Run: `npm install @tauri-apps/api@^2`

- [ ] **Step 4: Add Tauri scripts to `package.json`**

```json
"tauri": "tauri",
"tauri:dev": "tauri dev",
"tauri:build": "tauri build"
```

- [ ] **Step 5: Verify Tauri dev boots**

Run: `npm run tauri:dev`

Expected: a native window opens showing "Harebourg Helper". Close it.

If Rust toolchain is missing, install via https://rustup.rs and retry.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Tauri 2 shell"
```

---

### Task 5: Restructure `src/` skeleton

**Files:**
- Create: `src/core/`, `src/state/slices/`, `src/ui/app/`, `src/ui/grid/`, `src/ui/panels/`, `src/services/`, `src/data/`, `tests/core/`, `tests/state/`

- [ ] **Step 1: Create empty folders with placeholder `.gitkeep`**

Create `src/core/.gitkeep`, `src/state/slices/.gitkeep`, `src/ui/app/.gitkeep`, `src/ui/grid/.gitkeep`, `src/ui/panels/.gitkeep`, `src/services/.gitkeep`, `src/data/.gitkeep`, `tests/core/.gitkeep`, `tests/state/.gitkeep` (empty files).

- [ ] **Step 2: Commit**

```bash
git add src tests
git commit -m "chore: create src skeleton matching spec layout"
```

---

## Phase 2 — Core (pure TypeScript, TDD)

### Task 6: Core types

**Files:**
- Create: `src/core/types.ts`

- [ ] **Step 1: Write types file**

Create `src/core/types.ts`:

```ts
export type Cell = { x: number; y: number };

export type CellKind = 'floor' | 'hole' | 'obstacle';

export type GameMap = {
  id: string;
  name: string;
  width: number;
  height: number;
  cells: CellKind[][]; // [y][x]
};

export type EntityKind = 'me' | 'meStart' | 'harebourg' | 'ally' | 'neutral';

export type Entity = {
  id: string;
  kind: EntityKind;
  cell: Cell;
  label?: string;
};

export type HpRange = 'r100_90' | 'r89_75' | 'r74_45' | 'r44_30' | 'r29_0';

export type Rotation = {
  degrees: 0 | 90 | 180 | 270;
  direction: 'cw' | 'ccw';
};

export type TurnState = {
  hpRange: HpRange;
  meleeHits: number;
  targetCell: Cell | null;
};

export type RedirectionResult =
  | { kind: 'ok'; aimCell: Cell; impactCell: Cell }
  | { kind: 'blocked'; reason: 'los' | 'out_of_map' | 'no_solution' };

export type AppMode = 'combat' | 'edit';
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/core/types.ts
git commit -m "feat(core): add domain types"
```

---

### Task 7: Geometry — rotation utilities (TDD)

**Files:**
- Create: `src/core/geometry.ts`, `tests/core/geometry.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/core/geometry.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  addRotations,
  inverseRotation,
  rotateCellAround,
} from '../../src/core/geometry';
import type { Rotation } from '../../src/core/types';

const cw = (d: 0 | 90 | 180 | 270): Rotation => ({ degrees: d, direction: 'cw' });
const ccw = (d: 0 | 90 | 180 | 270): Rotation => ({ degrees: d, direction: 'ccw' });

describe('rotateCellAround', () => {
  const pivot = { x: 5, y: 5 };

  it('returns the target unchanged for 0°', () => {
    expect(rotateCellAround(pivot, { x: 6, y: 5 }, cw(0))).toEqual({ x: 6, y: 5 });
  });

  it('cw 90°: (1, 0) offset -> (0, 1) offset', () => {
    expect(rotateCellAround(pivot, { x: 6, y: 5 }, cw(90))).toEqual({ x: 5, y: 6 });
  });

  it('cw 180°: negates offsets', () => {
    expect(rotateCellAround(pivot, { x: 7, y: 5 }, cw(180))).toEqual({ x: 3, y: 5 });
  });

  it('cw 270°: (1, 0) offset -> (0, -1) offset', () => {
    expect(rotateCellAround(pivot, { x: 6, y: 5 }, cw(270))).toEqual({ x: 5, y: 4 });
  });

  it('ccw 90° equals cw 270°', () => {
    expect(rotateCellAround(pivot, { x: 6, y: 5 }, ccw(90))).toEqual(
      rotateCellAround(pivot, { x: 6, y: 5 }, cw(270)),
    );
  });

  it('ccw 270° equals cw 90°', () => {
    expect(rotateCellAround(pivot, { x: 6, y: 5 }, ccw(270))).toEqual(
      rotateCellAround(pivot, { x: 6, y: 5 }, cw(90)),
    );
  });

  it('pivot maps to itself', () => {
    expect(rotateCellAround(pivot, pivot, cw(90))).toEqual(pivot);
  });
});

describe('inverseRotation', () => {
  it('flips direction, keeps degrees', () => {
    expect(inverseRotation(cw(90))).toEqual(ccw(90));
    expect(inverseRotation(ccw(270))).toEqual(cw(270));
  });

  it('composing a rotation with its inverse yields identity', () => {
    const r = cw(90);
    const p = { x: 0, y: 0 };
    const t = { x: 3, y: 4 };
    const rotated = rotateCellAround(p, t, r);
    const back = rotateCellAround(p, rotated, inverseRotation(r));
    expect(back).toEqual(t);
  });
});

describe('addRotations', () => {
  it('cw 90 + cw 90 = cw 180', () => {
    expect(addRotations(cw(90), cw(90))).toEqual(cw(180));
  });

  it('cw 90 + ccw 90 = cw 0', () => {
    expect(addRotations(cw(90), ccw(90))).toEqual(cw(0));
  });

  it('cw 180 + cw 180 = cw 0', () => {
    expect(addRotations(cw(180), cw(180))).toEqual(cw(0));
  });

  it('ccw 90 + ccw 90 = cw 180 (canonical cw form)', () => {
    expect(addRotations(ccw(90), ccw(90))).toEqual(cw(180));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/core/geometry.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `geometry.ts`**

Create `src/core/geometry.ts`:

```ts
import type { Cell, Rotation } from './types';

function toCwDegrees(r: Rotation): number {
  return r.direction === 'cw' ? r.degrees : (360 - r.degrees) % 360;
}

export function rotateCellAround(pivot: Cell, target: Cell, rotation: Rotation): Cell {
  const deg = toCwDegrees(rotation);
  const dx = target.x - pivot.x;
  const dy = target.y - pivot.y;
  let nx: number;
  let ny: number;
  switch (deg) {
    case 0:   nx = dx;  ny = dy;  break;
    case 90:  nx = -dy; ny = dx;  break;
    case 180: nx = -dx; ny = -dy; break;
    case 270: nx = dy;  ny = -dx; break;
    default:  nx = dx;  ny = dy;
  }
  return { x: pivot.x + nx, y: pivot.y + ny };
}

export function inverseRotation(r: Rotation): Rotation {
  return { degrees: r.degrees, direction: r.direction === 'cw' ? 'ccw' : 'cw' };
}

export function addRotations(a: Rotation, b: Rotation): Rotation {
  const total = (toCwDegrees(a) + toCwDegrees(b)) % 360;
  return { degrees: total as 0 | 90 | 180 | 270, direction: 'cw' };
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/core/geometry.test.ts`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/core/geometry.ts tests/core/geometry.test.ts
git commit -m "feat(core): rotation utilities (rotateCellAround, inverseRotation, addRotations)"
```

---

### Task 8: Line of sight — Bresenham (TDD)

**Files:**
- Create: `src/core/los.ts`, `tests/core/los.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/core/los.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { hasLineOfSight } from '../../src/core/los';
import type { GameMap } from '../../src/core/types';

function makeMap(w: number, h: number, obstacles: Array<[number, number]> = [], holes: Array<[number, number]> = []): GameMap {
  const cells = Array.from({ length: h }, () => Array.from({ length: w }, () => 'floor' as const));
  const out: GameMap = { id: 't', name: 't', width: w, height: h, cells };
  for (const [x, y] of obstacles) out.cells[y][x] = 'obstacle';
  for (const [x, y] of holes) out.cells[y][x] = 'hole';
  return out;
}

describe('hasLineOfSight', () => {
  it('A == B is always true', () => {
    expect(hasLineOfSight({ x: 2, y: 2 }, { x: 2, y: 2 }, makeMap(5, 5))).toBe(true);
  });

  it('clear horizontal line', () => {
    expect(hasLineOfSight({ x: 0, y: 2 }, { x: 4, y: 2 }, makeMap(5, 5))).toBe(true);
  });

  it('obstacle on the line blocks', () => {
    const map = makeMap(5, 5, [[2, 2]]);
    expect(hasLineOfSight({ x: 0, y: 2 }, { x: 4, y: 2 }, map)).toBe(false);
  });

  it('hole on the line does NOT block', () => {
    const map = makeMap(5, 5, [], [[2, 2]]);
    expect(hasLineOfSight({ x: 0, y: 2 }, { x: 4, y: 2 }, map)).toBe(true);
  });

  it('obstacle outside the line does not block', () => {
    const map = makeMap(5, 5, [[3, 3]]);
    expect(hasLineOfSight({ x: 0, y: 0 }, { x: 4, y: 0 }, map)).toBe(true);
  });

  it('diagonal clear', () => {
    expect(hasLineOfSight({ x: 0, y: 0 }, { x: 4, y: 4 }, makeMap(5, 5))).toBe(true);
  });

  it('diagonal blocked by obstacle on the diagonal', () => {
    const map = makeMap(5, 5, [[2, 2]]);
    expect(hasLineOfSight({ x: 0, y: 0 }, { x: 4, y: 4 }, map)).toBe(false);
  });

  it('source or destination being obstacle is fine (only traversed cells matter)', () => {
    const map = makeMap(5, 5, [[0, 0], [4, 4]]);
    expect(hasLineOfSight({ x: 0, y: 0 }, { x: 4, y: 4 }, map)).toBe(true);
  });
});
```

- [ ] **Step 2: Verify fail**

Run: `npm test -- tests/core/los.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement Bresenham**

Create `src/core/los.ts`:

```ts
import type { Cell, GameMap } from './types';

export function hasLineOfSight(a: Cell, b: Cell, map: GameMap): boolean {
  if (a.x === b.x && a.y === b.y) return true;

  let x0 = a.x;
  let y0 = a.y;
  const x1 = b.x;
  const y1 = b.y;
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;

  while (true) {
    if (!(x0 === a.x && y0 === a.y) && !(x0 === b.x && y0 === b.y)) {
      if (x0 < 0 || y0 < 0 || x0 >= map.width || y0 >= map.height) return false;
      if (map.cells[y0][x0] === 'obstacle') return false;
    }
    if (x0 === x1 && y0 === y1) return true;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/core/los.test.ts`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/core/los.ts tests/core/los.test.ts
git commit -m "feat(core): line of sight via Bresenham"
```

---

### Task 9: Confusion computation (TDD)

**Files:**
- Create: `src/core/confusion.ts`, `tests/core/confusion.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/core/confusion.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { BASE_CONFUSION, computeConfusion } from '../../src/core/confusion';
import type { HpRange, TurnState } from '../../src/core/types';

const make = (hpRange: HpRange, meleeHits: number): TurnState => ({
  hpRange,
  meleeHits,
  targetCell: null,
});

describe('computeConfusion', () => {
  it('returns base rotation at 0 melee hits', () => {
    expect(computeConfusion(make('r100_90', 0))).toEqual(BASE_CONFUSION.r100_90);
    expect(computeConfusion(make('r74_45', 0))).toEqual(BASE_CONFUSION.r74_45);
  });

  it('each melee hit adds 90° ccw', () => {
    // r100_90 base = cw 90. +1 ccw 90 = cw 0.
    expect(computeConfusion(make('r100_90', 1))).toEqual({ degrees: 0, direction: 'cw' });
    // +2 ccw = cw 270
    expect(computeConfusion(make('r100_90', 2))).toEqual({ degrees: 270, direction: 'cw' });
  });

  it('caps at 10 melee hits', () => {
    const at10 = computeConfusion(make('r74_45', 10));
    const at15 = computeConfusion(make('r74_45', 15));
    expect(at15).toEqual(at10);
  });

  it('negative hits clamp to 0', () => {
    expect(computeConfusion(make('r100_90', -3))).toEqual(BASE_CONFUSION.r100_90);
  });

  it('full table × 0..10 hits is a total function (no throws)', () => {
    const ranges: HpRange[] = ['r100_90', 'r89_75', 'r74_45', 'r44_30', 'r29_0'];
    for (const r of ranges) {
      for (let h = 0; h <= 10; h++) {
        const result = computeConfusion(make(r, h));
        expect([0, 90, 180, 270]).toContain(result.degrees);
      }
    }
  });
});
```

- [ ] **Step 2: Verify fail**

Run: `npm test -- tests/core/confusion.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/core/confusion.ts`:

```ts
import { addRotations } from './geometry';
import type { HpRange, Rotation, TurnState } from './types';

export const BASE_CONFUSION: Record<HpRange, Rotation> = {
  r100_90: { degrees: 90, direction: 'cw' },
  r89_75:  { degrees: 270, direction: 'ccw' },
  r74_45:  { degrees: 180, direction: 'cw' },
  r44_30:  { degrees: 90, direction: 'ccw' },
  r29_0:   { degrees: 270, direction: 'cw' },
};

const HIT_INCREMENT: Rotation = { degrees: 90, direction: 'ccw' };
const MAX_HITS = 10;

export function computeConfusion(state: TurnState): Rotation {
  const base = BASE_CONFUSION[state.hpRange];
  const hits = Math.min(Math.max(state.meleeHits, 0), MAX_HITS);
  let result = base;
  for (let i = 0; i < hits; i++) {
    result = addRotations(result, HIT_INCREMENT);
  }
  return result;
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/core/confusion.test.ts`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/core/confusion.ts tests/core/confusion.test.ts
git commit -m "feat(core): computeConfusion with HP table and melee increment"
```

---

### Task 10: Forward redirection (TDD)

**Files:**
- Create: `src/core/redirection.ts`, `tests/core/redirection.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/core/redirection.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { forwardRedirection } from '../../src/core/redirection';
import type { GameMap, Rotation } from '../../src/core/types';

function makeMap(w: number, h: number, obstacles: Array<[number, number]> = []): GameMap {
  const cells = Array.from({ length: h }, () => Array.from({ length: w }, () => 'floor' as const));
  const m: GameMap = { id: 't', name: 't', width: w, height: h, cells };
  for (const [x, y] of obstacles) m.cells[y][x] = 'obstacle';
  return m;
}

const cw = (d: 0 | 90 | 180 | 270): Rotation => ({ degrees: d, direction: 'cw' });

describe('forwardRedirection', () => {
  it('identity rotation yields aim == impact', () => {
    const r = forwardRedirection({ x: 2, y: 2 }, { x: 4, y: 2 }, cw(0), makeMap(10, 10));
    expect(r).toEqual({ kind: 'ok', aimCell: { x: 4, y: 2 }, impactCell: { x: 4, y: 2 } });
  });

  it('cw 90° around source (2,2): aim (4,2) -> impact (2,4)', () => {
    const r = forwardRedirection({ x: 2, y: 2 }, { x: 4, y: 2 }, cw(90), makeMap(10, 10));
    expect(r).toEqual({ kind: 'ok', aimCell: { x: 4, y: 2 }, impactCell: { x: 2, y: 4 } });
  });

  it('impact out of map is blocked (out_of_map)', () => {
    const r = forwardRedirection({ x: 0, y: 0 }, { x: 2, y: 0 }, cw(180), makeMap(10, 10));
    expect(r).toEqual({ kind: 'blocked', reason: 'out_of_map' });
  });

  it('LOS blocked returns los', () => {
    const map = makeMap(10, 10, [[3, 2]]);
    const r = forwardRedirection({ x: 2, y: 2 }, { x: 5, y: 2 }, cw(0), map);
    expect(r).toEqual({ kind: 'blocked', reason: 'los' });
  });

  it('impact on obstacle returns no_solution', () => {
    const map = makeMap(10, 10, [[2, 4]]);
    const r = forwardRedirection({ x: 2, y: 2 }, { x: 4, y: 2 }, cw(90), map);
    expect(r).toEqual({ kind: 'blocked', reason: 'no_solution' });
  });
});
```

- [ ] **Step 2: Verify fail**

Run: `npm test -- tests/core/redirection.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/core/redirection.ts`:

```ts
import { rotateCellAround } from './geometry';
import { hasLineOfSight } from './los';
import type { Cell, GameMap, RedirectionResult, Rotation } from './types';

function isInside(cell: Cell, map: GameMap): boolean {
  return cell.x >= 0 && cell.y >= 0 && cell.x < map.width && cell.y < map.height;
}

export function forwardRedirection(
  source: Cell,
  aim: Cell,
  rotation: Rotation,
  map: GameMap,
): RedirectionResult {
  if (!isInside(aim, map)) return { kind: 'blocked', reason: 'out_of_map' };
  if (!hasLineOfSight(source, aim, map)) return { kind: 'blocked', reason: 'los' };

  const impact = rotateCellAround(source, aim, rotation);
  if (!isInside(impact, map)) return { kind: 'blocked', reason: 'out_of_map' };
  if (map.cells[impact.y][impact.x] === 'obstacle') return { kind: 'blocked', reason: 'no_solution' };

  return { kind: 'ok', aimCell: aim, impactCell: impact };
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/core/redirection.test.ts`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/core/redirection.ts tests/core/redirection.test.ts
git commit -m "feat(core): forward redirection (aim -> impact)"
```

---

### Task 11: Reverse solver (TDD)

**Files:**
- Create: `src/core/solver.ts`, `tests/core/solver.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/core/solver.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { forwardRedirection } from '../../src/core/redirection';
import { reverseSolve } from '../../src/core/solver';
import type { GameMap, Rotation } from '../../src/core/types';

function makeMap(w: number, h: number, obstacles: Array<[number, number]> = []): GameMap {
  const cells = Array.from({ length: h }, () => Array.from({ length: w }, () => 'floor' as const));
  const m: GameMap = { id: 't', name: 't', width: w, height: h, cells };
  for (const [x, y] of obstacles) m.cells[y][x] = 'obstacle';
  return m;
}

const cw = (d: 0 | 90 | 180 | 270): Rotation => ({ degrees: d, direction: 'cw' });

describe('reverseSolve', () => {
  it('identity rotation: aim == target', () => {
    const r = reverseSolve({ x: 2, y: 2 }, { x: 4, y: 2 }, cw(0), makeMap(10, 10));
    expect(r).toEqual({ kind: 'ok', aimCell: { x: 4, y: 2 }, impactCell: { x: 4, y: 2 } });
  });

  it('cw 90°: to hit target (2,4) from (2,2), click (4,2)', () => {
    const r = reverseSolve({ x: 2, y: 2 }, { x: 2, y: 4 }, cw(90), makeMap(10, 10));
    expect(r).toEqual({ kind: 'ok', aimCell: { x: 4, y: 2 }, impactCell: { x: 2, y: 4 } });
  });

  it('aim out of map returns out_of_map', () => {
    const r = reverseSolve({ x: 0, y: 0 }, { x: 0, y: 2 }, cw(90), makeMap(10, 10));
    // aim = rotate target by inverse cw 90 = ccw 90 around source. target (0,2), source (0,0). ccw 90: (dx,dy)->(dy,-dx). (0,2) -> (2,0). aim=(2,0). In map.
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') expect(r.aimCell).toEqual({ x: 2, y: 0 });
  });

  it('LOS blocked to aim returns los', () => {
    const map = makeMap(10, 10, [[3, 2]]);
    // source (2,2), target (2,4), rot cw 90 -> aim (4,2). LOS (2,2)->(4,2) crosses (3,2) which is obstacle.
    const r = reverseSolve({ x: 2, y: 2 }, { x: 2, y: 4 }, cw(90), map);
    expect(r).toEqual({ kind: 'blocked', reason: 'los' });
  });

  it('reverseSolve is inverse of forward', () => {
    const map = makeMap(10, 10);
    const source = { x: 2, y: 2 };
    const aim = { x: 5, y: 3 };
    const rot = cw(90);
    const fwd = forwardRedirection(source, aim, rot, map);
    expect(fwd.kind).toBe('ok');
    if (fwd.kind !== 'ok') return;
    const rev = reverseSolve(source, fwd.impactCell, rot, map);
    expect(rev).toEqual({ kind: 'ok', aimCell: aim, impactCell: fwd.impactCell });
  });
});
```

- [ ] **Step 2: Verify fail**

Run: `npm test -- tests/core/solver.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/core/solver.ts`:

```ts
import { inverseRotation, rotateCellAround } from './geometry';
import { hasLineOfSight } from './los';
import type { Cell, GameMap, RedirectionResult, Rotation } from './types';

function isInside(cell: Cell, map: GameMap): boolean {
  return cell.x >= 0 && cell.y >= 0 && cell.x < map.width && cell.y < map.height;
}

export function reverseSolve(
  source: Cell,
  target: Cell,
  rotation: Rotation,
  map: GameMap,
): RedirectionResult {
  const aim = rotateCellAround(source, target, inverseRotation(rotation));
  if (!isInside(aim, map)) return { kind: 'blocked', reason: 'out_of_map' };
  if (map.cells[aim.y][aim.x] === 'obstacle') return { kind: 'blocked', reason: 'no_solution' };
  if (!hasLineOfSight(source, aim, map)) return { kind: 'blocked', reason: 'los' };
  return { kind: 'ok', aimCell: aim, impactCell: target };
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/core/solver.test.ts`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/core/solver.ts tests/core/solver.test.ts
git commit -m "feat(core): reverse solver (target -> aim)"
```

---

### Task 12: Placement guard (TDD)

**Files:**
- Create: `src/core/placement.ts`, `tests/core/placement.test.ts`

- [ ] **Step 1: Failing tests**

Create `tests/core/placement.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { canPlaceEntity } from '../../src/core/placement';
import type { GameMap } from '../../src/core/types';

const map: GameMap = {
  id: 't', name: 't', width: 3, height: 3,
  cells: [
    ['floor', 'hole', 'obstacle'],
    ['floor', 'floor', 'floor'],
    ['floor', 'floor', 'floor'],
  ],
};

describe('canPlaceEntity', () => {
  it('allows floor', () => {
    expect(canPlaceEntity({ x: 0, y: 0 }, map)).toBe(true);
  });
  it('rejects hole', () => {
    expect(canPlaceEntity({ x: 1, y: 0 }, map)).toBe(false);
  });
  it('rejects obstacle', () => {
    expect(canPlaceEntity({ x: 2, y: 0 }, map)).toBe(false);
  });
  it('rejects out of bounds', () => {
    expect(canPlaceEntity({ x: -1, y: 0 }, map)).toBe(false);
    expect(canPlaceEntity({ x: 3, y: 0 }, map)).toBe(false);
  });
});
```

- [ ] **Step 2: Verify fail**

Run: `npm test -- tests/core/placement.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/core/placement.ts`:

```ts
import type { Cell, GameMap } from './types';

export function canPlaceEntity(cell: Cell, map: GameMap): boolean {
  if (cell.x < 0 || cell.y < 0 || cell.x >= map.width || cell.y >= map.height) return false;
  return map.cells[cell.y][cell.x] === 'floor';
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/core/placement.test.ts`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/core/placement.ts tests/core/placement.test.ts
git commit -m "feat(core): floor-only placement guard"
```

---

## Phase 3 — Data

### Task 13: Harebourg map preset

**Files:**
- Create: `src/data/harebourg-map.ts`

- [ ] **Step 1: Draft the preset**

Create `src/data/harebourg-map.ts` — a provisional 15×17 map with a border of `obstacle`, interior of `floor`, and a few `hole` cells to exercise rendering. Exact layout will be corrected in-game later via the edit mode.

```ts
import type { CellKind, GameMap } from '../core/types';

const W = 15;
const H = 17;

function build(): CellKind[][] {
  const grid: CellKind[][] = Array.from({ length: H }, (_, y) =>
    Array.from({ length: W }, (_, x) => {
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1) return 'obstacle';
      return 'floor';
    }),
  );
  // Provisional holes (to be corrected from a HD screenshot)
  const holes: Array<[number, number]> = [
    [3, 4], [4, 4], [10, 4], [11, 4],
    [3, 12], [4, 12], [10, 12], [11, 12],
  ];
  for (const [x, y] of holes) grid[y][x] = 'hole';
  return grid;
}

export const HAREBOURG_MAP: GameMap = {
  id: 'harebourg-v1',
  name: 'Comte Harebourg',
  width: W,
  height: H,
  cells: build(),
};
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add src/data/harebourg-map.ts
git commit -m "feat(data): provisional Harebourg map preset (to be refined in edit mode)"
```

---

## Phase 4 — State (Zustand slice pattern)

### Task 14: Install Zustand and Immer

- [ ] **Step 1: Install**

Run: `npm install zustand immer`

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add zustand + immer"
```

---

### Task 15: Map slice (TDD)

**Files:**
- Create: `src/state/slices/mapSlice.ts`, `tests/state/mapSlice.test.ts`

- [ ] **Step 1: Failing tests**

Create `tests/state/mapSlice.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { create } from 'zustand';
import { type MapSlice, createMapSlice } from '../../src/state/slices/mapSlice';

function makeStore() {
  return create<MapSlice>()((...a) => ({ ...createMapSlice(...a) }));
}

describe('mapSlice', () => {
  it('initializes with the Harebourg preset', () => {
    const s = makeStore().getState();
    expect(s.map.id).toBe('harebourg-v1');
    expect(s.map.width).toBeGreaterThan(0);
  });

  it('setCellKind updates a cell', () => {
    const s = makeStore();
    s.getState().setCellKind({ x: 1, y: 1 }, 'obstacle');
    expect(s.getState().map.cells[1][1]).toBe('obstacle');
  });

  it('setCellKind ignores out-of-bounds', () => {
    const s = makeStore();
    const before = JSON.stringify(s.getState().map.cells);
    s.getState().setCellKind({ x: -1, y: 0 }, 'obstacle');
    expect(JSON.stringify(s.getState().map.cells)).toBe(before);
  });

  it('resetMapToDefault restores the preset', () => {
    const s = makeStore();
    s.getState().setCellKind({ x: 1, y: 1 }, 'obstacle');
    s.getState().resetMapToDefault();
    const original = s.getState().map.cells[1][1];
    expect(original).toBe('floor');
  });
});
```

- [ ] **Step 2: Verify fail**

Run: `npm test -- tests/state/mapSlice.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/state/slices/mapSlice.ts`:

```ts
import type { StateCreator } from 'zustand';
import { produce } from 'immer';
import { HAREBOURG_MAP } from '../../data/harebourg-map';
import type { Cell, CellKind, GameMap } from '../../core/types';

export type MapSlice = {
  map: GameMap;
  setCellKind: (cell: Cell, kind: CellKind) => void;
  resetMapToDefault: () => void;
};

function clone(map: GameMap): GameMap {
  return { ...map, cells: map.cells.map((row) => [...row]) };
}

export const createMapSlice: StateCreator<MapSlice, [], [], MapSlice> = (set) => ({
  map: clone(HAREBOURG_MAP),
  setCellKind: (cell, kind) =>
    set(
      produce<MapSlice>((s) => {
        if (cell.x < 0 || cell.y < 0 || cell.x >= s.map.width || cell.y >= s.map.height) return;
        s.map.cells[cell.y][cell.x] = kind;
      }),
    ),
  resetMapToDefault: () => set({ map: clone(HAREBOURG_MAP) }),
});
```

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/state/mapSlice.test.ts`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/state/slices/mapSlice.ts tests/state/mapSlice.test.ts
git commit -m "feat(state): map slice with cell toggle and reset"
```

---

### Task 16: Entity slice with placement guard (TDD)

**Files:**
- Create: `src/state/slices/entitySlice.ts`, `tests/state/entitySlice.test.ts`

- [ ] **Step 1: Failing tests**

Create `tests/state/entitySlice.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { create } from 'zustand';
import { type EntitySlice, createEntitySlice } from '../../src/state/slices/entitySlice';
import { type MapSlice, createMapSlice } from '../../src/state/slices/mapSlice';

type Combined = MapSlice & EntitySlice;

function makeStore() {
  return create<Combined>()((...a) => ({
    ...createMapSlice(...a),
    ...createEntitySlice(...a),
  }));
}

describe('entitySlice', () => {
  it('starts empty', () => {
    expect(makeStore().getState().entities).toEqual([]);
  });

  it('placeEntity on floor succeeds', () => {
    const s = makeStore();
    s.getState().placeEntity('harebourg', { x: 5, y: 5 });
    expect(s.getState().entities).toHaveLength(1);
    expect(s.getState().entities[0].kind).toBe('harebourg');
  });

  it('placeEntity on obstacle is rejected silently', () => {
    const s = makeStore();
    s.getState().setCellKind({ x: 5, y: 5 }, 'obstacle');
    s.getState().placeEntity('ally', { x: 5, y: 5 });
    expect(s.getState().entities).toEqual([]);
  });

  it('placeEntity on hole is rejected', () => {
    const s = makeStore();
    s.getState().setCellKind({ x: 5, y: 5 }, 'hole');
    s.getState().placeEntity('ally', { x: 5, y: 5 });
    expect(s.getState().entities).toEqual([]);
  });

  it('unique kinds (me, meStart, harebourg) replace existing', () => {
    const s = makeStore();
    s.getState().placeEntity('me', { x: 5, y: 5 });
    s.getState().placeEntity('me', { x: 6, y: 5 });
    const me = s.getState().entities.filter((e) => e.kind === 'me');
    expect(me).toHaveLength(1);
    expect(me[0].cell).toEqual({ x: 6, y: 5 });
  });

  it('multiple allies coexist', () => {
    const s = makeStore();
    s.getState().placeEntity('ally', { x: 5, y: 5 });
    s.getState().placeEntity('ally', { x: 6, y: 5 });
    expect(s.getState().entities.filter((e) => e.kind === 'ally')).toHaveLength(2);
  });

  it('removeEntity by id', () => {
    const s = makeStore();
    s.getState().placeEntity('ally', { x: 5, y: 5 });
    const id = s.getState().entities[0].id;
    s.getState().removeEntity(id);
    expect(s.getState().entities).toEqual([]);
  });
});
```

- [ ] **Step 2: Verify fail**

Run: `npm test -- tests/state/entitySlice.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/state/slices/entitySlice.ts`:

```ts
import type { StateCreator } from 'zustand';
import { canPlaceEntity } from '../../core/placement';
import type { Cell, Entity, EntityKind, GameMap } from '../../core/types';

export type EntitySlice = {
  entities: Entity[];
  placeEntity: (kind: EntityKind, cell: Cell) => void;
  removeEntity: (id: string) => void;
};

const UNIQUE: ReadonlySet<EntityKind> = new Set(['me', 'meStart', 'harebourg']);

let counter = 0;
const nextId = () => `e${++counter}`;

type Requires = { map: GameMap };

export const createEntitySlice: StateCreator<
  EntitySlice & Requires,
  [],
  [],
  EntitySlice
> = (set, get) => ({
  entities: [],
  placeEntity: (kind, cell) =>
    set((state) => {
      if (!canPlaceEntity(cell, get().map)) return state;
      const filtered = UNIQUE.has(kind)
        ? state.entities.filter((e) => e.kind !== kind)
        : state.entities;
      return { entities: [...filtered, { id: nextId(), kind, cell }] };
    }),
  removeEntity: (id) =>
    set((state) => ({ entities: state.entities.filter((e) => e.id !== id) })),
});
```

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/state/entitySlice.test.ts`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/state/slices/entitySlice.ts tests/state/entitySlice.test.ts
git commit -m "feat(state): entity slice with floor-only guard and unique kinds"
```

---

### Task 17: Turn slice (TDD)

**Files:**
- Create: `src/state/slices/turnSlice.ts`, `tests/state/turnSlice.test.ts`

- [ ] **Step 1: Failing tests**

Create `tests/state/turnSlice.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { create } from 'zustand';
import { type TurnSlice, createTurnSlice } from '../../src/state/slices/turnSlice';

function makeStore() {
  return create<TurnSlice>()((...a) => ({ ...createTurnSlice(...a) }));
}

describe('turnSlice', () => {
  it('defaults: r100_90, 0 hits, null target', () => {
    const s = makeStore().getState();
    expect(s.turn).toEqual({ hpRange: 'r100_90', meleeHits: 0, targetCell: null });
  });

  it('setHpRange updates', () => {
    const s = makeStore();
    s.getState().setHpRange('r74_45');
    expect(s.getState().turn.hpRange).toBe('r74_45');
  });

  it('setMeleeHits clamps to [0, 10]', () => {
    const s = makeStore();
    s.getState().setMeleeHits(-3);
    expect(s.getState().turn.meleeHits).toBe(0);
    s.getState().setMeleeHits(15);
    expect(s.getState().turn.meleeHits).toBe(10);
    s.getState().setMeleeHits(4);
    expect(s.getState().turn.meleeHits).toBe(4);
  });

  it('setTargetCell accepts cell or null', () => {
    const s = makeStore();
    s.getState().setTargetCell({ x: 3, y: 4 });
    expect(s.getState().turn.targetCell).toEqual({ x: 3, y: 4 });
    s.getState().setTargetCell(null);
    expect(s.getState().turn.targetCell).toBeNull();
  });

  it('resetTurn zeros meleeHits and clears target, keeps hpRange', () => {
    const s = makeStore();
    s.getState().setHpRange('r44_30');
    s.getState().setMeleeHits(5);
    s.getState().setTargetCell({ x: 1, y: 1 });
    s.getState().resetTurn();
    expect(s.getState().turn).toEqual({ hpRange: 'r44_30', meleeHits: 0, targetCell: null });
  });
});
```

- [ ] **Step 2: Verify fail**

Run: `npm test -- tests/state/turnSlice.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/state/slices/turnSlice.ts`:

```ts
import type { StateCreator } from 'zustand';
import type { Cell, HpRange, TurnState } from '../../core/types';

export type TurnSlice = {
  turn: TurnState;
  setHpRange: (range: HpRange) => void;
  setMeleeHits: (n: number) => void;
  setTargetCell: (cell: Cell | null) => void;
  resetTurn: () => void;
};

export const createTurnSlice: StateCreator<TurnSlice, [], [], TurnSlice> = (set) => ({
  turn: { hpRange: 'r100_90', meleeHits: 0, targetCell: null },
  setHpRange: (range) => set((s) => ({ turn: { ...s.turn, hpRange: range } })),
  setMeleeHits: (n) =>
    set((s) => ({ turn: { ...s.turn, meleeHits: Math.min(Math.max(n, 0), 10) } })),
  setTargetCell: (cell) => set((s) => ({ turn: { ...s.turn, targetCell: cell } })),
  resetTurn: () =>
    set((s) => ({ turn: { ...s.turn, meleeHits: 0, targetCell: null } })),
});
```

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/state/turnSlice.test.ts`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/state/slices/turnSlice.ts tests/state/turnSlice.test.ts
git commit -m "feat(state): turn slice with clamped melee hits and reset"
```

---

### Task 18: Settings slice

**Files:**
- Create: `src/state/slices/settingsSlice.ts`, `tests/state/settingsSlice.test.ts`

- [ ] **Step 1: Failing tests**

Create `tests/state/settingsSlice.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { create } from 'zustand';
import {
  DEFAULT_SHORTCUTS,
  type SettingsSlice,
  createSettingsSlice,
} from '../../src/state/slices/settingsSlice';

function makeStore() {
  return create<SettingsSlice>()((...a) => ({ ...createSettingsSlice(...a) }));
}

describe('settingsSlice', () => {
  it('defaults mode to combat', () => {
    expect(makeStore().getState().mode).toBe('combat');
  });

  it('toggles mode combat <-> edit', () => {
    const s = makeStore();
    s.getState().setMode('edit');
    expect(s.getState().mode).toBe('edit');
    s.getState().setMode('combat');
    expect(s.getState().mode).toBe('combat');
  });

  it('default shortcuts contain resetTurn', () => {
    const s = makeStore().getState();
    expect(s.settings.shortcuts.resetTurn).toBe(DEFAULT_SHORTCUTS.resetTurn);
  });

  it('updateShortcut overrides a single binding', () => {
    const s = makeStore();
    s.getState().updateShortcut('resetTurn', 'F5');
    expect(s.getState().settings.shortcuts.resetTurn).toBe('F5');
  });

  it('updateShortcut to null disables a binding', () => {
    const s = makeStore();
    s.getState().updateShortcut('resetTurn', null);
    expect(s.getState().settings.shortcuts.resetTurn).toBeNull();
  });

  it('resetShortcutsToDefault restores all bindings', () => {
    const s = makeStore();
    s.getState().updateShortcut('resetTurn', 'F5');
    s.getState().resetShortcutsToDefault();
    expect(s.getState().settings.shortcuts).toEqual(DEFAULT_SHORTCUTS);
  });
});
```

- [ ] **Step 2: Verify fail**

Run: `npm test -- tests/state/settingsSlice.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/state/slices/settingsSlice.ts`:

```ts
import type { StateCreator } from 'zustand';
import type { AppMode } from '../../core/types';

export type ShortcutAction =
  | 'resetTurn'
  | 'toggleMode'
  | 'swapPositions'
  | 'cycleHpRangeDown'
  | 'incrementMeleeHits'
  | 'decrementMeleeHits';

export type ShortcutBindings = Record<ShortcutAction, string | null>;

export const DEFAULT_SHORTCUTS: ShortcutBindings = {
  resetTurn: 'CmdOrCtrl+R',
  toggleMode: 'CmdOrCtrl+E',
  swapPositions: 'CmdOrCtrl+S',
  cycleHpRangeDown: 'CmdOrCtrl+Down',
  incrementMeleeHits: 'CmdOrCtrl+H',
  decrementMeleeHits: 'CmdOrCtrl+Shift+H',
};

export type AppSettings = {
  shortcuts: ShortcutBindings;
  alwaysOnTop: boolean;
};

export type SettingsSlice = {
  mode: AppMode;
  settings: AppSettings;
  setMode: (mode: AppMode) => void;
  updateShortcut: (action: ShortcutAction, binding: string | null) => void;
  resetShortcutsToDefault: () => void;
  setAlwaysOnTop: (v: boolean) => void;
};

export const createSettingsSlice: StateCreator<SettingsSlice, [], [], SettingsSlice> = (set) => ({
  mode: 'combat',
  settings: { shortcuts: { ...DEFAULT_SHORTCUTS }, alwaysOnTop: false },
  setMode: (mode) => set({ mode }),
  updateShortcut: (action, binding) =>
    set((s) => ({
      settings: { ...s.settings, shortcuts: { ...s.settings.shortcuts, [action]: binding } },
    })),
  resetShortcutsToDefault: () =>
    set((s) => ({ settings: { ...s.settings, shortcuts: { ...DEFAULT_SHORTCUTS } } })),
  setAlwaysOnTop: (v) => set((s) => ({ settings: { ...s.settings, alwaysOnTop: v } })),
});
```

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/state/settingsSlice.test.ts`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/state/slices/settingsSlice.ts tests/state/settingsSlice.test.ts
git commit -m "feat(state): settings slice with mode, shortcuts, always-on-top"
```

---

### Task 19: Store composition + derived selectors

**Files:**
- Create: `src/state/store.ts`, `src/state/selectors.ts`

- [ ] **Step 1: Implement store**

Create `src/state/store.ts`:

```ts
import { create } from 'zustand';
import { createEntitySlice, type EntitySlice } from './slices/entitySlice';
import { createMapSlice, type MapSlice } from './slices/mapSlice';
import { createSettingsSlice, type SettingsSlice } from './slices/settingsSlice';
import { createTurnSlice, type TurnSlice } from './slices/turnSlice';

export type AppStore = MapSlice & EntitySlice & TurnSlice & SettingsSlice;

export const useAppStore = create<AppStore>()((...a) => ({
  ...createMapSlice(...a),
  ...createEntitySlice(...a),
  ...createTurnSlice(...a),
  ...createSettingsSlice(...a),
}));
```

- [ ] **Step 2: Implement derived selectors**

Create `src/state/selectors.ts`:

```ts
import { computeConfusion } from '../core/confusion';
import { forwardRedirection } from '../core/redirection';
import { reverseSolve } from '../core/solver';
import type { Cell, Entity, RedirectionResult, Rotation } from '../core/types';
import type { AppStore } from './store';

export const selectMe = (s: AppStore): Entity | undefined =>
  s.entities.find((e) => e.kind === 'me');

export const selectMeStart = (s: AppStore): Entity | undefined =>
  s.entities.find((e) => e.kind === 'meStart');

export const selectHarebourg = (s: AppStore): Entity | undefined =>
  s.entities.find((e) => e.kind === 'harebourg');

export const selectConfusion = (s: AppStore): Rotation => computeConfusion(s.turn);

export function selectReverseResult(s: AppStore): RedirectionResult | null {
  const me = selectMe(s);
  const target = s.turn.targetCell;
  if (!me || !target) return null;
  return reverseSolve(me.cell, target, selectConfusion(s), s.map);
}

export function selectHoverForward(hover: Cell | null) {
  return (s: AppStore): RedirectionResult | null => {
    const me = selectMe(s);
    if (!me || !hover) return null;
    return forwardRedirection(me.cell, hover, selectConfusion(s), s.map);
  };
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add src/state/store.ts src/state/selectors.ts
git commit -m "feat(state): compose store and add derived selectors"
```

---

## Phase 5 — UI

### Task 20: Theme tokens

**Files:**
- Create: `src/ui/theme.ts`, `src/index.css` (replace)

- [ ] **Step 1: Theme file**

Create `src/ui/theme.ts`:

```ts
export const theme = {
  bg: '#0e1116',
  panel: '#161b22',
  panelBorder: '#30363d',
  text: '#c9d1d9',
  textDim: '#8b949e',
  accent: '#58a6ff',
  floor: '#1e2530',
  floorEdge: '#2b3542',
  hole: '#0b0d11',
  obstacle: '#3d2a2a',
  me: '#58a6ff',
  meStart: '#9aa6b2',
  harebourg: '#d1656b',
  ally: '#56d364',
  neutral: '#d29922',
  target: '#ff4d4f',
  greenAim: '#3fb950',
  losWarn: '#e0a93b',
} as const;

export type Theme = typeof theme;
```

- [ ] **Step 2: Base CSS**

Replace `src/index.css`:

```css
:root {
  color-scheme: dark;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 14px;
}
* { box-sizing: border-box; }
html, body, #root { height: 100%; margin: 0; }
body { background: #0e1116; color: #c9d1d9; overflow: hidden; }
button { font: inherit; color: inherit; background: transparent; border: 1px solid #30363d; padding: 6px 10px; border-radius: 6px; cursor: pointer; }
button:hover { border-color: #58a6ff; }
button[aria-pressed="true"] { background: #1f6feb; border-color: #1f6feb; color: white; }
```

- [ ] **Step 3: Import CSS in `main.tsx`**

Ensure `src/main.tsx` imports `./index.css`.

- [ ] **Step 4: Commit**

```bash
git add src/ui/theme.ts src/index.css
git commit -m "feat(ui): dark theme tokens and base CSS"
```

---

### Task 21: Iso projection

**Files:**
- Create: `src/ui/grid/iso.ts`, `tests/ui/iso.test.ts`

- [ ] **Step 1: Failing tests**

Create `tests/ui/iso.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { cartesianToIso, isoToCartesian, TILE_W, TILE_H } from '../../src/ui/grid/iso';

describe('iso projection', () => {
  it('origin maps to (0, 0)', () => {
    expect(cartesianToIso({ x: 0, y: 0 })).toEqual({ px: 0, py: 0 });
  });

  it('round-trips', () => {
    const c = { x: 4, y: 3 };
    const p = cartesianToIso(c);
    expect(isoToCartesian(p.px, p.py)).toEqual(c);
  });

  it('moving +x goes right and down by half tile', () => {
    const a = cartesianToIso({ x: 0, y: 0 });
    const b = cartesianToIso({ x: 1, y: 0 });
    expect(b.px - a.px).toBe(TILE_W / 2);
    expect(b.py - a.py).toBe(TILE_H / 2);
  });
});
```

Update `vitest.config.ts` include glob if needed — already `tests/**/*.test.ts`, covers `tests/ui/`.

Create folder `tests/ui/` if missing.

- [ ] **Step 2: Verify fail**

Run: `npm test -- tests/ui/iso.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/ui/grid/iso.ts`:

```ts
import type { Cell } from '../../core/types';

export const TILE_W = 64;
export const TILE_H = 32;

export function cartesianToIso(c: Cell): { px: number; py: number } {
  return {
    px: (c.x - c.y) * (TILE_W / 2),
    py: (c.x + c.y) * (TILE_H / 2),
  };
}

export function isoToCartesian(px: number, py: number): Cell {
  const fx = px / (TILE_W / 2);
  const fy = py / (TILE_H / 2);
  const x = Math.round((fx + fy) / 2);
  const y = Math.round((fy - fx) / 2);
  return { x, y };
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/ui/iso.test.ts`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/ui/grid/iso.ts tests/ui/iso.test.ts
git commit -m "feat(ui): iso projection (cartesian <-> screen)"
```

---

### Task 22: GridView skeleton + MapLayer + Cell

**Files:**
- Create: `src/ui/grid/GridView.tsx`, `src/ui/grid/MapLayer.tsx`, `src/ui/grid/Cell.tsx`

- [ ] **Step 1: Implement `Cell.tsx`**

Create `src/ui/grid/Cell.tsx`:

```tsx
import { memo } from 'react';
import type { CellKind } from '../../core/types';
import { theme } from '../theme';
import { TILE_H, TILE_W } from './iso';

type Props = {
  px: number;
  py: number;
  kind: CellKind;
  onClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onMouseEnter?: () => void;
};

function fillFor(kind: CellKind): string {
  switch (kind) {
    case 'floor': return theme.floor;
    case 'hole': return theme.hole;
    case 'obstacle': return theme.obstacle;
  }
}

function CellImpl({ px, py, kind, onClick, onContextMenu, onMouseEnter }: Props) {
  const hx = TILE_W / 2;
  const hy = TILE_H / 2;
  const points = `${px},${py - hy} ${px + hx},${py} ${px},${py + hy} ${px - hx},${py}`;
  const blocking = kind !== 'floor';
  return (
    <polygon
      points={points}
      fill={fillFor(kind)}
      stroke={theme.floorEdge}
      strokeWidth={1}
      style={{ cursor: blocking ? 'not-allowed' : 'pointer' }}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onMouseEnter={onMouseEnter}
    />
  );
}

export const Cell = memo(CellImpl);
```

- [ ] **Step 2: Implement `MapLayer.tsx`**

Create `src/ui/grid/MapLayer.tsx`:

```tsx
import { useAppStore } from '../../state/store';
import { Cell } from './Cell';
import { cartesianToIso } from './iso';

type Props = {
  onCellClick: (cell: { x: number; y: number }) => void;
  onCellRightClick: (cell: { x: number; y: number }) => void;
  onCellHover: (cell: { x: number; y: number }) => void;
};

export function MapLayer({ onCellClick, onCellRightClick, onCellHover }: Props) {
  const map = useAppStore((s) => s.map);
  const nodes = [];
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const { px, py } = cartesianToIso({ x, y });
      nodes.push(
        <Cell
          key={`${x},${y}`}
          px={px}
          py={py}
          kind={map.cells[y][x]}
          onClick={() => onCellClick({ x, y })}
          onContextMenu={(e) => {
            e.preventDefault();
            onCellRightClick({ x, y });
          }}
          onMouseEnter={() => onCellHover({ x, y })}
        />,
      );
    }
  }
  return <g>{nodes}</g>;
}
```

- [ ] **Step 3: Implement `GridView.tsx`**

Create `src/ui/grid/GridView.tsx`:

```tsx
import { useMemo, useState } from 'react';
import { useAppStore } from '../../state/store';
import type { Cell } from '../../core/types';
import { MapLayer } from './MapLayer';
import { cartesianToIso, TILE_H, TILE_W } from './iso';

export function GridView() {
  const map = useAppStore((s) => s.map);
  const mode = useAppStore((s) => s.mode);
  const placeEntity = useAppStore((s) => s.placeEntity);
  const setTargetCell = useAppStore((s) => s.setTargetCell);
  const setCellKind = useAppStore((s) => s.setCellKind);
  const [hover, setHover] = useState<Cell | null>(null);

  const { viewBox, width, height } = useMemo(() => {
    const corners = [
      cartesianToIso({ x: 0, y: 0 }),
      cartesianToIso({ x: map.width - 1, y: 0 }),
      cartesianToIso({ x: 0, y: map.height - 1 }),
      cartesianToIso({ x: map.width - 1, y: map.height - 1 }),
    ];
    const minX = Math.min(...corners.map((c) => c.px)) - TILE_W;
    const maxX = Math.max(...corners.map((c) => c.px)) + TILE_W;
    const minY = Math.min(...corners.map((c) => c.py)) - TILE_H;
    const maxY = Math.max(...corners.map((c) => c.py)) + TILE_H;
    return {
      viewBox: `${minX} ${minY} ${maxX - minX} ${maxY - minY}`,
      width: maxX - minX,
      height: maxY - minY,
    };
  }, [map.width, map.height]);

  const onCellClick = (cell: Cell) => {
    if (mode === 'edit') {
      const current = map.cells[cell.y][cell.x];
      setCellKind(cell, current === 'obstacle' ? 'floor' : 'obstacle');
    } else {
      placeEntity('me', cell);
    }
  };
  const onCellRightClick = (cell: Cell) => {
    if (mode === 'edit') {
      const current = map.cells[cell.y][cell.x];
      setCellKind(cell, current === 'hole' ? 'floor' : 'hole');
    } else {
      setTargetCell(cell);
    }
  };

  return (
    <svg viewBox={viewBox} width="100%" height="100%" style={{ display: 'block' }}>
      <MapLayer
        onCellClick={onCellClick}
        onCellRightClick={onCellRightClick}
        onCellHover={setHover}
      />
      <title>{hover ? `(${hover.x}, ${hover.y})` : ''}</title>
    </svg>
  );
}
```

- [ ] **Step 4: Hook into `App.tsx`**

Replace `src/App.tsx`:

```tsx
import { GridView } from './ui/grid/GridView';

export default function App() {
  return (
    <div style={{ height: '100vh', display: 'flex' }}>
      <div style={{ flex: 1 }}>
        <GridView />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Manual check**

Run: `npm run dev`, confirm an iso grid renders with obstacle borders and a few holes. Click cycles floor/obstacle in combat mode (placing `me`). `Ctrl+C`.

- [ ] **Step 6: Commit**

```bash
git add src/ui/grid src/App.tsx
git commit -m "feat(ui): SVG iso grid with MapLayer and memoized Cell"
```

---

### Task 23: EntityLayer with Shift+click for meStart

**Files:**
- Create: `src/ui/grid/EntityLayer.tsx`
- Modify: `src/ui/grid/GridView.tsx`

- [ ] **Step 1: Implement `EntityLayer.tsx`**

Create `src/ui/grid/EntityLayer.tsx`:

```tsx
import { memo } from 'react';
import type { Entity, EntityKind } from '../../core/types';
import { useAppStore } from '../../state/store';
import { theme } from '../theme';
import { cartesianToIso } from './iso';

function colorFor(kind: EntityKind): string {
  switch (kind) {
    case 'me': return theme.me;
    case 'meStart': return theme.meStart;
    case 'harebourg': return theme.harebourg;
    case 'ally': return theme.ally;
    case 'neutral': return theme.neutral;
  }
}

function labelFor(kind: EntityKind): string {
  switch (kind) {
    case 'me': return 'M';
    case 'meStart': return 'S';
    case 'harebourg': return 'H';
    case 'ally': return 'A';
    case 'neutral': return 'N';
  }
}

const Marker = memo(function Marker({ entity }: { entity: Entity }) {
  const { px, py } = cartesianToIso(entity.cell);
  const removeEntity = useAppStore((s) => s.removeEntity);
  return (
    <g
      onClick={(e) => {
        if (e.shiftKey) return;
        e.stopPropagation();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        removeEntity(entity.id);
      }}
      style={{ cursor: 'pointer' }}
    >
      <circle cx={px} cy={py - 6} r={10} fill={colorFor(entity.kind)} stroke="#000" strokeWidth={1} />
      <text x={px} y={py - 2} textAnchor="middle" fontSize={10} fontWeight={700} fill="#0e1116">
        {labelFor(entity.kind)}
      </text>
    </g>
  );
});

export function EntityLayer() {
  const entities = useAppStore((s) => s.entities);
  return (
    <g>
      {entities.map((e) => (
        <Marker key={e.id} entity={e} />
      ))}
    </g>
  );
}
```

- [ ] **Step 2: Modify `GridView.tsx` to include EntityLayer and Shift+click handling**

In `src/ui/grid/GridView.tsx`, add import:

```tsx
import { EntityLayer } from './EntityLayer';
```

Change `onCellClick` signature to accept the event and handle Shift:

```tsx
const onCellClick = (cell: Cell, e: React.MouseEvent) => {
  if (mode === 'edit') {
    const current = map.cells[cell.y][cell.x];
    setCellKind(cell, current === 'obstacle' ? 'floor' : 'obstacle');
  } else if (e.shiftKey) {
    placeEntity('meStart', cell);
  } else {
    placeEntity('me', cell);
  }
};
```

And update the `MapLayer` handler plumbing. In `MapLayer.tsx`, change `onCellClick` prop to `(cell, e) => void`:

```tsx
type Props = {
  onCellClick: (cell: { x: number; y: number }, e: React.MouseEvent) => void;
  onCellRightClick: (cell: { x: number; y: number }) => void;
  onCellHover: (cell: { x: number; y: number }) => void;
};
```

And pass `e` from `Cell` click: update `Cell.tsx` `onClick` to be `(e: React.MouseEvent) => void`:

```tsx
type Props = {
  px: number;
  py: number;
  kind: CellKind;
  onClick?: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onMouseEnter?: () => void;
};
```

And in `MapLayer.tsx` the cell `onClick={(e) => onCellClick({ x, y }, e)}`.

Finally, insert `<EntityLayer />` after `<MapLayer ... />` in `GridView.tsx`.

- [ ] **Step 3: Manual check**

Run `npm run dev`. Click places `M`, Shift+click places `S`, right-click sets the red target (no visual yet), double-click removes an entity. `Ctrl+C`.

- [ ] **Step 4: Commit**

```bash
git add src/ui/grid/EntityLayer.tsx src/ui/grid/GridView.tsx src/ui/grid/MapLayer.tsx src/ui/grid/Cell.tsx
git commit -m "feat(ui): entity layer with Shift+click for meStart, double-click to remove"
```

---

### Task 24: OverlayLayer (target, aim cell, LOS warning)

**Files:**
- Create: `src/ui/grid/OverlayLayer.tsx`
- Modify: `src/ui/grid/GridView.tsx`

- [ ] **Step 1: Implement `OverlayLayer.tsx`**

Create `src/ui/grid/OverlayLayer.tsx`:

```tsx
import { useAppStore } from '../../state/store';
import { selectReverseResult } from '../../state/selectors';
import { theme } from '../theme';
import { cartesianToIso, TILE_H, TILE_W } from './iso';

function diamond(px: number, py: number): string {
  const hx = TILE_W / 2;
  const hy = TILE_H / 2;
  return `${px},${py - hy} ${px + hx},${py} ${px},${py + hy} ${px - hx},${py}`;
}

export function OverlayLayer() {
  const target = useAppStore((s) => s.turn.targetCell);
  const result = useAppStore(selectReverseResult);

  return (
    <g pointerEvents="none">
      {target && (() => {
        const { px, py } = cartesianToIso(target);
        return (
          <polygon
            points={diamond(px, py)}
            fill={theme.target}
            fillOpacity={0.55}
            stroke={theme.target}
            strokeWidth={2}
          />
        );
      })()}
      {result?.kind === 'ok' && (() => {
        const { px, py } = cartesianToIso(result.aimCell);
        return (
          <polygon
            points={diamond(px, py)}
            fill={theme.greenAim}
            fillOpacity={0.6}
            stroke={theme.greenAim}
            strokeWidth={2}
          />
        );
      })()}
      {result?.kind === 'blocked' && result.reason === 'los' && (
        <text x={0} y={0} fill={theme.losWarn} fontSize={14}>LOS bloquée</text>
      )}
    </g>
  );
}
```

- [ ] **Step 2: Insert into `GridView.tsx`**

Add `<OverlayLayer />` after `<EntityLayer />`.

- [ ] **Step 3: Manual check**

Run `npm run dev`. Place `me` (left-click), right-click another cell to set target. A red diamond appears on target, a green diamond on the computed aim cell (when LOS allows). `Ctrl+C`.

- [ ] **Step 4: Commit**

```bash
git add src/ui/grid/OverlayLayer.tsx src/ui/grid/GridView.tsx
git commit -m "feat(ui): overlay with target, computed aim cell, LOS warning"
```

---

### Task 25: Left panel (HP range, melee hits, confusion display, mode toggle)

**Files:**
- Create: `src/ui/panels/HpRangeSelector.tsx`, `src/ui/panels/MeleeHitsCounter.tsx`, `src/ui/panels/ConfusionDisplay.tsx`, `src/ui/panels/ModeToggle.tsx`, `src/ui/panels/LeftPanel.tsx`

- [ ] **Step 1: HpRangeSelector**

Create `src/ui/panels/HpRangeSelector.tsx`:

```tsx
import type { HpRange } from '../../core/types';
import { useAppStore } from '../../state/store';

const RANGES: Array<{ value: HpRange; label: string }> = [
  { value: 'r100_90', label: '100–90%' },
  { value: 'r89_75', label: '89–75%' },
  { value: 'r74_45', label: '74–45%' },
  { value: 'r44_30', label: '44–30%' },
  { value: 'r29_0', label: '29–0%' },
];

export function HpRangeSelector() {
  const hpRange = useAppStore((s) => s.turn.hpRange);
  const setHpRange = useAppStore((s) => s.setHpRange);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 12, opacity: 0.7 }}>Plage PV</div>
      {RANGES.map((r) => (
        <button
          key={r.value}
          aria-pressed={hpRange === r.value}
          onClick={() => setHpRange(r.value)}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: MeleeHitsCounter**

Create `src/ui/panels/MeleeHitsCounter.tsx`:

```tsx
import { useAppStore } from '../../state/store';

export function MeleeHitsCounter() {
  const hits = useAppStore((s) => s.turn.meleeHits);
  const setMeleeHits = useAppStore((s) => s.setMeleeHits);
  return (
    <div>
      <div style={{ fontSize: 12, opacity: 0.7 }}>Coups CàC reçus</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={() => setMeleeHits(hits - 1)} disabled={hits <= 0}>−</button>
        <span style={{ minWidth: 24, textAlign: 'center' }}>{hits}</span>
        <button onClick={() => setMeleeHits(hits + 1)} disabled={hits >= 10}>+</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: ConfusionDisplay**

Create `src/ui/panels/ConfusionDisplay.tsx`:

```tsx
import { useAppStore } from '../../state/store';
import { selectConfusion } from '../../state/selectors';

export function ConfusionDisplay() {
  const r = useAppStore(selectConfusion);
  const arrow = r.direction === 'cw' ? '⟳' : '⟲';
  return (
    <div>
      <div style={{ fontSize: 12, opacity: 0.7 }}>Confusion</div>
      <div style={{ fontSize: 24 }}>{r.degrees}° {arrow}</div>
    </div>
  );
}
```

- [ ] **Step 4: ModeToggle**

Create `src/ui/panels/ModeToggle.tsx`:

```tsx
import { useAppStore } from '../../state/store';

export function ModeToggle() {
  const mode = useAppStore((s) => s.mode);
  const setMode = useAppStore((s) => s.setMode);
  return (
    <button onClick={() => setMode(mode === 'combat' ? 'edit' : 'combat')}>
      Mode : {mode === 'combat' ? 'Combat' : 'Édition'}
    </button>
  );
}
```

- [ ] **Step 5: LeftPanel**

Create `src/ui/panels/LeftPanel.tsx`:

```tsx
import { ConfusionDisplay } from './ConfusionDisplay';
import { HpRangeSelector } from './HpRangeSelector';
import { MeleeHitsCounter } from './MeleeHitsCounter';
import { ModeToggle } from './ModeToggle';

export function LeftPanel() {
  return (
    <aside style={{ width: 220, padding: 12, borderRight: '1px solid #30363d', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <HpRangeSelector />
      <MeleeHitsCounter />
      <ConfusionDisplay />
      <ModeToggle />
    </aside>
  );
}
```

- [ ] **Step 6: Wire into App**

Modify `src/App.tsx`:

```tsx
import { GridView } from './ui/grid/GridView';
import { LeftPanel } from './ui/panels/LeftPanel';

export default function App() {
  return (
    <div style={{ height: '100vh', display: 'flex' }}>
      <LeftPanel />
      <div style={{ flex: 1 }}>
        <GridView />
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Manual check**

Run `npm run dev`. Left panel renders; clicking HP ranges updates confusion display; +/- increments melee hits; mode toggle switches to Edit mode and click toggles obstacles. `Ctrl+C`.

- [ ] **Step 8: Commit**

```bash
git add src/ui/panels src/App.tsx
git commit -m "feat(ui): left panel (hp range, melee hits, confusion, mode toggle)"
```

---

### Task 26: Right panel (entity palette, reset, legend)

**Files:**
- Create: `src/ui/panels/EntityPalette.tsx`, `src/ui/panels/RightPanel.tsx`

- [ ] **Step 1: EntityPalette**

Create `src/ui/panels/EntityPalette.tsx`:

```tsx
import { useState } from 'react';
import type { EntityKind } from '../../core/types';

type Props = {
  selected: EntityKind;
  onSelect: (kind: EntityKind) => void;
};

const PALETTE: Array<{ kind: EntityKind; label: string }> = [
  { kind: 'harebourg', label: 'Comte Harebourg' },
  { kind: 'ally', label: 'Allié' },
  { kind: 'neutral', label: 'Neutre' },
];

export function EntityPalette({ selected, onSelect }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 12, opacity: 0.7 }}>Placer (clic milieu)</div>
      {PALETTE.map((p) => (
        <button
          key={p.kind}
          aria-pressed={selected === p.kind}
          onClick={() => onSelect(p.kind)}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
```

Note: to keep v1 simple, middle-click places the currently selected palette kind. Update `GridView.tsx` to support it.

- [ ] **Step 2: Add middle-click handler**

In `src/ui/grid/GridView.tsx`:

1. Add state: `const [paletteKind, setPaletteKind] = useState<EntityKind>('harebourg');` (import `useState`, `EntityKind`).
2. Accept `paletteKind` as a prop (or move state to App level — move to App level).

Refactor: lift palette state to `App.tsx` and pass down.

Modify `src/App.tsx`:

```tsx
import { useState } from 'react';
import type { EntityKind } from './core/types';
import { GridView } from './ui/grid/GridView';
import { LeftPanel } from './ui/panels/LeftPanel';
import { RightPanel } from './ui/panels/RightPanel';

export default function App() {
  const [paletteKind, setPaletteKind] = useState<EntityKind>('harebourg');
  return (
    <div style={{ height: '100vh', display: 'flex' }}>
      <LeftPanel />
      <div style={{ flex: 1 }}>
        <GridView paletteKind={paletteKind} />
      </div>
      <RightPanel paletteKind={paletteKind} onPaletteChange={setPaletteKind} />
    </div>
  );
}
```

Update `GridView.tsx` to accept `paletteKind` prop and add a middle-click handler on the SVG root that places `paletteKind` at the hovered cell:

```tsx
type Props = { paletteKind: EntityKind };

export function GridView({ paletteKind }: Props) {
  // ... existing ...
  const onCellMiddleClick = (cell: Cell) => {
    placeEntity(paletteKind, cell);
  };
  // pass to MapLayer as onCellMiddleClick, then in MapLayer forward onMouseDown with button===1
}
```

Add to `MapLayer.tsx` `Props`: `onCellMiddleClick: (cell: { x: number; y: number }) => void;` and on each Cell, pass `onMouseDown={(e) => { if (e.button === 1) { e.preventDefault(); onCellMiddleClick({ x, y }); } }}`.

Update `Cell.tsx` to accept `onMouseDown?: (e: React.MouseEvent) => void;` and forward it.

- [ ] **Step 3: RightPanel**

Create `src/ui/panels/RightPanel.tsx`:

```tsx
import type { EntityKind } from '../../core/types';
import { useAppStore } from '../../state/store';
import { EntityPalette } from './EntityPalette';

type Props = {
  paletteKind: EntityKind;
  onPaletteChange: (k: EntityKind) => void;
};

export function RightPanel({ paletteKind, onPaletteChange }: Props) {
  const resetTurn = useAppStore((s) => s.resetTurn);
  const resetMapToDefault = useAppStore((s) => s.resetMapToDefault);
  const mode = useAppStore((s) => s.mode);
  return (
    <aside style={{ width: 220, padding: 12, borderLeft: '1px solid #30363d', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {mode === 'combat' ? (
        <>
          <EntityPalette selected={paletteKind} onSelect={onPaletteChange} />
          <button onClick={resetTurn}>Reset tour</button>
          <div style={{ fontSize: 11, opacity: 0.7, lineHeight: 1.5 }}>
            Clic gauche : moi (tir)<br />
            Shift+clic : début de tour<br />
            Clic droit : cible<br />
            Clic milieu : entité sélectionnée<br />
            Double-clic entité : supprimer
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 12, opacity: 0.7, lineHeight: 1.5 }}>
            Mode édition :<br />
            Clic gauche : obstacle on/off<br />
            Clic droit : trou on/off
          </div>
          <button onClick={resetMapToDefault}>Réinitialiser la map</button>
        </>
      )}
    </aside>
  );
}
```

- [ ] **Step 4: Manual check**

Run `npm run dev`. Right panel renders; select palette kind, middle-click places it; reset tour clears target; edit mode shows editor legend; reset map restores preset. `Ctrl+C`.

- [ ] **Step 5: Commit**

```bash
git add src/ui/panels src/ui/grid src/App.tsx
git commit -m "feat(ui): right panel with entity palette, reset buttons, and legend"
```

---

### Task 27: AppShell wrapper + window title

**Files:**
- Create: `src/ui/app/AppShell.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: AppShell**

Create `src/ui/app/AppShell.tsx`:

```tsx
import { useState } from 'react';
import type { EntityKind } from '../../core/types';
import { GridView } from '../grid/GridView';
import { LeftPanel } from '../panels/LeftPanel';
import { RightPanel } from '../panels/RightPanel';

export function AppShell() {
  const [paletteKind, setPaletteKind] = useState<EntityKind>('harebourg');
  return (
    <div style={{ height: '100vh', display: 'flex' }}>
      <LeftPanel />
      <div style={{ flex: 1, position: 'relative' }}>
        <GridView paletteKind={paletteKind} />
      </div>
      <RightPanel paletteKind={paletteKind} onPaletteChange={setPaletteKind} />
    </div>
  );
}
```

- [ ] **Step 2: Replace `App.tsx`**

```tsx
import { AppShell } from './ui/app/AppShell';

export default function App() {
  return <AppShell />;
}
```

- [ ] **Step 3: Manual check**

Run `npm run dev`. Same layout, cleaner entry point. `Ctrl+C`.

- [ ] **Step 4: Commit**

```bash
git add src/ui/app/AppShell.tsx src/App.tsx
git commit -m "refactor(ui): extract AppShell"
```

---

## Phase 6 — Services and Tauri integration

### Task 28: Tauri plugins (fs + global-shortcut)

**Files:**
- Modify: `src-tauri/Cargo.toml`, `src-tauri/src/lib.rs` (or `main.rs`), `src-tauri/capabilities/default.json`

- [ ] **Step 1: Add Rust crates**

In `src-tauri/Cargo.toml`, under `[dependencies]`:

```toml
tauri-plugin-fs = "2"
tauri-plugin-global-shortcut = "2"
```

- [ ] **Step 2: Register plugins**

Open `src-tauri/src/lib.rs` (Tauri 2 default) and add:

```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 3: Update capabilities**

Open `src-tauri/capabilities/default.json` and add permissions inside `"permissions"`:

```json
"fs:allow-app-write",
"fs:allow-app-read",
"fs:allow-mkdir",
"global-shortcut:allow-register",
"global-shortcut:allow-unregister",
"global-shortcut:allow-is-registered"
```

- [ ] **Step 4: Install JS bindings**

Run: `npm install @tauri-apps/plugin-fs @tauri-apps/plugin-global-shortcut`

- [ ] **Step 5: Build check**

Run: `npm run tauri:dev`

Expected: window opens, no runtime errors. Close.

- [ ] **Step 6: Commit**

```bash
git add src-tauri package.json package-lock.json
git commit -m "chore(tauri): add fs and global-shortcut plugins"
```

---

### Task 29: Persistence service

**Files:**
- Create: `src/services/persistence.ts`, `src/services/persistence.init.ts`
- Modify: `src/main.tsx`

- [ ] **Step 1: Implement `persistence.ts`**

Create `src/services/persistence.ts`:

```ts
import { BaseDirectory, exists, mkdir, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import type { CellKind } from '../core/types';
import type { AppSettings } from '../state/slices/settingsSlice';

const DIR = 'harebourg-helper';
const SETTINGS_FILE = `${DIR}/settings.json`;
const MAP_DIFF_FILE = `${DIR}/custom-maps.json`;

export type MapDiff = {
  mapId: string;
  changes: Array<{ x: number; y: number; kind: CellKind }>;
};

async function ensureDir() {
  const ok = await exists(DIR, { baseDir: BaseDirectory.AppConfig });
  if (!ok) await mkdir(DIR, { baseDir: BaseDirectory.AppConfig, recursive: true });
}

export async function loadSettings(): Promise<AppSettings | null> {
  try {
    const raw = await readTextFile(SETTINGS_FILE, { baseDir: BaseDirectory.AppConfig });
    return JSON.parse(raw) as AppSettings;
  } catch {
    return null;
  }
}

export async function saveSettings(s: AppSettings): Promise<void> {
  await ensureDir();
  await writeTextFile(SETTINGS_FILE, JSON.stringify(s, null, 2), { baseDir: BaseDirectory.AppConfig });
}

export async function loadMapDiff(): Promise<MapDiff | null> {
  try {
    const raw = await readTextFile(MAP_DIFF_FILE, { baseDir: BaseDirectory.AppConfig });
    return JSON.parse(raw) as MapDiff;
  } catch {
    return null;
  }
}

export async function saveMapDiff(d: MapDiff): Promise<void> {
  await ensureDir();
  await writeTextFile(MAP_DIFF_FILE, JSON.stringify(d, null, 2), { baseDir: BaseDirectory.AppConfig });
}
```

- [ ] **Step 2: Implement `persistence.init.ts` with debounced save**

Create `src/services/persistence.init.ts`:

```ts
import { HAREBOURG_MAP } from '../data/harebourg-map';
import { useAppStore } from '../state/store';
import { loadMapDiff, loadSettings, saveMapDiff, saveSettings } from './persistence';

function debounce<T extends (...args: never[]) => unknown>(fn: T, ms: number): T {
  let t: ReturnType<typeof setTimeout> | null = null;
  return ((...args: Parameters<T>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  }) as T;
}

function diffFromMap(current: typeof HAREBOURG_MAP) {
  const changes: Array<{ x: number; y: number; kind: (typeof HAREBOURG_MAP)['cells'][number][number] }> = [];
  for (let y = 0; y < current.height; y++) {
    for (let x = 0; x < current.width; x++) {
      if (current.cells[y][x] !== HAREBOURG_MAP.cells[y][x]) {
        changes.push({ x, y, kind: current.cells[y][x] });
      }
    }
  }
  return { mapId: current.id, changes };
}

export async function hydrateFromDisk() {
  const [settings, diff] = await Promise.all([loadSettings(), loadMapDiff()]);
  useAppStore.setState((s) => ({
    settings: settings ?? s.settings,
  }));
  if (diff && diff.mapId === HAREBOURG_MAP.id) {
    const setCellKind = useAppStore.getState().setCellKind;
    for (const c of diff.changes) setCellKind({ x: c.x, y: c.y }, c.kind);
  }
}

export function installAutoSave() {
  const save = debounce(() => {
    const st = useAppStore.getState();
    void saveSettings(st.settings);
    void saveMapDiff(diffFromMap(st.map));
  }, 500);

  useAppStore.subscribe((state, prev) => {
    if (state.settings !== prev.settings || state.map !== prev.map) save();
  });
}
```

- [ ] **Step 3: Wire into `main.tsx`**

Modify `src/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { hydrateFromDisk, installAutoSave } from './services/persistence.init';

async function bootstrap() {
  try {
    await hydrateFromDisk();
  } catch (e) {
    console.warn('hydration failed', e);
  }
  installAutoSave();

  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

void bootstrap();
```

- [ ] **Step 4: Manual check (Tauri only — fs plugin requires Tauri runtime)**

Run: `npm run tauri:dev`

- Switch to edit mode, toggle a few cells.
- Close window.
- Relaunch `npm run tauri:dev`.
- Verify the toggled cells are restored.

- [ ] **Step 5: Commit**

```bash
git add src/services/persistence.ts src/services/persistence.init.ts src/main.tsx
git commit -m "feat(services): persist settings and map diff to AppConfig"
```

---

### Task 30: Global shortcuts service

**Files:**
- Create: `src/services/shortcuts.ts`, `src/services/shortcuts.init.ts`
- Modify: `src/main.tsx`

- [ ] **Step 1: Implement `shortcuts.ts`**

Create `src/services/shortcuts.ts`:

```ts
import {
  isRegistered,
  register,
  unregister,
} from '@tauri-apps/plugin-global-shortcut';
import type { ShortcutAction } from '../state/slices/settingsSlice';
import { useAppStore } from '../state/store';

const HP_ORDER = ['r100_90', 'r89_75', 'r74_45', 'r44_30', 'r29_0'] as const;

const HANDLERS: Record<ShortcutAction, () => void> = {
  resetTurn: () => useAppStore.getState().resetTurn(),
  toggleMode: () => {
    const s = useAppStore.getState();
    s.setMode(s.mode === 'combat' ? 'edit' : 'combat');
  },
  swapPositions: () => {
    const s = useAppStore.getState();
    const me = s.entities.find((e) => e.kind === 'me');
    const meStart = s.entities.find((e) => e.kind === 'meStart');
    if (!me || !meStart) return;
    s.removeEntity(me.id);
    s.removeEntity(meStart.id);
    s.placeEntity('me', meStart.cell);
    s.placeEntity('meStart', me.cell);
  },
  cycleHpRangeDown: () => {
    const s = useAppStore.getState();
    const idx = HP_ORDER.indexOf(s.turn.hpRange);
    const next = HP_ORDER[(idx + 1) % HP_ORDER.length];
    s.setHpRange(next);
  },
  incrementMeleeHits: () => {
    const s = useAppStore.getState();
    s.setMeleeHits(s.turn.meleeHits + 1);
  },
  decrementMeleeHits: () => {
    const s = useAppStore.getState();
    s.setMeleeHits(s.turn.meleeHits - 1);
  },
};

const registered = new Map<ShortcutAction, string>();

export async function bindAll() {
  const bindings = useAppStore.getState().settings.shortcuts;
  for (const action of Object.keys(HANDLERS) as ShortcutAction[]) {
    const key = bindings[action];
    if (key) await bindOne(action, key);
  }
}

export async function rebind(action: ShortcutAction, key: string | null) {
  const prev = registered.get(action);
  if (prev) {
    try { await unregister(prev); } catch { /* noop */ }
    registered.delete(action);
  }
  if (key) await bindOne(action, key);
}

async function bindOne(action: ShortcutAction, key: string) {
  try {
    if (await isRegistered(key)) await unregister(key);
    await register(key, () => HANDLERS[action]());
    registered.set(action, key);
  } catch (e) {
    console.warn('failed to bind', action, key, e);
  }
}
```

- [ ] **Step 2: `shortcuts.init.ts`**

Create `src/services/shortcuts.init.ts`:

```ts
import type { ShortcutAction, ShortcutBindings } from '../state/slices/settingsSlice';
import { useAppStore } from '../state/store';
import { bindAll, rebind } from './shortcuts';

export async function installShortcuts() {
  await bindAll();

  let previous: ShortcutBindings = { ...useAppStore.getState().settings.shortcuts };
  useAppStore.subscribe(async (state) => {
    const current = state.settings.shortcuts;
    if (current === previous) return;
    for (const action of Object.keys(current) as ShortcutAction[]) {
      if (current[action] !== previous[action]) {
        await rebind(action, current[action]);
      }
    }
    previous = { ...current };
  });
}
```

- [ ] **Step 3: Wire in `main.tsx`**

Add to `bootstrap()`:

```tsx
import { installShortcuts } from './services/shortcuts.init';
// ...
await installShortcuts();
```

(Place after `installAutoSave()`.)

- [ ] **Step 4: Manual check**

Run: `npm run tauri:dev`. Press `Cmd/Ctrl+R` → reset tour. Press `Cmd/Ctrl+E` → mode toggle. Press `Cmd/Ctrl+H` → hits +1. Close.

- [ ] **Step 5: Commit**

```bash
git add src/services/shortcuts.ts src/services/shortcuts.init.ts src/main.tsx
git commit -m "feat(services): global shortcuts with live rebind on settings change"
```

---

### Task 31: Settings modal for rebinding

**Files:**
- Create: `src/ui/app/SettingsModal.tsx`, `src/ui/app/SettingsButton.tsx`
- Modify: `src/ui/panels/RightPanel.tsx`, `src/ui/app/AppShell.tsx`

- [ ] **Step 1: SettingsModal**

Create `src/ui/app/SettingsModal.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { DEFAULT_SHORTCUTS, type ShortcutAction } from '../../state/slices/settingsSlice';
import { useAppStore } from '../../state/store';

type Props = { open: boolean; onClose: () => void };

const LABELS: Record<ShortcutAction, string> = {
  resetTurn: 'Reset tour',
  toggleMode: 'Toggle mode',
  swapPositions: 'Swap start ↔ attack',
  cycleHpRangeDown: 'Cycler plage PV ↓',
  incrementMeleeHits: '+1 coup CàC',
  decrementMeleeHits: '−1 coup CàC',
};

function formatEvent(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.metaKey || e.ctrlKey) parts.push('CmdOrCtrl');
  if (e.shiftKey) parts.push('Shift');
  if (e.altKey) parts.push('Alt');
  const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
  if (!['Meta', 'Control', 'Shift', 'Alt'].includes(e.key)) parts.push(key);
  return parts.join('+');
}

export function SettingsModal({ open, onClose }: Props) {
  const shortcuts = useAppStore((s) => s.settings.shortcuts);
  const updateShortcut = useAppStore((s) => s.updateShortcut);
  const resetShortcutsToDefault = useAppStore((s) => s.resetShortcutsToDefault);
  const [capturing, setCapturing] = useState<ShortcutAction | null>(null);

  useEffect(() => {
    if (!capturing) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      if (e.key === 'Escape') {
        setCapturing(null);
        return;
      }
      if (['Meta', 'Control', 'Shift', 'Alt'].includes(e.key)) return;
      updateShortcut(capturing, formatEvent(e));
      setCapturing(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [capturing, updateShortcut]);

  if (!open) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'grid', placeItems: 'center' }}>
      <div style={{ background: '#161b22', border: '1px solid #30363d', padding: 20, width: 400, borderRadius: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Raccourcis</h3>
          <button onClick={onClose}>Fermer</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
          {(Object.keys(DEFAULT_SHORTCUTS) as ShortcutAction[]).map((action) => (
            <div key={action} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{LABELS[action]}</span>
              <button onClick={() => setCapturing(action)} aria-pressed={capturing === action}>
                {capturing === action ? 'Appuie sur une touche…' : (shortcuts[action] ?? '—')}
              </button>
            </div>
          ))}
          <button onClick={resetShortcutsToDefault}>Réinitialiser aux défauts</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: SettingsButton**

Create `src/ui/app/SettingsButton.tsx`:

```tsx
import { useState } from 'react';
import { SettingsModal } from './SettingsModal';

export function SettingsButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Paramètres</button>
      <SettingsModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
```

- [ ] **Step 3: Wire into RightPanel**

In `src/ui/panels/RightPanel.tsx`, import `SettingsButton` and add it at the bottom of the panel:

```tsx
import { SettingsButton } from '../app/SettingsButton';
// ...
<SettingsButton />
```

- [ ] **Step 4: Manual check**

Run: `npm run tauri:dev`. Open settings, capture a new shortcut, verify it triggers the corresponding action. Reset to defaults. Close.

- [ ] **Step 5: Commit**

```bash
git add src/ui/app/SettingsModal.tsx src/ui/app/SettingsButton.tsx src/ui/panels/RightPanel.tsx
git commit -m "feat(ui): settings modal with live shortcut rebinding"
```

---

## Phase 7 — CI

### Task 32: GitHub Actions workflow

**Files:**
- Create: `.github/workflows/build.yml`

- [ ] **Step 1: Workflow**

Create `.github/workflows/build.yml`:

```yaml
name: Build

on:
  push:
    branches: [main]
  pull_request:

jobs:
  check:
    name: Lint, typecheck, test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run check
      - run: npm run typecheck
      - run: npm test

  build:
    name: Build (${{ matrix.os }})
    needs: check
    strategy:
      fail-fast: false
      matrix:
        os: [macos-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - uses: dtolnay/rust-toolchain@stable
      - uses: Swatinem/rust-cache@v2
        with:
          workspaces: src-tauri
      - run: npm ci
      - run: npm run tauri:build
      - uses: actions/upload-artifact@v4
        with:
          name: harebourg-helper-${{ matrix.os }}
          path: |
            src-tauri/target/release/bundle/**/*.dmg
            src-tauri/target/release/bundle/**/*.msi
            src-tauri/target/release/bundle/**/*.exe
          if-no-files-found: ignore
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/build.yml
git commit -m "ci: lint + typecheck + test + matrix build macOS & Windows"
```

- [ ] **Step 3: Push and verify**

Run: `git push`

Open the Actions tab on GitHub and confirm the workflow runs. Fix any failures before proceeding.

---

## Phase 8 — Final verification

### Task 33: Full regression check

- [ ] **Step 1: All automated checks pass locally**

Run each and confirm green:

```bash
npm run check
npm run typecheck
npm test
```

- [ ] **Step 2: Full Tauri build works locally**

Run: `npm run tauri:build`
Expected: bundle produced under `src-tauri/target/release/bundle/`.

- [ ] **Step 3: Manual acceptance checklist**

Launch `npm run tauri:dev` and verify:
- [ ] Grid renders with obstacles on the border and a few holes.
- [ ] Left-click places `me` on a floor cell; shift-left-click places `meStart`; right-click sets the red target.
- [ ] Green diamond appears on the computed aim cell for a valid target+me.
- [ ] Changing HP range updates the confusion display (rotation indicator).
- [ ] +/− changes melee hits and the confusion rotation updates.
- [ ] Line-of-sight warning appears for targets behind an obstacle.
- [ ] Mode toggle switches to Edit; left-click toggles obstacle, right-click toggles hole; reset map restores preset.
- [ ] Middle-click with a palette selection places that entity kind.
- [ ] Shortcuts work (Cmd/Ctrl+R, Cmd/Ctrl+E, Cmd/Ctrl+H, Cmd/Ctrl+Shift+H, Cmd/Ctrl+↓, Cmd/Ctrl+S).
- [ ] Settings modal rebinds a shortcut and the new binding works immediately.
- [ ] Close and reopen the app: edited map cells are preserved; shortcut rebindings preserved.

- [ ] **Step 4: Tag v1**

```bash
git tag v1.0.0
git push --tags
```

---

## Notes for the implementer

- **Map preset accuracy:** the provisional layout in `harebourg-map.ts` is a placeholder. Refinement is expected via in-app edit mode before release, with the diff persisted. If a screenshot-based refinement is possible earlier, update `harebourg-map.ts` directly and clear the diff file.
- **HP table:** `BASE_CONFUSION` in `src/core/confusion.ts` matches the spec table. Validate in-game before release; if wrong, adjust the two-line table — tests will pin down the new mapping.
- **Convention reminder:** all Core arithmetic uses `x` right, `y` down (screen convention). Do not introduce iso coordinates into Core code; the only place iso coordinates exist is `ui/grid/iso.ts`.
- **React memo:** `Cell` and `EntityMarker` are already memoized. If profiling shows a layer re-rendering more than needed, narrow the selector in `MapLayer`/`EntityLayer` or split cell state further — do not chase it on feel.
