// All values measured from src-tauri/assets/harebourg-ground-truth.png.
// These are first-cut approximations — they will be tuned empirically in Phase 3/4
// when running the pipeline against real fixtures.
//
// Note: the asset file has a .png extension but is actually a JPEG (FFD8 header).
// Dimensions confirmed from JFIF metadata: 1000 x 684.

pub const REF_IMAGE_WIDTH: u32 = 1000;
pub const REF_IMAGE_HEIGHT: u32 = 684;

// Bounding box of the playable oval/diamond area in pixel space.
// Excludes the snowy icy border ring, the purple sky, and the chimney decor.
// Left/right apexes measured at the widest horizontal extent of the brown tile grid;
// top/bottom apexes at the northernmost and southernmost tile rows.
// Approximation — will be tuned in Phase 3 against real game captures.
pub const REF_BBOX_MIN_X: f32 = 68.0;
pub const REF_BBOX_MIN_Y: f32 = 75.0;
pub const REF_BBOX_MAX_X: f32 = 932.0;
pub const REF_BBOX_MAX_Y: f32 = 615.0;

// Approximate pixel width of one iso-diamond tile (horizontal tip-to-tip).
// Measured by counting tiles across the widest row (~14 visible tiles spanning ~868 px).
// REF_TILE_H = REF_TILE_W / 2.0 per standard isometric convention.
pub const REF_TILE_W: f32 = 62.0;
pub const REF_TILE_H: f32 = 31.0; // = REF_TILE_W / 2.0

// Pixel center of grid cell (0, 0) — the top-left corner of the 20x20 grid.
// In the isometric projection this corresponds to the NORTH apex of the diamond
// (the highest, most centered point of the playable area).
// Approximation based on visual center of the topmost visible tile cluster.
pub const REF_ORIGIN_X: f32 = 500.0;
pub const REF_ORIGIN_Y: f32 = 75.0;

pub fn ref_bbox_width() -> f32 {
    REF_BBOX_MAX_X - REF_BBOX_MIN_X
}

pub fn ref_bbox_height() -> f32 {
    REF_BBOX_MAX_Y - REF_BBOX_MIN_Y
}

// HSV ranges for "playable tile" color in the GAME (not the simulator — the simulator is
// khaki/uniform; the game uses brown tile textures). Starting values; to be tuned.
pub const TILE_HSV_H_MIN: f32 = 15.0;
pub const TILE_HSV_H_MAX: f32 = 30.0;
pub const TILE_HSV_S_MIN: f32 = 0.25;
pub const TILE_HSV_V_MIN: f32 = 0.30;

// HSV ranges for entity ring markers.
pub const ORANGE_RING_H_MIN: f32 = 10.0;
pub const ORANGE_RING_H_MAX: f32 = 35.0;
pub const ORANGE_RING_S_MIN: f32 = 0.55;
pub const ORANGE_RING_V_MIN: f32 = 0.50;

pub const BLUE_RING_H_MIN: f32 = 195.0;
pub const BLUE_RING_H_MAX: f32 = 235.0;
pub const BLUE_RING_S_MIN: f32 = 0.45;
pub const BLUE_RING_V_MIN: f32 = 0.45;
