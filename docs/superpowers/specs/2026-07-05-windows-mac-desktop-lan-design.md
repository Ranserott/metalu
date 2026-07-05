# Windows/Mac Desktop Distribution + LAN Topology — Design Spec

**Date:** 2026-07-05
**Status:** Approved — ready for implementation plan
**Scope:** Repackage MetalFlow ERP as a double-click-installable desktop app for Windows and Mac, where one PC acts as server (DB + Next.js) and 2-5 client PCs connect over LAN.

## Problem

MetalFlow ERP currently runs as a hosted web app with PostgreSQL on a remote server. The user wants to deploy it on premise at a small workshop (2-5 PCs in one LAN) with the following qualities:

1. **Installable with double-click** on Windows and Mac — no terminal, no Node.js, no manual Postgres setup.
2. **One PC acts as server**, the rest connect to it over LAN as clients.
3. **Local-first** — DB and app live on the server PC's filesystem, accessible from the LAN.

The current architecture is unsuited for this: PostgreSQL requires a server process install, no desktop wrapper exists, and there is no concept of LAN discovery.

## Goal

Ship a Tauri-based desktop shell that bundles the existing Next.js MetalFlow app together with an embedded Postgres database (pglite + Prisma adapter). One codebase produces two binaries via a build-time flag:

- **Server build** — bundles Next.js, Prisma, pglite. Spins up on double-click, listens on `0.0.0.0:3000`, owns the DB file in OS app-data dir.
- **Client build** — bundles only a Tauri webview. On first run, asks for the server's LAN IP (or auto-discovers via UDP broadcast). Opens the webview pointing at `http://<server-ip>:3000`.

All existing app code (modules, services, APIs, validation schemas, auth) continues to work without modification. The embedded Postgres keeps the same dialect as the current remote Postgres, so the Prisma schema is **unchanged**.

## Non-Goals (YAGNI — explicit out-of-scope for v1)

- HTTPS / TLS on LAN (LAN assumed trusted; no cert handling).
- Hot failover (if server PC dies, replace it manually with a backup — no auto-promotion).
- Auto-updates from server (Fran distributes new `.dmg`/`.exe` manually for v1).
- Scheduled/automated backups (button-triggered only; scheduler is follow-up).
- Code signing + Apple notarization (paid certs deferred until outside-the-taller distribution).
- Multi-write Postgres / multi-node concurrency (pglite is single-writer — same ceiling as SQLite, fine for 2-5 PCs).
- Cross-compiling Windows binaries from macOS (use GitHub Actions `windows-latest` runner instead).
- Persistence of client discovery across Tauri shell restarts (LAN config persists; discovery re-runs on miss).

## Architecture

```
        ┌─────────────────────────────────────────┐         ┌─────────────────────────────────────┐
        │              PC SERVIDOR                │         │              PC CLIENTE              │
        │  (installer ~83MB — Tauri + Next + WASM)│         │   (installer ~15MB — Tauri webview) │
        │                                         │         │                                     │
        │  ┌─────────────────────────────────┐    │         │  ┌─────────────────────────────┐    │
        │  │ Tauri shell (Rust)              │    │         │  │ Tauri shell (Rust)          │    │
        │  │  ┌─────────────────────────┐    │    │  HTTP   │  │  ┌────────────────────┐     │    │
        │  │  │ Next.js standalone     │    │    │  :3000  │  │  │ webview → server   │     │    │
        │  │  │  ├─ API routes         │◄───┼────┼─────────┼──┼─►│  URL (cached)      │     │    │
        │  │  │  ├─ Server Components  │    │    │         │  │  └────────────────────┘     │    │
        │  │  │  └─ next-auth v5 (JWT) │    │    │         │  │                             │    │
        │  │  └─────────────────────────┘    │    │         │  │  UDP broadcast listener :   │    │
        │  │  ┌─────────────────────────┐    │    │         │  │  3001                       │    │
        │  │  │ Prisma 7 + pglite-     │    │    │         │  │                             │    │
        │  │  │ prisma-adapter         │    │    │         │  └─────────────────────────────┘    │
        │  │  └─────────────────────────┘    │    │         │                                     │
        │  │  ┌─────────────────────────┐    │    │         │                                     │
        │  │  │ pglite (Postgres WASM)  │    │    │         │                                     │
        │  │  │ data dir = ./metalu-db/ │    │    │         │                                     │
        │  │  └─────────────────────────┘    │    │         │                                     │
        │  └─────────────────────────────────┘    │         │                                     │
        │                                         │         │                                     │
        │  UDP listener :3001 (discovery replies) │         │                                     │
        └─────────────────────────────────────────┘         └─────────────────────────────────────┘
```

Two Tauri binaries, one codebase, distinguished at build time by `BUILD_TARGET=server|client` which selects a different `tauri.conf.json` profile.

## Components

### `src-tauri/` — Tauri Rust shell

Single project, dual build:

**Server mode:**
- On startup: ensure `app_data_dir()/metalu-db/` exists; if not, initialize via `prisma migrate deploy`.
- Spawn `next start` as child process with env `HOSTNAME=0.0.0.0`, `PORT=3000`.
- Health-check loop on `http://localhost:3000/api/health` (1s interval, max 30s).
- Once healthy, open Tauri webview window pointing at `http://localhost:3000`.
- Also bind UDP listener on `:3001` responding to `METALU_DISCOVER` packets with `{ ip, hostname, port }` JSON.

**Client mode:**
- On startup: read `~/.metalu-client.toml` (or equivalent via `app_config_dir()`).
- If config has a server URL and `health` succeeds within 2s → open webview at that URL.
- Otherwise: open a small Tauri-windowed modal asking for server IP/hostname with a "Buscar server" button that UDP-broadcasts and picks the first responder.
- Persist chosen URL back to config.

### Prisma integration

```ts
// src/lib/prisma/client.ts — new
import { PrismaClient } from "@/generated/prisma";
import { PrismaPGlite } from "pglite-prisma-adapter";
import { PGlite } from "@electric-sql/pglite";
import path from "path";
import { app_data_dir } from "@tauri-apps/api/path"; // when called from Tauri context

const dataDir = await resolveDataDir();  // app_data_dir()/metalu-db/
const pg = new PGlite(dataDir);
const adapter = new PrismaPGlite(pg);
export const prisma = new PrismaClient({ adapter });
```

Existing service files (`src/modules/*/services/*Service.ts`) import from `@/lib/prisma/client`; no other changes needed.

### LAN discovery protocol

- UDP port `3001`, both directions.
- Discovery request: ASCII `METALU_DISCOVER\n` broadcast to `255.255.255.255`.
- Discovery response: JSON `{"ip":"192.168.1.5","hostname":"taller-pc","port":3000}` from server Tauri shell.
- Client caches first valid response for 30 days; re-discovers on connection failure.

### Authentication over LAN

- next-auth v5 with `useSecureCookie: false`, `trustHost: true`.
- JWT secret embedded in the Next.js standalone build at build time.
- Per-PC auth sessions (cookies scoped to the host the user logged into). Each PC's browser is a distinct user context — matches the model that each workshop employee has their own PC.

### Backup & restore (admin UI)

- Button in `/settings` → "Hacer backup ahora" → calls `pglite.export()` → writes binary blob to `app_data_dir()/backups/metalu-YYYY-MM-DD.pglitebackup`.
- Button "Restaurar desde backup" → file picker (filtered to `.pglitebackup`) → `pglite.import()` after stopping Next.js child process.

### Build matrix

```
BUILD_TARGET=server pnpm tauri build --target aarch64-apple-darwin
BUILD_TARGET=client pnpm tauri build --target aarch64-apple-darwin
BUILD_TARGET=server pnpm tauri build --target x86_64-apple-darwin
BUILD_TARGET=client pnpm tauri build --target x86_64-apple-darwin
BUILD_TARGET=server pnpm tauri build --target x86_64-pc-windows-msvc   # GitHub Actions only
BUILD_TARGET=client pnpm tauri build --target x86_64-pc-windows-msvc   # GitHub Actions only
```

Two `tauri.conf.json` profiles selected by `BUILD_TARGET`:
- `tauri.server.conf.json` — window title "Metalu Server", app id `cl.metalu.server`, default URL `localhost:3000`, enables server commands.
- `tauri.client.conf.json` — window title "Metalu Cliente", app id `cl.metalu.client`, no server commands.

Both share `tauri.shared.conf.json` base for window geometry, icon, bundle identifier prefix.

## Data Layer (Postgres remains the dialect)

**No schema changes.** `prisma/schema.prisma` keeps `provider = "postgresql"` and the existing URL points to pglite's wire-protocol socket (or is omitted if using the adapter's default).

```diff
- // (no schema.prisma changes at all)
+ // src/lib/prisma/client.ts (new file using pglite-prisma-adapter)
```

The only file added is the Prisma client instantiation with the pglite adapter. All `prisma.<model>.<op>(...)` calls in services work unchanged because pglite speaks real Postgres SQL.

**Postgres features that still work with pglite:**
- All enums (WorkOrderStatus, Priority, QuotationStatus, etc.).
- `Decimal @db.Decimal(p, s)` — pglite has full numeric/decimal support.
- `Json` columns — full JSONB semantics.
- `@default(uuid())` and `@default(cuid())` — both work (cuid generated in Prisma client as String).
- Composite PKs, self-relations, cascade deletes.

**Concurrency:** pglite is single-writer. For 2-5 PCs LAN with infrequent concurrent writes, this is fine. The Next.js API routes layer adds a write-queue layer (see Error Handling) to gracefully handle 503s from serialization.

## API additions

- `GET /api/health` — returns `{ ok: true, version, schemaVersion }`. Used by Tauri client health-check loop.
- `GET /api/version` — returns `{ appVersion, schemaVersion }`. Used by clients to detect version mismatch.

All other existing API routes (`/api/clients`, `/api/work-orders`, ...) work unchanged.

## Error Handling

### Server-PC down/restart
- Client fetch fails → UI toast "Conectando con el servidor..." polling every 5s.
- Tauri webview stays open; user can still see cached UI, just no fresh data.
- When server returns, JWT cookie remains valid (next-auth verifies signature against embedded secret, no DB roundtrip).

### Single-writer conflict (concurrent writes from 2 clients)
- pglite serializes; second writer waits.
- If wait > 5s, pglite returns timeout → service layer maps to 503 with `Retry-After`.
- Client UI: exponential backoff retry (1s, 2s, 4s, 30s max) with toast.

### Schema/version mismatch
- Client calls `GET /api/version` on startup.
- Compares to its bundled `appVersion`. Mismatch → persistent banner in Tauri webview: "El servidor tiene una versión distinta. Pedile al admin el instalador nuevo."

### Corrupted or missing DB
- Tauri server checks `metalu-db/` on startup. If `pglite.open()` throws → modal "Restaurar desde último backup" with file picker.
- Backup directory is `app_data_dir()/backups/`.

## Edge Cases

1. **Server's port 3000 already in use** — Tauri shell picks a free port (3001-3010 fallback), reports chosen port in `METALU_DISCOVER` response.
2. **Network changes between client boot and use** — client re-discovers on first failed request.
3. **Tauri shell crash on server** — Next.js child process exits cleanly too; on Tauri restart, ports get re-allocated.
4. **User accidentally double-launches server on 2 PCs** — both run, both accept writes independently; one becomes de-facto primary. v1 accepts this as a known issue (follow-up = leader election via gossip).
5. **pglite WASM file missing/corrupt in bundle** — Tauri shell fails to start, error dialog "Reinstalar la aplicación".
6. **LAN with no internet** — fully offline capable. Fonts already bundled via `@fontsource/eb-garamond`. No external CDN calls.
7. **macOS Gatekeeper warns on first open** — requires Apple notarization OR user right-click → Open. v1 lives with right-click. Notarization is follow-up.

## Testing Strategy

Proportional to risk. Three levels:

**1. Unit/integration tests for the swap (CI, automated)**
- `tests/prisma-pglite-adapter.test.ts` — verify Prisma client works against pglite adapter with the existing schema (create, findMany, update, delete on a few representative models).
- `tests/lan-discovery.test.ts` — mock UDP sockets, verify request/response parsing and caching.
- `tests/backup-export.test.ts` — verify `pglite.export()` produces a restorable blob.

**2. Build verification (CI)**
- GitHub Actions matrix builds: `macos-latest` (arm64 + x64), `windows-latest` (x64). Each runs `pnpm tauri build` and asserts the artifact exists. No runtime smoke.

**3. Manual smoke test (checklist, on real hardware)**
- Install on macOS (server) → window opens, localhost:3000 reachable.
- Install on macOS (client) → prompts for IP, finds server, log in works.
- Install on Windows (client) → same as above.
- Open 2 clients simultaneously → CRUD operations from both, audit log shows both users, no data loss.

## Build & Distribution

### Scripts

- `scripts/build.sh` — wraps `tauri build` with the `BUILD_TARGET` env variable and target arch.
- `scripts/release.sh` — produces both server + client binaries for one platform, zips them, computes SHA256, generates a `RELEASE-NOTES.md`.

### CI

- `.github/workflows/build.yml` — runs on tag push. Matrix: 4 combos (server/client × {macos-latest, windows-latest}). Uploads artifacts to a GitHub Release.

### Distribution channel v1

- File copies only: `.dmg` and `.exe` delivered by Dropbox / USB / email to the workshop admin (Fran).
- No update server. v2 can add tauri-plugin-updater.

### What's deferred (documented in CLAUDE.md / README)

- HTTPS with local CA.
- Auto-update via tauri-plugin-updater.
- Scheduled backup (cron-like inside Tauri shell).
- Cross-compile Windows from Mac (use CI runner).
- Code signing certs ($99 Apple / $200-400 EV).
- Leader election for redundant servers.
- Apple notarization.

## Files to Create

- `src-tauri/Cargo.toml` — Tauri Rust workspace.
- `src-tauri/tauri.conf.json` — base shared config.
- `src-tauri/tauri.server.conf.json` — server build profile.
- `src-tauri/tauri.client.conf.json` — client build profile.
- `src-tauri/src/main.rs` — Rust entrypoint (server vs client branching).
- `src-tauri/src/server.rs` — server-side commands (spawn Next.js, UDP listener).
- `src-tauri/src/client.rs` — client-side commands (read config, UDP discovery, mode modal).
- `src-tauri/src/discovery.rs` — UDP discovery protocol.
- `src-tauri/src/health.rs` — server health-check loop.
- `src-tauri/icons/` — app icons (server + client variants optional).
- `src/lib/prisma/client.ts` — Prisma client instantiation with pglite adapter.
- `src/lib/tauri/runtime.ts` — Tauri context detection helpers for use inside React components.
- `src/components/admin/BackupPanel.tsx` — admin UI for manual backup/restore.
- `src/app/api/health/route.ts` — health endpoint.
- `src/app/api/version/route.ts` — version endpoint.
- `src/hooks/useServerHealth.ts` — client-side health polling hook.
- `scripts/build.sh` — local build wrapper.
- `scripts/release.sh` — release artifact bundler.
- `.github/workflows/build.yml` — CI build matrix.
- `tests/prisma-pglite-adapter.test.ts` — adapter swap test.
- `tests/lan-discovery.test.ts` — discovery protocol test.

## Files to Modify

- `package.json` — add `@electric-sql/pglite`, `pglite-prisma-adapter`, `@tauri-apps/cli`, `@tauri-apps/api`.
- `prisma/schema.prisma` — no changes needed (Postgres dialect stays).
- `next.config.js` — add `output: 'standalone'` for Tauri server build.
- `tsconfig.json` — paths alias for `@/generated/prisma` already exists; verify.
- `README.md` — document install procedure, troubleshooting (Gatekeeper, port conflicts).

## Implementation Order (9 commits, 8 code + 1 docs)

1. **`chore(deps): add pglite + pglite-prisma-adapter + @tauri-apps/api`** — install embedded Postgres pieces + Tauri JS bridge. Keep `@prisma/adapter-pg` for now (don't remove yet).
2. **`feat(prisma): swap Prisma client to pglite adapter`** — `src/lib/prisma/client.ts` rewritten. Verified with unit test against a model. Existing services continue to import from same path.
3. **`feat(api): add /api/health and /api/version endpoints`** — small new routes, used by Tauri shells.
4. **`chore(tauri): scaffold src-tauri/ workspace + dual build configs`** — Tauri Rust project with server/client profile split.
5. **`feat(tauri-server): spawn Next.js + pglite init + UDP discovery listener`** — Rust commands + child process management + health-check loop.
6. **`feat(tauri-client): UDP discovery + config persistence + first-run modal`** — Rust commands + minimal webview modal.
7. **`feat(admin): backup panel (export/import pglite)** — admin UI to trigger backups and restore.
8. **`feat(ci): add GitHub Actions build matrix for server/client × macOS/Windows`** — CI produces both `.dmg` and `.exe` variants. Includes local `scripts/build.sh` for manual builds.

Plus documentation:
9. **`docs: README + troubleshooting for double-click install + LAN setup`** — operational guide.

No `Co-Authored-By` per repo convention. Conventional commits.

## Verification

End-to-end smoke test on real hardware (the only way to validate the actual install UX):

1. **macOS server build** — install `Metalu Server.app`, double-click. Window opens, `localhost:3000` reachable from server's browser, login works, seed data present.
2. **macOS client build** — install on second Mac on same WiFi. Double-click, see discovery modal, "Buscar server" finds the other Mac, log in works. CRUD a client from both Macs.
3. **Windows client build** — same as above from a Windows PC.
4. **Server restart** — kill server Tauri shell, wait 30s, restart. Clients reconnect automatically.
5. **Backup/restore** — admin clicks "Hacer backup", downloads the `.pglitebackup`, simulates DB corruption, restores from backup. Data comes back.
6. **Offline client** — disconnect Mac client from WiFi for 1 minute. UI shows "Conectando...", reconnect, works.

If all 6 pass, ship.

## Risks

- **`pglite-prisma-adapter` is community-maintained** (npm published 2026-01-17). Prisma officially uses pglite internally for `prisma dev` but does not publish an official adapter yet (open issue: prisma/prisma#23752). Mitigation: fallback path to standard `@prisma/adapter-pg` + a real local Postgres install is documented but not built. If adapter breaks catastrophically in 6 months, swap to SQLite adapter or pre-built bundled Postgres.
- **Single-writer ceiling** — pglite single-writer can become a bottleneck with 6+ concurrent writes/sec. Acceptable for 2-5 PCs in a workshop where CRUD operations are mostly single-user. Test under load: burst 10 simultaneous POSTs from a k6 script, verify p50 < 1s.
- **Tauri config drift** — server-side `tauri.conf.json` vs `next.config.js` (which controls `output: 'standalone'`) can desync. Mitigation: a build-time check that asserts the build target's Next.js output dir matches Tauri's `externalBin` expectation.
- **Webview2 runtime missing on Windows** — Tauri requires WebView2 (preinstalled on Win 11, optional on Win 10). Detection on startup; show modal "Tu Windows necesita una actualización" with link to install WebView2 if missing.
- **macOS Gatekeeper friction** — first launch warns the user. Right-click → Open is the documented workaround for v1 (no notarization).
- **Cross-compile friction** — building Windows artifacts from Mac is unreliable. CI handles it; local Mac builds only for macOS targets.
- **`app_data_dir()` ownership** — if the server PC's `app_data_dir` is cloud-synced (Dropbox), pglite file conflicts can occur. Documented as a "don't sync your app data folder" warning in the admin panel.

## Open Decisions for Implementation Plan

- **Prisma client generation**: keep `output = "../src/generated/prisma"` (custom path already in schema.prisma) — no change.
- **Auth secret**: pass via env at build time; document required `NEXTAUTH_SECRET` env var.
- **HTTP server lifecycle**: Tauri Rust starts/stops Next.js child process on its own; on Tauri quit, send SIGTERM to child (graceful shutdown, no orphaned port).
- **First-user bootstrap**: seed creates an `admin` user on first run; subsequent users created via admin UI. Document the seed flow.
