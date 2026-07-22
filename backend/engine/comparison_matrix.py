"""Build agent comparison matrix for research analysis."""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from application import load_theory_profile
from engine.response_parser import first_action_block, first_text_bullet, parse_agent_response


DIMENSIONS = [
    {"key": "main_focus", "label": "Main focus (from answer)"},
    {"key": "first_action", "label": "First priority action (from answer)"},
    {"key": "stakeholder", "label": "Primary stakeholder"},
    {"key": "solution_type", "label": "Solution type"},
    {"key": "success_metric", "label": "Success / uncertainty note"},
    {"key": "self_check_passed", "label": "Self-check passed"},
]

ACTION_SECTION_FALLBACKS = [
    "Participatory action plan",
    "Collective action",
    "Procedure and accountability plan",
    "Process design",
    "School-day learning plan",
    "Concrete activity",
    "Pilot design",
    "Scaling roadmap",
    "Priority Actions",
    "Implementation Steps",
]


def _agent_key(response: dict) -> str:
    return (response.get("agent_key") or response.get("agent_id") or "").lower()


def _extract_stakeholder(action: Optional[dict], sections: list, schema: dict) -> Tuple[str, str]:
    if action and action.get("owner"):
        return action["owner"], "answer"
    for title in ("Responsibility", "Accountability", "Adopter analysis"):
        text = first_text_bullet(sections, title)
        if text:
            return text, "answer"
    default = schema.get("primary_stakeholder", "")
    if default:
        return default, "schema_default"
    return "", "missing"


def _extract_solution_type(sections: list, schema: dict, response: dict) -> Tuple[str, str]:
    for title in ("Theory link", "Innovation framing", "Prepared environment"):
        text = first_text_bullet(sections, title)
        if text:
            return text[:120], "answer"
    default = schema.get("solution_type") or ""
    if default:
        return default, "schema_default"
    return response.get("title") or "", "schema_default"


def _row_values(response: dict, profile: dict) -> Dict[str, Any]:
    structured = response.get("structured_output")
    if not structured or not structured.get("sections"):
        structured = parse_agent_response(response.get("response", ""))

    sections = structured.get("sections", [])
    schema = profile.get("output_schema", {})
    section_titles = schema.get("section_titles") or []
    main_section = section_titles[0] if section_titles else "Problem Diagnosis"

    action = first_action_block(sections)
    first_action = ""
    first_action_source = "missing"
    if action and action.get("action"):
        first_action = action.get("action", "")
        first_action_source = "answer"
    else:
        for title in ACTION_SECTION_FALLBACKS:
            text = first_text_bullet(sections, title)
            if text:
                first_action = text
                first_action_source = "answer"
                break

    stakeholder, stakeholder_source = _extract_stakeholder(action, sections, schema)
    solution_type, solution_source = _extract_solution_type(sections, schema, response)

    main_focus = first_text_bullet(sections, main_section)
    if not main_focus:
        main_focus = first_text_bullet(sections, "Problem Diagnosis")
    if not main_focus:
        main_focus = first_text_bullet(sections, "Lived experience")
    if not main_focus:
        main_focus = response.get("theory") or response.get("title") or ""
        main_focus_source = "schema_default"
    else:
        main_focus_source = "answer"

    success_metric = first_text_bullet(sections, "Success Indicators")
    success_source = "answer" if success_metric else "missing"
    if not success_metric:
        success_metric = first_text_bullet(sections, "Uncertainty")
        success_source = "answer" if success_metric else "missing"
    if not success_metric and section_titles:
        # Prefer last content section before Assumptions/Uncertainty if present
        for title in reversed(section_titles):
            if title.lower() in {"assumptions", "uncertainty"}:
                continue
            success_metric = first_text_bullet(sections, title)
            if success_metric:
                success_source = "answer"
                break

    self_check = response.get("self_check") or {}

    return {
        "main_focus": main_focus[:200],
        "first_action": first_action[:200],
        "stakeholder": stakeholder[:200],
        "solution_type": solution_type[:200],
        "success_metric": (success_metric or "")[:200],
        "self_check_passed": bool(self_check.get("passed")),
        "sources": {
            "main_focus": main_focus_source,
            "first_action": first_action_source,
            "stakeholder": stakeholder_source,
            "solution_type": solution_source,
            "success_metric": success_source,
        },
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
                "sources": values.get("sources", {}),
            }
        )

    matrix = []
    for dimension in DIMENSIONS:
        row = {
            "dimension": dimension["key"],
            "label": dimension["label"],
            "values": {agent["agent_key"]: agent["values"].get(dimension["key"], "") for agent in agents},
            "sources": {agent["agent_key"]: agent.get("sources", {}).get(dimension["key"], "") for agent in agents},
        }
        matrix.append(row)

    return {
        "session_id": report.get("session_id"),
        "question": report.get("question"),
        "workflow_mode": report.get("workflow_mode", "parallel"),
        "dimensions": [dimension["key"] for dimension in DIMENSIONS],
        "agents": agents,
        "matrix": matrix,
        "legend": {
            "answer": "Extracted from agent answer text",
            "schema_default": "Profile default (not extracted from this answer)",
            "missing": "Not found in answer or profile",
        },
    }
