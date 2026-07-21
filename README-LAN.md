# MetalFlow ERP — LAN Distribution (v0.2.0)

Installable desktop app for Windows. One PC acts as server (DB + Next.js +
UDP discovery). 2-5 client PCs discover it over LAN via Tauri shells.

## Prerequisites

- Windows 10/11 x64 (all PCs)
- All PCs on the same LAN (router, switch, or WiFi)
- WebView2 runtime (preinstalled on Win 11; auto-installed by client .exe on
  Win 10)

## Install — Server PC

1. Copy `metalu-server.exe` to the server PC (e.g., `C:\metalu\`).
2. Double-click. A console window appears showing:
   ```
   [server] data dir: C:\Users\<user>\AppData\Roaming\metalu
   [server] Next.js listening on http://0.0.0.0:3000
   [server] UDP announcer broadcasting on :3001 every 5000ms
   ```
3. Open `http://localhost:3000` in any browser on the server PC.
4. Login with `admin / admin` (first-run default). Change immediately under
   Settings → Users.
5. Note the IP shown at `/admin/server-info` (e.g., `192.168.1.5`).

## Install — Client PCs

1. Copy `metalu-client.exe` to each client PC.
2. Double-click. A window opens with the login UI.
3. First launch discovers the server via UDP (≤30s).
4. Subsequent launches reuse the cached URL for 30 days.

## Backup & Restore

Server-side: `http://<server-ip>:3000/admin/backups`

- **Hacer backup ahora** → writes `metalu-YYYY-MM-DD.pglitebackup` to
  `%APPDATA%\metalu\backups\`. Keep last 10, older are auto-pruned.
- **Descargar** → grab a `.pglitebackup` for offsite storage.
- **Restaurar desde archivo** → uploads + replaces DB. Lock file prevents
  concurrent restores.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Client shows "No se encontró servidor" | Server off, or different VLAN/WiFi | Verify server console window is open and PCs share the same router |
| Client stuck on "Conectando..." | Server unreachable mid-session | Check server console; reload client window |
| "Disco lleno" toast on backup | `%APPDATA%` is full | Free space or change `APPDATA` env var before launching server |
| Cache stale after IP change | DHCP renewed | Delete `%APPDATA%\metalu-client\server-url.json` and relaunch client |

## Network requirements

- LAN assumed trusted. No TLS. If workshop has guest WiFi, use WPA2
  client-isolation on the guest SSID.
- UDP port 3001 must be unblocked on the server's firewall (default Windows
  Firewall prompts on first run).
- If your router isolates clients (AP isolation), discovery fails. Disable
  isolation or use a wired switch.

## Uninstall

- Delete `metalu-server.exe` and `metalu-client.exe`.
- Delete `%APPDATA%\metalu\` to wipe DB and backups (irreversible).

## Limits (v1)

- 2-5 concurrent PCs recommended (PGlite single-writer).
- No HTTPS, no auto-update, no cloud sync.
- Windows x64 only.