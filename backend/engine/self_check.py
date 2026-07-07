"""Validate agent responses against theory-native output schemas."""

from __future__ import annotations

from typing import Any, Dict, List

from application import load_theory_profile
from engine.response_parser import parse_agent_response, section_titles_found


def enrich_with_self_check(agent_id: str, response_record: dict) -> dict:
    """Run self-check and attach structured_output + self_check to a response."""
    if response_record.get("error"):
        return {
            **response_record,
            "structured_output": {"sections": [], "fallback": ""},
            "self_check": {
                "passed": False,
                "checks": [{"id": "agent_error", "passed": False, "detail": response_record["error"]}],
            },
        }

    text = response_record.get("response", "")
    profile = load_theory_profile(agent_id) or {}
    schema = profile.get("output_schema", {})
    parsed = parse_agent_response(text)
    checks = _run_checks(agent_id, text, parsed, profile, schema)
    passed = all(check["passed"] for check in checks)

    return {
        **response_record,
        "structured_output": parsed,
        "self_check": {"passed": passed, "checks": checks},
    }


def _run_checks(
    agent_id: str,
    text: str,
    parsed: dict,
    profile: dict,
    schema: dict,
) -> List[Dict[str, Any]]:
    checks: List[Dict[str, Any]] = []
    expected_titles = schema.get("section_titles") or []
    word_count = len(text.split())

    if expected_titles:
        found = section_titles_found(text, expected_titles)
        min_required = min(3, len(expected_titles))
        checks.append(
            {
                "id": "sections_present",
                "passed": len(found) >= min_required,
                "detail": f"Found {len(found)}/{len(expected_titles)} theory-native sections",
                "found_sections": found,
            }
        )
    else:
        checks.append(
            {
                "id": "sections_present",
                "passed": len(parsed.get("sections", [])) >= 3,
                "detail": f"Found {len(parsed.get('sections', []))} parsed sections",
            }
        )

    theory_name = (profile.get("theory") or agent_id).split("—")[0].strip()
    checks.append(
        {
            "id": "theory_named",
            "passed": theory_name.lower() in text.lower() or agent_id.lower() in text.lower(),
            "detail": f"Expected reference to {theory_name}",
        }
    )

    checks.append(
        {
            "id": "no_markdown",
            "passed": "###" not in text and "**" not in text,
            "detail": "Response must not contain markdown headings or bold",
        }
    )

    checks.append(
        {
            "id": "word_count",
            "passed": 80 <= word_count <= 700,
            "detail": f"Word count: {word_count} (target 300-450)",
        }
    )

    checks.append(
        {
            "id": "has_content",
            "passed": bool(text.strip()),
            "detail": "Non-empty response body",
        }
    )

    return checks
