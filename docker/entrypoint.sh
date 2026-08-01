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

cd /app/backend

python - <<'PY'
from config import get_settings, refresh_settings
from database import init_db
from auth_service import auth_required

refresh_settings()
settings = get_settings()
settings.validate_production()
init_db()
print(
    f"Boot OK version={settings.app_version} "
    f"ENVIRONMENT={settings.environment} auth_required={auth_required()}"
)
PY

exec gunicorn main:app -c /app/docker/gunicorn.conf.py
