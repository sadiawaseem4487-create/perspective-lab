#!/bin/sh
set -e

# Render injects RENDER=true. Force SaaS production unless explicitly allowed otherwise.
# This overrides a mistaken ENVIRONMENT=development in the dashboard.
if [ "${RENDER}" = "true" ] && [ "${ALLOW_DEV_ON_RENDER}" != "true" ]; then
  export ENVIRONMENT=production
  export AUTH_REQUIRED=true
  echo "Render detected: forcing ENVIRONMENT=production AUTH_REQUIRED=true"
fi

export ENVIRONMENT="${ENVIRONMENT:-production}"
export AUTH_REQUIRED="${AUTH_REQUIRED:-true}"

if [ -n "${DATABASE_URL}" ]; then
  echo "Using Postgres DATABASE_URL for durable accounts"
elif [ -n "${DATABASE_PATH}" ]; then
  mkdir -p "$(dirname "${DATABASE_PATH}")"
else
  mkdir -p /app/backend/data
fi

cd /app/backend

python - <<'PY'
from config import get_settings, refresh_settings
from database import init_db, storage_is_persistent, count_users_safe
from db import (
    _postgres_connect_kwargs,
    _safe_postgres_target,
    database_url,
    storage_backend,
)
from auth_service import auth_required

refresh_settings()
settings = get_settings()
settings.validate_production()
url = database_url()
if url:
    # Help diagnose bad copy/paste without printing the password.
    at_count = url.count("@")
    print(
        "DATABASE_URL diagnostics: "
        f"len={len(url)} at_count={at_count} "
        f"has_brackets={'[' in url or ']' in url} "
        f"has_sslmode={'sslmode=' in url} "
        f"starts={url[:28]!r}"
    )
    try:
        params = _postgres_connect_kwargs(url)
        print(f"Postgres target: {_safe_postgres_target(params)}")
    except Exception as exc:
        print(f"DATABASE_URL parse failed: {exc}")
init_db()
persistent = storage_is_persistent()
users = count_users_safe()
backend = storage_backend()
print(
    f"Boot OK version={settings.app_version} "
    f"ENVIRONMENT={settings.environment} auth_required={auth_required()} "
    f"storage={backend} persistent_storage={persistent} user_count={users}"
)
if not persistent:
    print(
        "WARNING: storage is ephemeral — set DATABASE_URL to Render Postgres "
        "(see render.yaml) so accounts survive redeploys."
    )
PY

exec gunicorn main:app -c /app/docker/gunicorn.conf.py
