#!/usr/bin/env bash
# Sign + notarize PerspectiveLab.app / .dmg so Gatekeeper stops warning.
#
# Prerequisites (one-time, paid):
#   1. Apple Developer Program membership (~$99/year): https://developer.apple.com/programs/
#   2. Create a "Developer ID Application" certificate in Xcode → Settings → Accounts
#   3. Create an app-specific password: https://appleid.apple.com → Sign-In and Security
#   4. Store notarization credentials once:
#        xcrun notarytool store-credentials "perspectivelab-notary" \
#          --apple-id "you@example.com" \
#          --team-id "XXXXXXXXXX" \
#          --password "app-specific-password"
#
# Usage (after make desktop-dmg builds an unsigned app, or pass paths):
#   export DEVELOPER_ID="Developer ID Application: Your Name (TEAMID)"
#   ./desktop/macos/notarize.sh /path/to/PerspectiveLab.app /path/to/PerspectiveLab-Installer.dmg
#
set -euo pipefail

APP="${1:-}"
DMG="${2:-$HOME/Desktop/PerspectiveLab-Installer.dmg}"

if [ -z "${DEVELOPER_ID:-}" ]; then
  echo "Set DEVELOPER_ID to your Developer ID Application identity, e.g.:"
  echo '  export DEVELOPER_ID="Developer ID Application: Your Name (TEAMID)"'
  echo ""
  echo "Available identities:"
  security find-identity -v -p codesigning
  exit 1
fi

if [ -z "$APP" ] || [ ! -d "$APP" ]; then
  echo "Usage: $0 /path/to/PerspectiveLab.app [optional.dmg]"
  exit 1
fi

echo "Signing $APP …"
codesign --force --deep --options runtime \
  --sign "$DEVELOPER_ID" \
  "$APP"

codesign --verify --deep --strict --verbose=2 "$APP"

if [ -f "$DMG" ]; then
  echo "Signing DMG $DMG …"
  codesign --force --sign "$DEVELOPER_ID" "$DMG"
fi

echo "Submitting for notarization (may take several minutes)…"
# Prefer notarizing the DMG (what users download)
TARGET="$DMG"
if [ ! -f "$TARGET" ]; then
  TARGET="$APP"
fi

xcrun notarytool submit "$TARGET" \
  --keychain-profile "perspectivelab-notary" \
  --wait

if [[ "$TARGET" == *.dmg ]]; then
  echo "Stapling ticket to DMG…"
  xcrun stapler staple "$TARGET"
else
  echo "Stapling ticket to app…"
  xcrun stapler staple "$APP"
fi

echo ""
echo "Notarization complete. Clients can open without the malware warning."
spctl -a -vv "$APP" 2>&1 || true
