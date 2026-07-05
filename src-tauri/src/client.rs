//! Client-mode Tauri commands: discover the server via UDP, persist the URL,
//! and tell the webview what URL to load.

use crate::discovery::DISCOVERY_MAGIC;
use serde::{Deserialize, Serialize};
use std::fs;
use std::net::{IpAddr, Ipv4Addr, SocketAddr, UdpSocket};
use std::time::{Duration, Instant};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DiscoveredServer {
    pub ip: String,
    pub hostname: String,
    pub port: u16,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
pub struct ClientConfig {
    pub server_url: Option<String>,
}

pub fn config_path() -> std::path::PathBuf {
    crate::data_dir::metalu_data_dir().join("metalu-client.toml")
}

pub fn load_config() -> ClientConfig {
    let p = config_path();
    if !p.exists() {
        return ClientConfig::default();
    }
    match fs::read_to_string(&p) {
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => ClientConfig::default(),
        Err(e) => {
            log::warn!("failed to read client config {:?}: {}", p, e);
            ClientConfig::default()
        }
        Ok(s) => match toml::from_str(&s) {
            Ok(cfg) => cfg,
            Err(e) => {
                log::warn!("failed to parse client config {:?}: {}", p, e);
                ClientConfig::default()
            }
        },
    }
}

pub fn save_config(cfg: &ClientConfig) -> Result<(), String> {
    let p = config_path();
    if let Some(parent) = p.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let s = toml::to_string(cfg).map_err(|e| e.to_string())?;
    fs::write(p, s).map_err(|e| e.to_string())?;
    Ok(())
}

/// Broadcast `DISCOVERY_MAGIC` on the LAN, wait up to `timeout` for a response.
/// Returns the first server that replies with a valid JSON `DiscoveredServer`.
pub fn discover_server(timeout: Duration) -> Result<Option<DiscoveredServer>, String> {
    let client = UdpSocket::bind("0.0.0.0:0").map_err(|e| e.to_string())?;
    client.set_broadcast(true).map_err(|e| e.to_string())?;
    client
        .set_read_timeout(Some(Duration::from_millis(500)))
        .map_err(|e| e.to_string())?;

    let broadcast = SocketAddr::new(IpAddr::V4(Ipv4Addr::BROADCAST), 3001);
    client
        .send_to(DISCOVERY_MAGIC, broadcast)
        .map_err(|e| e.to_string())?;
    let deadline = Instant::now() + timeout;
    let mut buf = [0u8; 1024];
    while std::time::Instant::now() < deadline {
        match client.recv_from(&mut buf) {
            Ok((n, _peer)) => {
                if let Ok(s) = std::str::from_utf8(&buf[..n]) {
                    if let Ok(server) = serde_json::from_str::<DiscoveredServer>(s) {
                        return Ok(Some(server));
                    }
                }
            }
            Err(_) => {}
        }
        // Sleep the remaining time before the deadline (or 100ms, whichever is smaller)
        let remaining = deadline.saturating_duration_since(std::time::Instant::now());
        let sleep_for = remaining.min(Duration::from_millis(100));
        if sleep_for.is_zero() {
            break;
        }
        std::thread::sleep(sleep_for);
    }
    Ok(None)
}

pub fn build_server_url(server: &DiscoveredServer) -> String {
    format!("http://{}:{}", server.ip, server.port)
}

pub fn run_client() {
    env_logger::init();
    log::info!("client started");
    // The actual webview open happens in the Tauri command layer.
    // This entrypoint is here so the binary can be built and exist.
    std::thread::park();
}
