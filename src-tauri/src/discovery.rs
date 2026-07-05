//! UDP LAN discovery for the server-mode Tauri binary.
//!
//! Clients on the LAN broadcast `METALU_DISCOVER\n` to UDP/3001. The server
//! replies with a JSON `ServerInfo` payload describing its IP/hostname/port.
//! This is the same handshake the client-mode Tauri binary uses in Task 6 to
//! discover servers on the network.

use serde::{Deserialize, Serialize};
use std::net::{IpAddr, Ipv4Addr, SocketAddr, UdpSocket};
use std::time::Duration;

/// Magic packet body broadcast by clients. Includes a trailing newline so a
/// client that prints the protocol looks human-readable.
pub const DISCOVERY_MAGIC: &[u8] = b"METALU_DISCOVER\n";

/// UDP port used by both client (send) and server (bind).
pub const DISCOVERY_PORT: u16 = 3001;

/// Payload the server sends back in response to a discovery packet.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ServerInfo {
    /// Outward-facing IPv4 string. `0.0.0.0` for now — Task 6 uses
    /// `getifaddrs`-style enumeration if we ever need a real IP.
    pub ip: String,
    /// Hostname as reported by the OS.
    pub hostname: String,
    /// TCP port the Next.js server listens on.
    pub port: u16,
}

/// Returns true iff `buf` starts with the discovery magic. Tolerates trailing
/// garbage (some clients append their own metadata) — only the prefix matters.
pub fn parse_request(buf: &[u8]) -> bool {
    buf.starts_with(DISCOVERY_MAGIC)
}

/// Build the JSON-encoded reply for the given server port.
pub fn build_response(server_port: u16) -> serde_json::Result<Vec<u8>> {
    let hostname = gethostname::gethostname()
        .into_string()
        .unwrap_or_else(|_| "unknown".to_string());
    let info = ServerInfo {
        ip: "0.0.0.0".to_string(),
        hostname,
        port: server_port,
    };
    let s = serde_json::to_string(&info)?;
    Ok(s.into_bytes())
}

/// Bind the discovery socket on UDP/0.0.0.0:3001.
pub fn bind_discovery_socket() -> std::io::Result<UdpSocket> {
    let addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::UNSPECIFIED), DISCOVERY_PORT);
    UdpSocket::bind(addr)
}

/// Read one packet (with a 500ms timeout) and, if it is a discovery request,
/// reply with a `ServerInfo` JSON. Returns `Ok(Some(peer))` on reply,
/// `Ok(None)` on timeout or ignore.
pub fn handle_one_request(
    socket: &UdpSocket,
    server_port: u16,
) -> std::io::Result<Option<SocketAddr>> {
    let mut buf = [0u8; 256];
    socket.set_read_timeout(Some(Duration::from_millis(500)))?;
    let (n, peer) = match socket.recv_from(&mut buf) {
        Ok(v) => v,
        Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => return Ok(None),
        Err(ref e) if e.kind() == std::io::ErrorKind::TimedOut => return Ok(None),
        Err(e) => return Err(e),
    };
    if !parse_request(&buf[..n]) {
        return Ok(None);
    }
    let response = build_response(server_port).expect("response json");
    socket.send_to(&response, peer)?;
    Ok(Some(peer))
}
