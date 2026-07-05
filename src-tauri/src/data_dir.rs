//! Resolves the OS-specific application data directory for Metalu.
//!
//! On Tauri startup this directory is used to:
//!   - house the bundled Next.js standalone server resources,
//!   - persist the local PGlite database (`<data dir>/metalu-db`),
//!   - backup/restore blobs for the admin panel.

use std::path::PathBuf;

/// Returns `<OS data dir>/Metalu`.
///
/// Panics if the platform-specific env var (`HOME` on macOS/Linux, `APPDATA`
/// on Windows, `XDG_DATA_HOME` on Linux) is not set — which would be a
/// genuinely broken host environment rather than a recoverable runtime error.
pub fn metalu_data_dir() -> PathBuf {
    let base = dirs_data_dir().expect("platform data dir env var not set");
    base.join("Metalu")
}

fn dirs_data_dir() -> Option<PathBuf> {
    #[cfg(target_os = "macos")]
    {
        std::env::var_os("HOME").map(|h| PathBuf::from(h).join("Library/Application Support"))
    }
    #[cfg(target_os = "windows")]
    {
        std::env::var_os("APPDATA").map(PathBuf::from)
    }
    #[cfg(target_os = "linux")]
    {
        std::env::var_os("XDG_DATA_HOME")
            .map(PathBuf::from)
            .or_else(|| std::env::var_os("HOME").map(|h| PathBuf::from(h).join(".local/share")))
    }
}
