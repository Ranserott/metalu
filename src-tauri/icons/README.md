# Tauri icons

Generated from `logo.svg` via `npx @tauri-apps/cli icon` on 2026-07-20. Update by re-running that command against a new source PNG (≥1024×1024).

## Required at build time

- `icon.png` — 512×512 RGBA. Primary source.
- `icon.ico` — Windows: 16/32/48/64/128/256 multi-res.
- `icon.icns` — macOS: full ic09 set.

## Optional (Windows MSIX / Store metadata)

The `Square*Logo.png` and `StoreLogo.png` files are tile assets used by the Microsoft Store / MSIX packaging path. They aren't referenced by `tauri.{,server.,client.}conf.json` and not used by the desktop installer path. Kept around for future Store packaging.
