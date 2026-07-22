#!/usr/bin/env bash
# Start PerspectiveLab for desktop / local use (backend serves UI + API).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT/frontend"
if [ ! -d node_modules ]; then
  npm install
fi
npm run build

cd "$ROOT/backend"
if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
pip install -q -r requirements.txt

if [ ! -f .env ] && [ ! -f "$ROOT/.env" ]; then
  cp .env.example .env
  echo "Created backend/.env — open the app and use the Setup wizard to add your API key."
fi

echo "Starting PerspectiveLab at http://127.0.0.1:8000"
exec uvicorn main:app --host 127.0.0.1 --port 8000
