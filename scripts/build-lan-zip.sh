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

# `zip` is available on macOS out of the box. On the CI runner (windows-latest)
# the Git for Windows Bash ships `zip` too.
if ! command -v zip >/dev/null 2>&1; then
    echo "ERROR: 'zip' not found in PATH" >&2
    echo "Install with: brew install zip (macOS)" >&2
    exit 1
fi

echo "[zip] staging source from $ROOT"
echo "[zip] excluding build/runtime artifacts"

# Patterns to exclude. `zip -x` matches each file path against each pattern;
# trailing /* keeps directories empty (zip still records the dir entry) which
# is fine because the client never traverses them.
zip -r "$OUT_STAMPED" . \
    -x "node_modules/*" \
    -x ".next/*" \
    -x "dist-server/*" \
    -x "dist/*" \
    -x "metalu-db/*" \
    -x ".git/*" \
    -x ".github/*" \
    -x "src-tauri/target/*" \
    -x "src-tauri-client/target/*" \
    -x "tests/*" \
    -x "docs/*" \
    -x "coverage/*" \
    -x ".playwright-cli/*" \
    -x "graphify-out/*" \
    -x "*.log" \
    -x ".DS_Store" \
    -x "metalu-lan*.zip" \
    -x "package-lock.json" \
    >/dev/null

# Also write the canonical (latest) filename so iniciar.bat paths and
# download URLs don't need the timestamp.
cp "$OUT_STAMPED" "$OUT"

echo "[zip] wrote $OUT_STAMPED"
ls -lh "$OUT_STAMPED" "$OUT"
