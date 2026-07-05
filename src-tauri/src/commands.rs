//! Tauri command surface for client-mode webviews.
//!
//! These are the entry points invoked from JavaScript via `@tauri-apps/api/core`'s
//! `invoke()`. They are intentionally thin: business logic lives in `client`.

use crate::client::{discover_server, load_config, save_config, ClientConfig, DiscoveredServer};
use std::time::Duration;

#[derive(serde::Serialize)]
pub struct DiscoveryResult {
    pub found: bool,
    pub server: Option<DiscoveredServer>,
    pub url: Option<String>,
}

#[tauri::command]
pub async fn discover_servers(timeout_ms: u64) -> DiscoveryResult {
    match discover_server(Duration::from_millis(timeout_ms)) {
        Ok(Some(server)) => {
            let url = crate::client::build_server_url(&server);
            DiscoveryResult {
                found: true,
                url: Some(url),
                server: Some(server),
            }
        }
        Ok(None) => DiscoveryResult {
            found: false,
            server: None,
            url: None,
        },
        Err(e) => {
            log::error!("discover error: {}", e);
            DiscoveryResult {
                found: false,
                server: None,
                url: None,
            }
        }
    }
}

#[tauri::command]
pub fn get_client_config() -> ClientConfig {
    load_config()
}

#[tauri::command]
pub fn set_client_config(config: ClientConfig) -> Result<(), String> {
    if let Some(ref url) = config.server_url {
        if !validate_server_url(url) {
            return Err(format!("invalid server URL: {}", url));
        }
    }
    save_config(&config)
}

fn validate_server_url(s: &str) -> bool {
    (s.starts_with("http://") || s.starts_with("https://"))
        && s.len() > 8
        && !s.chars().any(char::is_whitespace)
}

#[tauri::command]
pub fn server_url_for_client() -> Option<String> {
    load_config().server_url
}
