"""Theory-native output format instructions per agent profile."""

from application import load_theory_profile
from agents.output_format import OUTPUT_FORMAT_INSTRUCTIONS


def get_output_instructions_for_agent(agent_id: str) -> str:
    profile = load_theory_profile(agent_id)
    schema = profile.get("output_schema") if profile else None
    if schema and schema.get("section_titles"):
        return _format_theory_native_instructions(schema)
    return OUTPUT_FORMAT_INSTRUCTIONS


def _format_theory_native_instructions(schema: dict) -> str:
    titles = schema.get("section_titles", [])
    title_block = "\n".join(f"- {title}" for title in titles)
    return f"""
THEORY-NATIVE OUTPUT FORMAT (follow exactly):

Length: 300-450 words maximum. Short paragraphs and bullets only.

Language: Write ALL content in the same language as the user's question.
Section titles below must appear exactly as written (in English).

Plain text only. Do NOT use markdown: no ###, no **, no ---, no tables.

Use exactly these section titles on their own line:
{title_block}

Under each section use short bullet points starting with "- " (max 5 bullets per section).

If the section is an action plan, you may use structured action blocks with:
Action:, Owner:, Timeline:, Measure:

Every recommendation must connect clearly to the agent's theory.
If information is missing, add: Missing information: [what is needed].

Quality check before finishing:
1. Specific, not generic
2. Clearly connected to the agent's theory
3. Followable steps with measurable indicators
""".strip()
