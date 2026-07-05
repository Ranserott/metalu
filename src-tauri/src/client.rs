//! Client-mode Tauri commands. Placeholder — implemented in Task 6.
//!
//! In Task 6 this module will:
//!   1. Bind UDP/3001 outbound (broadcast `METALU_DISCOVER\n`),
//!   2. Collect `ServerInfo` replies from nearby servers,
//!   3. Present a "Connect to server" picker modal,
//!   4. Open the webview pointed at the chosen server.

pub fn run_client() {
    log::info!("client mode not implemented in Task 5; full impl in Task 6");
    // Park so the binary does not exit before the (yet-to-exist) webview is wired.
    std::thread::park();
}
