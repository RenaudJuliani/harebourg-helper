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
    let windows = xcap::Window::all()
        .map_err(|e| CaptureError::CaptureFailed(format!("xcap enumeration: {e}")))?;

    let dofus = windows
        .into_iter()
        .find(|w| {
            w.app_name()
                .ok()
                .map(|n| n.to_lowercase().contains("dofus"))
                .unwrap_or(false)
                || w.title()
                    .ok()
                    .map(|t| t.to_lowercase().contains("dofus"))
                    .unwrap_or(false)
        })
        .ok_or(CaptureError::WindowNotFound)?;

    // Check minimized state before attempting capture
    if dofus.is_minimized().unwrap_or(false) {
        return Err(CaptureError::WindowMinimized);
    }

    // Logical width for retina scale computation (XCapResult<u32> in 0.9.4)
    let logical_width = dofus.width().unwrap_or(1).max(1) as f32;

    let img = dofus.capture_image().map_err(classify_capture_error)?;

    let (width, height) = (img.width(), img.height());
    let scale_factor = (width as f32 / logical_width).max(1.0);
    let pixels = img.into_raw();

    if is_mostly_black(&pixels) {
        return Err(CaptureError::WindowMinimized);
    }

    Ok(CapturedImage {
        width,
        height,
        pixels,
        scale_factor,
    })
}

fn classify_capture_error(e: xcap::XCapError) -> CaptureError {
    let msg = e.to_string();
    if msg.to_lowercase().contains("permission") || msg.to_lowercase().contains("denied") {
        CaptureError::PermissionDenied
    } else {
        CaptureError::CaptureFailed(msg)
    }
}

fn is_mostly_black(rgba: &[u8]) -> bool {
    let total_pixels = rgba.len() / 4;
    if total_pixels == 0 {
        return true;
    }
    let mut non_black = 0usize;
    for px in rgba.chunks_exact(4) {
        if px[0] > 20 || px[1] > 20 || px[2] > 20 {
            non_black += 1;
        }
    }
    (non_black as f32 / total_pixels as f32) < 0.05
}
