#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "=========================================="
echo "  PerspectiveLab"
echo "  Starting... (first run may take 2-5 min)"
echo "=========================================="
echo ""

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
  echo "[3/4] Installing backend..."
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
pip install -q -r requirements.txt

if [ ! -f .env ] && [ ! -f "$ROOT/.env" ]; then
  cp .env.example .env
  echo ""
  echo "Created backend/.env — open the app and use Setup to paste your API key."
  echo ""
fi

echo "[4/4] Starting server..."
echo ""
echo "  Open in browser:  http://localhost:8000"
echo "  First time? Use the Setup page to add your OpenRouter or OpenAI key."
echo ""
echo "  Keep this window OPEN while using the app."
echo "  Press Ctrl+C to stop."
echo ""

sleep 2
open "http://localhost:8000/setup" 2>/dev/null || open "http://localhost:8000" 2>/dev/null || true

cd "$ROOT/backend"
# shellcheck disable=SC1091
source .venv/bin/activate
exec uvicorn main:app --host 127.0.0.1 --port 8000
