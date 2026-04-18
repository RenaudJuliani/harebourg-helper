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

fn assert_reasonable(t: &app_lib::cv::calibration::GridTransform) {
    assert!(t.tile_w > 20.0 && t.tile_w < 200.0, "tile_w = {}", t.tile_w);
    assert!((t.tile_h - t.tile_w / 2.0).abs() < 0.01);
}

#[test]
fn calibrate_screen_01() {
    let img = load_fixture("screen-01.png");
    let t = app_lib::cv::calibration::calibrate(&img).expect("should calibrate");
    assert_reasonable(&t);
}

#[test]
fn calibrate_screen_02() {
    let img = load_fixture("screen-02.png");
    let t = app_lib::cv::calibration::calibrate(&img).expect("should calibrate");
    assert_reasonable(&t);
}

#[test]
fn calibrate_screen_03() {
    let img = load_fixture("screen-03.png");
    let t = app_lib::cv::calibration::calibrate(&img).expect("should calibrate");
    assert_reasonable(&t);
}

#[test]
fn calibrate_screen_04() {
    let img = load_fixture("screen-04.png");
    let t = app_lib::cv::calibration::calibrate(&img).expect("should calibrate");
    assert_reasonable(&t);
}

#[test]
fn calibrate_screen_05() {
    let img = load_fixture("screen-05.png");
    let t = app_lib::cv::calibration::calibrate(&img).expect("should calibrate");
    assert_reasonable(&t);
}

#[test]
fn calibrate_screen_06() {
    let img = load_fixture("screen-06.png");
    let t = app_lib::cv::calibration::calibrate(&img).expect("should calibrate");
    assert_reasonable(&t);
}

#[test]
fn calibrate_screen_07() {
    let img = load_fixture("screen-07.png");
    let t = app_lib::cv::calibration::calibrate(&img).expect("should calibrate");
    assert_reasonable(&t);
}
