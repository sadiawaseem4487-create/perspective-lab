#!/usr/bin/env bash
# Cross-platform launcher for PerspectiveLab (macOS, Linux, Windows Git Bash/WSL).
# Prefer OS-specific double-click starters when available:
#   macOS:   Start App.command
#   Windows: Start App.bat  or  Start App.ps1
#   Linux:   Start App.sh   or  ./start.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "=========================================="
echo "  PerspectiveLab"
echo "  Starting... (first run may take 2-5 min)"
echo "=========================================="
echo ""

detect_python() {
  if command -v python3 >/dev/null 2>&1; then
    echo "python3"
  elif command -v python >/dev/null 2>&1; then
    echo "python"
  else
    echo ""
  fi
}

open_browser() {
  local url="$1"
  local uname_s
  uname_s="$(uname -s 2>/dev/null || echo unknown)"
  case "$uname_s" in
    Darwin*)
      open "$url" 2>/dev/null || true
      ;;
    Linux*)
      if command -v xdg-open >/dev/null 2>&1; then
        xdg-open "$url" >/dev/null 2>&1 || true
      elif command -v sensible-browser >/dev/null 2>&1; then
        sensible-browser "$url" >/dev/null 2>&1 || true
      fi
      ;;
    MINGW*|MSYS*|CYGWIN*)
      cmd.exe /c start "" "$url" >/dev/null 2>&1 || true
      ;;
    *)
      echo "Open this URL in your browser: $url"
      ;;
  esac
}

PY="$(detect_python)"
if [ -z "$PY" ]; then
  echo "ERROR: Python 3 not found."
  echo "  macOS: usually preinstalled, or install from https://www.python.org"
  echo "  Windows: https://www.python.org (enable Add to PATH)"
  echo "  Linux: sudo apt install python3 python3-venv python3-pip"
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: Node.js / npm not found. Install LTS from https://nodejs.org"
  exit 1
fi

cd "$ROOT/frontend"
if [ ! -d node_modules ]; then
  echo "[1/4] Installing frontend..."
  npm install
else
  echo "[1/4] Frontend ready."
fi
echo "[2/4] Building interface..."
npm run build

cd "$ROOT/backend"
if [ ! -d .venv ]; then
  echo "[3/4] Installing backend ($PY)..."
  "$PY" -m venv .venv
fi

# shellcheck disable=SC1091
if [ -f .venv/bin/activate ]; then
  # macOS / Linux / WSL / Git Bash with Unix venv
  source .venv/bin/activate
elif [ -f .venv/Scripts/activate ]; then
  # Git Bash on Windows with Windows-style venv
  # shellcheck disable=SC1091
  source .venv/Scripts/activate
else
  echo "ERROR: Could not activate virtualenv."
  exit 1
fi

pip install -q -r requirements.txt

if [ ! -f .env ] && [ ! -f "$ROOT/.env" ]; then
  cp .env.example .env
  echo ""
  echo "Created backend/.env — use Setup in the app to paste your API key."
  echo ""
fi

echo "[4/4] Starting server..."
echo ""
echo "  Open in browser:  http://localhost:8000"
echo "  First time? Use the Setup page to add your OpenRouter or OpenAI key."
echo "  Keep this window OPEN while using the app."
echo "  Press Ctrl+C to stop."
echo ""

sleep 2
open_browser "http://localhost:8000/setup"

cd "$ROOT/backend"
if [ -f .venv/bin/activate ]; then
  # shellcheck disable=SC1091
  source .venv/bin/activate
elif [ -f .venv/Scripts/activate ]; then
  # shellcheck disable=SC1091
  source .venv/Scripts/activate
fi
exec uvicorn main:app --host 127.0.0.1 --port 8000
