import logging
from functools import lru_cache
from pathlib import Path
from typing import List, Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "PerspectiveLab"
    app_version: str = "1.0.0"
    case_id: str = "sao-paulo-dropout"
    project_root: Path = Path(__file__).parent.parent
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
    openai_timeout_seconds: int = 90
    openai_max_retries: int = 2

    database_path: Path = Path(__file__).parent / "data" / "sessions.db"

    cors_origins: str = "*"
    allowed_hosts: str = "*"

    rate_limit_ask: str = "10/minute"
    export_api_key: str = ""

    log_level: str = "INFO"

    frontend_dist: Path = Path(__file__).parent.parent / "frontend" / "dist"

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
        missing = []
        if not self.llm_configured:
            missing.append("OPENROUTER_API_KEY or OPENAI_API_KEY")
        if self.export_api_key == "":
            missing.append("EXPORT_API_KEY")
        if self.cors_origins.strip() == "*":
            logging.getLogger(__name__).warning(
                "CORS_ORIGINS is set to '*' in production — restrict to your domain."
            )
        if missing:
            raise RuntimeError(
                "Production configuration incomplete. Set: " + ", ".join(missing)
            )


@lru_cache
def get_settings() -> Settings:
    return Settings()
