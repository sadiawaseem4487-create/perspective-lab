"""Request-scoped LLM credentials (per logged-in user)."""

from __future__ import annotations

from contextvars import ContextVar
from typing import Any, Dict, Optional

_llm_creds: ContextVar[Optional[Dict[str, Any]]] = ContextVar("llm_creds", default=None)


def set_request_llm_credentials(creds: Optional[Dict[str, Any]]) -> None:
    _llm_creds.set(creds)


def get_request_llm_credentials() -> Optional[Dict[str, Any]]:
    return _llm_creds.get()
