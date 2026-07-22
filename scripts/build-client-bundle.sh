#!/usr/bin/env bash
# Cross-builds the Metalu Windows client .exe from macOS using
# Neutralino.js and stages it into the dist-server/ distribution folder.
#
# Usage:
#   bash scripts/build-client-bundle.sh
#
# Pre-requisites:
#   - Node.js + npm (uses `npx neu` from local @neutralinojs/neu dep)
#   - Internet access for the first build (Neutralino downloads the
#     platform-specific native binaries from its CDN; cached thereafter)
#
# After this script completes, the Windows .exe lives at:
#   dist-server/metalu-client-v0.2.0/metalu-client.exe

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DIST_DIR="dist-server/metalu-client-v0.2.0"
NEU_BIN_DIR="dist/metalu-client"
WINDOWS_EXE_NAME="metalu-client-win_x64.exe"
EXE_NAME="metalu-client.exe"

echo "[build-client] Building all platforms via Neutralino..."
npx neu build --release

if [ ! -f "$NEU_BIN_DIR/$WINDOWS_EXE_NAME" ]; then
  echo "[build-client] ERROR: expected $NEU_BIN_DIR/$WINDOWS_EXE_NAME not found"
  echo "[build-client] Available files in dist/:"
  fd -e exe . dist/ 2>/dev/null || true
  exit 1
fi

mkdir -p "$DIST_DIR"
cp "$NEU_BIN_DIR/$WINDOWS_EXE_NAME" "$DIST_DIR/$EXE_NAME"
echo "[build-client] Staged: $DIST_DIR/$EXE_NAME"
ls -lh "$DIST_DIR/$EXE_NAME"
