//! Health-polling loop for the spawned Next.js server.
//!
//! The Next.js app exposes `GET /api/health` (Task 3) which returns 200 with
//! `{ok:true}` once the database is migrated and reachable. We poll that
//! endpoint in a tight loop until it succeeds or the timeout elapses — then
//! the Tauri shell knows it's safe to open the webview.

use std::time::{Duration, Instant};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;

/// Block (async) until `http://127.0.0.1:<port>/api/health` returns 200, or
/// return Err on timeout.
pub async fn wait_for_healthy(port: u16, timeout: Duration) -> Result<(), String> {
    let deadline = Instant::now() + timeout;
    let addr = format!("127.0.0.1:{}", port);

    while Instant::now() < deadline {
        match reqwest_get_200(&addr).await {
            Ok(true) => return Ok(()),
            Ok(false) | Err(_) => tokio::time::sleep(Duration::from_millis(200)).await,
        }
    }
    Err(format!("server did not become healthy within {:?}", timeout))
}

/// Minimal HTTP/1.0 GET that returns Ok(true) iff the status line starts with
/// `HTTP/1.x 200`. We hand-roll this instead of pulling in `reqwest` to keep
/// the binary small (Tauri bundles ship to end users).
async fn reqwest_get_200(addr: &str) -> Result<bool, String> {
    let connect_fut = TcpStream::connect(addr);
    let mut stream = match tokio::time::timeout(Duration::from_millis(500), connect_fut).await {
        Ok(Ok(s)) => s,
        Ok(Err(_)) | Err(_) => return Ok(false),
    };

    let req = format!(
        "GET /api/health HTTP/1.0\r\nHost: {}\r\nConnection: close\r\n\r\n",
        addr
    );

    if tokio::time::timeout(Duration::from_millis(500), stream.write_all(req.as_bytes()))
        .await
        .is_err()
    {
        return Ok(false);
    }

    let mut buf = Vec::new();
    let read_fut = stream.read_to_end(&mut buf);
    match tokio::time::timeout(Duration::from_millis(1500), read_fut).await {
        Ok(Ok(_)) => {}
        Ok(Err(_)) | Err(_) => return Ok(false),
    }

    let body = String::from_utf8_lossy(&buf);
    Ok(body.starts_with("HTTP/1.0 200") || body.starts_with("HTTP/1.1 200"))
}
