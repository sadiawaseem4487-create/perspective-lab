#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"

if [ ! -f "$ROOT/.env" ]; then
  echo "Missing .env — copy .env.example and configure it first."
  exit 1
fi

echo "Building and starting production stack..."
docker compose -f "$ROOT/docker-compose.yml" up -d --build

echo ""
echo "Production app running at http://localhost:${PORT:-8000}"
echo "Health: curl http://localhost:${PORT:-8000}/api/health"
