#!/usr/bin/env bash
# Build a fully self-contained macOS .dmg (Node NOT required on client Mac).
# Bundles: standalone Python + preinstalled venv + prebuilt frontend dist.
# Usage: ./desktop/macos/build-dmg.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
STAGE="${TMPDIR:-/tmp}/PerspectiveLab-dmg-$$"
APP="$STAGE/PerspectiveLab.app"
RES="$APP/Contents/Resources"
CACHE="${XDG_CACHE_HOME:-$HOME/Library/Caches}/PerspectiveLab-build"
OUT_DMG="$HOME/Desktop/PerspectiveLab-Installer.dmg"
VOL="PerspectiveLab Installer"

NODE_VER="v22.14.0"
PY_TAG="20251217"
PY_VER="3.12.12"

arch="$(uname -m)"
case "$arch" in
  arm64)
    NODE_ARCH="arm64"
    PY_ARCH="aarch64-apple-darwin"
    ;;
  *)
    NODE_ARCH="x64"
    PY_ARCH="x86_64-apple-darwin"
    ;;
esac

NODE_NAME="node-${NODE_VER}-darwin-${NODE_ARCH}"
NODE_URL="https://nodejs.org/dist/${NODE_VER}/${NODE_NAME}.tar.gz"
PY_NAME="cpython-${PY_VER}+${PY_TAG}-${PY_ARCH}-install_only_stripped.tar.gz"
PY_URL="https://github.com/astral-sh/python-build-standalone/releases/download/${PY_TAG}/${PY_NAME}"

echo "Building self-contained PerspectiveLab DMG for ${arch}..."
rm -rf "$STAGE"
mkdir -p "$APP/Contents/MacOS" "$RES/app" "$RES/runtime" "$CACHE"

cat > "$APP/Contents/Info.plist" << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>PerspectiveLab</string>
  <key>CFBundleDisplayName</key><string>PerspectiveLab</string>
  <key>CFBundleIdentifier</key><string>fi.hamk.perspectivelab</string>
  <key>CFBundleVersion</key><string>1.1.0</string>
  <key>CFBundleShortVersionString</key><string>1.1.0</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleExecutable</key><string>PerspectiveLab</string>
  <key>LSMinimumSystemVersion</key><string>11.0</string>
  <key>NSHighResolutionCapable</key><true/>
</dict>
</plist>
PLIST

# --- Fetch build Node (builder machine only; not required at runtime if dist is prebuilt) ---
if [ ! -x "$CACHE/node/bin/node" ]; then
  echo "Downloading Node ${NODE_VER} (build cache)…"
  tmp="$(mktemp -d)"
  curl -fL "$NODE_URL" -o "$tmp/node.tar.gz"
  tar -xzf "$tmp/node.tar.gz" -C "$tmp"
  rm -rf "$CACHE/node"
  mv "$tmp/$NODE_NAME" "$CACHE/node"
  rm -rf "$tmp"
fi
export PATH="$CACHE/node/bin:$PATH"
echo "Build Node: $(node -v)"

# --- Fetch standalone Python (bundled into app for clients) ---
if [ ! -x "$CACHE/python/bin/python3" ]; then
  echo "Downloading standalone Python ${PY_VER}…"
  tmp="$(mktemp -d)"
  curl -fL "$PY_URL" -o "$tmp/python.tar.gz"
  tar -xzf "$tmp/python.tar.gz" -C "$tmp"
  # install_only extracts a top-level "python/" directory
  rm -rf "$CACHE/python"
  mv "$tmp/python" "$CACHE/python"
  rm -rf "$tmp"
fi
echo "Build Python: $($CACHE/python/bin/python3 -V)"

# --- App source ---
git -C "$ROOT" archive --format=tar HEAD | tar -x -C "$RES/app"
rm -f "$RES/app/backend/.env" "$RES/app/.env" 2>/dev/null || true
rm -rf "$RES/app/frontend/node_modules" "$RES/app/backend/.venv" \
  "$RES/app/frontend/dist" "$RES/app/frontend/src-tauri/target" 2>/dev/null || true

# --- Prebuild frontend (client never needs npm) ---
echo "Building frontend into bundle…"
(
  cd "$RES/app/frontend"
  npm install
  npm run build
  # Shrink: runtime only needs dist/
  rm -rf node_modules
)

# --- Bundle Python runtime ---
echo "Bundling Python runtime…"
rm -rf "$RES/runtime/python"
cp -R "$CACHE/python" "$RES/runtime/python"

# --- Preinstall backend venv with bundled Python ---
echo "Installing Python packages into bundle…"
PY="$RES/runtime/python/bin/python3"
"$PY" -m venv "$RES/app/backend/.venv"
# shellcheck disable=SC1091
source "$RES/app/backend/.venv/bin/activate"
pip install -q --upgrade pip
pip install -q -r "$RES/app/backend/requirements.txt"
# Offline wheel cache for relocating venv on client Mac
mkdir -p "$RES/wheels"
pip download -q -r "$RES/app/backend/requirements.txt" -d "$RES/wheels"
deactivate

# Icon
if [ -f "$ROOT/frontend/src-tauri/icons/icon.icns" ]; then
  cp "$ROOT/frontend/src-tauri/icons/icon.icns" "$RES/AppIcon.icns"
  /usr/libexec/PlistBuddy -c 'Add :CFBundleIconFile string AppIcon' "$APP/Contents/Info.plist" 2>/dev/null || \
    /usr/libexec/PlistBuddy -c 'Set :CFBundleIconFile AppIcon' "$APP/Contents/Info.plist" 2>/dev/null || true
fi

cp "$ROOT/desktop/macos/PerspectiveLab-launcher.sh" "$APP/Contents/MacOS/PerspectiveLab"
chmod +x "$APP/Contents/MacOS/PerspectiveLab"

# DMG layout
mkdir -p "$STAGE/dmg"
cp -R "$APP" "$STAGE/dmg/PerspectiveLab.app"
ln -s /Applications "$STAGE/dmg/Applications"
cat > "$STAGE/dmg/READ ME.txt" << 'EOF'
PerspectiveLab — self-contained Mac installer
=============================================

No Node.js or Python install needed on this Mac.

1. Drag PerspectiveLab into Applications
2. Open Applications → PerspectiveLab
3. If macOS blocks it: right-click → Open → Open (once)
4. Browser opens → Setup → paste your API key
5. Keep the Terminal window open while using the app

Everything (Python + research server + UI) is inside the app.
EOF

rm -f "$OUT_DMG"
echo "Creating DMG (this may take a minute)…"
hdiutil create -volname "$VOL" -srcfolder "$STAGE/dmg" -ov -format UDZO "$OUT_DMG"
xattr -cr "$OUT_DMG" 2>/dev/null || true

rm -rf "$STAGE"
echo ""
echo "Created: $OUT_DMG"
ls -lh "$OUT_DMG"
open -R "$OUT_DMG"
