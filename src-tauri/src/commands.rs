use crate::cv::pipeline::{detect, DetectionResult, PipelineError};

#[tauri::command]
pub async fn detect_entities() -> Result<DetectionResult, PipelineError> {
    tauri::async_runtime::spawn_blocking(detect)
        .await
        .unwrap_or_else(|e| {
            Err(PipelineError::Capture(
                crate::capture::CaptureError::CaptureFailed(format!("join: {e}")),
            ))
        })
}
