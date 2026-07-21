//! Tauri Builder for client mode: discovery + webview navigation.
//!
//! On startup the setup callback calls `try_resolve_server_url` and, if a
//! URL is returned, navigates the webview to it. The `retry_discovery`
//! Tauri command is invoked by `first_run.html`'s JS to poll every 10s
//! when initial discovery fails.

use crate::client::{
    build_server_url, discover_server, load_config, save_config, validate_server_url,
};
use std::time::Duration;
use tauri::Manager;

/// Returns the URL the webview should navigate to.
///
/// Resolution order:
///   1. If the cached config has a valid `server_url`, return it (no UDP).
///   2. Else run UDP discovery with `timeout`. On success, cache + return.
///   3. On discovery failure (timeout, no response), return `None`.
pub fn try_resolve_server_url(timeout: Duration) -> Option<String> {
    let cfg = load_config();

    if let Some(ref url) = cfg.server_url {
        if validate_server_url(url) {
            return Some(url.clone());
        }
    }

    match discover_server(timeout) {
        Ok(Some(server)) => {
            let url = build_server_url(&server);
            let mut new_cfg = cfg;
            new_cfg.server_url = Some(url.clone());
            if save_config(&new_cfg).is_err() {
                log::warn!("failed to persist discovered server URL to config");
            }
            Some(url)
        }
        Ok(None) | Err(_) => None,
    }
}

/// Tauri command invoked by `first_run.html`'s JS.
///
/// Returns the URL to navigate to, or `None` if discovery timed out.
/// The JS calls this every 10s while the spinner is showing.
#[tauri::command]
pub async fn retry_discovery() -> Option<String> {
    try_resolve_server_url(Duration::from_secs(5))
}

/// Build and run the client-mode Tauri app. Blocks until the window closes.
pub fn run() -> tauri::Result<()> {
    tauri::Builder::default()
        .setup(|app| {
            let window = app
                .get_webview_window("main")
                .ok_or("main webview window missing")?
                .clone();

            tauri::async_runtime::spawn(async move {
                if let Some(url_str) = try_resolve_server_url(Duration::from_secs(5)) {
                    match url::Url::parse(&url_str) {
                        Ok(parsed) => {
                            if let Err(e) = window.navigate(parsed) {
                                log::error!("webview navigate failed: {}", e);
                            }
                        }
                        Err(e) => log::error!("invalid server URL {:?}: {}", url_str, e),
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![retry_discovery])
        .run(tauri::generate_context!())
}
