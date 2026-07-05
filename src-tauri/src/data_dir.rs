//! Resolves the OS-specific application data directory for Metalu.
//!
//! On Tauri startup this directory is used to:
//!   - house the bundled Next.js standalone server resources,
//!   - persist the local PGlite database (`<data dir>/metalu-db`),
//!   - persist the client-mode config (`<data dir>/metalu-client.toml`),
//!   - backup/restore blobs for the admin panel.

use std::path::PathBuf;

/// Returns the platform-specific application data directory for Metalu.
///
/// Resolution order:
///   1. `METALU_DATA_DIR` env var, if set (used by tests to redirect I/O
///      to a tempdir, and by ops for portable installs).
///   2. `<OS data dir>/Metalu` (via `HOME`/`APPDATA`/`XDG_DATA_HOME`).
///
/// Panics on the platform-default branch if the relevant env var is unset —
/// which would be a genuinely broken host environment rather than a
/// recoverable runtime error.
pub fn metalu_data_dir() -> PathBuf {
    if let Some(dir) = std::env::var_os("METALU_DATA_DIR") {
        return PathBuf::from(dir);
    }
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
