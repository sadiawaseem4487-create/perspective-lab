#!/bin/sh
set -e

cd /app/backend

python - <<'PY'
from config import get_settings
from database import init_db

settings = get_settings()
settings.validate_production()
init_db()
print("Database initialized.")
PY

exec gunicorn main:app -c /app/docker/gunicorn.conf.py
