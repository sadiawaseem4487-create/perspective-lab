"""Request-scoped LLM credentials (per logged-in user)."""

from __future__ import annotations

from contextlib import contextmanager
from contextvars import ContextVar
from typing import Any, Dict, Iterator, Optional

_llm_creds: ContextVar[Optional[Dict[str, Any]]] = ContextVar("llm_creds", default=None)


def set_request_llm_credentials(creds: Optional[Dict[str, Any]]) -> None:
    _llm_creds.set(creds)


def get_request_llm_credentials() -> Optional[Dict[str, Any]]:
    return _llm_creds.get()


@contextmanager
def use_llm_credentials(creds: Optional[Dict[str, Any]]) -> Iterator[None]:
    """Bind credentials for this call stack (needed across LangGraph fan-out)."""
    token = _llm_creds.set(creds)
    try:
        yield
    finally:
        _llm_creds.reset(token)
