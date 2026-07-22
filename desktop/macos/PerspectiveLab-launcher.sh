#!/usr/bin/env bash
# PerspectiveLab.app entry — shows setup dialogs, then opens Terminal for install/run.
set -euo pipefail

RES_DIR="$(cd "$(dirname "$0")/../Resources" && pwd)"
APP_DIR="$RES_DIR/app"
SUPPORT="$HOME/Library/Application Support/PerspectiveLab"
RUNTIME="$SUPPORT/runtime"
HELPER="$SUPPORT/run-in-terminal.sh"
mkdir -p "$SUPPORT" "$RUNTIME"

dialog() {
  osascript -e "display dialog \"$2\" with title \"$1\" buttons {\"OK\"} default button 1" >/dev/null 2>&1 || true
}

confirm() {
  osascript -e "button returned of (display dialog \"$2\" with title \"$1\" buttons {\"Cancel\", \"Continue\"} default button \"Continue\")" 2>/dev/null || echo "Cancel"
}

# Write the long-running helper (sourced PATH + app dir baked in)
cat > "$HELPER" << EOF
#!/usr/bin/env bash
set -euo pipefail
APP_DIR="$APP_DIR"
RUNTIME="$RUNTIME"
SUPPORT="$SUPPORT"
LOG="\$SUPPORT/launch.log"
mkdir -p "\$SUPPORT"
exec > >(tee -a "\$LOG") 2>&1

export PATH="\$RUNTIME/node/bin:/usr/local/bin:/opt/homebrew/bin:\$PATH"

echo ""
echo "=========================================="
echo "  PerspectiveLab"
echo "=========================================="
echo ""

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  ARCH=\$(uname -m)
  case "\$ARCH" in arm64) NARCH=arm64 ;; *) NARCH=x64 ;; esac
  VER="v22.14.0"
  NAME="node-\${VER}-darwin-\${NARCH}"
  URL="https://nodejs.org/dist/\${VER}/\${NAME}.tar.gz"
  echo "Downloading Node.js (\${NAME})…"
  TMP=\$(mktemp -d)
  curl -fL "\$URL" -o "\$TMP/node.tar.gz"
  tar -xzf "\$TMP/node.tar.gz" -C "\$TMP"
  rm -rf "\$RUNTIME/node"
  mv "\$TMP/\$NAME" "\$RUNTIME/node"
  rm -rf "\$TMP"
  export PATH="\$RUNTIME/node/bin:\$PATH"
  echo "Node ready: \$(node -v)"
fi

if [ -x /usr/bin/python3 ]; then PY=/usr/bin/python3
elif command -v python3 >/dev/null 2>&1; then PY=\$(command -v python3)
else
  echo "Python 3 missing. Install from https://www.python.org/downloads/ then re-open PerspectiveLab."
  open "https://www.python.org/downloads/" 2>/dev/null || true
  read -r -p "Press Enter to close…"
  exit 1
fi

cd "\$APP_DIR/frontend"
if [ ! -d node_modules ]; then
  echo "[1/4] Installing frontend…"
  npm install
else
  echo "[1/4] Frontend ready."
fi
echo "[2/4] Building interface…"
npm run build

cd "\$APP_DIR/backend"
if [ ! -d .venv ]; then
  echo "[3/4] Installing backend…"
  "\$PY" -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
pip install -q -r requirements.txt
if [ ! -f .env ] && [ ! -f "\$APP_DIR/.env" ]; then
  cp .env.example .env
fi

echo "[4/4] Starting server at http://localhost:8000"
echo "Keep this window OPEN. Press Ctrl+C to stop."
echo ""
sleep 2
open "http://localhost:8000/setup" 2>/dev/null || true
exec uvicorn main:app --host 127.0.0.1 --port 8000
EOF
chmod +x "$HELPER"

# First-run consent for Node auto-download
NEED_NODE=0
if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  if [ ! -x "$RUNTIME/node/bin/node" ]; then
    NEED_NODE=1
  fi
fi

MSG="Welcome to PerspectiveLab.

This will prepare the research app on your Mac.
First launch can take a few minutes."
if [ "$NEED_NODE" = "1" ]; then
  MSG="$MSG

Node.js was not found. PerspectiveLab can download a private copy for this app only (recommended)."
fi

ANS="$(confirm "PerspectiveLab Setup" "$MSG")"
if [ "$ANS" != "Continue" ]; then
  dialog "PerspectiveLab" "Setup cancelled."
  exit 0
fi

# Open Terminal so install progress is visible (wizard-style)
osascript <<OSA
tell application "Terminal"
  activate
  do script "bash '$HELPER'"
end tell
OSA
