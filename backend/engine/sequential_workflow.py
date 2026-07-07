"""LangGraph sequential chain: Freire → Weber → Montessori → Rogers (Vaihe 1–4)."""

from __future__ import annotations

import operator
from typing import Annotated, Dict, List, Optional, TypedDict

from langgraph.graph import END, START, StateGraph

from engine.sequential_context import SEQUENTIAL_STAGES, build_stage_question


def _merge_stage_outputs(left: Optional[Dict[str, str]], right: Optional[Dict[str, str]]) -> Dict[str, str]:
    merged = dict(left or {})
    if right:
        merged.update(right)
    return merged


class SequentialState(TypedDict):
    question: str
    model: Optional[str]
    stage_outputs: Annotated[Dict[str, str], _merge_stage_outputs]
    responses: Annotated[List[dict], operator.add]


async def _run_stage(state: SequentialState, agent_id: str, slot_number: int, stage_role: str) -> dict:
    from agents.service import ask_agent_slot
    from engine.self_check import enrich_with_self_check

    stage_question = build_stage_question(
        state["question"],
        state.get("stage_outputs", {}),
        agent_id,
    )
    result = await ask_agent_slot(
        slot_number,
        agent_id,
        stage_question,
        state.get("model"),
    )
    checked = enrich_with_self_check(agent_id, result)
    checked["sequential_stage"] = {
        "vaihe": slot_number,
        "role": stage_role,
        "agent_id": agent_id,
    }
    if not checked.get("error"):
        return {
            "responses": [checked],
            "stage_outputs": {agent_id: checked.get("response", "")},
        }
    return {"responses": [checked]}


def _make_stage_node(agent_id: str, slot_number: int, stage_role: str):
    async def _node(state: SequentialState) -> dict:
        return await _run_stage(state, agent_id, slot_number, stage_role)

    _node.__name__ = f"stage_{agent_id}"
    return _node


def _build_sequential_graph():
    builder = StateGraph(SequentialState)
    node_names = []

    for agent_id, slot_number, stage_role in SEQUENTIAL_STAGES:
        node_name = f"stage_{agent_id}"
        builder.add_node(node_name, _make_stage_node(agent_id, slot_number, stage_role))
        node_names.append(node_name)

    builder.add_edge(START, node_names[0])
    for index in range(len(node_names) - 1):
        builder.add_edge(node_names[index], node_names[index + 1])
    builder.add_edge(node_names[-1], END)
    return builder.compile()


_GRAPH = None


def get_sequential_graph():
    global _GRAPH
    if _GRAPH is None:
        _GRAPH = _build_sequential_graph()
    return _GRAPH


async def run_sequential_workflow(question: str, model: Optional[str] = None) -> List[dict]:
    """Execute Phase 2 sequential workflow via LangGraph linear chain."""
    graph = get_sequential_graph()
    result = await graph.ainvoke(
        {
            "question": question,
            "model": model,
            "stage_outputs": {},
            "responses": [],
        }
    )
    return list(result.get("responses", []))


async def run_single_sequential_stage(
    question: str,
    vaihe: int,
    stage_outputs: Optional[Dict[str, str]] = None,
    model: Optional[str] = None,
) -> dict:
    """Run one Vaihe (1–4) for human-in-the-loop sequential mode."""
    if vaihe < 1 or vaihe > len(SEQUENTIAL_STAGES):
        raise ValueError(f"vaihe must be 1–{len(SEQUENTIAL_STAGES)}")

    agent_id, slot_number, stage_role = SEQUENTIAL_STAGES[vaihe - 1]
    state: SequentialState = {
        "question": question,
        "model": model,
        "stage_outputs": stage_outputs or {},
        "responses": [],
    }
    result = await _run_stage(state, agent_id, slot_number, stage_role)
    return result["responses"][0]
