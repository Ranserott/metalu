# MetalFlow ERP — LAN Distribution (v0.2.0)

Installable desktop app for Windows. One PC acts as server (DB + Next.js).
2-5 client PCs connect to it over LAN via Neutralino.js shells (single .exe
each, hardcoded server IP).

## Prerequisites

- Windows 10/11 x64 (all PCs)
- All PCs on the same LAN (router, switch, or WiFi)
- The server PC must have a stable IP (recommended: `192.168.1.21`,
  hardcoded into the client build)

## Install — Server PC

1. Copy `metalu-server.exe` to the server PC (e.g., `C:\metalu\`).
2. Double-click. A console window appears showing:
   ```
   [server] data dir: C:\Users\<user>\AppData\Roaming\metalu
   [server] Next.js listening on http://0.0.0.0:3000
   ```
3. Open `http://localhost:3000` in any browser on the server PC.
4. Login with `admin / admin` (first-run default). Change immediately under
   Settings → Users.
5. Verify the server's LAN IP matches `192.168.1.21` (or rebuild the
   client with the correct IP — see "Regenerating the client" below).

## Install — Client PCs

1. Copy `metalu-client-v0.2.0.zip` to each client PC and unzip.
2. Double-click `metalu-client.exe`. A native window opens with a dark
   splash screen, then navigates to the server at `192.168.1.21:3000`.
3. No install, no admin permissions required. First launch on Windows
   may show a SmartScreen warning (unsigned binary); click "More info"
   → "Run anyway".
4. To uninstall, just delete `metalu-client.exe` — no leftover files.

## Regenerating the client

The server IP `192.168.1.21` is hardcoded into the client at build time.
If your server is on a different IP:

```bash
# In the repo, edit client/index.html (SERVER_URL constant), then:
npm run build:client
# Output: dist-server/metalu-client-v0.2.0/metalu-client.exe
# Re-zip and re-distribute.
```

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
| Client shows "No se pudo conectar" or similar | Server off, wrong IP, or different VLAN/WiFi | Verify server console is open, server IP matches the hardcoded URL, and PCs share the same router |
| Client stuck on "Conectando al servidor..." | Server unreachable mid-session | Check server console; close and reopen the client window |
| SmartScreen warning on first launch | Unsigned binary | Click "Más información" → "Ejecutar de todas formas" |
| "Disco lleno" toast on backup | `%APPDATA%` is full | Free space or change `APPDATA` env var before launching server |

## Network requirements

- LAN assumed trusted. No TLS. If workshop has guest WiFi, use WPA2
  client-isolation on the guest SSID.
- TCP port 3000 must be reachable from clients to the server (default
  Windows Firewall prompts on first run).
- All PCs must be on the same subnet (e.g., `192.168.1.x`) for the
  hardcoded IP to resolve.

## Uninstall

- Delete `metalu-server.exe` and `metalu-client.exe`.
- Delete `%APPDATA%\metalu\` to wipe DB and backups (irreversible).

## Limits (v1)

- 2-5 concurrent PCs recommended (PGlite single-writer).
- No HTTPS, no auto-update, no cloud sync.
- Windows x64 only.
- Server IP is hardcoded into the client; changing it requires rebuilding.