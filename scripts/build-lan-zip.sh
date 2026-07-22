#!/usr/bin/env bash
# Builds metalu-lan.zip — a portable archive that the client unpacks on
# their PC and runs via iniciar.bat. Excludes everything that's derived
# (node_modules, build outputs, the PGlite data dir, etc.) so the zip is
# small enough to email and has no secrets.
#
# Usage:
#   bash scripts/build-lan-zip.sh
#
# Output:
#   ./metalu-lan.zip  (sibling of package.json)
#
# The client flow:
#   1. unzip metalu-lan.zip -d C:\Metalu
#   2. double-click iniciar.bat
#   3. http://localhost:3000  (admin / admin123)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

VERSION="$(node -p "require('./package.json').version")"
OUT="$ROOT/metalu-lan.zip"

# Use the timestamp so re-builds don't get clobbered by Windows file locking
# if the user is browsing the previous archive at the same time.
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_STAMPED="$ROOT/metalu-lan-${VERSION}-${STAMP}.zip"

# `git archive` is available anywhere the source was cloned and avoids relying
# on a separate zip binary, which is absent from GitHub's Windows runner.
if ! command -v git >/dev/null 2>&1; then
    printf '%s\n' "ERROR: 'git' not found in PATH" >&2
    exit 1
fi

echo "[zip] archiving committed source from $ROOT"

git archive --format=zip --output="$OUT_STAMPED" HEAD

# Also write the canonical (latest) filename so iniciar.bat paths and
# download URLs don't need the timestamp.
cp "$OUT_STAMPED" "$OUT"

echo "[zip] wrote $OUT_STAMPED"
echo "[zip] wrote $OUT"
