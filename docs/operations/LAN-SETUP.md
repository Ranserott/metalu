# LAN setup

## Network assumptions

- All PCs are on the same LAN (same subnet — e.g., all on `192.168.1.*`).
- UDP port 3001 is open between server and clients (default; required for discovery).
- TCP port 3000 is open between server and clients (the Next.js port).

If your network blocks UDP broadcast (some corporate firewalls do), UDP discovery won't work — clients must type the server URL manually.

## Static vs dynamic IPs

The client caches the server's URL on first discovery. If the server's IP changes (DHCP lease expired), the client shows "Conectando con el servidor..." until you re-discover by clicking "Buscar server" in the modal.

For workshop installations where the server PC is on, recommend giving the server a static IP via your router's DHCP reservation.

## What if 2 PCs both try to act as server?

Currently both run independently. The second server's writes are isolated — clients connected to the wrong server see orphaned data. v1 doesn't elect a leader; avoid this by installing the server only on the chosen PC.

## Server offline

If the server PC is off or restarting, client Tauri windows show a "Conectando con el servidor..." toast and retry every 5s. Once the server returns, all clients reconnect with their existing sessions intact (JWT cookies survive).