#!/usr/bin/env bash
# Build a Tauri desktop binary locally.
# Usage: ./scripts/build.sh <server|client> [target-triple]
# Examples:
#   ./scripts/build.sh server
#   ./scripts/build.sh client aarch64-apple-darwin

set -euo pipefail

BUILD_TARGET="${1:-server}"
TARGET_TRIPLE="${2:-}"

if [ "$BUILD_TARGET" != "server" ] && [ "$BUILD_TARGET" != "client" ]; then
  echo "Usage: $0 <server|client> [target-triple]" >&2
  exit 1
fi

cd "$(dirname "$0")/.."

echo "[build] Installing deps..."
npm ci

echo "[build] Building Next.js app..."
npm run build

echo "[build] Running tests..."
npm test

echo "[build] Tauri build (target=${BUILD_TARGET})..."
cd src-tauri
METALU_BUILD_TARGET="$BUILD_TARGET" npm run tauri -- build ${TARGET_TRIPLE:+--target "$TARGET_TRIPLE"}