use serde::Serialize;

#[derive(Debug, Serialize, Clone)]
#[serde(tag = "kind", content = "detail")]
pub enum CaptureError {
    WindowNotFound,
    WindowMinimized,
    PermissionDenied,
    CaptureFailed(String),
}

#[derive(Debug, Clone)]
pub struct CapturedImage {
    pub width: u32,
    pub height: u32,
    pub pixels: Vec<u8>, // RGBA row-major
    pub scale_factor: f32,
}

pub fn capture_dofus_window() -> Result<CapturedImage, CaptureError> {
    todo!("implemented in Task 1.3")
}
