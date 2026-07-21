use serde::{Deserialize, Serialize};
use std::time::Duration;
use tokio::net::UdpSocket;
use tokio::time::timeout;

const DISCOVERY_PORT_DEFAULT: u16 = 3001;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ServerAnnouncement {
    pub ip: String,
    pub port: u16,
    pub hostname: String,
    pub version: String,
}

#[derive(Debug)]
pub enum DiscoveryError {
    Io(std::io::Error),
    Timeout,
    Json(serde_json::Error),
    InvalidPayload(String),
}

impl std::fmt::Display for DiscoveryError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DiscoveryError::Io(e) => write!(f, "io: {}", e),
            DiscoveryError::Timeout => write!(f, "discovery timeout"),
            DiscoveryError::Json(e) => write!(f, "json: {}", e),
            DiscoveryError::InvalidPayload(e) => write!(f, "invalid payload: {}", e),
        }
    }
}

impl std::error::Error for DiscoveryError {}

fn validate_announcement(a: &ServerAnnouncement) -> Result<(), String> {
    let ip_ok = a.ip.split('.').count() == 4
        && a.ip
            .split('.')
            .all(|p| p.parse::<u8>().is_ok());
    if !ip_ok {
        return Err(format!("ip inválida: {}", a.ip));
    }
    if a.port == 0 {
        return Err("port debe ser > 0".to_string());
    }
    if a.hostname.is_empty() {
        return Err("hostname vacío".to_string());
    }
    if !a.version.chars().any(|c| c == '.') {
        return Err(format!("version no es semver: {}", a.version));
    }
    Ok(())
}

pub async fn wait_for_server(max_wait_ms: u64) -> Result<ServerAnnouncement, DiscoveryError> {
    let port = std::env::var("METALU_DISCOVERY_PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(DISCOVERY_PORT_DEFAULT);

    let socket = UdpSocket::bind(("0.0.0.0", port))
        .await
        .map_err(DiscoveryError::Io)?;
    // Filter only packets from LAN (192.168.0.0/16, 10.0.0.0/8, 172.16.0.0/12) — out of scope v1.

    let mut buf = vec![0u8; 1024];
    loop {
        let recv = timeout(
            Duration::from_millis(max_wait_ms),
            socket.recv_from(&mut buf),
        )
        .await;

        match recv {
            Ok(Ok((n, _addr))) => {
                let raw = match std::str::from_utf8(&buf[..n]) {
                    Ok(s) => s,
                    Err(_) => continue,
                };
                let parsed: Result<ServerAnnouncement, _> = serde_json::from_str(raw);
                match parsed {
                    Ok(a) => match validate_announcement(&a) {
                        Ok(()) => return Ok(a),
                        Err(e) => return Err(DiscoveryError::InvalidPayload(e)),
                    },
                    Err(e) => return Err(DiscoveryError::Json(e)),
                }
            }
            Ok(Err(e)) => return Err(DiscoveryError::Io(e)),
            Err(_) => return Err(DiscoveryError::Timeout),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validate_accepts_valid_announcement() {
        let a = ServerAnnouncement {
            ip: "192.168.1.5".to_string(),
            port: 3000,
            hostname: "taller-pc".to_string(),
            version: "0.2.0".to_string(),
        };
        assert!(validate_announcement(&a).is_ok());
    }

    #[test]
    fn validate_rejects_bad_ip() {
        let a = ServerAnnouncement {
            ip: "999.999.999.999".to_string(),
            port: 3000,
            hostname: "x".to_string(),
            version: "0.2.0".to_string(),
        };
        assert!(validate_announcement(&a).is_err());
    }

    #[test]
    fn validate_rejects_zero_port() {
        let a = ServerAnnouncement {
            ip: "1.2.3.4".to_string(),
            port: 0,
            hostname: "x".to_string(),
            version: "0.2.0".to_string(),
        };
        assert!(validate_announcement(&a).is_err());
    }

    #[test]
    fn validate_rejects_empty_hostname() {
        let a = ServerAnnouncement {
            ip: "1.2.3.4".to_string(),
            port: 3000,
            hostname: "".to_string(),
            version: "0.2.0".to_string(),
        };
        assert!(validate_announcement(&a).is_err());
    }

    #[test]
    fn validate_rejects_non_semver() {
        let a = ServerAnnouncement {
            ip: "1.2.3.4".to_string(),
            port: 3000,
            hostname: "x".to_string(),
            version: "abc".to_string(),
        };
        assert!(validate_announcement(&a).is_err());
    }

    #[tokio::test]
    async fn wait_for_server_times_out() {
        // Bind a sender that doesn't broadcast — listener should timeout.
        let result = wait_for_server(100).await;
        assert!(matches!(result, Err(DiscoveryError::Timeout)));
    }
}