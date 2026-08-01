"""First-run / desktop API key setup helpers."""

from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Literal, Optional

from config import Settings, get_settings, refresh_settings

Provider = Literal["openrouter", "openai"]

_KEY_LINE = re.compile(
    r"^(LLM_PROVIDER|OPENROUTER_API_KEY|OPENAI_API_KEY|OPENAI_MODEL)\s*=.*$",
    re.MULTILINE,
)


def setup_allowed(settings: Optional[Settings] = None) -> bool:
    """Allow writing keys only outside locked production."""
    settings = settings or get_settings()
    return settings.environment != "production"


def env_file_path(settings: Optional[Settings] = None) -> Path:
    settings = settings or get_settings()
    backend_env = settings.project_root / "backend" / ".env"
    root_env = settings.project_root / ".env"
    if backend_env.is_file():
        return backend_env
    if root_env.is_file():
        return root_env
    return backend_env


def apply_llm_keys(
    *,
    provider: Provider,
    api_key: str,
    model: Optional[str] = None,
    settings: Optional[Settings] = None,
) -> Path:
    """Upsert LLM keys into the active .env file and refresh settings cache."""
    settings = settings or get_settings()
    if not setup_allowed(settings):
        raise PermissionError("API key setup is disabled in production")

    key = (api_key or "").strip()
    if len(key) < 8:
        raise ValueError("API key looks too short")

    # OpenRouter keys always go to the OpenRouter slot
    if key.startswith("sk-or-"):
        provider = "openrouter"

    path = env_file_path(settings)
    path.parent.mkdir(parents=True, exist_ok=True)
    existing = path.read_text(encoding="utf-8") if path.is_file() else ""

    if provider == "openrouter":
        model_value = (model or "openai/gpt-4o-mini").strip()
        if "/" not in model_value:
            model_value = f"openai/{model_value}"
        block = (
            f"LLM_PROVIDER=openrouter\n"
            f"OPENROUTER_API_KEY={key}\n"
            f"OPENAI_MODEL={model_value}\n"
        )
    else:
        model_value = (model or "gpt-4o-mini").strip()
        if model_value.startswith("openai/"):
            model_value = model_value[len("openai/") :]
        block = (
            f"LLM_PROVIDER=openai\n"
            f"OPENAI_API_KEY={key}\n"
            f"OPENAI_MODEL={model_value}\n"
        )

    cleaned = _KEY_LINE.sub("", existing).strip()
    content = f"{cleaned}\n\n{block}".strip() + "\n"
    path.write_text(content, encoding="utf-8")

    # Apply to process env without leaving empty-string overrides
    if provider == "openrouter":
        os.environ["LLM_PROVIDER"] = "openrouter"
        os.environ["OPENROUTER_API_KEY"] = key
        os.environ.pop("OPENAI_API_KEY", None)
        os.environ["OPENAI_MODEL"] = model_value
    else:
        os.environ["LLM_PROVIDER"] = "openai"
        os.environ["OPENAI_API_KEY"] = key
        os.environ.pop("OPENROUTER_API_KEY", None)
        os.environ["OPENAI_MODEL"] = model_value

    refresh_settings()
    return path
