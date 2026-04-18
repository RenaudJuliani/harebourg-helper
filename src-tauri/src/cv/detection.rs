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
    HsvRange {
        h_min: ORANGE_RING_H_MIN,
        h_max: ORANGE_RING_H_MAX,
        s_min: ORANGE_RING_S_MIN,
        v_min: ORANGE_RING_V_MIN,
    }
}

fn blue_range() -> HsvRange {
    HsvRange {
        h_min: BLUE_RING_H_MIN,
        h_max: BLUE_RING_H_MAX,
        s_min: BLUE_RING_S_MIN,
        v_min: BLUE_RING_V_MIN,
    }
}

fn sample_window(image: &CapturedImage, cx: f32, cy: f32, half: f32) -> Vec<(u8, u8, u8)> {
    let x0 = (cx - half).max(0.0) as u32;
    let y0 = (cy - half).max(0.0) as u32;
    let x1 = (cx + half).min(image.width as f32 - 1.0) as u32;
    let y1 = (cy + half).min(image.height as f32 - 1.0) as u32;
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
    if pixels.is_empty() {
        return 0.0;
    }
    let count = pixels
        .iter()
        .filter(|(r, g, b)| range.contains(&rgb_to_hsv(*r, *g, *b)))
        .count();
    count as f32 / pixels.len() as f32
}

/// Classify the ring color at cell (x, y). Returns None if no ring detected.
pub fn classify_ring(
    image: &CapturedImage,
    t: &GridTransform,
    x: i32,
    y: i32,
) -> Option<(Team, f32)> {
    let (px, py) = t.cell_to_pixel(x, y);
    let sample_cy = py + t.tile_h * 0.1;
    let half = t.tile_w * 0.45;
    let pixels = sample_window(image, px, sample_cy, half);

    let orange = fraction_matching(&pixels, &orange_range());
    let blue = fraction_matching(&pixels, &blue_range());

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

#[cfg(test)]
mod tests {
    use super::*;

    fn make_image(width: u32, height: u32, fill: (u8, u8, u8)) -> CapturedImage {
        let mut pixels = Vec::with_capacity((width * height * 4) as usize);
        for _ in 0..(width * height) {
            pixels.extend_from_slice(&[fill.0, fill.1, fill.2, 255]);
        }
        CapturedImage {
            width,
            height,
            pixels,
            scale_factor: 1.0,
        }
    }

    fn stamp_ring(
        image: &mut CapturedImage,
        cx: i32,
        cy: i32,
        radius: i32,
        color: (u8, u8, u8),
    ) {
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

    // Ring is stamped at the sample center (px, py + tile_h*0.1) = (100, 103)
    // so its pixels fall entirely within the 55x55 sampling window.
    #[test]
    fn detects_orange_ring_as_enemy() {
        let mut img = make_image(200, 200, (100, 60, 40));
        stamp_ring(&mut img, 100, 103, 25, (255, 140, 30));
        let t = GridTransform {
            origin_x: 100.0,
            origin_y: 100.0,
            tile_w: 60.0,
            tile_h: 30.0,
        };
        let result = classify_ring(&img, &t, 0, 0);
        assert!(
            matches!(result, Some((Team::Enemy, c)) if c > 0.08),
            "got {:?}",
            result
        );
    }

    #[test]
    fn detects_blue_ring_as_ally() {
        let mut img = make_image(200, 200, (100, 60, 40));
        stamp_ring(&mut img, 100, 103, 25, (40, 130, 220));
        let t = GridTransform {
            origin_x: 100.0,
            origin_y: 100.0,
            tile_w: 60.0,
            tile_h: 30.0,
        };
        let result = classify_ring(&img, &t, 0, 0);
        assert!(matches!(result, Some((Team::Ally, _))), "got {:?}", result);
    }
}
