"""Fetch and cache the public OpenRouter model catalog."""

from __future__ import annotations

import logging
import time
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)

_CACHE: Dict[str, Any] = {"fetched_at": 0.0, "models": []}
_CACHE_TTL_SECONDS = 60 * 60  # 1 hour

# Curated “recommended” ids floated to the top of the picker when present live.
RECOMMENDED_IDS = [
    "openai/gpt-4o-mini",
    "openai/gpt-4o",
    "openai/gpt-4.1-mini",
    "openai/gpt-4.1",
    "anthropic/claude-sonnet-4",
    "anthropic/claude-3.5-sonnet",
    "google/gemini-2.0-flash-001",
    "google/gemini-2.5-flash-preview",
    "meta-llama/llama-3.3-70b-instruct",
    "deepseek/deepseek-chat",
    "mistralai/mistral-large",
    "qwen/qwen-2.5-72b-instruct",
]

OPENAI_STATIC = [
    {"id": "gpt-4o-mini", "name": "GPT-4o Mini", "provider": "OpenAI", "recommended": True, "notes": "Fast and affordable"},
    {"id": "gpt-4o", "name": "GPT-4o", "provider": "OpenAI", "recommended": True, "notes": "Strong general model"},
    {"id": "gpt-4.1-mini", "name": "GPT-4.1 Mini", "provider": "OpenAI", "recommended": False, "notes": "Newer mini tier"},
    {"id": "gpt-4.1", "name": "GPT-4.1", "provider": "OpenAI", "recommended": False, "notes": "Higher quality"},
    {"id": "o4-mini", "name": "o4-mini", "provider": "OpenAI", "recommended": False, "notes": "Reasoning-oriented mini"},
]


def _provider_label(model_id: str) -> str:
    prefix = (model_id or "").split("/", 1)[0].strip().lower()
    mapping = {
        "openai": "OpenAI",
        "anthropic": "Anthropic",
        "google": "Google",
        "meta-llama": "Meta",
        "mistralai": "Mistral",
        "deepseek": "DeepSeek",
        "qwen": "Qwen",
        "x-ai": "xAI",
        "cohere": "Cohere",
        "perplexity": "Perplexity",
        "amazon": "Amazon",
        "microsoft": "Microsoft",
    }
    return mapping.get(prefix, prefix.replace("-", " ").title() or "OpenRouter")


def _normalize_openrouter(raw: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    recommended = set(RECOMMENDED_IDS)
    out: List[Dict[str, Any]] = []
    for item in raw:
        mid = str(item.get("id") or "").strip()
        if not mid or "/" not in mid:
            continue
        name = str(item.get("name") or mid).strip()
        ctx = item.get("context_length")
        notes_parts = []
        if ctx:
            notes_parts.append(f"{int(ctx):,} ctx")
        pricing = item.get("pricing") or {}
        prompt = pricing.get("prompt")
        if prompt not in (None, ""):
            try:
                notes_parts.append(f"${float(prompt) * 1_000_000:.2f}/M in")
            except (TypeError, ValueError):
                pass
        out.append(
            {
                "id": mid,
                "name": name,
                "provider": _provider_label(mid),
                "recommended": mid in recommended,
                "notes": " · ".join(notes_parts) if notes_parts else "via OpenRouter",
            }
        )

    def sort_key(m: Dict[str, Any]):
        try:
            rank = RECOMMENDED_IDS.index(m["id"])
        except ValueError:
            rank = 10_000
        return (0 if m.get("recommended") else 1, rank, m.get("provider", ""), m.get("name", ""))

    out.sort(key=sort_key)
    return out


async def fetch_openrouter_models(api_key: Optional[str] = None) -> List[Dict[str, Any]]:
    now = time.time()
    if _CACHE["models"] and (now - float(_CACHE["fetched_at"])) < _CACHE_TTL_SECONDS:
        return list(_CACHE["models"])

    headers = {"Accept": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            res = await client.get("https://openrouter.ai/api/v1/models", headers=headers)
            res.raise_for_status()
            payload = res.json()
        raw = payload.get("data") if isinstance(payload, dict) else payload
        if not isinstance(raw, list):
            raise ValueError("Unexpected OpenRouter models payload")
        models = _normalize_openrouter(raw)
        if models:
            _CACHE["models"] = models
            _CACHE["fetched_at"] = now
            return list(models)
    except Exception:
        logger.exception("OpenRouter model catalog fetch failed")

    return list(_CACHE["models"]) if _CACHE["models"] else []


def openai_static_models() -> List[Dict[str, Any]]:
    return list(OPENAI_STATIC)
