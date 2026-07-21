//! Integration tests for the client's URL-resolution helper.
//!
//! These tests use a tempdir for METALU_DATA_DIR (same pattern as
//! tests/client_discovery.rs) and either pre-populate the .toml config
//! or rely on UDP discovery (which is skipped on CI — see comments).

use metalu_lib::client::{load_config, save_config, ClientConfig};
use metalu_lib::client_app::try_resolve_server_url;
use std::time::Duration;

struct DataDirGuard {
    _dir: tempfile::TempDir,
    prev: Option<std::ffi::OsString>,
}

impl DataDirGuard {
    fn new() -> Self {
        let prev = std::env::var_os("METALU_DATA_DIR");
        let dir = tempfile::tempdir().unwrap();
        std::env::set_var("METALU_DATA_DIR", dir.path());
        Self { _dir: dir, prev }
    }
}

impl Drop for DataDirGuard {
    fn drop(&mut self) {
        match &self.prev {
            Some(v) => std::env::set_var("METALU_DATA_DIR", v),
            None => std::env::remove_var("METALU_DATA_DIR"),
        }
    }
}

#[test]
fn cached_url_short_circuits_discovery() {
    let _guard = DataDirGuard::new();
    let mut cfg: ClientConfig = load_config();
    cfg.server_url = Some("http://10.0.0.42:3000".to_string());
    save_config(&cfg).expect("save_config ok");

    // Generous timeout — if the helper were to run UDP discovery we'd notice
    // because real discovery is slow and CI sandboxes block broadcast.
    let url = try_resolve_server_url(Duration::from_secs(2));
    assert_eq!(url.as_deref(), Some("http://10.0.0.42:3000"));
}
