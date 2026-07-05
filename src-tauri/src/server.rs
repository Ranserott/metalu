//! Server-mode Tauri runtime. Spawns the Next.js standalone server, waits
//! for it to become healthy, and binds the UDP discovery port so LAN clients
//! can find this instance.

use std::process::Stdio;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

/// Absolute path to the bundled `server.js` for the Next.js standalone build.
/// Tauri copies `apps/web/.next/standalone/**` into the resources dir at
/// bundle time — see `tauri.server.conf.json`.
pub fn standalone_entry(resources_dir: &std::path::Path) -> std::path::PathBuf {
    resources_dir.join(".next").join("standalone").join("server.js")
}

/// Spawn the Next.js standalone server with the Tauri-specific env vars set.
/// Returns the child's PID.
pub async fn spawn_next_server(
    resources_dir: &std::path::Path,
    port: u16,
) -> Result<u32, String> {
    let entry = standalone_entry(resources_dir);
    if !entry.exists() {
        return Err(format!("standalone entry not found at {:?}", entry));
    }
    let mut cmd = Command::new("node");
    cmd.arg(entry)
        .env("METALU_RUNTIME", "tauri")
        .env("PORT", port.to_string())
        .env("HOSTNAME", "0.0.0.0")
        .env("METALU_DATA_DIR", resolve_data_dir())
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    let child = cmd.spawn().map_err(|e| e.to_string())?;
    let pid = child.id().ok_or("child had no pid")?;

    let stdout = child.stdout.ok_or("no stdout")?;
    let stderr = child.stderr.ok_or("no stderr")?;
    tokio::spawn(async move {
        let mut lines = BufReader::new(stdout).lines();
        while let Ok(Some(line)) = lines.next_line().await {
            log::info!("[next] {}", line);
        }
    });
    let mut errlines = BufReader::new(stderr).lines();
    tokio::spawn(async move {
        while let Ok(Some(line)) = errlines.next_line().await {
            log::warn!("[next-err] {}", line);
        }
    });
    Ok(pid)
}

/// Where the on-disk PGlite database lives. Matches `pglite.ts::resolveDataDir`
/// on the Next side: `<OS data dir>/Metalu/metalu-db`.
fn resolve_data_dir() -> std::path::PathBuf {
    crate::data_dir::metalu_data_dir().join("metalu-db")
}

/// Full server-mode runtime. Called from `lib::run()` when
/// `METALU_BUILD_TARGET` is unset or equals `"server"`.
pub async fn run_server_async() -> Result<(), String> {
    use crate::discovery::bind_discovery_socket;
    use crate::health::wait_for_healthy;
    use std::time::Duration;

    let resources_dir = std::env::current_dir().unwrap_or_default();
    let port: u16 = 3000;
    let _pid = spawn_next_server(&resources_dir, port).await?;

    wait_for_healthy(port, Duration::from_secs(30)).await?;

    // Bind UDP discovery on a dedicated OS thread. The handler uses a 500ms
    // recv timeout, so the thread is not CPU-bound.
    std::thread::spawn(move || loop {
        let Ok(sock) = bind_discovery_socket() else { continue };
        while let Ok(Some(_)) = crate::discovery::handle_one_request(&sock, port) {}
    });

    log::info!("server ready on http://localhost:{}", port);
    Ok(())
}

/// Sync entry point used by `main.rs`. Sets up logging and blocks on the
/// async runtime until `run_server_async` returns (which it won't, in
/// practice — the Tauri shell replaces it in Task 7+).
pub fn run_server() {
    env_logger::init();
    let rt = tokio::runtime::Runtime::new().unwrap();
    rt.block_on(async {
        let _ = run_server_async().await;
    });
}
