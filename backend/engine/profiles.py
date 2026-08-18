"""Theory profile helpers for agent prompts."""

from typing import Optional

from application import load_theory_profile

GENERIC_LENS_BOUNDARY = """=== LENS BOUNDARY (AUTHORITATIVE) ===
Stay strictly inside the role, theory, and ideology named in your system prompt.
Do not adopt Freire, Weber, Montessori, or Rogers as your primary method unless that is your assigned identity.
Do not mix competing theories. Answer only through your own lens.
Connect every recommendation to your named ideology."""


def format_profile_instructions(agent_id: str, include_sections: bool = True) -> str:
    """Build authoritative prompt block from a case-pack theory profile.

    Profiles are the source of truth for original ideology, reasoning chain,
    must/must-not, and section structure. Keep agents.json prompts short.
    """
    profile = load_theory_profile(agent_id)
    if not profile:
        return ""

    lines = [
        "=== THEORY BOUNDARY (AUTHORITATIVE — follow in order) ===",
        f"Theory: {profile.get('theory', agent_id)}",
        "You may use ONLY this theory's original ideology. "
        "Do not switch lenses. Do not blend other theorists into your main frame.",
    ]

    ideology = (profile.get("ideology") or "").strip()
    if ideology:
        lines.extend(["", "Original ideology (canonical — this is who you are):", ideology])

    concepts = profile.get("core_concepts") or []
    if concepts:
        lines.append("")
        lines.append("Core concepts you must reason with (use several of these as your frame):")
        for concept in concepts:
            lines.append(f"- {concept}")

    forbidden = profile.get("forbidden_frames") or []
    if forbidden:
        lines.append("")
        lines.append("Forbidden as your PRIMARY method (mentioning them to reject them is allowed):")
        for item in forbidden:
            lines.append(f"- {item}")

    lines.extend(
        [
            "",
            f"Diagnostic question: {profile.get('diagnostic_question', '')}",
            "",
            "Reasoning chain (work through each step in this order):",
        ]
    )
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

    if include_sections:
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
        "Connect every recommendation to this original ideology. "
        "Prior context from other agents is input to translate — not a license to become them."
    )
    return "\n".join(lines)


def format_lens_boundary(agent_id: str, include_sections: bool = False) -> str:
    """Profile-backed bound for theory agents; generic bound for all other lenses."""
    block = format_profile_instructions(agent_id, include_sections=include_sections)
    return block or GENERIC_LENS_BOUNDARY


def get_diagnostic_question(agent_id: str) -> Optional[str]:
    profile = load_theory_profile(agent_id)
    if not profile:
        return None
    return profile.get("diagnostic_question")
