#!/usr/bin/env bash
# Build a drag-to-Applications macOS .dmg with a first-run setup wizard.
# Usage: ./desktop/macos/build-dmg.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
STAGE="${TMPDIR:-/tmp}/PerspectiveLab-dmg-$$"
APP="$STAGE/PerspectiveLab.app"
RES="$APP/Contents/Resources"
OUT_DMG="$HOME/Desktop/PerspectiveLab-Installer.dmg"
VOL="PerspectiveLab Installer"

echo "Building PerspectiveLab macOS installer DMG..."
rm -rf "$STAGE"
mkdir -p "$APP/Contents/MacOS" "$RES/app"

# App metadata
cat > "$APP/Contents/Info.plist" << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>PerspectiveLab</string>
  <key>CFBundleDisplayName</key><string>PerspectiveLab</string>
  <key>CFBundleIdentifier</key><string>fi.hamk.perspectivelab</string>
  <key>CFBundleVersion</key><string>1.0.0</string>
  <key>CFBundleShortVersionString</key><string>1.0.0</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleExecutable</key><string>PerspectiveLab</string>
  <key>LSMinimumSystemVersion</key><string>11.0</string>
  <key>NSHighResolutionCapable</key><true/>
</dict>
</plist>
PLIST

# Bundle application source (no secrets / node_modules)
git -C "$ROOT" archive --format=tar HEAD | tar -x -C "$RES/app"
rm -f "$RES/app/backend/.env" "$RES/app/.env" 2>/dev/null || true
rm -rf "$RES/app/frontend/node_modules" "$RES/app/backend/.venv" \
  "$RES/app/frontend/dist" "$RES/app/frontend/src-tauri/target" 2>/dev/null || true

# Icon if present
if [ -f "$ROOT/frontend/src-tauri/icons/icon.icns" ]; then
  cp "$ROOT/frontend/src-tauri/icons/icon.icns" "$RES/AppIcon.icns"
  /usr/libexec/PlistBuddy -c 'Add :CFBundleIconFile string AppIcon' "$APP/Contents/Info.plist" 2>/dev/null || \
    /usr/libexec/PlistBuddy -c 'Set :CFBundleIconFile AppIcon' "$APP/Contents/Info.plist" 2>/dev/null || true
fi

# Launcher with first-run wizard (auto-fetch Node if missing)
cp "$ROOT/desktop/macos/PerspectiveLab-launcher.sh" "$APP/Contents/MacOS/PerspectiveLab"
chmod +x "$APP/Contents/MacOS/PerspectiveLab"

# DMG layout: Applications symlink + app + readme
mkdir -p "$STAGE/dmg"
cp -R "$APP" "$STAGE/dmg/PerspectiveLab.app"
ln -s /Applications "$STAGE/dmg/Applications"
cat > "$STAGE/dmg/READ ME.txt" << 'EOF'
PerspectiveLab — Mac installer
==============================

1. Drag PerspectiveLab into Applications
2. Open Applications → PerspectiveLab
3. If macOS blocks it: right-click → Open → Open
4. First launch may download Node.js automatically (one-time)
5. Browser opens → Setup → paste your API key

Need help? See CLIENT_HANDOVER inside the app resources, or ask your facilitator.
EOF

rm -f "$OUT_DMG"
hdiutil create -volname "$VOL" -srcfolder "$STAGE/dmg" -ov -format UDZO "$OUT_DMG"
xattr -cr "$OUT_DMG" 2>/dev/null || true

rm -rf "$STAGE"
echo ""
echo "Created: $OUT_DMG"
ls -lh "$OUT_DMG"
open -R "$OUT_DMG"
