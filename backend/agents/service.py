import asyncio
import logging
import time
from typing import Any, Dict, Optional

from openai import APITimeoutError, AsyncOpenAI, RateLimitError

from agents.prompts import AGENT_DEFINITIONS
from config import get_settings
from application import SLOT_ORDER, get_slot_assignments, load_agents_catalog
from engine.output_formats import get_output_instructions_for_agent
from engine.profiles import format_profile_instructions

logger = logging.getLogger(__name__)


def _resolve_active_creds(llm_creds: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Prefer explicit creds, then request context, then server .env."""
    from llm_context import get_request_llm_credentials

    settings = get_settings()
    creds = llm_creds or get_request_llm_credentials() or {}
    if creds.get("api_key"):
        provider = creds.get("provider") or "openai"
        base_url = creds.get("base_url")
        if provider == "openrouter" and not base_url:
            base_url = "https://openrouter.ai/api/v1"
        return {
            "api_key": creds["api_key"],
            "provider": provider,
            "base_url": base_url,
            "model": creds.get("model") or settings.llm_model,
        }
    if not settings.llm_configured:
        raise RuntimeError(
            "No LLM API key available. Open Settings → API key and save your OpenRouter or OpenAI key."
        )
    return {
        "api_key": settings.llm_api_key,
        "provider": settings.resolved_llm_provider,
        "base_url": settings.llm_base_url,
        "model": settings.llm_model,
    }


def get_client(llm_creds: Optional[Dict[str, Any]] = None) -> AsyncOpenAI:
    settings = get_settings()
    active = _resolve_active_creds(llm_creds)
    kwargs = {
        "api_key": active["api_key"],
        "timeout": settings.openai_timeout_seconds,
        "max_retries": settings.openai_max_retries,
    }
    if active.get("base_url"):
        kwargs["base_url"] = active["base_url"]
    if active.get("provider") == "openrouter":
        kwargs["default_headers"] = {
            "HTTP-Referer": "https://github.com/perspective-lab",
            "X-Title": "PerspectiveLab",
        }
    return AsyncOpenAI(**kwargs)


def _base_fields(slot_number: int, agent_id: str, agent: dict) -> dict:
    return {
        "agent_key": agent_id,
        "slot": SLOT_ORDER[slot_number - 1],
        "agent_number": slot_number,
        "agent_label": f"Agent {slot_number}",
        "agent_name": agent["name"],
        "title": agent.get("title", ""),
        "theory": agent.get("theory", ""),
        "color": agent.get("color", "#444444"),
    }


async def ask_agent_slot(
    slot_number: int,
    agent_id: str,
    question: str,
    model: Optional[str] = None,
    llm_creds: Optional[Dict[str, Any]] = None,
) -> dict:
    settings = get_settings()
    catalog = load_agents_catalog()
    agent = catalog.get(agent_id) or AGENT_DEFINITIONS.get(agent_id, {})
    started = time.perf_counter()
    try:
        active = _resolve_active_creds(llm_creds)
    except RuntimeError as exc:
        return _error_response(slot_number, agent_id, agent, model or settings.llm_model, str(exc), started)

    active_model = model or active.get("model") or settings.llm_model
    prompt = agent.get("system_prompt") or agent.get("prompt", "")
    # Avoid duplicating section lists (profile + format) — fewer tokens, faster replies
    profile_block = format_profile_instructions(agent_id, include_sections=False)
    if profile_block:
        prompt = f"{prompt}\n\n{profile_block}"
    full_prompt = f"{prompt}\n\n{get_output_instructions_for_agent(agent_id)}"
    user_content = (
        f"Research question:\n{question}\n\n"
        "Answer this exact question. Be specific and concise (within the length limit). "
        "Tailor every section to what was asked — do not repeat a generic template."
    )

    for attempt in range(settings.openai_max_retries + 1):
        try:
            client = get_client(active)
            completion = await client.chat.completions.create(
                model=active_model,
                messages=[
                    {"role": "system", "content": full_prompt},
                    {"role": "user", "content": user_content},
                ],
                temperature=0.4,
                max_tokens=1100,
            )
            text = completion.choices[0].message.content or ""
            latency_ms = int((time.perf_counter() - started) * 1000)
            return {
                **_base_fields(slot_number, agent_id, agent),
                "response": text.strip(),
                "model": active_model,
                "latency_ms": latency_ms,
                "error": None,
            }
        except (APITimeoutError, RateLimitError) as exc:
            if attempt >= settings.openai_max_retries:
                logger.exception("Slot %s (%s) failed after retries", slot_number, agent_id)
                return _error_response(slot_number, agent_id, agent, active_model, str(exc), started)
            await asyncio.sleep(1.5 * (attempt + 1))
        except Exception as exc:
            logger.exception("Slot %s (%s) failed", slot_number, agent_id)
            return _error_response(slot_number, agent_id, agent, active_model, str(exc), started)

    return _error_response(slot_number, agent_id, agent, active_model, "Unknown error", started)


def _error_response(
    slot_number: int,
    agent_id: str,
    agent: dict,
    model: str,
    message: str,
    started: float,
) -> dict:
    latency_ms = int((time.perf_counter() - started) * 1000)
    return {
        **_base_fields(slot_number, agent_id, agent),
        "response": "",
        "model": model,
        "latency_ms": latency_ms,
        "error": message,
    }


async def ask_all_agents(
    question: str,
    model: Optional[str] = None,
    mode: str = "parallel",
    llm_creds: Optional[Dict[str, Any]] = None,
) -> list:
    from llm_context import get_request_llm_credentials

    creds = llm_creds or get_request_llm_credentials()
    if mode == "parallel":
        from engine.parallel_workflow import run_parallel_workflow

        return await run_parallel_workflow(question, model=model, llm_creds=creds)
    if mode == "sequential":
        from engine.sequential_workflow import run_sequential_workflow

        return await run_sequential_workflow(question, model=model, llm_creds=creds)
    raise ValueError(f"Unknown workflow mode: {mode}")
