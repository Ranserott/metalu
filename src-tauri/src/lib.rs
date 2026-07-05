// metalu_lib — Tauri command/handler registry.
//
// Intentionally minimal in Task 4. Subsequent tasks will add:
//   - Task 5: server binary entry + UDP broadcast
//   - Task 6: client binary entry + UDP discovery
//   - Task 7: admin backup panel commands
//
// For now this stub lets `cargo check` resolve the [lib] target declared
// in Cargo.toml. Real logic lives in submodules added later.

pub fn version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn version_is_set() {
        assert!(!version().is_empty());
    }
}
