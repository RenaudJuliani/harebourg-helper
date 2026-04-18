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
    pub fn width(&self) -> u32 {
        self.max_x - self.min_x
    }
    pub fn height(&self) -> u32 {
        self.max_y - self.min_y
    }
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
            if !mask[i] {
                continue;
            }
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

    let mut bboxes: std::collections::HashMap<i32, Bbox> = std::collections::HashMap::new();
    let mut areas: std::collections::HashMap<i32, u32> = std::collections::HashMap::new();
    for y in 0..h {
        for x in 0..w {
            let i = y * w + x;
            if labels[i] == 0 {
                continue;
            }
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

    areas
        .into_iter()
        .max_by_key(|(_, a)| *a)
        .and_then(|(root, _)| bboxes.get(&root).copied())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn single_blob_bbox() {
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
        // small 2x2 blob in corner
        for y in 0..2 {
            for x in 0..2 {
                mask[y * 10 + x] = true;
            }
        }
        // larger 4x4 blob elsewhere
        for y in 5..9 {
            for x in 5..9 {
                mask[y * 10 + x] = true;
            }
        }
        let bbox = largest_blob_bbox(&mask, 10, 10).unwrap();
        assert_eq!(bbox.min_x, 5);
        assert_eq!(bbox.max_x, 8);
    }
}
