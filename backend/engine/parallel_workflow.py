"""LangGraph parallel fan-out: same question → 4 independent agents → merge."""

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


async def _ask_agent_node(task: AgentTask) -> dict:
    from agents.service import ask_agent_slot

    result = await ask_agent_slot(
        task["slot_number"],
        task["agent_id"],
        task["question"],
        task.get("model"),
    )
    return {"responses": [result]}


def _fan_out_to_agents(state: ParallelState) -> List[Send]:
    assignments = get_slot_assignments()
    return [
        Send(
            "ask_agent",
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
    builder.add_node("ask_agent", _ask_agent_node)
    builder.add_conditional_edges(START, _fan_out_to_agents, ["ask_agent"])
    builder.add_edge("ask_agent", END)
    return builder.compile()


_GRAPH = None


def get_parallel_graph():
    global _GRAPH
    if _GRAPH is None:
        _GRAPH = _build_parallel_graph()
    return _GRAPH


async def run_parallel_workflow(question: str, model: Optional[str] = None) -> List[dict]:
    """Execute Phase 1 parallel workflow via LangGraph fan-out."""
    graph = get_parallel_graph()
    result = await graph.ainvoke({"question": question, "model": model, "responses": []})
    responses = list(result.get("responses", []))
    responses.sort(key=lambda item: item.get("agent_number", 0))
    return responses
