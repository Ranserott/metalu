//! Tauri Builder for client mode: discovery + webview navigation.
//!
//! The pure-ish helper `try_resolve_server_url` short-circuits to the
//! cached URL when present and valid; otherwise it runs UDP discovery
//! and persists the result on success. Both the Tauri setup callback
//! (first launch) and the `retry_discovery` Tauri command (background
//! polling from first_run.html) call into this helper.

use crate::client::{
    build_server_url, discover_server, load_config, save_config, validate_server_url,
};
use std::time::Duration;

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
