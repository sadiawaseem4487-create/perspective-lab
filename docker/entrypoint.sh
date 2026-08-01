#!/bin/sh
set -e

# SaaS defaults — Render dashboard can still override, but never leave unset as "development"
export ENVIRONMENT="${ENVIRONMENT:-production}"
export AUTH_REQUIRED="${AUTH_REQUIRED:-true}"

cd /app/backend

python - <<'PY'
from config import get_settings
from database import init_db

settings = get_settings()
settings.validate_production()
init_db()
print(f"Database initialized. ENVIRONMENT={settings.environment} auth_required will follow settings.")
PY

exec gunicorn main:app -c /app/docker/gunicorn.conf.py
