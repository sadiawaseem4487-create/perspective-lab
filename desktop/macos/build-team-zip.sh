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

# Always use the latest Fix script from the repo (not the older copy inside the DMG)
cp "$ROOT/desktop/macos/Fix-Mac-Open.command" "$FOLDER/Fix Mac Open.command"
chmod +x "$FOLDER/Fix Mac Open.command"

cp "$ROOT/desktop/macos/GATEKEEPER.md" "$FOLDER/About Mac security.txt" 2>/dev/null || true

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
1. Open Finder → Go → Applications (or click Applications in the sidebar)
2. Drag "PerspectiveLab" from this folder into Applications
3. Wait until the copy finishes
4. Confirm it appears in Applications (not only in this ZIP folder)


STEP 3 — First open (IMPORTANT — new macOS)
-------------------------------------------
If you double-click PerspectiveLab, macOS may show:

  "Apple could not verify PerspectiveLab…"
  buttons: Done   |   Move to Bin

Do NOT click "Move to Bin" (that deletes the app).
Click Done, then use ONE of these fixes:

  A) BEST — right-click "Fix Mac Open.command" → Open → Open
     (allow Terminal if asked). It clears the block and starts the app.

  B) System Settings → Privacy & Security → scroll down →
     click "Open Anyway" next to PerspectiveLab → Open

  C) Open Terminal and paste this, then press Enter:

     xattr -cr /Applications/PerspectiveLab.app && open /Applications/PerspectiveLab.app

This warning is normal for lab software without Apple notarization.
It is NOT malware.


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
• Still blocked → use Fix Mac Open.command or Privacy & Security → Open Anyway
• Browser does not open → go to http://127.0.0.1:8000
• "Cannot connect" → Terminal was closed; open the app again
• Agents fail → Setup → paste/save API key again
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
