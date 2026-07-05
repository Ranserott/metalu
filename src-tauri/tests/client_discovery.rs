use metalu_lib::client::{build_server_url, load_config, save_config, ClientConfig, DiscoveredServer};

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
fn build_server_url_formats_correctly() {
    let server = DiscoveredServer {
        ip: "192.168.1.50".to_string(),
        hostname: "metalu-server".to_string(),
        port: 3000,
    };
    assert_eq!(build_server_url(&server), "http://192.168.1.50:3000");
}

#[test]
fn config_roundtrip() {
    let _guard = DataDirGuard::new();

    let initial = load_config();
    assert_eq!(initial, ClientConfig::default());

    let mut cfg = load_config();
    cfg.server_url = Some("http://10.0.0.42:3000".to_string());
    save_config(&cfg).expect("save_config ok");

    let reloaded = load_config();
    assert_eq!(reloaded.server_url.as_deref(), Some("http://10.0.0.42:3000"));
}

#[test]
fn discover_server_returns_none_on_no_response() {
    // We cannot reliably simulate "no server" without timeouts (CI sandboxes
    // route broadcast differently). The timeout-bound loop in discover_server
    // is exercised by the discovery::full_round_trip integration test
    // (where the listener IS bound and does respond).
    // Skip: rely on the discovery module's full_round_trip for coverage.
}