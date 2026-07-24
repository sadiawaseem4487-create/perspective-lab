#!/usr/bin/env bash
# Silent self-contained launcher: uses ONLY bundled Python + prebuilt UI.
# Writable state lives in ~/Library/Application Support/PerspectiveLab
set -euo pipefail

RES_DIR="$(cd "$(dirname "$0")/../Resources" && pwd)"
BUNDLE_APP="$RES_DIR/app"
BUNDLE_PY="$RES_DIR/runtime/python"
SUPPORT="$HOME/Library/Application Support/PerspectiveLab"
APP_DIR="$SUPPORT/app"
PY_DIR="$SUPPORT/runtime/python"
HELPER="$SUPPORT/run-in-terminal.sh"
READY="$SUPPORT/.bundle-ready-v1.1"

mkdir -p "$SUPPORT"

dialog() {
  osascript -e "display dialog \"$2\" with title \"$1\" buttons {\"OK\"} default button 1" >/dev/null 2>&1 || true
}

# Materialize a writable copy once (Applications may be read-only for writes)
if [ ! -f "$READY" ]; then
  dialog "PerspectiveLab" "Preparing PerspectiveLab on this Mac (one-time). No Node/Python install needed — everything is inside the app."
  mkdir -p "$SUPPORT/runtime"
  rm -rf "$APP_DIR" "$PY_DIR"
  ditto "$BUNDLE_APP" "$APP_DIR"
  ditto "$BUNDLE_PY" "$PY_DIR"
  if [ -d "$RES_DIR/wheels" ]; then
    rm -rf "$SUPPORT/wheels"
    ditto "$RES_DIR/wheels" "$SUPPORT/wheels"
  fi
  # Recreate venv with local Python paths (offline wheels when available)
  rm -rf "$APP_DIR/backend/.venv"
  "$PY_DIR/bin/python3" -m venv "$APP_DIR/backend/.venv"
  # shellcheck disable=SC1091
  source "$APP_DIR/backend/.venv/bin/activate"
  pip install -q --upgrade pip
  if [ -d "$SUPPORT/wheels" ]; then
    pip install -q --no-index --find-links "$SUPPORT/wheels" -r "$APP_DIR/backend/requirements.txt"
  else
    pip install -q -r "$APP_DIR/backend/requirements.txt"
  fi
  deactivate
  touch "$READY"
fi

cat > "$HELPER" << EOF
#!/usr/bin/env bash
set -euo pipefail
APP_DIR="$APP_DIR"
PY_DIR="$PY_DIR"
SUPPORT="$SUPPORT"
LOG="\$SUPPORT/launch.log"
mkdir -p "\$SUPPORT"
exec > >(tee -a "\$LOG") 2>&1

echo ""
echo "=========================================="
echo "  PerspectiveLab (self-contained)"
echo "=========================================="
echo ""

export PATH="\$PY_DIR/bin:\$APP_DIR/backend/.venv/bin:\$PATH"

if [ ! -x "\$APP_DIR/backend/.venv/bin/uvicorn" ]; then
  echo "Repairing Python environment…"
  "\$PY_DIR/bin/python3" -m venv "\$APP_DIR/backend/.venv"
  # shellcheck disable=SC1091
  source "\$APP_DIR/backend/.venv/bin/activate"
  pip install -q --upgrade pip
  pip install -q -r "\$APP_DIR/backend/requirements.txt"
fi

# shellcheck disable=SC1091
source "\$APP_DIR/backend/.venv/bin/activate"

cd "\$APP_DIR/backend"
if [ ! -f .env ]; then
  cp .env.example .env
fi

# Prefer prebuilt UI from bundle
if [ ! -f "\$APP_DIR/frontend/dist/index.html" ]; then
  echo "ERROR: UI bundle missing. Please reinstall from the DMG."
  read -r -p "Press Enter to close…"
  exit 1
fi

echo "Server: http://localhost:8000"
echo "Keep this window OPEN. Press Ctrl+C to stop."
echo ""
sleep 1
open "http://localhost:8000/setup" 2>/dev/null || open "http://localhost:8000" 2>/dev/null || true
exec uvicorn main:app --host 127.0.0.1 --port 8000
EOF
chmod +x "$HELPER"

# Minimal prompt — no software download choices
osascript >/dev/null 2>&1 <<OSA || true
display dialog "Starting PerspectiveLab…

Browser will open to Setup so you can paste your API key.
Keep the Terminal window open while using the app." with title "PerspectiveLab" buttons {"OK"} default button 1
OSA

osascript <<OSA
tell application "Terminal"
  activate
  do script "bash '$HELPER'"
end tell
OSA
