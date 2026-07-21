#!/usr/bin/env bash
set -euo pipefail

# Build the Next.js standalone bundle, then package it with @yao-pkg/pkg into
# a single metalu-server.exe for Windows x64.

WORKTREE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$WORKTREE_ROOT/dist-server"
TARGET="node20-win-x64"

echo "[build] cleaning $DIST"
rm -rf "$DIST"
mkdir -p "$DIST"

echo "[build] next build (standalone output)"
cd "$WORKTREE_ROOT"
npx next build

echo "[build] staging standalone into $DIST"
mkdir -p "$DIST/standalone"
cp -R .next/standalone/. "$DIST/standalone/"
mkdir -p "$DIST/standalone/.next"
cp -R .next/static "$DIST/standalone/.next/static" 2>/dev/null || true
mkdir -p "$DIST/standalone/public"
cp -R public/. "$DIST/standalone/public/" 2>/dev/null || true

# Copy public files PKG needs at runtime (PGlite WASM, fonts)
mkdir -p "$DIST/standalone/public-files"
cp -R node_modules/@electric-sql/pglite/dist "$DIST/standalone/public-files/pglite" 2>/dev/null || true

echo "[build] pkg bundling"
npx pkg "$DIST/standalone/src/server/entry.js" \
  --target "$TARGET" \
  --output "$DIST/metalu-server.exe" \
  --public-files "$DIST/standalone/public-files/*"

echo "[build] done — $DIST/metalu-server.exe"
ls -lh "$DIST/metalu-server.exe"
