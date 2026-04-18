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
