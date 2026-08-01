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
PerspectiveLab — how to install & run (Mac)
===========================================

You need: a Mac (macOS 11+). You do NOT need Node.js or Python.


STEP 1 — Unzip
--------------
1. Download PerspectiveLab-Team.zip
2. Double-click the ZIP to unpack it
3. Open the folder "PerspectiveLab-Team"


STEP 2 — Install the app
------------------------
1. Drag "PerspectiveLab.app" into your Applications folder
   (Finder → Applications, or the Applications shortcut)


STEP 3 — Open the first time (security)
---------------------------------------
macOS may say it "could not verify" the app. That is normal for
lab software that is not Apple-notarized. It is NOT malware.

Do ONE of these:

  A) Easiest — in this folder, double-click "Fix Mac Open.command"
     → click Open / Allow if Terminal asks
     → the app should start

  B) Right-click PerspectiveLab in Applications → Open → Open

  C) System Settings → Privacy & Security → Open Anyway


STEP 4 — First-run setup
------------------------
1. A prepare dialog may appear once (wait — it copies files)
2. A Terminal window opens and starts the local server
   → keep that Terminal window OPEN while you use the app
3. Your browser opens to PerspectiveLab
4. Go to Setup (if asked) and paste your OpenRouter or OpenAI API key
5. Save — then open Workspace and ask a question


STEP 5 — Everyday use
---------------------
1. Open Applications → PerspectiveLab
2. Keep the Terminal window open
3. Use the app in the browser window that opens


If something goes wrong
-----------------------
• Browser does not open → go to http://127.0.0.1:8000
• "Cannot connect" → Terminal was closed; open the app again
• Agents fail → Setup → paste/save API key again
• Still blocked by macOS → use Fix Mac Open.command again
• See also: "About Mac security.txt"


Need help? Ask the person who shared this ZIP with you.
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
