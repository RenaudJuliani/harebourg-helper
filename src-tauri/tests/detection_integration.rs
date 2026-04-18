use serde::Deserialize;
use std::path::PathBuf;

#[derive(Deserialize)]
struct Expected {
    #[serde(default)]
    entities: Vec<ExpectedEntity>,
}

#[derive(Deserialize)]
struct ExpectedEntity {
    cell: ExpectedCell,
    team: String,
    kind: String,
}

#[derive(Deserialize)]
struct ExpectedCell {
    x: i32,
    y: i32,
}

fn load_image(name: &str) -> app_lib::capture::CapturedImage {
    let path: PathBuf = ["tests", "fixtures", "harebourg", name].iter().collect();
    let img = image::open(&path).expect("open fixture").to_rgba8();
    let (w, h) = img.dimensions();
    app_lib::capture::CapturedImage {
        width: w,
        height: h,
        pixels: img.into_raw(),
        scale_factor: 1.0,
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

    let mut matched = 0;
    for exp in &expected.entities {
        let hit = result.entities.iter().find(|d| {
            (d.cell.0 - exp.cell.x).abs() <= 1
                && (d.cell.1 - exp.cell.y).abs() <= 1
                && format!("{:?}", d.team).to_lowercase() == exp.team
                && format!("{:?}", d.kind).to_lowercase() == exp.kind
        });
        if hit.is_some() {
            matched += 1;
        } else {
            eprintln!(
                "{screen}: missing expected entity ({},{}) {} {}",
                exp.cell.x, exp.cell.y, exp.team, exp.kind
            );
        }
    }

    let expected_count = expected.entities.len();
    assert!(
        matched >= expected_count.saturating_sub(1),
        "{screen}: only {matched}/{expected_count} matched",
    );
}

#[test]
fn fixture_01() {
    run_fixture("screen-01.png", "expected-01.json");
}
#[test]
fn fixture_02() {
    run_fixture("screen-02.png", "expected-02.json");
}
#[test]
fn fixture_03() {
    run_fixture("screen-03.png", "expected-03.json");
}
#[test]
fn fixture_04() {
    run_fixture("screen-04.png", "expected-04.json");
}
#[test]
fn fixture_05() {
    run_fixture("screen-05.png", "expected-05.json");
}
#[test]
fn fixture_06() {
    run_fixture("screen-06.png", "expected-06.json");
}
#[test]
fn fixture_07() {
    run_fixture("screen-07.png", "expected-07.json");
}
