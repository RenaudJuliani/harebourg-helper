use crate::capture::{capture_dofus_window, CaptureError, CapturedImage};
use crate::cv::calibration::{calibrate, CalibrationError};
use crate::cv::detection::{
    classify_ring, match_harebourg_at, DetectedEntity, DetectedKind, Team, HAREBOURG_THRESHOLD,
};
use crate::cv::map_data::PLAYABLE_CELLS;
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

/// Playable floor cells of the Harebourg arena (sourced from `map_data`).
pub fn playable_cells() -> &'static [(i32, i32)] {
    PLAYABLE_CELLS
}

pub fn detect() -> Result<DetectionResult, PipelineError> {
    let image = capture_dofus_window().map_err(PipelineError::Capture)?;
    detect_on_image(&image)
}

pub fn detect_on_image(image: &CapturedImage) -> Result<DetectionResult, PipelineError> {
    let transform = calibrate(image).map_err(PipelineError::Calibration)?;

    let mut entities = Vec::new();
    let warnings = Vec::new();

    for &(x, y) in playable_cells() {
        let Some((team, ring_quality)) = classify_ring(image, &transform, x, y) else {
            continue;
        };

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

        entities.push(DetectedEntity {
            cell: (x, y),
            team,
            kind,
            confidence,
        });
    }

    // At most one Harebourg: keep the highest-confidence match, demote others to Generic.
    if entities
        .iter()
        .filter(|e| matches!(e.kind, DetectedKind::Harebourg))
        .count()
        > 1
    {
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
