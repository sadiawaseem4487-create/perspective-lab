"""Theory profile helpers for agent prompts."""

from typing import Optional

from application import load_theory_profile


def format_profile_instructions(agent_id: str) -> str:
    """Build authoritative prompt block from a case-pack theory profile.

    Profiles are the source of truth for reasoning chain, must/must-not,
    and section structure. Keep agents.json prompts short.
    """
    profile = load_theory_profile(agent_id)
    if not profile:
        return ""

    lines = [
        "=== THEORY PROFILE (AUTHORITATIVE — follow in order) ===",
        f"Theory: {profile.get('theory', agent_id)}",
        f"Diagnostic question: {profile.get('diagnostic_question', '')}",
        "",
        "Reasoning chain (work through each step in this order):",
    ]
    for index, step in enumerate(profile.get("reasoning_chain", []), start=1):
        lines.append(f"{index}. {step}")

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
        lines.append(
            "Output section titles (exact English titles on their own line, NOT as bullets):"
        )
        for section in sections:
            lines.append(section)

    lines.append("")
    lines.append(
        "Connect every recommendation to this theory. "
        "Do not borrow another theorist's primary method as your main frame."
    )
    return "\n".join(lines)


def get_diagnostic_question(agent_id: str) -> Optional[str]:
    profile = load_theory_profile(agent_id)
    if not profile:
        return None
    return profile.get("diagnostic_question")
