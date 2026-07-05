# Troubleshooting

## macOS: "Metalu Server.app" can't be opened (Gatekeeper)

The app isn't notarized in v1. Right-click the .dmg or the .app inside Applications → "Open" → confirm the dialog.

## Windows: WebView2 runtime missing

Tauri requires WebView2. Windows 11 includes it by default. Windows 10 may need it installed. Download from Microsoft: <https://developer.microsoft.com/microsoft-edge/webview2/>

## Server port 3000 already in use

Another process on the server PC is using port 3000. Either stop that process or set `PORT=3001` in the Tauri shell environment. Update the discovery response too — clients need to point at the new port.

## Client can't find server via UDP

- Both PCs on the same subnet? (`ping <server-ip>` from the client PC should respond.)
- Server firewall allowing UDP `:3001`? (macOS and Windows firewalls prompt on first run; click "Allow".)
- Corporate VPN active? Some VPNs block UDP broadcasts. Disable or use manual URL entry.

## Prisma client errors in server log

Check `/api/health` from a browser on the server. If it returns 503, pglite failed to open the data dir. Check:
- Disk space
- Permissions on `~/Library/Application Support/Metalu/metalu-db/` (macOS) or `%APPDATA%/Metalu/metalu-db/` (Windows)

## Backup button disabled

Backup API only runs when `METALU_RUNTIME=tauri`. If running outside Tauri (e.g., `npm run dev`), the panel shows "sólo disponible en instalación Tauri local" — expected.

## How to fully uninstall

1. Quit the app.
2. macOS: drag `Metalu.app` to Trash. Optional: also delete `~/Library/Application Support/Metalu/`.
3. Windows: Settings → Apps → "Metalu Server" → Uninstall.

The data dir is NOT removed by uninstall (so reinstalling brings your data back). Delete manually if you want a clean slate.