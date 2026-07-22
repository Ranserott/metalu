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
# The PKG-bundled server runs in tauri mode at runtime, so tell Next.js to
# evaluate the tauri branch of src/lib/prisma/prisma.ts during build-time
# route collection. Without this, `next build` throws "DATABASE_URL not set"
# because prisma.ts falls into the hosted-Postgres branch.
METALU_RUNTIME=tauri npx next build

echo "[build] staging standalone into $DIST"
mkdir -p "$DIST/standalone"
cp -R .next/standalone/. "$DIST/standalone/"
mkdir -p "$DIST/standalone/.next"
cp -R .next/static "$DIST/standalone/.next/static" 2>/dev/null || true
mkdir -p "$DIST/standalone/public"
cp -R public/. "$DIST/standalone/public/" 2>/dev/null || true

node - "$DIST/standalone/server.js" <<'NODE'
const fs = require("fs");
const file = process.argv[2];
const source = fs.readFileSync(file, "utf8");
const target = "process.chdir(__dirname)";
if (!source.includes(target)) {
  throw new Error(`Cannot patch ${file}: generated chdir not found`);
}
fs.writeFileSync(file, source.replace(target, "if (!process.pkg) process.chdir(__dirname)"));
NODE

# Copy public files PKG needs at runtime (PGlite WASM is bundled via pkg.assets in package.json)
mkdir -p "$DIST/standalone/public-files"
cp -R node_modules/@electric-sql/pglite/dist "$DIST/standalone/public-files/pglite" 2>/dev/null || true

echo "[build] pkg bundling"
npx pkg "$DIST/standalone/server.js" \
  --target "$TARGET" \
  --output "$DIST/metalu-server.exe" \
  --public

echo "[build] done — $DIST/metalu-server.exe"
ls -lh "$DIST/metalu-server.exe"
