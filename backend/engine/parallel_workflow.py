"""LangGraph parallel fan-out: same question → 4 agents → self-check → merge."""

from __future__ import annotations

import operator
from typing import Annotated, List, Optional, TypedDict

from langgraph.graph import END, START, StateGraph
from langgraph.types import Send

from application import SLOT_ORDER, get_slot_assignments


class ParallelState(TypedDict):
    question: str
    model: Optional[str]
    responses: Annotated[List[dict], operator.add]


class AgentTask(TypedDict):
    slot_number: int
    agent_id: str
    question: str
    model: Optional[str]


async def _agent_pipeline_node(task: AgentTask) -> dict:
    """Ask one agent, then run theory-native self-check (two-step pipeline node)."""
    from agents.service import ask_agent_slot
    from engine.self_check import enrich_with_self_check

    result = await ask_agent_slot(
        task["slot_number"],
        task["agent_id"],
        task["question"],
        task.get("model"),
    )
    checked = enrich_with_self_check(task["agent_id"], result)
    return {"responses": [checked]}


def _fan_out_to_agents(state: ParallelState) -> List[Send]:
    assignments = get_slot_assignments()
    return [
        Send(
            "agent_pipeline",
            {
                "slot_number": index,
                "agent_id": assignments[slot],
                "question": state["question"],
                "model": state.get("model"),
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


async def run_parallel_workflow(question: str, model: Optional[str] = None) -> List[dict]:
    """Execute Phase 1 parallel workflow via LangGraph fan-out + self-check."""
    graph = get_parallel_graph()
    result = await graph.ainvoke({"question": question, "model": model, "responses": []})
    responses = list(result.get("responses", []))
    responses.sort(key=lambda item: item.get("agent_number", 0))
    return responses
