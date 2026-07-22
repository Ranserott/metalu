---
title: Tauri Client Distribution — Webview .exe for LAN Workshop PCs
date: 2026-07-21
status: approved
---

# Tauri Client Distribution — Webview .exe for LAN Workshop PCs

## Context

Metalu v0.2 is the LAN distribution: a Node.js server that runs on a workshop PC, exposing the app on `http://<server-ip>:3000`. Today, operators on the other LAN PCs have to open a browser and type that IP. That works, but it's unprofessional — easy to mistype, exposes the URL, and looks like a dev artifact.

We need a real desktop client: a Windows `.exe` that, when double-clicked, opens a window pointing at the server with zero typing. The server discovery happens via the UDP broadcast protocol already implemented in `src-tauri/src/discovery.rs` (server side) and `src-tauri/src/client.rs` (client side).

The Tauri scaffolding already exists under `src-tauri/` (server + client modes in one crate, dispatched by `METALU_BUILD_TARGET`). What's missing is the actual Tauri Builder for the client mode — `client::run_client()` is a stub that just parks a thread. This spec finishes that work and ships a buildable `.exe`.

There is also a parallel `src-tauri-client/` crate that was an abandoned earlier attempt at splitting the client out. Its 1.7 GB build cache and 6 dead commits need to go away before this work starts.

## Decision

Ship a **single-file `metalu-client.exe`** (no installer) that uses the existing `src-tauri/` crate in client mode. On first run it discovers the server via UDP, navigates the webview, and caches the URL in `%APPDATA%\metalu\metalu-client.toml`. Subsequent launches skip discovery and open the cached URL instantly.

The client is a thin shell — no bundled server, no Node.js, no Next.js inside the `.exe`. It's ~6–10 MB and relies on WebView2 (preinstalled on Win10/11).

## Architecture

### Components

| Path | Purpose |
|------|---------|
| `src-tauri/src/client_app.rs` (new) | Tauri Builder for client mode. Wires the `setup()` callback that runs initial discovery, and exposes the `retry_discovery` Tauri command (invoked by `first_run.html`'s JS to re-trigger discovery after a timeout). No "forget server" UI — clearing the cache is done by deleting the `.toml` file (documented in `LEEME.txt`). |
| `src-tauri/src/first_run.html` (new) | Static HTML loaded as the initial frontend. Shows a centered spinner + status text. Its inline JS uses `@tauri-apps/api/core` `invoke()` to call `retry_discovery` every 10 s and to navigate when discovery succeeds. The file is bundled by `tauri::generate_context!` at compile time — no runtime file lookup needed. |
| `src-tauri/src/client.rs` (modify) | `run_client()` stops being a stub — calls `client_app::run()`. The existing `discover_server`, `load_config`, `save_config`, `build_server_url`, `validate_server_url` functions stay untouched. |
| `src-tauri/src/lib.rs` (no change) | `run()` dispatch already routes `METALU_BUILD_TARGET=client` → `client::run_client()`. |
| `src-tauri/tauri.client.conf.json` (modify) | Set `frontendDist` to the in-tree path of `first_run.html` (relative to `src-tauri/`, e.g. `"frontendDist": "../src-tauri/first_run.html"` — verify exact path during implementation). Set `productName` to `Metalu Cliente`, `identifier` to `cl.metalu.client`. Keep window `width: 1280, height: 800, resizable: true`. |
| `src-tauri/Cargo.toml` (no changes expected) | The existing `tauri = "2"` features are sufficient for webview navigation via `WebviewWindow::navigate`. If a feature is missing during implementation, add it — but do not speculatively add deps. |
| `package.json` (add script) | `tauri:build:client` → `cargo tauri build --config src-tauri/tauri.client.conf.json --bundles none`. (`--bundles none` produces just the `.exe` with no NSIS/MSI wrapper.) |
| `dist-server/metalu-client-v0.2.0/` (new distribution) | Final folder containing `metalu-client.exe` + `README.md` + `LEEME.txt` (Spanish quick-start). |
| `dist-server/metalu-client-v0.2.0.zip` (new artifact) | Compressed distribution for download. Separate from the server ZIP. |

### Data flow — first run (no config)

1. Operator double-clicks `metalu-client.exe`.
2. Tauri starts, opens a window loading `first_run.html` (spinner + status text).
3. `setup()` callback runs:
   - Reads `%APPDATA%\metalu\metalu-client.toml` via `load_config()` — empty.
   - Since `server_url` is `None`, calls `discover_server(Duration::from_secs(5))`.
   - Spawns a tokio task so the UI thread isn't blocked.
4. Discovery sends UDP magic packet to `255.255.255.255:3001`, waits up to 5 s.
5. On first valid JSON response `{ ip, hostname, port }`:
   - Build URL `http://{ip}:{port}` via `build_server_url`.
   - Call `webview_window.navigate(url)`.
   - Persist `server_url` via `save_config` (atomic write to `.toml`).
6. Webview now shows the Next.js app served by the workshop PC.

### Data flow — subsequent runs (config has URL)

1. Operator double-clicks `metalu-client.exe`.
2. Tauri starts, opens window with `first_run.html`.
3. `setup()` reads config — finds `server_url = "http://192.168.1.21:3000"`.
4. Immediately calls `navigate(server_url)` — no UDP, no delay.
5. Webview shows Next.js.

### Data flow — discovery fails, no cache

1. Setup reads config — empty.
2. Discovery times out after 5 s with no response.
3. Webview stays on `first_run.html`. Its inline JS invokes the `retry_discovery` Tauri command every 10 s.
4. Each retry is a synchronous-ish call (returns the new URL or `null`). If `retry_discovery` returns a URL, JS calls `window.location.href = url` (or the equivalent via Tauri) to navigate. If it returns `null`, the spinner keeps spinning.

### Failure handling

| Scenario | Behavior |
|----------|----------|
| Server not responding to UDP | `first_run.html` shows "Buscando servidor..." spinner. Re-attempts every 10 s. No total timeout — operator can close the app. |
| Cached URL but server is down | Navigate runs. Next.js returns its own 503/error page. Operator closes + reopens to re-discover. |
| Invalid URL in config (operator hand-edited) | `validate_server_url` already rejects malformed URLs at save time. Read path doesn't re-validate. If somehow a bad URL is persisted, Next.js fails to load — operator clears `%APPDATA%\metalu\metalu-client.toml`. |
| Two servers on the LAN | Discovery returns the first to respond. Last-write-wins. |
| Network disconnects mid-session | Webview stays on whatever was last loaded. New navigations fail with WebView2 error. |
| DHCP changes the server's IP | Cached URL is stale → load fails → operator deletes `metalu-client.toml` and reopens. Documented in `LEEME.txt`. |

### Cleanup (must happen before implementation)

Reclaim ~5 GB and remove the dead `src-tauri-client` crate:

| Path | Size | Action |
|------|------|--------|
| `/Users/francisco/Desktop/metalu/src-tauri/target` | 2.6 GB | Delete. Cache from main repo's old Tauri builds; regenerable with `cargo build`. |
| `/Users/francisco/Desktop/metalu/src-tauri/gen` | small | Delete. Generated Tauri schemas; regenerable. |
| `/Users/francisco/Desktop/metalu/src-tauri/Cargo.lock` | small | Delete. Will regenerate on next `cargo build`. (No effect on other worktrees; this is the main repo's working tree.) |
| `v0.2-lan-node-server/src-tauri-client/` (entire tree) | 1.7 GB | `git rm -r`. Abandoned parallel-crate attempt. Logic is superseded by `src-tauri/`'s `METALU_BUILD_TARGET=client` mode. The 6 commits stay in git history if ever needed. |
| `v0.2-lan-node-server/dist-server/standalone` | 131 MB | Delete. Intermediate Next.js standalone output — already copied into `metalu-server-v0.2.0/app/`. |
| `v0.2-lan-node-server/dist-server/metalu-server-v0.2.0 2` | 401 MB | Delete. Backup of broken build from prior session. New bundle is `metalu-server-v0.2.0/`. |
| `v0.2-lan-node-server/dist-server/metalu-server-v0.2.0.zip` (old 140 MB) | 140 MB | Delete. Replaced by the new 122 MB zip from the latest build. |

Cleanup is its own commit, separate from the feature work, so it's reversible if anything is wrong.

### Distribution

Final deliverable: **`dist-server/metalu-client-v0.2.0.zip`** (~7 MB compressed, contains a single `.exe` + `LEEME.txt`).

Contents:
```
metalu-client-v0.2.0/
  metalu-client.exe      # The Tauri webview wrapper (~7 MB)
  LEEME.txt              # Spanish quick-start (3 paragraphs)
```

Operator workflow:
1. Copy `metalu-client.exe` to any folder (Desktop, Program Files, USB stick — anywhere).
2. Double-click.
3. Window opens, finds server on the LAN, shows the login page.

No installation. No admin rights needed. To uninstall: delete the `.exe`.

## Out of scope (v1)

- Manual server URL entry UI — operator edits the `.toml` file if needed.
- Per-role binaries (`metalu-admin.exe` / `metalu-supervisor.exe`) — task #451 was a placeholder; the current model is one client that uses whatever session the server gives it.
- Auto-reconnect when server recovers mid-session.
- IPv6 discovery.
- macOS / Linux builds.
- Code signing certificate (operators get a SmartScreen warning on first run — documented in `LEEME.txt`).
- Auto-update mechanism.

## Testing

### Unit (Rust, in-file `#[cfg(test)]`)
- `build_server_url()` — formats `http://{ip}:{port}` ✅ (exists)
- `config_roundtrip` — TOML load/save preserves URL ✅ (exists)
- `validate_server_url()` — rejects malformed URLs ✅ (exists)
- `client_app::run` smoke — Builder initializes without panicking when setup is mocked.

### Integration (`tests/client_app.rs`)
- `setup_with_cached_url_skips_discovery` — pre-populated `.toml`, mock listener bound on :3001, assert NO UDP packet sent and `navigate(cached_url)` is called.
- `setup_without_config_runs_discovery` — empty `.toml`, mock listener replies with valid JSON, assert `navigate(discovered_url)` is called.
- `setup_discovery_timeout_keeps_first_run` — empty `.toml`, no listener, assert `navigate` is NOT called within the 5 s window.

### Manual smoke (after build)
1. Build: `pnpm tauri:build:client` produces `src-tauri/target/release/metalu-client.exe`.
2. Copy to a non-server PC on the same LAN.
3. Double-click → window opens → within 5 s shows the Next.js login.
4. Close + reopen → window opens instantly on the login.
5. Stop the server → reopen client → "Buscando servidor..." appears, retries.
6. Restart server → within 10 s the client navigates to it.
7. Delete `%APPDATA%\metalu\metalu-client.toml` → reopen → behaves as first-run (re-discovers).

## Open questions

None — all resolved during brainstorming on 2026-07-21.