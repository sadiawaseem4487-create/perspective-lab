"""Parse agent response text into structured sections (mirrors frontend parser)."""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple

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
]

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

SECTION_PATTERN = re.compile(
    r"^\s*(?:#{1,6}\s*)?(?:\d+\.\s*)?(?:\*\*)?("
    + "|".join(re.escape(title) for title in SECTION_TITLES)
    + r")(?:\*\*)?\s*:?\s*$",
    re.IGNORECASE | re.MULTILINE,
)


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


def _parse_action_block(text: str) -> Optional[Dict[str, str]]:
    block = {"action": "", "owner": "", "timeline": "", "measure": ""}
    has_field = False
    for line in text.split("\n"):
        line = line.strip()
        if not line:
            continue
        match = re.match(r"^(Action|Owner|Timeline|Measure)\s*:\s*(.+)$", line, re.IGNORECASE)
        if match:
            block[match.group(1).lower()] = match.group(2).strip()
            has_field = True
    return block if has_field else None


def _extract_bullets(body: str, section_title: str) -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = []

    if section_title == "Priority Actions":
        chunks = [chunk.strip() for chunk in re.split(r"\n(?=Action\s*:)", body, flags=re.IGNORECASE) if chunk.strip()]
        for chunk in chunks:
            action_block = _parse_action_block(chunk)
            if action_block:
                items.append({"type": "action", **action_block})
        if items:
            return items[:4]

    for line in body.split("\n"):
        line = line.strip()
        if not line:
            continue
        bullet = re.sub(r"^[-•*]\s+", "", line)
        bullet = re.sub(r"^\d+\.\s+", "", bullet).strip()
        if not bullet:
            continue
        if bullet.lower() in {title.lower() for title in SECTION_TITLES}:
            continue
        action_block = _parse_action_block(bullet)
        if action_block and section_title == "Priority Actions":
            items.append({"type": "action", **action_block})
        else:
            items.append({"type": "bullet", "text": bullet})

    if not items and body.strip():
        return [{"type": "bullet", "text": body.strip()}]
    limit = 4 if section_title == "Priority Actions" else 5
    return items[:limit]


def parse_agent_response(text: str) -> Dict[str, Any]:
    cleaned = clean_agent_text(text)
    if not cleaned:
        return {"sections": [], "fallback": ""}

    matches = list(SECTION_PATTERN.finditer(cleaned))
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
    section = next((item for item in sections if item["title"] == "Priority Actions"), None)
    if not section:
        return None
    for bullet in section.get("bullets", []):
        if bullet.get("type") == "action":
            return bullet
    return None


def section_titles_found(text: str, expected_titles: List[str]) -> List[str]:
    parsed = parse_agent_response(text)
    found = {section["title"].lower() for section in parsed["sections"]}
    return [title for title in expected_titles if title.lower() in found]
