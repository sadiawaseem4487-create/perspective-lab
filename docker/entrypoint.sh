#!/bin/sh
set -e

# Render injects RENDER=true. Force SaaS production unless explicitly allowed otherwise.
# This overrides a mistaken ENVIRONMENT=development in the dashboard.
if [ "${RENDER}" = "true" ] && [ "${ALLOW_DEV_ON_RENDER}" != "true" ]; then
  export ENVIRONMENT=production
  export AUTH_REQUIRED=true
  # Always put SQLite on the persistent disk mount (see render.yaml disk.mountPath).
  export DATABASE_PATH="${DATABASE_PATH:-/app/backend/data/sessions.db}"
  echo "Render detected: forcing ENVIRONMENT=production AUTH_REQUIRED=true DATABASE_PATH=${DATABASE_PATH}"
fi

export ENVIRONMENT="${ENVIRONMENT:-production}"
export AUTH_REQUIRED="${AUTH_REQUIRED:-true}"

mkdir -p "$(dirname "${DATABASE_PATH:-/app/backend/data/sessions.db}")"

cd /app/backend

python - <<'PY'
from config import get_settings, refresh_settings
from database import init_db, storage_is_persistent, count_users_safe
from auth_service import auth_required

refresh_settings()
settings = get_settings()
settings.validate_production()
init_db()
persistent = storage_is_persistent()
users = count_users_safe()
print(
    f"Boot OK version={settings.app_version} "
    f"ENVIRONMENT={settings.environment} auth_required={auth_required()} "
    f"database_path={settings.database_path} persistent_storage={persistent} user_count={users}"
)
if not persistent:
    print(
        "WARNING: database directory is not on a persistent mount — "
        "accounts will be wiped on the next redeploy. Attach a Render disk at "
        "/app/backend/data (Starter plan) or set DATABASE_PATH onto durable storage."
    )
PY

exec gunicorn main:app -c /app/docker/gunicorn.conf.py