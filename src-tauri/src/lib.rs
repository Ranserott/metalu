//! `metalu_lib` — MetalFlow Tauri shell library.
//!
//! Module layout:
//!   - `data_dir`  : OS-specific application data dir resolution.
//!   - `discovery` : UDP LAN-discovery packet format + reply logic.
//!   - `health`    : async poll loop for `/api/health`.
//!   - `server`    : server-mode runtime: spawn Next, wait healthy, bind UDP.
//!   - `client`    : client-mode runtime (stub in Task 5 — wired in Task 6).

pub mod client;
pub mod client_app;
pub mod commands;
pub mod data_dir;
pub mod discovery;
pub mod health;
pub mod server;

pub fn version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}

/// Top-level dispatch invoked from `main.rs`. `METALU_BUILD_TARGET` selects
/// between server (`server`, default) and client (`client`) modes.
pub fn run() {
    let mode = std::env::var("METALU_BUILD_TARGET").unwrap_or_else(|_| "server".to_string());
    match mode.as_str() {
        "client" => client::run_client(),
        _ => server::run_server(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn version_is_set() {
        assert!(!version().is_empty());
    }
}
