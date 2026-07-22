import asyncio
import logging
import time
from typing import Optional

from openai import APITimeoutError, AsyncOpenAI, RateLimitError

from agents.prompts import AGENT_DEFINITIONS
from config import get_settings
from application import SLOT_ORDER, get_slot_assignments, load_agents_catalog
from engine.output_formats import get_output_instructions_for_agent
from engine.profiles import format_profile_instructions

logger = logging.getLogger(__name__)


def get_client() -> AsyncOpenAI:
    settings = get_settings()
    if not settings.llm_configured:
        raise RuntimeError("No LLM API key configured (OPENROUTER_API_KEY or OPENAI_API_KEY)")
    kwargs = {
        "api_key": settings.llm_api_key,
        "timeout": settings.openai_timeout_seconds,
        "max_retries": settings.openai_max_retries,
    }
    if settings.llm_base_url:
        kwargs["base_url"] = settings.llm_base_url
    if settings.resolved_llm_provider == "openrouter":
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
) -> dict:
    settings = get_settings()
    catalog = load_agents_catalog()
    agent = catalog.get(agent_id) or AGENT_DEFINITIONS.get(agent_id, {})
    started = time.perf_counter()
    active_model = model or settings.llm_model
    prompt = agent.get("system_prompt") or agent.get("prompt", "")
    profile_block = format_profile_instructions(agent_id)
    if profile_block:
        prompt = f"{prompt}\n\n{profile_block}"
    full_prompt = f"{prompt}\n\n{get_output_instructions_for_agent(agent_id)}"
    user_content = (
        f"Research question:\n{question}\n\n"
        "Answer this exact question. Tailor every section to what was asked — "
        "do not repeat a generic template from your examples."
    )

    for attempt in range(settings.openai_max_retries + 1):
        try:
            client = get_client()
            completion = await client.chat.completions.create(
                model=active_model,
                messages=[
                    {"role": "system", "content": full_prompt},
                    {"role": "user", "content": user_content},
                ],
                temperature=0.55,
                max_tokens=750,
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
) -> list:
    if mode == "parallel":
        from engine.parallel_workflow import run_parallel_workflow

        return await run_parallel_workflow(question, model=model)
    if mode == "sequential":
        from engine.sequential_workflow import run_sequential_workflow

        return await run_sequential_workflow(question, model=model)
    raise ValueError(f"Unknown workflow mode: {mode}")
