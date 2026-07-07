"""Build chained prompts for sequential Vaihe 1–4 workflow."""

from __future__ import annotations

from typing import Dict, List, Tuple

from application import load_theory_profile

# Fixed document order: Freire → Weber → Montessori → Rogers
SEQUENTIAL_STAGES: List[Tuple[str, int, str]] = [
    ("freire", 1, "problem_map"),
    ("weber", 2, "service_model"),
    ("montessori", 3, "school_day_redesign"),
    ("rogers", 4, "scaling_roadmap"),
]

DEFAULT_STAGE_TASKS = {
    "freire": "VAIHE 1 — Produce a problem map: whose voices are missing, key power relations, and participatory framing.",
    "weber": "VAIHE 2 — Using the problem map, design an administrative service model with clear rules, roles, and accountability.",
    "montessori": "VAIHE 3 — Using prior stages, redesign the school-day learning environment for autonomy and engagement.",
    "rogers": "VAIHE 4 — Using the working model so far, design a pilot and scaling roadmap for adoption.",
}


def get_sequential_stages() -> List[Tuple[str, int, str]]:
    return list(SEQUENTIAL_STAGES)


def _stage_task(agent_id: str) -> str:
    profile = load_theory_profile(agent_id) or {}
    stage = profile.get("sequential_stage", {})
    return stage.get("task") or DEFAULT_STAGE_TASKS.get(agent_id, "Complete your stage deliverable.")


def _stage_deliverable(agent_id: str) -> str:
    profile = load_theory_profile(agent_id) or {}
    stage = profile.get("sequential_stage", {})
    return stage.get("deliverable", "Stage output")


def build_stage_question(original_question: str, stage_outputs: Dict[str, str], agent_id: str) -> str:
    """Compose user message for one sequential stage with prior context."""
    parts = [
        "RESEARCH QUESTION:",
        original_question.strip(),
    ]

    if stage_outputs:
        parts.append("\nPRIOR STAGES (build on these; do not repeat verbatim):")
        for prior_id, _slot, _role in SEQUENTIAL_STAGES:
            if prior_id == agent_id:
                break
            if prior_id in stage_outputs and stage_outputs[prior_id]:
                parts.append(f"\n[{prior_id.upper()} — {_stage_deliverable(prior_id)}]\n{stage_outputs[prior_id]}")

    parts.append(f"\nYOUR TASK — {_stage_deliverable(agent_id)}:")
    parts.append(_stage_task(agent_id))
    parts.append(
        "\nRespond only for your stage. Reference prior stages where relevant. "
        "Keep output structured per your theory profile."
    )
    return "\n".join(parts)
