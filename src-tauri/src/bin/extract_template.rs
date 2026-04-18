// One-off tool to crop the Harebourg sprite from a fixture screenshot.
// Uses calibration to locate a target cell, then crops a rect sized to the tile.
//
// Usage: cargo run --bin extract_template [-- <x> <y>]
// Default target cell is (10, 1) — the top-center row of the arena where Harebourg
// typically stands in screen-02.png.

use app_lib::capture::CapturedImage;
use app_lib::cv::calibration::calibrate;
use std::path::PathBuf;

const DEFAULT_CELL: (i32, i32) = (10, 1);
const FIXTURE: &str = "tests/fixtures/harebourg/screen-02.png";
const OUTPUT: &str = "assets/harebourg-template.png";

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let (target_x, target_y) = if args.len() >= 3 {
        (
            args[1].parse::<i32>().expect("x must be int"),
            args[2].parse::<i32>().expect("y must be int"),
        )
    } else {
        DEFAULT_CELL
    };

    let fixture_path: PathBuf = FIXTURE.into();
    let dyn_img = image::open(&fixture_path).expect("open fixture");
    let rgba = dyn_img.to_rgba8();
    let (w, h) = rgba.dimensions();
    let captured = CapturedImage {
        width: w,
        height: h,
        pixels: rgba.into_raw(),
        scale_factor: 1.0,
    };

    let transform = calibrate(&captured).expect("calibrate fixture");
    let (cx, cy) = transform.cell_to_pixel(target_x, target_y);

    // Crop rectangle: 1.2 tile_w wide, 2.0 tile_h tall, bottom edge at the tile floor.
    let crop_w = (transform.tile_w * 1.2).round() as i64;
    let crop_h = (transform.tile_h * 2.0).round() as i64;
    let cx_i = cx.round() as i64;
    let cy_i = cy.round() as i64;

    let left = (cx_i - crop_w / 2).clamp(0, w as i64 - 1);
    let top = (cy_i - crop_h).clamp(0, h as i64 - 1);
    let right = (left + crop_w).clamp(0, w as i64);
    let bottom = (top + crop_h).clamp(0, h as i64);

    let crop_w_u = (right - left) as u32;
    let crop_h_u = (bottom - top) as u32;

    println!(
        "fixture: {FIXTURE} ({w}x{h}) cell ({target_x},{target_y}) -> center ({cx:.1},{cy:.1}) tile {}x{}",
        transform.tile_w.round() as i32,
        transform.tile_h.round() as i32,
    );
    println!("crop rect: left={left} top={top} width={crop_w_u} height={crop_h_u}");

    let template = image::imageops::crop_imm(&dyn_img, left as u32, top as u32, crop_w_u, crop_h_u)
        .to_image();
    let output_path: PathBuf = OUTPUT.into();
    template.save(&output_path).expect("save template");
    println!("saved: {}", output_path.display());
}
