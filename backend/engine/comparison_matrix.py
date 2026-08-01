"""Build agent comparison matrix for research analysis."""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple

from application import load_theory_profile
from engine.response_parser import first_action_block, first_text_bullet, parse_agent_response


DIMENSIONS = [
    {"key": "main_focus", "label": "Main focus"},
    {"key": "first_action", "label": "First action"},
    {"key": "stakeholder", "label": "Primary stakeholder"},
    {"key": "solution_type", "label": "Solution type"},
    {"key": "success_metric", "label": "Success metric"},
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

ACTION_HINT = re.compile(
    r"\b(should|must|need to|needs to|recommend|propose|implement|create|visit|establish|introduce|provide|support|track|reduce)\b",
    re.I,
)


def _agent_key(response: dict) -> str:
    return (response.get("agent_key") or response.get("agent_id") or "").lower()


def _sentences(text: str) -> List[str]:
    """Split into sentences without treating numbered-list markers (e.g. '1.') as endings."""
    raw = (text or "").strip()
    if not raw:
        return []
    # Split on newlines first so list items stay intact, then soft-split long lines.
    chunks: List[str] = []
    for line in re.split(r"\n+", raw):
        line = line.strip(" -•\t")
        if not line:
            continue
        # Avoid splitting after digit+period (1. 2. 10.) — common in guest numbered answers.
        parts = re.split(r"(?<!\d)(?<=[.!?])\s+", line)
        for part in parts:
            cleaned = part.strip(" -•\t")
            if cleaned:
                chunks.append(cleaned)
    return chunks


def _guest_excerpt(text: str, max_len: int = 1200) -> str:
    """Prefer a meaningful first block from free-text; never return a lone '1.' marker."""
    cleaned = (text or "").strip()
    if not cleaned:
        return ""
    sentences = _sentences(cleaned)
    for sentence in sentences:
        # Skip bare list markers / ultra-short fragments from bad splits.
        if re.fullmatch(r"\d+[.)]?", sentence):
            continue
        if len(sentence) < 3:
            continue
        if len(sentence) <= max_len:
            return sentence
        return sentence[:max_len].rsplit(" ", 1)[0].strip() or sentence[:max_len]
    # Fallback: first non-empty paragraph / whole answer
    first_para = re.split(r"\n\s*\n", cleaned)[0].strip()
    if len(first_para) <= max_len:
        return first_para
    return first_para[:max_len].rsplit(" ", 1)[0].strip() or first_para[:max_len]


def _guest_row_values(respondent: dict) -> Dict[str, Any]:
    """Neutral extraction from free-text guest answers (no theory profile defaults)."""
    answer = (respondent.get("answer") or "").strip()
    sentences = _sentences(answer)
    main_focus = _guest_excerpt(answer, max_len=1200)

    first_action = ""
    for sentence in sentences:
        if re.fullmatch(r"\d+[.)]?", sentence):
            continue
        if ACTION_HINT.search(sentence):
            first_action = sentence if len(sentence) <= 1200 else sentence[:1200].rsplit(" ", 1)[0]
            break
    if not first_action:
        # Second meaningful sentence, else same as focus
        meaningful = [s for s in sentences if not re.fullmatch(r"\d+[.)]?", s) and len(s) >= 3]
        if len(meaningful) > 1:
            first_action = meaningful[1][:1200]
        else:
            first_action = main_focus

    role = (respondent.get("role") or "").strip()
    org = (respondent.get("organization") or "").strip()
    stakeholder = " · ".join(p for p in (role, org) if p) or (respondent.get("name") or "Guest")

    return {
        "main_focus": main_focus,
        "first_action": first_action,
        "stakeholder": stakeholder,
        "solution_type": "Human perspective",
        "success_metric": "",
        "self_check_passed": "",
        "sources": {
            "main_focus": "guest_answer" if main_focus else "missing",
            "first_action": "guest_answer" if first_action else "missing",
            "stakeholder": "guest_meta" if (role or org) else "guest_answer",
            "solution_type": "neutral_label",
            "success_metric": "missing",
            "self_check_passed": "n/a",
        },
    }


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

    success_metric = ""
    success_source = "missing"
    if action and action.get("measure"):
        success_metric = action.get("measure", "")
        success_source = "answer"
    if not success_metric:
        success_metric = first_text_bullet(sections, "Success Indicators")
        success_source = "answer" if success_metric else "missing"
    if not success_metric:
        for title in ("Success metric", "Indicators", "Evaluation"):
            success_metric = first_text_bullet(sections, title)
            if success_metric:
                success_source = "answer"
                break
    if not success_metric:
        uncertainty = first_text_bullet(sections, "Uncertainty")
        if uncertainty:
            success_metric = uncertainty
            success_source = "answer"

    self_check = response.get("self_check") or {}

    return {
        "main_focus": main_focus,
        "first_action": first_action,
        "stakeholder": stakeholder,
        "solution_type": solution_type,
        "success_metric": success_metric or "",
        "self_check_passed": bool(self_check.get("passed")),
        "sources": {
            "main_focus": main_focus_source,
            "first_action": first_action_source,
            "stakeholder": stakeholder_source,
            "solution_type": solution_source,
            "success_metric": success_source,
        },
    }


MATRIX_GUEST_COLUMN_LIMIT = 8


def build_comparison_matrix(report: dict, human_answers: Optional[List[dict]] = None) -> dict:
    responses = [item for item in report.get("responses", []) if item.get("response") and not item.get("error")]
    columns: List[Dict[str, Any]] = []

    for response in responses:
        agent_id = _agent_key(response)
        profile = load_theory_profile(agent_id) or {}
        values = _row_values(response, profile)
        columns.append(
            {
                "column_key": agent_id,
                "kind": "agent",
                "agent_key": agent_id,
                "agent_label": response.get("agent_label") or response.get("agent_name"),
                "agent_number": response.get("agent_number"),
                "color": response.get("color"),
                "values": values,
                "sources": values.get("sources", {}),
            }
        )

    guests = human_answers if human_answers is not None else report.get("human_answers") or []
    guest_summaries: List[Dict[str, Any]] = []
    for index, respondent in enumerate(guests):
        if not (respondent.get("name") or "").strip() or not (respondent.get("answer") or "").strip():
            continue
        values = _guest_row_values(respondent)
        name = (respondent.get("name") or "Guest").strip()
        role = (respondent.get("role") or "").strip()
        label = f"{name}" + (f" ({role})" if role else "")
        summary = {
            "index": index,
            "response_id": respondent.get("response_id") or f"guest_{index}",
            "name": name,
            "role": role,
            "organization": (respondent.get("organization") or "").strip(),
            "email": (respondent.get("email") or "").strip(),
            "answer": (respondent.get("answer") or "").strip(),
            "source": respondent.get("source") or "",
            "submitted_at": respondent.get("submitted_at") or "",
            "values": values,
            "label": label,
        }
        guest_summaries.append(summary)

        # Keep matrix readable: only first N guests as columns; full list in guest_summaries
        if len([c for c in columns if c.get("kind") == "guest"]) < MATRIX_GUEST_COLUMN_LIMIT:
            column_key = f"guest_{index}"
            columns.append(
                {
                    "column_key": column_key,
                    "kind": "guest",
                    "agent_key": column_key,
                    "agent_label": label,
                    "agent_number": None,
                    "color": "#64748b",
                    "guest_name": name,
                    "guest_role": role,
                    "guest_organization": summary["organization"],
                    "values": values,
                    "sources": values.get("sources", {}),
                }
            )

    matrix = []
    for dimension in DIMENSIONS:
        row = {
            "dimension": dimension["key"],
            "label": dimension["label"],
            "values": {col["column_key"]: col["values"].get(dimension["key"], "") for col in columns},
            "sources": {
                col["column_key"]: col.get("sources", {}).get(dimension["key"], "") for col in columns
            },
        }
        matrix.append(row)

    return {
        "session_id": report.get("session_id"),
        "question": report.get("question"),
        "workflow_mode": report.get("workflow_mode", "parallel"),
        "dimensions": [dimension["key"] for dimension in DIMENSIONS],
        "agents": columns,
        "columns": columns,
        "matrix": matrix,
        "guest_count": len(guest_summaries),
        "guest_summaries": guest_summaries,
        "guest_columns_shown": sum(1 for col in columns if col.get("kind") == "guest"),
        "guest_column_limit": MATRIX_GUEST_COLUMN_LIMIT,
        "legend": {
            "answer": "Extracted from agent answer text",
            "schema_default": "Profile default (not extracted from this answer)",
            "missing": "Not found in answer or profile",
            "guest_answer": "Extracted from guest / human free-text answer",
            "guest_meta": "From guest role or organization (not theory-framed)",
            "neutral_label": "Neutral label (not a theory schema)",
            "n/a": "Not applicable for guest answers",
        },
    }
