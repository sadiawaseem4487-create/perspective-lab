"""Parse agent response text into structured sections (mirrors frontend parser)."""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Set

SECTION_TITLES = [
    "Problem Diagnosis",
    "Theory-Based Reasoning",
    "Priority Actions",
    "Action Plan",
    "Implementation Steps",
    "Risks and Limitations",
    "Success Indicators",
    "Final Recommendation",
    "Missing voices",
    "Power and participation analysis",
    "Participatory action plan",
    "Theory link",
    "Authority and rule gaps",
    "Administrative model",
    "Procedure and accountability plan",
    "Environment diagnosis",
    "Autonomy and activity redesign",
    "School-day learning plan",
    "Adoption barriers and enablers",
    "Pilot design",
    "Scaling roadmap",
    # Sprint 9 — reasoning process + scientific honesty
    "Lived experience",
    "Naming the problem",
    "Critical question",
    "Collective action",
    "Reflection",
    "Authority map",
    "Responsibility",
    "Process design",
    "Documentation",
    "Accountability",
    "Legitimacy",
    "Observation",
    "Prepared environment",
    "Learner choice",
    "Concrete activity",
    "Teacher as guide",
    "Independent learning",
    "Innovation framing",
    "Adopter analysis",
    "Communication channels",
    "Assumptions",
    "Uncertainty",
]

ACTION_SECTIONS: Set[str] = {
    "Priority Actions",
    "Pilot design",
    "Scaling roadmap",
    "Participatory action plan",
    "Procedure and accountability plan",
    "School-day learning plan",
    "Administrative model",
    "Implementation Steps",
    "Collective action",
    "Process design",
    "Concrete activity",
}

CANONICAL_TITLES = {
    "action plan": "Priority Actions",
    "priority actions": "Priority Actions",
    "problem diagnosis": "Problem Diagnosis",
    "theory-based reasoning": "Theory-Based Reasoning",
    "implementation steps": "Implementation Steps",
    "risks and limitations": "Risks and Limitations",
    "success indicators": "Success Indicators",
    "final recommendation": "Final Recommendation",
}

_TITLE_ALT = "|".join(re.escape(title) for title in SECTION_TITLES)

SECTION_PATTERN = re.compile(
    rf"^\s*(?:#{{1,6}}\s*)?(?:\d+\.\s*)?(?:\*\*)?({_TITLE_ALT})(?:\*\*)?\s*:?\s*$",
    re.IGNORECASE | re.MULTILINE,
)

# Models often emit section titles as bullets: "- Missing voices"
BULLET_SECTION_PATTERN = re.compile(
    rf"^-\s+({_TITLE_ALT})\s*$",
    re.IGNORECASE | re.MULTILINE,
)

SECTION_TITLE_SET = {title.lower() for title in SECTION_TITLES}


def clean_agent_text(text: str) -> str:
    if not text:
        return ""
    cleaned = text.replace("\r\n", "\n")
    cleaned = re.sub(r"^#{1,6}\s+", "", cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r"\*\*([^*]+)\*\*", r"\1", cleaned)
    cleaned = re.sub(r"\*([^*\n]+)\*", r"\1", cleaned)
    cleaned = re.sub(r"^---+$", "", cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r"^\|.+\|$", "", cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


def _canonical_title(title: str) -> str:
    return CANONICAL_TITLES.get(title.lower(), title)


def _is_section_title(text: str) -> bool:
    return _canonical_title(text).lower() in SECTION_TITLE_SET


def _parse_action_block(text: str) -> Optional[Dict[str, str]]:
    block = {"action": "", "owner": "", "timeline": "", "measure": ""}
    has_field = False
    for line in text.split("\n"):
        line = line.strip()
        if not line:
            continue
        normalized = re.sub(r"^[-•*]\s+", "", line)
        match = re.match(r"^(Action|Owner|Timeline|Measure)\s*:\s*(.+)$", normalized, re.IGNORECASE)
        if match:
            block[match.group(1).lower()] = match.group(2).strip()
            has_field = True
    return block if has_field else None


def _leftover_bullets(chunk: str) -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = []
    for line in chunk.split("\n"):
        trimmed = line.strip()
        if not trimmed:
            continue
        normalized = re.sub(r"^[-•*]\s+", "", trimmed)
        if re.match(r"^(Action|Owner|Timeline|Measure)\s*:", normalized, re.IGNORECASE):
            continue
        text = re.sub(r"^\d+\.\s+", "", normalized).strip()
        if not text or _is_section_title(text):
            continue
        items.append({"type": "bullet", "text": text})
    return items


def _extract_action_items(body: str) -> List[Dict[str, Any]]:
    normalized = re.sub(r"^-\s*(Action\s*:)", r"\1", body, flags=re.IGNORECASE | re.MULTILINE)
    chunks = [chunk.strip() for chunk in re.split(r"\n(?=Action\s*:)", normalized, flags=re.IGNORECASE) if chunk.strip()]
    items: List[Dict[str, Any]] = []
    for chunk in chunks:
        action_block = _parse_action_block(chunk)
        if action_block:
            items.append({"type": "action", **action_block})
            items.extend(_leftover_bullets(chunk))
    return items


def _extract_bullets(body: str, section_title: str) -> List[Dict[str, Any]]:
    if section_title in ACTION_SECTIONS:
        action_items = _extract_action_items(body)
        if action_items:
            return action_items[:8]

    items: List[Dict[str, Any]] = []
    for line in body.split("\n"):
        line = line.strip()
        if not line:
            continue
        bullet = re.sub(r"^[-•*]\s+", "", line)
        bullet = re.sub(r"^\d+\.\s+", "", bullet).strip()
        if not bullet or _is_section_title(bullet):
            continue
        items.append({"type": "bullet", "text": bullet})

    if not items and body.strip():
        return [{"type": "bullet", "text": body.strip()}]
    limit = 8 if section_title in ACTION_SECTIONS else 6
    return items[:limit]


def _dedupe_matches(matches: List[re.Match[str]]) -> List[re.Match[str]]:
    sorted_matches = sorted(matches, key=lambda match: match.start())
    result: List[re.Match[str]] = []
    for match in sorted_matches:
        if not result or match.start() >= result[-1].start() + len(result[-1].group(0)):
            result.append(match)
    return result


def parse_agent_response(text: str) -> Dict[str, Any]:
    cleaned = clean_agent_text(text)
    if not cleaned:
        return {"sections": [], "fallback": ""}

    line_matches = list(SECTION_PATTERN.finditer(cleaned))
    bullet_matches = list(BULLET_SECTION_PATTERN.finditer(cleaned))
    matches = _dedupe_matches(line_matches + bullet_matches)
    if not matches:
        return {"sections": [], "fallback": cleaned}

    sections: List[Dict[str, Any]] = []
    for index, match in enumerate(matches):
        title = _canonical_title(match.group(1))
        start = match.end()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(cleaned)
        body = cleaned[start:end].strip()
        bullets = _extract_bullets(body, title)
        existing = next((section for section in sections if section["title"] == title), None)
        if existing:
            existing["bullets"].extend(bullets)
        else:
            sections.append({"title": title, "bullets": bullets})

    return {"sections": sections, "fallback": ""}


def first_text_bullet(sections: List[Dict[str, Any]], title: str) -> str:
    section = next((item for item in sections if item["title"] == title), None)
    if not section:
        return ""
    for bullet in section.get("bullets", []):
        if bullet.get("type") == "bullet" and bullet.get("text"):
            return bullet["text"]
    return ""


def first_action_block(sections: List[Dict[str, Any]]) -> Optional[Dict[str, str]]:
    for section in sections:
        for bullet in section.get("bullets", []):
            if bullet.get("type") == "action":
                return bullet
    return None


def section_titles_found(text: str, expected_titles: List[str]) -> List[str]:
    parsed = parse_agent_response(text)
    found = {section["title"].lower() for section in parsed["sections"]}
    return [title for title in expected_titles if title.lower() in found]
