#!/usr/bin/env bash
# Build a shareable team ZIP on the Desktop (no Developer ID needed).
# Contents: PerspectiveLab.app + Fix Mac Open + short README.
# Prefers an existing Desktop DMG so a full rebuild is not required.
# Usage: ./desktop/macos/build-team-zip.sh
#        make desktop-zip
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT_ZIP="$HOME/Desktop/PerspectiveLab-Team.zip"
DMG="$HOME/Desktop/PerspectiveLab-Installer.dmg"
STAGE="${TMPDIR:-/tmp}/PerspectiveLab-team-zip-$$"
FOLDER="$STAGE/PerspectiveLab-Team"

cleanup() {
  if [ -n "${MOUNT:-}" ]; then
    hdiutil detach "$MOUNT" -quiet 2>/dev/null || true
  fi
  rm -rf "$STAGE"
}
trap cleanup EXIT

mkdir -p "$FOLDER"

if [ ! -f "$DMG" ]; then
  echo "No DMG on Desktop — building one first…"
  chmod +x "$ROOT/desktop/macos/build-dmg.sh" "$ROOT/desktop/macos/PerspectiveLab-launcher.sh"
  "$ROOT/desktop/macos/build-dmg.sh"
fi

if [ ! -f "$DMG" ]; then
  echo "ERROR: Expected $DMG after build."
  exit 1
fi

echo "Mounting DMG…"
# Volume names may contain spaces — take everything from /Volumes/ onward.
attach_out="$(hdiutil attach "$DMG" -nobrowse -readonly)"
MOUNT="$(printf '%s\n' "$attach_out" | sed -n 's#.*\(/Volumes/.*\)$#\1#p' | tail -1)"
if [ -z "$MOUNT" ] || [ ! -d "$MOUNT/PerspectiveLab.app" ]; then
  echo "ERROR: Could not find PerspectiveLab.app inside the DMG."
  echo "$attach_out"
  exit 1
fi

echo "Copying app into team folder…"
ditto "$MOUNT/PerspectiveLab.app" "$FOLDER/PerspectiveLab.app"

if [ -f "$MOUNT/Fix Mac Open.command" ]; then
  cp "$MOUNT/Fix Mac Open.command" "$FOLDER/Fix Mac Open.command"
else
  cp "$ROOT/desktop/macos/Fix-Mac-Open.command" "$FOLDER/Fix Mac Open.command"
fi
chmod +x "$FOLDER/Fix Mac Open.command"

if [ -f "$MOUNT/About Mac security.txt" ]; then
  cp "$MOUNT/About Mac security.txt" "$FOLDER/About Mac security.txt"
elif [ -f "$ROOT/desktop/macos/GATEKEEPER.md" ]; then
  cp "$ROOT/desktop/macos/GATEKEEPER.md" "$FOLDER/About Mac security.txt"
fi

cat > "$FOLDER/READ ME.txt" << 'EOF'
PerspectiveLab — team install (Mac)
===================================

No Node.js or Python install needed.

1. Drag PerspectiveLab into Applications
2. If macOS says it "could not verify" the app:
     • Double-click "Fix Mac Open.command"   ← easiest
     • Or right-click PerspectiveLab → Open → Open (once)
3. Browser opens → Setup → paste your API key
4. Keep the Terminal window open while using the app

This ZIP is for internal lab testing. The security warning is normal
without Apple notarization — it is NOT malware.
EOF

hdiutil detach "$MOUNT" -quiet 2>/dev/null || true
MOUNT=""

rm -f "$OUT_ZIP"
echo "Creating ZIP on Desktop…"
# ditto -c -k preserves Mac app bundles better than zip(1)
(
  cd "$STAGE"
  ditto -c -k --sequesterRsrc --keepParent "PerspectiveLab-Team" "$OUT_ZIP"
)

xattr -cr "$OUT_ZIP" 2>/dev/null || true

echo ""
echo "Created: $OUT_ZIP"
ls -lh "$OUT_ZIP"
open -R "$OUT_ZIP"
