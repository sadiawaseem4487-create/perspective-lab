"""LangGraph parallel fan-out: same question → 4 agents → self-check → merge."""

from __future__ import annotations

import operator
from typing import Annotated, Any, Dict, List, Optional, TypedDict

from langgraph.graph import END, START, StateGraph
from langgraph.types import Send

from application import SLOT_ORDER, get_slot_assignments


class ParallelState(TypedDict):
    question: str
    model: Optional[str]
    responses: Annotated[List[dict], operator.add]
    llm_creds: Optional[Dict[str, Any]]


class AgentTask(TypedDict):
    slot_number: int
    agent_id: str
    question: str
    model: Optional[str]
    llm_creds: Optional[Dict[str, Any]]


async def _agent_pipeline_node(task: AgentTask) -> dict:
    """Ask one agent, then run theory-native self-check (two-step pipeline node)."""
    from agents.service import ask_agent_slot
    from engine.self_check import enrich_with_self_check_async

    # Pass creds as an explicit argument — ContextVar is unreliable across LangGraph Send.
    creds = task.get("llm_creds")
    result = await ask_agent_slot(
        task["slot_number"],
        task["agent_id"],
        task["question"],
        task.get("model"),
        llm_creds=creds,
    )
    checked = await enrich_with_self_check_async(task["agent_id"], result, llm_creds=creds)
    return {"responses": [checked]}


def _fan_out_to_agents(state: ParallelState) -> List[Send]:
    assignments = get_slot_assignments()
    creds = state.get("llm_creds")
    return [
        Send(
            "agent_pipeline",
            {
                "slot_number": index,
                "agent_id": assignments[slot],
                "question": state["question"],
                "model": state.get("model"),
                "llm_creds": creds,
            },
        )
        for index, slot in enumerate(SLOT_ORDER, start=1)
    ]


def _build_parallel_graph():
    builder = StateGraph(ParallelState)
    builder.add_node("agent_pipeline", _agent_pipeline_node)
    builder.add_conditional_edges(START, _fan_out_to_agents, ["agent_pipeline"])
    builder.add_edge("agent_pipeline", END)
    return builder.compile()


_GRAPH = None


def get_parallel_graph():
    global _GRAPH
    if _GRAPH is None:
        _GRAPH = _build_parallel_graph()
    return _GRAPH


def reset_parallel_graph() -> None:
    """Test helper / hot-reload safety."""
    global _GRAPH
    _GRAPH = None


async def run_parallel_workflow(
    question: str,
    model: Optional[str] = None,
    llm_creds: Optional[Dict[str, Any]] = None,
) -> List[dict]:
    """Execute Phase 1 parallel workflow via LangGraph fan-out + self-check."""
    from llm_context import get_request_llm_credentials

    creds = llm_creds if llm_creds is not None else get_request_llm_credentials()

    graph = get_parallel_graph()
    result = await graph.ainvoke(
        {
            "question": question,
            "model": model,
            "responses": [],
            "llm_creds": creds,
        }
    )
    responses = list(result.get("responses", []))
    responses.sort(key=lambda r: r.get("agent_number") or 0)
    return responses
