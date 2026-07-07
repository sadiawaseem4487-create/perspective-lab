"""Theory profile helpers for agent prompts."""

from typing import Optional

from application import load_theory_profile


def format_profile_instructions(agent_id: str) -> str:
    """Build prompt appendix from a case-pack theory profile."""
    profile = load_theory_profile(agent_id)
    if not profile:
        return ""

    lines = [
        "THEORY PROFILE (follow this reasoning structure):",
        f"Diagnostic question: {profile.get('diagnostic_question', '')}",
        "",
        "Reasoning chain:",
    ]
    for step in profile.get("reasoning_chain", []):
        lines.append(f"- {step}")

    must_do = profile.get("must_do", [])
    if must_do:
        lines.append("")
        lines.append("You must:")
        for item in must_do:
            lines.append(f"- {item}")

    must_not = profile.get("must_not_do", [])
    if must_not:
        lines.append("")
        lines.append("You must not:")
        for item in must_not:
            lines.append(f"- {item}")

    sections = profile.get("output_sections", [])
    if sections:
        lines.append("")
        lines.append("Structure your answer using these sections:")
        for section in sections:
            lines.append(f"- {section}")

    return "\n".join(lines)


def get_diagnostic_question(agent_id: str) -> Optional[str]:
    profile = load_theory_profile(agent_id)
    if not profile:
        return None
    return profile.get("diagnostic_question")
