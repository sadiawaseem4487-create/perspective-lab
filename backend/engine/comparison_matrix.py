"""Build agent comparison matrix for research analysis."""

from __future__ import annotations

from typing import Any, Dict, List

from application import load_theory_profile
from engine.response_parser import first_action_block, first_text_bullet, parse_agent_response


DIMENSIONS = [
    {"key": "main_focus", "label": "Main focus"},
    {"key": "first_action", "label": "First priority action"},
    {"key": "stakeholder", "label": "Primary stakeholder"},
    {"key": "solution_type", "label": "Solution type"},
    {"key": "success_metric", "label": "Success indicator"},
    {"key": "self_check_passed", "label": "Self-check passed"},
]


def _agent_key(response: dict) -> str:
    return (response.get("agent_key") or response.get("agent_id") or "").lower()


def _row_values(response: dict, profile: dict) -> Dict[str, Any]:
    structured = response.get("structured_output")
    if not structured:
        structured = parse_agent_response(response.get("response", ""))

    sections = structured.get("sections", [])
    schema = profile.get("output_schema", {})
    section_titles = schema.get("section_titles") or []
    main_section = section_titles[0] if section_titles else "Problem Diagnosis"

    action = first_action_block(sections)
    first_action = ""
    stakeholder = schema.get("primary_stakeholder", "")
    if action:
        first_action = action.get("action", "")
        stakeholder = stakeholder or action.get("owner", "")

    if not first_action:
        first_action = first_text_bullet(sections, "Participatory action plan")
    if not first_action:
        first_action = first_text_bullet(sections, "Priority Actions")
    if not first_action:
        first_action = first_text_bullet(sections, "Implementation Steps")

    main_focus = first_text_bullet(sections, main_section)
    if not main_focus:
        main_focus = first_text_bullet(sections, "Problem Diagnosis")
    if not main_focus:
        main_focus = response.get("theory") or response.get("title") or ""

    success_metric = first_text_bullet(sections, "Success Indicators")
    if not success_metric and section_titles:
        success_metric = first_text_bullet(sections, section_titles[-1])

    self_check = response.get("self_check") or {}

    return {
        "main_focus": main_focus[:200],
        "first_action": first_action[:200],
        "stakeholder": stakeholder[:200],
        "solution_type": schema.get("solution_type") or response.get("title") or "",
        "success_metric": success_metric[:200],
        "self_check_passed": bool(self_check.get("passed")),
    }


def build_comparison_matrix(report: dict) -> dict:
    responses = [item for item in report.get("responses", []) if item.get("response") and not item.get("error")]
    agents: List[Dict[str, Any]] = []

    for response in responses:
        agent_id = _agent_key(response)
        profile = load_theory_profile(agent_id) or {}
        values = _row_values(response, profile)
        agents.append(
            {
                "agent_key": agent_id,
                "agent_label": response.get("agent_label") or response.get("agent_name"),
                "agent_number": response.get("agent_number"),
                "color": response.get("color"),
                "values": values,
            }
        )

    matrix = []
    for dimension in DIMENSIONS:
        row = {
            "dimension": dimension["key"],
            "label": dimension["label"],
            "values": {agent["agent_key"]: agent["values"].get(dimension["key"], "") for agent in agents},
        }
        matrix.append(row)

    return {
        "session_id": report.get("session_id"),
        "question": report.get("question"),
        "workflow_mode": report.get("workflow_mode", "parallel"),
        "dimensions": [dimension["key"] for dimension in DIMENSIONS],
        "agents": agents,
        "matrix": matrix,
    }
