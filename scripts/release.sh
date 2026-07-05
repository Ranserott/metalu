#!/usr/bin/env bash
# Bundle built artifacts for distribution.
# Usage: ./scripts/release.sh <version>
# Looks under src-tauri/target/*/release/bundle/ for .dmg/.msi/.exe and copies
# them to dist/<version>/<platform>/<build_target>/.

set -euo pipefail

VERSION="${1:-}"
if [ -z "$VERSION" ]; then
  echo "Usage: $0 <version>" >&2
  exit 1
fi

cd "$(dirname "$0")/.."
DIST_DIR="dist/$VERSION"
mkdir -p "$DIST_DIR"

shopt -s nullglob
found=0
for triple in aarch64-apple-darwin x86_64-apple-darwin x86_64-pc-windows-msvc; do
  for bt in server client; do
    bundle_root="src-tauri/target/$triple/release/bundle"
    if [ ! -d "$bundle_root" ]; then continue; fi
    out_dir="$DIST_DIR/$bt-$triple"
    # Wipe any stale artifacts from a previous release of the same version
    # so a deleted/renamed bundle file doesn't survive a fresh find -exec cp.
    rm -rf "$out_dir"
    mkdir -p "$out_dir"
    # Count actual files copied so we only set `found=1` when something landed
    # in $out_dir (the dir's existence is not enough).
    copied=$(find "$bundle_root" \( -name "*.dmg" -o -name "*.msi" -o -name "*.exe" \) -exec cp {} "$out_dir/" \; -print | wc -l | tr -d ' ')
    if [ "$copied" -gt 0 ]; then
      found=1
    fi
  done
done

if [ "$found" -eq 0 ]; then
  echo "No artifacts found under src-tauri/target/*/release/bundle/." >&2
  exit 2
fi

cat > "$DIST_DIR/RELEASE-NOTES.md" <<EOF
# Metalu $VERSION

Manual install artifacts. Each platform+role bundle goes under:
- \`server-<triple>/\` — server install with DB
- \`client-<triple>/\` — client install (points at LAN server)

## Install

1. Unzip the relevant bundle.
2. On macOS, right-click the .dmg → Open to bypass Gatekeeper (no notarization in v1).
3. Drag to /Applications.
4. On Windows, double-click the .exe / .msi and follow prompts.

## First server run

- Launch "Metalu Server" on the chosen PC.
- Note its LAN IP (top of the app window).
- Log in with the seeded admin credentials (set via NEXTAUTH seed; see docs).

## First client run

- Launch "Metalu Cliente" on each other PC in the LAN.
- Discover modal prompts for the server's LAN IP — "Buscar server" finds it automatically.
- Each PC logs in independently; sessions are scoped per-PC.
EOF

( cd "$DIST_DIR" && find . -type f -exec sha256sum {} \; > SHA256SUMS.txt )
echo "Release ready at $DIST_DIR/"