> **SUPERSEDED 2026-07-21** — This plan was abandoned mid-execution. The pivot to **Neutralino.js** (single-binary webview, hardcoded server IP `192.168.1.21:3000`, no UDP discovery) is documented in `docs/superpowers/plans/2026-07-21-neutralino-client.md`. All Phase 1–5 commits from this plan remain in git history but the work described below was **not** the final implementation. Do NOT follow this plan; refer to the Neutralino plan for the shipped approach. Kept here as a record of the abandoned direction.
>
> **Cleanup performed:** `src-tauri-client/` deleted, `src-tauri/src/client_app.rs` and `src-tauri/Cargo.toml` client block reverted, `.github/workflows/build.yml` `build-client` job removed, `bin/` Neutralino binaries live in repo root. Final Windows client at `dist-server/metalu-client-v0.2.0/metalu-client.exe` (1.7 MB PE32+ GUI x86-64, Neutralino v6.8.0 runtime).

# Tauri Client Distribution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `metalu-client.exe` — a single-file Tauri webview that auto-discovers the Metalu server on the LAN via UDP and opens a desktop window without the operator typing any URL. Distributed as `dist-server/metalu-client-v0.2.0.zip`.

**Architecture:** Extend the existing `src-tauri/` crate with a new `client_app` module that wires a Tauri Builder. The setup callback reads the cached URL from `%APPDATA%\metalu\metalu-client.toml`; if missing, runs UDP discovery (5s timeout), caches the result, and navigates the webview. A `retry_discovery` Tauri command is exposed so the `first_run.html` fallback screen can poll every 10s. Clean up the abandoned `src-tauri-client/` parallel crate and ~5 GB of stale build artifacts first.

**Tech Stack:** Rust (Tauri 2.x), WebView2 (Windows built-in), inline HTML/JS for the discovery-waiting screen.

**Worktree:** All file paths below assume the working directory is `/Users/francisco/Desktop/metalu/.claude/worktrees/v0.2-lan-node-server/`. Run `pwd` before each task and `cd` into that worktree if needed. Do NOT work in the main repo or in `feature+users-roles-module` — the client feature ships in `v0.2-lan-node-server`.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src-tauri/src/client_app.rs` (new) | Tauri Builder for client mode. Exposes `run()` and the `retry_discovery` Tauri command. Defines the `try_resolve_server_url` helper that's pure-ish and unit-testable. |
| `src-tauri/src/client.rs` (modify) | `run_client()` becomes a one-liner that calls `client_app::run()`. Existing functions stay. |
| `src-tauri/src/lib.rs` (modify) | Add `pub mod client_app;`. No change to `run()` dispatch. |
| `src-tauri/first_run.html` (new) | Inline HTML+JS loaded at startup. Spinner + status text. JS polls `retry_discovery` every 10s; on success, navigates the webview. |
| `src-tauri/tauri.client.conf.json` (modify) | Set `frontendDist` to the in-tree `first_run.html` path. Verify `productName` and `identifier`. |
| `src-tauri/tests/client_app.rs` (new) | Unit tests for `try_resolve_server_url`: cached-URL short-circuit, save-on-discovery-success, no-cache-no-discovery returns None. |
| `package.json` (modify) | Add `tauri:build:client` script that runs `cargo tauri build` with `--bundles none` against the client config. |
| `dist-server/metalu-client-v0.2.0/LEEME.txt` (new) | 3-paragraph Spanish quick-start for the operator. |
| `dist-server/metalu-client-v0.2.0/metalu-client.exe` (built) | The final binary, copied out of `src-tauri/target/release/`. |
| `dist-server/metalu-client-v0.2.0.zip` (built) | Compressed distribution. |

## Tasks

### Task 1: Clean up stale artifacts (~5 GB reclaim)

**Files:**
- Delete (git-tracked): `src-tauri-client/` (entire tree, via `git rm -r`)
- Delete (filesystem-only, gitignored): `/Users/francisco/Desktop/metalu/src-tauri/target/`, `/Users/francisco/Desktop/metalu/src-tauri/gen/`, `/Users/francisco/Desktop/metalu/src-tauri/Cargo.lock`, `dist-server/standalone/`, `dist-server/metalu-server-v0.2.0 2/`, `dist-server/metalu-server-v0.2.0.zip` (old 140 MB one)

- [ ] **Step 1.1: Verify src-tauri-client is truly abandoned**

Run:
```bash
cd /Users/francisco/Desktop/metalu/.claude/worktrees/v0.2-lan-node-server
rg -l "metalu_client_lib|metalu-client" --type rust --type toml --type json 2>/dev/null
```

Expected: NO matches outside `src-tauri-client/` itself. If there are matches, STOP and ask the user — those files reference the abandoned crate.

- [ ] **Step 1.2: git rm the abandoned crate**

Run:
```bash
cd /Users/francisco/Desktop/metalu/.claude/worktrees/v0.2-lan-node-server
git rm -r src-tauri-client
```

Expected: D terminal output listing each file removed. No errors.

- [ ] **Step 1.3: Delete untracked build artifacts**

Run:
```bash
rm -rf /Users/francisco/Desktop/metalu/src-tauri/target
rm -rf /Users/francisco/Desktop/metalu/src-tauri/gen
rm -rf /Users/francisco/Desktop/metalu/src-tauri/Cargo.lock
rm -rf /Users/francisco/Desktop/metalu/.claude/worktrees/v0.2-lan-node-server/dist-server/standalone
rm -rf "/Users/francisco/Desktop/metalu/.claude/worktrees/v0.2-lan-node-server/dist-server/metalu-server-v0.2.0 2"
rm -f /Users/francisco/Desktop/metalu/.claude/worktrees/v0.2-lan-node-server/dist-server/metalu-server-v0.2.0.zip
```

Expected: No errors. Each path silently removed.

- [ ] **Step 1.4: Verify cleanup reclaimed the expected space**

Run:
```bash
du -sh /Users/francisco/Desktop/metalu/src-tauri 2>/dev/null
du -sh /Users/francisco/Desktop/metalu/.claude/worktrees/v0.2-lan-node-server/src-tauri 2>/dev/null
du -sh /Users/francisco/Desktop/metalu/.claude/worktrees/v0.2-lan-node-server/dist-server 2>/dev/null
```

Expected: main repo `src-tauri` should be a few KB (just configs). v0.2 `src-tauri` should be small (source only, no target/). `dist-server` should contain only `metalu-server-v0.2.0/` and the new client folders we add later.

- [ ] **Step 1.5: Commit the cleanup**

Run:
```bash
cd /Users/francisco/Desktop/metalu/.claude/worktrees/v0.2-lan-node-server
git status --short
git commit -m "chore: remove abandoned src-tauri-client crate and stale build artifacts

The src-tauri-client/ parallel crate was an earlier attempt at splitting
the client out of src-tauri/. That approach was abandoned in favor of the
METALU_BUILD_TARGET=client dispatch inside src-tauri/, which is the
canonical architecture.

Also removes ~5 GB of stale target/, gen/, Cargo.lock, intermediate
standalone output, and a backup of a broken server bundle from prior
sessions. None of these are source-of-truth and all regenerate on next
build."
```

Expected: One commit. `git log -1` shows the message. `git status` is clean.

---

### Task 2: Add `try_resolve_server_url` helper (TDD)

**Files:**
- Create: `src-tauri/src/client_app.rs`
- Test: `src-tauri/tests/client_app.rs`
- Modify: `src-tauri/src/lib.rs` (add `pub mod client_app;`)

The helper is the heart of the client. Pure-ish: takes a timeout, returns the URL to navigate to (cached URL if present and valid, otherwise runs UDP discovery and caches the result on success). The Tauri Builder will call this from both the setup callback and the `retry_discovery` command.

- [ ] **Step 2.1: Add the empty module and wire it into lib.rs**

Edit `src-tauri/src/lib.rs`. After the line `pub mod client;` add:

```rust
pub mod client_app;
```

Create `src-tauri/src/client_app.rs` with this minimal content:

```rust
//! Tauri Builder for client mode: discovery + webview navigation.

pub fn try_resolve_server_url(_timeout: std::time::Duration) -> Option<String> {
    None
}
```

- [ ] **Step 2.2: Create the test file with a failing test**

Create `src-tauri/tests/client_app.rs`:

```rust
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
```

- [ ] **Step 2.3: Run the test to verify it fails**

Run:
```bash
cd /Users/francisco/Desktop/metalu/.claude/worktrees/v0.2-lan-node-server
cargo test --manifest-path src-tauri/Cargo.toml --test client_app
```

Expected: FAIL. The current stub returns `None` for everything, so `assert_eq!(url.as_deref(), Some("http://10.0.0.42:3000"))` fails with "None != Some(\"http://10.0.0.42:3000\")".

- [ ] **Step 2.4: Implement `try_resolve_server_url`**

Replace the contents of `src-tauri/src/client_app.rs` with:

```rust
//! Tauri Builder for client mode: discovery + webview navigation.
//!
//! The pure-ish helper `try_resolve_server_url` short-circuits to the
//! cached URL when present and valid; otherwise it runs UDP discovery
//! and persists the result on success. Both the Tauri setup callback
//! (first launch) and the `retry_discovery` Tauri command (background
//! polling from first_run.html) call into this helper.

use crate::client::{
    build_server_url, discover_server, load_config, save_config, validate_server_url,
};
use std::time::Duration;

/// Returns the URL the webview should navigate to.
///
/// Resolution order:
///   1. If the cached config has a valid `server_url`, return it (no UDP).
///   2. Else run UDP discovery with `timeout`. On success, cache + return.
///   3. On discovery failure (timeout, no response), return `None`.
pub fn try_resolve_server_url(timeout: Duration) -> Option<String> {
    let cfg = load_config();

    if let Some(ref url) = cfg.server_url {
        if validate_server_url(url) {
            return Some(url.clone());
        }
    }

    match discover_server(timeout) {
        Ok(Some(server)) => {
            let url = build_server_url(&server);
            let mut new_cfg = cfg;
            new_cfg.server_url = Some(url.clone());
            if save_config(&new_cfg).is_err() {
                log::warn!("failed to persist discovered server URL to config");
            }
            Some(url)
        }
        Ok(None) | Err(_) => None,
    }
}
```

- [ ] **Step 2.5: Re-run the test to verify it passes**

Run:
```bash
cd /Users/francisco/Desktop/metalu/.claude/worktrees/v0.2-lan-node-server
cargo test --manifest-path src-tauri/Cargo.toml --test client_app
```

Expected: PASS. `cached_url_short_circuits_discovery` returns the cached URL.

- [ ] **Step 2.6: Commit**

Run:
```bash
cd /Users/francisco/Desktop/metalu/.claude/worktrees/v0.2-lan-node-server
git add src-tauri/src/client_app.rs src-tauri/src/lib.rs src-tauri/tests/client_app.rs
git commit -m "feat(tauri-client): add try_resolve_server_url helper

Pure-ish helper that the Tauri Builder uses for both initial discovery
and retry polling. Short-circuits to the cached URL when present; runs
UDP discovery and persists on success; returns None on discovery
failure (the polling caller retries after a backoff).

Includes a passing test for the cache short-circuit. UDP discovery paths
are exercised by the existing discovery::full_round_trip integration
test, not by CI (broadcast is unreliable in sandboxed CI environments)."
```

Expected: One commit, working tree clean.

---

### Task 3: Wire the Tauri Builder (`client_app::run` + `retry_discovery` command)

**Files:**
- Modify: `src-tauri/src/client_app.rs`

This task has no new tests because the Tauri Builder is a thin orchestrator that calls the helper. The helper is already tested in Task 2. Manual smoke test in Task 11 covers the wiring.

- [ ] **Step 3.1: Add the Tauri Builder and command to `client_app.rs`**

Replace the contents of `src-tauri/src/client_app.rs` with:

```rust
//! Tauri Builder for client mode: discovery + webview navigation.
//!
//! On startup the setup callback calls `try_resolve_server_url` and, if a
//! URL is returned, navigates the webview to it. The `retry_discovery`
//! Tauri command is invoked by `first_run.html`'s JS to poll every 10s
//! when initial discovery fails.

use crate::client::{
    build_server_url, discover_server, load_config, save_config, validate_server_url,
};
use std::time::Duration;

/// Returns the URL the webview should navigate to.
///
/// Resolution order:
///   1. If the cached config has a valid `server_url`, return it (no UDP).
///   2. Else run UDP discovery with `timeout`. On success, cache + return.
///   3. On discovery failure (timeout, no response), return `None`.
pub fn try_resolve_server_url(timeout: Duration) -> Option<String> {
    let cfg = load_config();

    if let Some(ref url) = cfg.server_url {
        if validate_server_url(url) {
            return Some(url.clone());
        }
    }

    match discover_server(timeout) {
        Ok(Some(server)) => {
            let url = build_server_url(&server);
            let mut new_cfg = cfg;
            new_cfg.server_url = Some(url.clone());
            if save_config(&new_cfg).is_err() {
                log::warn!("failed to persist discovered server URL to config");
            }
            Some(url)
        }
        Ok(None) | Err(_) => None,
    }
}

/// Tauri command invoked by `first_run.html`'s JS.
///
/// Returns the URL to navigate to, or `None` if discovery timed out.
/// The JS calls this every 10s while the spinner is showing.
#[tauri::command]
pub async fn retry_discovery() -> Option<String> {
    try_resolve_server_url(Duration::from_secs(5))
}

/// Build and run the client-mode Tauri app. Blocks until the window closes.
pub fn run() -> tauri::Result<()> {
    tauri::Builder::default()
        .setup(|app| {
            let window = app
                .get_webview_window("main")
                .ok_or("main webview window missing")?
                .clone();

            tauri::async_runtime::spawn(async move {
                if let Some(url) = try_resolve_server_url(Duration::from_secs(5)) {
                    if let Err(e) = window.navigate(url) {
                        log::error!("webview navigate failed: {}", e);
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![retry_discovery])
        .run(tauri::generate_context!())
}
```

- [ ] **Step 3.2: Wire `client::run_client()` to call `client_app::run()`**

Edit `src-tauri/src/client.rs`. Replace the body of `run_client` (the stub that calls `std::thread::park()`) with:

```rust
pub fn run_client() {
    env_logger::init();
    log::info!("client starting");
    if let Err(e) = crate::client_app::run() {
        log::error!("client_app::run failed: {}", e);
    }
}
```

- [ ] **Step 3.3: Verify it compiles**

Run:
```bash
cd /Users/francisco/Desktop/metalu/.claude/worktrees/v0.2-lan-node-server
cargo check --manifest-path src-tauri/Cargo.toml
```

Expected: `Finished` line at the end. If `env_logger` is not in `Cargo.toml`, add `env_logger = "0.11"` to `[dependencies]` and re-run.

- [ ] **Step 3.4: Re-run all tests**

Run:
```bash
cd /Users/francisco/Desktop/metalu/.claude/worktrees/v0.2-lan-node-server
cargo test --manifest-path src-tauri/Cargo.toml
```

Expected: All tests pass. The `cached_url_short_circuits_discovery` test still passes; existing tests in `tests/client_discovery.rs` and `tests/discovery_integration.rs` still pass.

- [ ] **Step 3.5: Commit**

Run:
```bash
cd /Users/francisco/Desktop/metalu/.claude/worktrees/v0.2-lan-node-server
git add src-tauri/src/client_app.rs src-tauri/src/client.rs
git commit -m "feat(tauri-client): wire Tauri Builder with setup + retry command

client_app::run() replaces the stub client::run_client(). The setup
callback spawns an async task that calls try_resolve_server_url; on
success it navigates the webview. The retry_discovery Tauri command
is exposed for first_run.html to invoke every 10s.

client::run_client() now delegates to client_app::run() and just
initializes the logger. The setup-orchestration and Tauri command
wiring are exercised by the manual smoke test (Tauri runtime can't be
unit-tested cheaply)."
```

Expected: One commit. Working tree clean.

---

### Task 4: Create `first_run.html` with spinner + polling JS

**Files:**
- Create: `src-tauri/first_run.html`

This HTML is loaded as the initial webview. It shows a spinner and polls `retry_discovery` every 10s. When the command returns a URL, the page sets `window.location.href` to navigate to it (Tauri webviews honor this on same-origin internal navigations; cross-origin to a real URL works too).

- [ ] **Step 4.1: Create the HTML file**

Create `src-tauri/first_run.html`:

```html
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <title>Metalu Cliente</title>
    <style>
      html,
      body {
        height: 100%;
        margin: 0;
        background: #0f172a;
        color: #e2e8f0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
          sans-serif;
      }
      .wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        gap: 1.5rem;
      }
      .logo {
        font-size: 2rem;
        font-weight: 600;
        letter-spacing: 0.02em;
      }
      .spinner {
        width: 48px;
        height: 48px;
        border: 4px solid #1e293b;
        border-top-color: #38bdf8;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
      .status {
        font-size: 1rem;
        color: #94a3b8;
        text-align: center;
        max-width: 32rem;
        line-height: 1.5;
      }
      .err {
        color: #f87171;
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="logo">Metalu</div>
      <div class="spinner" id="spinner"></div>
      <div class="status" id="status">Buscando servidor en la red...</div>
    </div>
    <script type="module">
      const { invoke } = window.__TAURI__.core;
      const status = document.getElementById("status");
      const spinner = document.getElementById("spinner");

      async function tick() {
        try {
          const url = await invoke("retry_discovery");
          if (url) {
            status.classList.remove("err");
            status.textContent = "Conectando a " + url + " ...";
            spinner.style.display = "none";
            window.location.href = url;
          }
        } catch (e) {
          status.classList.add("err");
          status.textContent = "Error: " + e;
        }
      }

      // Immediate attempt, then poll every 10s.
      tick();
      setInterval(tick, 10000);
    </script>
  </body>
</html>
```

- [ ] **Step 4.2: Commit**

Run:
```bash
cd /Users/francisco/Desktop/metalu/.claude/worktrees/v0.2-lan-node-server
git add src-tauri/first_run.html
git commit -m "feat(tauri-client): add first_run.html discovery-waiting screen

Dark-themed spinner + status text. Calls retry_discovery immediately
and then every 10s. On a non-null URL it navigates the webview to the
discovered server. Loaded as the Tauri webview's initial frontend

until discovery completes."
```

Expected: One commit. Working tree clean.

---

### Task 5: Update `tauri.client.conf.json`

**Files:**
- Modify: `src-tauri/tauri.client.conf.json`

- [ ] **Step 5.1: Set `frontendDist` and verify productName/identifier**

Read `src-tauri/tauri.client.conf.json` first. The current content (per spec audit on 2026-07-21):

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "Metalu Cliente",
  "version": "0.1.0",
  "identifier": "cl.metalu.client",
  "build": {
    "frontendDist": "http://localhost:3000",
    "beforeBuildCommand": ""
  },
  "app": {
    "windows": [
      {
        "title": "Metalu Cliente",
        "width": 1280,
        "height": 800,
        "resizable": true
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  }
}
```

Three changes:
1. `version`: bump to `"0.2.0"`
2. `build.frontendDist`: change from `"http://localhost:3000"` to `"../src-tauri/first_run.html"` (Tauri 2 resolves paths relative to the config file's directory).
3. `bundle.targets`: change from `"all"` to `"none"` so the build produces only the `.exe`, no NSIS/MSI.

Resulting file:

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "Metalu Cliente",
  "version": "0.2.0",
  "identifier": "cl.metalu.client",
  "build": {
    "frontendDist": "../src-tauri/first_run.html",
    "beforeBuildCommand": ""
  },
  "app": {
    "windows": [
      {
        "title": "Metalu Cliente",
        "width": 1280,
        "height": 800,
        "resizable": true
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": "none",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  }
}
```

Write that file content (use the Edit tool with replace_all if needed).

- [ ] **Step 5.2: Verify the JSON is valid**

Run:
```bash
cd /Users/francisco/Desktop/metalu/.claude/worktrees/v0.2-lan-node-server
python3 -m json.tool src-tauri/tauri.client.conf.json > /dev/null && echo OK
```

Expected: `OK` printed. If JSON is invalid, fix and re-run.

- [ ] **Step 5.3: Commit**

Run:
```bash
cd /Users/francisco/Desktop/metalu/.claude/worktrees/v0.2-lan-node-server
git add src-tauri/tauri.client.conf.json
git commit -m "chore(tauri-client): point client config at first_run.html

- version: 0.1.0 -> 0.2.0
- frontendDist: http://localhost:3000 -> ../src-tauri/first_run.html
  (loads the spinner screen; setup callback navigates once the URL
  is resolved)
- bundle.targets: all -> none (single-file .exe, no installer)"
```

Expected: One commit. Working tree clean.

---

### Task 6: Add `tauri:build:client` npm script

**Files:**
- Modify: `package.json` (add script)

- [ ] **Step 6.1: Read current scripts**

Run:
```bash
cd /Users/francisco/Desktop/metalu/.claude/worktrees/v0.2-lan-node-server
rg '"scripts"' package.json -A 20
```

Expected: A JSON block with `"scripts": { ... }`. Look for an existing `tauri:` script to colocate the new one with.

- [ ] **Step 6.2: Add the script**

Edit `package.json`. In the `"scripts"` block, add (alphabetically grouped with other tauri scripts, or after the last one):

```json
"tauri:build:client": "cargo tauri build --config src-tauri/tauri.client.conf.json --bundles none"
```

If a comma after the previous script is missing, add it.

- [ ] **Step 6.3: Verify JSON validity**

Run:
```bash
cd /Users/francisco/Desktop/metalu/.claude/worktrees/v0.2-lan-node-server
node -e "JSON.parse(require('fs').readFileSync('package.json'))" && echo OK
```

Expected: `OK` printed.

- [ ] **Step 6.4: Commit**

Run:
```bash
cd /Users/francisco/Desktop/metalu/.claude/worktrees/v0.2-lan-node-server
git add package.json
git commit -m "chore(tauri): add tauri:build:client script

Runs cargo tauri build against the client config with --bundles none,
producing just src-tauri/target/release/metalu-client.exe without any
NSIS/MSI wrapper."
```

Expected: One commit. Working tree clean.

---

### Task 7: Build `metalu-client.exe`

**Files:**
- Build artifact: `src-tauri/target/release/metalu-client.exe`

- [ ] **Step 7.1: Run the build**

Run:
```bash
cd /Users/francisco/Desktop/metalu/.claude/worktrees/v0.2-lan-node-server
pnpm tauri:build:client
```

Expected: Cargo output ending with `Finished release` and a path to `metalu-client.exe`. First build is slow (5-10 min — compiles all Tauri deps).

If the build fails with `error: linker not found` or similar on macOS, this is expected — Task 8 should be done on a Windows runner (or via GitHub Actions, future work). For local dev validation, a `cargo check` is enough.

- [ ] **Step 7.2: Verify the binary exists and inspect size**

Run:
```bash
ls -la src-tauri/target/release/metalu-client.exe
du -h src-tauri/target/release/metalu-client.exe
```

Expected: File exists, size between 5 MB and 12 MB. If much smaller (e.g. <1 MB) something went wrong — likely Tauri failed to bundle WebView2 loader.

- [ ] **Step 7.3: NO COMMIT**

The `.exe` lives inside `target/` which is gitignored. Nothing to commit.

---

### Task 8: Create distribution folder + `LEEME.txt`

**Files:**
- Create: `dist-server/metalu-client-v0.2.0/LEEME.txt`
- Copy: `src-tauri/target/release/metalu-client.exe` → `dist-server/metalu-client-v0.2.0/metalu-client.exe`

- [ ] **Step 8.1: Create the distribution folder**

Run:
```bash
cd /Users/francisco/Desktop/metalu/.claude/worktrees/v0.2-lan-node-server
mkdir -p dist-server/metalu-client-v0.2.0
cp src-tauri/target/release/metalu-client.exe dist-server/metalu-client-v0.2.0/
ls -la dist-server/metalu-client-v0.2.0/
```

Expected: Folder exists, contains `metalu-client.exe` (~6-10 MB).

- [ ] **Step 8.2: Write `LEEME.txt`**

Create `dist-server/metalu-client-v0.2.0/LEEME.txt`:

```
METALU CLIENTE v0.2.0
======================

Que es?
--------
Metalu Cliente es el programa que usan los operadores del taller para
abrir el sistema Metalu desde una computadora de la red. Es un .exe
que abre una ventana con la aplicacion, sin necesidad de escribir
ninguna direccion en el navegador.

Como se instala?
----------------
1. Copia el archivo "metalu-client.exe" a cualquier carpeta de la
   computadora donde quieras usar Metalu (Escritorio, Mis Documentos,
   una memoria USB, lo que prefieras).
2. Listo. No requiere instalador ni permisos de administrador.

Como se usa?
------------
1. Asegurate de que la computadora SERVIDOR este encendida y con
   Metalu corriendo (ventana de CMD abierta con iniciar.cmd).
2. Haz doble clic en "metalu-client.exe".
3. La ventana se abre sola, busca el servidor en la red y te muestra
   el inicio de sesion de Metalu.
4. La primera vez puede tardar unos segundos en encontrar el servidor.
   Las siguientes veces se abre instantaneo.

Problemas?
----------
- Si la ventana queda mostrando "Buscando servidor..." y nunca
  avanza: verifica que el servidor este encendido y que ambas
  computadoras esten en la misma red (mismo router / switch).
- Si Metalu cambia de IP porque tu router se reinicio: borra el
  archivo "%APPDATA%\metalu\metalu-client.toml" y abre el cliente
  de nuevo para que redescubra.
- La primera vez Windows puede mostrar una advertencia de SmartScreen
  ("Editor desconocido"). Haz clic en "Mas informacion" y luego
  "Ejecutar de todas formas". Esto pasa porque el .exe no tiene
  certificado de firma digital.

Desinstalar
-----------
Borra "metalu-client.exe". No deja rastro en el sistema.
```

- [ ] **Step 8.3: Verify the distribution folder**

Run:
```bash
ls -la dist-server/metalu-client-v0.2.0/
```

Expected: Two files — `metalu-client.exe` and `LEEME.txt`.

- [ ] **Step 8.4: Commit**

Run:
```bash
cd /Users/francisco/Desktop/metalu/.claude/worktrees/v0.2-lan-node-server
git add dist-server/metalu-client-v0.2.0/LEEME.txt
git commit -m "docs(tauri-client): add LEEME.txt quick-start for operators

3-paragraph Spanish guide covering install (just copy the .exe),
usage (double-click, no URL typing), and troubleshooting
(SmartScreen warning, IP-change recovery by deleting metalu-client.toml)."
```

Expected: One commit. Working tree clean. Note: the `.exe` is gitignored and NOT committed — it's a build artifact that the user copies separately.

---

### Task 9: Create ZIP distribution

**Files:**
- Create: `dist-server/metalu-client-v0.2.0.zip`

- [ ] **Step 9.1: Zip the distribution folder**

Run:
```bash
cd /Users/francisco/Desktop/metalu/.claude/worktrees/v0.2-lan-node-server/dist-server
zip -qr metalu-client-v0.2.0.zip metalu-client-v0.2.0/ -x "*.DS_Store"
ls -la metalu-client-v0.2.0.zip
```

Expected: ZIP file exists, size between 3 MB and 8 MB (compression reduces the .exe by ~30%).

- [ ] **Step 9.2: Verify the ZIP contents**

Run:
```bash
unzip -l dist-server/metalu-client-v0.2.0.zip
```

Expected: Two entries — `metalu-client-v0.2.0/metalu-client.exe` and `metalu-client-v0.2.0/LEEME.txt`.

- [ ] **Step 9.3: NO COMMIT**

The ZIP is in `dist-server/`, which the project's `.gitignore` typically covers. If it's NOT ignored, add `dist-server/*.zip` to `.gitignore` and commit that change.

---

### Task 10: Update README + docs cross-reference

**Files:**
- Modify: `README.md` (or `docs/superpowers/specs/2026-07-21-tauri-client-distribution-design.md`'s "Open questions" section) to note that the client is now shipped.

- [ ] **Step 10.1: Find the right place to document**

Run:
```bash
cd /Users/francisco/Desktop/metalu/.claude/worktrees/v0.2-lan-node-server
rg -l "metalu-server-v0.2.0.zip" README.md docs/ 2>/dev/null
```

Expected: At least one match — the README probably mentions the server ZIP. Add a similar note for the client ZIP right next to it.

- [ ] **Step 10.2: Add the client distribution note**

Edit the README to add (next to the existing server ZIP mention):

```markdown
### Client installation (other LAN PCs)

Download `metalu-client-v0.2.0.zip` from the same release. Unzip,
double-click `metalu-client.exe`. No install required.
```

Use whatever tone and formatting the existing README uses.

- [ ] **Step 10.3: Commit**

Run:
```bash
cd /Users/francisco/Desktop/metalu/.claude/worktrees/v0.2-lan-node-server
git add README.md
git commit -m "docs: add metalu-client-v0.2.0.zip install instructions to README"
```

Expected: One commit. Working tree clean.

---

### Task 11: Manual smoke test (the validation gate)

**Files:** none — this is the end-to-end verification that the whole feature works.

- [ ] **Step 11.1: Confirm both ZIPs exist on the workshop PC**

Run:
```bash
ls -la /Users/francisco/Desktop/metalu/.claude/worktrees/v0.2-lan-node-server/dist-server/metalu-server-v0.2.0.zip
ls -la /Users/francisco/Desktop/metalu/.claude/worktrees/v0.2-lan-node-server/dist-server/metalu-client-v0.2.0.zip
```

Expected: Both files exist. Note sizes.

- [ ] **Step 11.2: On the workshop PC, start the server**

Run:
```bash
cd /Users/francisco/Desktop/metalu/.claude/worktrees/v0.2-lan-node-server/dist-server/metalu-server-v0.2.0
cmd //c iniciar.cmd
```

Expected: Server starts. Window shows "[preboot] OK" then Next.js boots. Keep this running.

- [ ] **Step 11.3: Copy the client to another LAN PC**

Copy `metalu-client-v0.2.0/` (the unzipped folder) to a non-server PC on the same LAN. Use a USB stick, shared folder, or `scp` — whatever's available.

- [ ] **Step 11.4: First-run smoke test**

On the non-server PC:
1. Delete `%APPDATA%\metalu\metalu-client.toml` if it exists (force first-run state).
2. Double-click `metalu-client.exe`.
3. Observe: window opens showing "Buscando servidor..." with spinner.
4. Within ~5s the window navigates to the Next.js login page.
5. Log in with `admin / admin123` — full app works.

Expected: All five steps succeed. The client discovered the server via UDP and navigated correctly.

- [ ] **Step 11.5: Subsequent-run smoke test**

1. Close the client window.
2. Double-click `metalu-client.exe` again.
3. Observe: window opens and shows the login page almost instantly (no "Buscando..." delay).

Expected: The cached URL short-circuit works. Login visible within ~1 second of double-click.

- [ ] **Step 11.6: Discovery-failure smoke test**

1. Stop the server (close the CMD window on the workshop PC).
2. Delete `%APPDATA%\metalu\metalu-client.toml` on the client PC.
3. Double-click `metalu-client.exe`.
4. Observe: window shows "Buscando servidor..." with spinner, no navigation.
5. Restart the server (run `iniciar.cmd` again).
6. Within ~10s the client window navigates to the login.

Expected: Spinner shows while server is down. When server comes back up, the 10s poll picks it up.

- [ ] **Step 11.7: Report results**

In the final reply to the user, summarize which smoke tests passed and any that failed. If any test fails, fix the underlying issue (likely a Tauri config path or the `frontendDist` resolution) and re-run that test before declaring done.

---

## Self-Review Checklist

| Spec requirement | Task |
|------------------|------|
| Single-file `metalu-client.exe` (no installer) | Task 7 + Task 5 (`bundle.targets: "none"`) |
| First-run UDP discovery | Task 2 (helper) + Task 3 (setup callback) |
| Cached URL short-circuit on subsequent runs | Task 2 (`try_resolve_server_url`) + Task 11.5 |
| `first_run.html` spinner fallback when discovery fails | Task 4 + Task 11.6 |
| `retry_discovery` Tauri command for polling | Task 3 |
| `client::run_client()` no longer a stub | Task 3.2 |
| Cleanup of `src-tauri-client/` (1.7 GB) | Task 1.2 |
| Cleanup of stale build artifacts (~3 GB) | Task 1.3 |
| Separate `metalu-client-v0.2.0.zip` distribution | Task 9 |
| `LEEME.txt` Spanish quick-start | Task 8.2 |
| Unit test for cache short-circuit | Task 2.2–2.5 |
| Manual smoke test (cache + discovery + failure paths) | Task 11 |

All requirements covered. No placeholders.