# Install — detailed guide

## Prerequisites

- macOS 12+ (Apple Silicon or Intel) OR Windows 10+ (x64).
- 200 MB free disk space for the server (client needs ~80 MB).
- LAN connectivity between the server PC and any client PCs (same WiFi or wired LAN).

## Server install

The server is the only PC that owns the database. Choose one PC that stays on reliably during business hours.

### macOS
- Open `Metalu-Server-macOS.dmg` (right-click → Open the first time).
- Drag "Metalu Server.app" to `/Applications`.
- Launch it. The Tauri window appears and the Next.js server is reachable at `http://localhost:3000`.
- Top of the window shows the LAN IP (e.g., `192.168.1.5`). Clients use this URL.

### Windows
- Run `Metalu-Server-Setup.exe`. Pick install location (default fine).
- Launch "Metalu Server" from the Start menu. Same behavior as macOS.

## Client install

The client is a thin webview wrapper — same installer binary, but launches in client mode.

### macOS / Windows
- Install the same way.
- On first launch, a modal prompts for the server URL. Click "Buscar server" to UDP-discover the server on the LAN.
- If discovery fails, type the URL manually (e.g., `http://192.168.1.5:3000`).

## Verifying

- Server: open `http://localhost:3000` from the server PC's browser. Login should succeed.
- Client: open `http://<server-ip>:3000` from another PC's browser. If you can log in, the client install is wired correctly.