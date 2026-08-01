#!/bin/bash
# Clears macOS "Apple could not verify" quarantine and opens PerspectiveLab.
# Works from the team ZIP folder OR after install in Applications.
# Right-click this file → Open  (if double-click is blocked).
cd "$(dirname "$0")" || exit 1

HERE="$(pwd)"
CANDIDATES=(
  "$HERE/PerspectiveLab.app"
  "/Applications/PerspectiveLab.app"
  "$HOME/Applications/PerspectiveLab.app"
)

APP=""
for candidate in "${CANDIDATES[@]}"; do
  if [ -d "$candidate" ]; then
    APP="$candidate"
    break
  fi
done

echo "PerspectiveLab — fix Mac security block"
echo "======================================"
echo ""

if [ -z "$APP" ]; then
  echo "Could not find PerspectiveLab.app."
  echo "1. Keep this Fix next to PerspectiveLab.app in the ZIP folder, or"
  echo "2. Drag PerspectiveLab.app into Applications, then run Fix again."
  echo ""
  read -r -p "Press Enter to close…"
  exit 1
fi

echo "Found: $APP"
echo "Removing download quarantine flag…"
xattr -cr "$APP" 2>/dev/null || true
xattr -d com.apple.quarantine "$APP" 2>/dev/null || true

# Also clear quarantine on this folder (ZIP extract location)
xattr -cr "$HERE" 2>/dev/null || true

echo "Opening PerspectiveLab…"
open "$APP" 2>/dev/null || open -a "$APP" 2>/dev/null || true

echo ""
echo "If macOS still blocks it:"
echo "  1. Click Done (do NOT click Move to Bin)"
echo "  2. Open System Settings → Privacy & Security"
echo "  3. Scroll down → click Open Anyway next to PerspectiveLab"
echo "  4. Confirm Open"
echo ""
echo "Or paste this in Terminal:"
echo "  xattr -cr \"$APP\" && open \"$APP\""
echo ""
read -r -p "Press Enter to close…"
