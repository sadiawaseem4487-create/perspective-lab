import logging
import os
from functools import lru_cache
from pathlib import Path
from typing import List, Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
_BACKEND_DIR = Path(__file__).resolve().parent
_ENV_FILES = (
    _BACKEND_DIR / ".env",
    _BACKEND_DIR.parent / ".env",
)


def _drop_empty_llm_env_overrides() -> None:
    """Empty string env vars override .env and look like 'no key' — remove them."""
    for key in ("OPENAI_API_KEY", "OPENROUTER_API_KEY", "LLM_PROVIDER", "OPENAI_MODEL"):
        if key in os.environ and not str(os.environ.get(key, "")).strip():
            os.environ.pop(key, None)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        # Absolute paths — cwd must not affect whether the key is found
        env_file=_ENV_FILES,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "PerspectiveLab"
    app_version: str = "1.2.6"
    case_id: str = "sao-paulo-dropout"
    project_root: Path = _BACKEND_DIR.parent
    environment: str = Field(default="development", pattern="^(development|production|staging)$")
    debug: bool = False

    host: str = "0.0.0.0"
    port: int = 8000
    workers: int = 2

    # LLM: set LLM_PROVIDER=openrouter and OPENROUTER_API_KEY, or use OPENAI_API_KEY
    llm_provider: str = Field(default="openai", pattern="^(openai|openrouter)$")
    openai_api_key: str = ""
    openrouter_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    openai_base_url: str = ""
    openai_timeout_seconds: int = 120
    openai_max_retries: int = 1

    database_path: Path = _BACKEND_DIR / "data" / "sessions.db"
    # When set (e.g. Render Postgres), accounts survive free-tier redeploys.
    database_url: str = ""

    cors_origins: str = "*"
    allowed_hosts: str = "*"

    rate_limit_ask: str = "20/minute"
    export_api_key: str = ""

    # Optional semantic theory judge (extra LLM call per agent when true)
    theory_judge_llm: bool = False

    # Absolute public URL for invite links (e.g. https://your-app.onrender.com)
    public_app_url: str = ""

    # Auth (user accounts)
    auth_secret: str = ""
    admin_email: str = "admin@perspectivelab.local"
    admin_password: str = ""
    auth_required: str = ""  # empty = auto; true/false to force

    log_level: str = "INFO"

    frontend_dist: Path = _BACKEND_DIR.parent / "frontend" / "dist"

    @field_validator("openai_api_key", "openrouter_api_key", mode="before")
    @classmethod
    def strip_keys(cls, value: object) -> str:
        if value is None:
            return ""
        return str(value).strip()

    @property
    def cors_origin_list(self) -> List[str]:
        if self.cors_origins.strip() == "*":
            return ["*"]
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def allowed_host_list(self) -> List[str]:
        if self.allowed_hosts.strip() == "*":
            return ["*"]
        return [host.strip() for host in self.allowed_hosts.split(",") if host.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def resolved_llm_provider(self) -> str:
        if self.llm_provider == "openrouter" or self.openrouter_api_key:
            return "openrouter"
        if self.openai_api_key.startswith("sk-or-"):
            return "openrouter"
        return self.llm_provider

    @property
    def llm_api_key(self) -> str:
        if self.openrouter_api_key:
            return self.openrouter_api_key
        return self.openai_api_key

    @property
    def llm_model(self) -> str:
        model = self.openai_model.strip()
        if self.resolved_llm_provider == "openrouter" and "/" not in model:
            return f"openai/{model}"
        return model

    @property
    def llm_base_url(self) -> Optional[str]:
        if self.openai_base_url.strip():
            return self.openai_base_url.strip()
        if self.resolved_llm_provider == "openrouter":
            return OPENROUTER_BASE_URL
        return None

    @property
    def llm_configured(self) -> bool:
        return bool(self.llm_api_key)

    def validate_production(self) -> None:
        if not self.is_production:
            return
        log = logging.getLogger(__name__)
        # Shared server key lets all signed-in users ask without a personal key.
        if not self.llm_configured:
            log.warning(
                "No server OPENROUTER_API_KEY/OPENAI_API_KEY — "
                "users must paste a personal key in Settings to ask agents."
            )
        else:
            log.info(
                "Server LLM key configured — signed-in users can ask agents "
                "without a personal key (personal keys still preferred when set)."
            )
        if self.export_api_key == "":
            log.warning("EXPORT_API_KEY is empty in production.")
        if not (self.auth_secret or "").strip():
            log.warning("AUTH_SECRET is empty — set a long random secret for user accounts.")
        if self.cors_origins.strip() == "*":
            log.warning("CORS_ORIGINS is '*' in production — restrict to your domain.")


@lru_cache
def get_settings() -> Settings:
    _drop_empty_llm_env_overrides()
    return Settings()


def refresh_settings() -> Settings:
    """Clear cache and reload settings (e.g. after writing backend/.env)."""
    get_settings.cache_clear()
    _drop_empty_llm_env_overrides()
    return get_settings()
