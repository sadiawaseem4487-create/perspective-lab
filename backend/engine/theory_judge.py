"""Rule-based theory anti-drift checks (no extra LLM call).

Detects when an agent answer leans on another theory's signature language
or violates must_not_do / forbidden_frames from the profile.
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

# Signature phrases that belong primarily to one theory lens.
# Finding another agent's signature as the *dominant* frame is drift.
FOREIGN_SIGNATURES: Dict[str, Dict[str, List[str]]] = {
    "freire": {
        "weber": [
            r"\bcase[- ]management system\b",
            r"\bescalation (rules|protocol|process)\b",
            r"\battendance within 24 hours\b",
            r"\brational[- ]legal\b",
            r"\baudit trail\b",
            r"\bimpersonal(ity| rules)\b",
        ],
        "rogers": [
            r"\bcity[- ]wide rollout\b",
            r"\badopter categor",
            r"\bdiffusion of innovations\b",
            r"\brelative advantage\b",
        ],
        "montessori": [
            r"\bprepared environment\b",
            r"\bauto[- ]education\b",
            r"\bsensitive periods?\b",
            r"\bcontrol of error\b",
        ],
    },
    "weber": {
        "freire": [
            r"\blistening circles\b",
            r"\bconscienti[sz]ation\b",
            r"\bemancipat",
            r"\bproblem[- ]posing education\b",
            r"\bco[- ]design with (students|families|communities)\b",
        ],
        "montessori": [
            r"\bprepared environment\b",
            r"\bself[- ]directed learning\b",
            r"\bteacher as guide\b",
            r"\bauto[- ]education\b",
        ],
        "rogers": [
            r"\badopter categor",
            r"\bdiffusion of innovations\b",
            r"\bS[- ]curve\b",
        ],
    },
    "montessori": {
        "weber": [
            r"\bcase[- ]management\b",
            r"\bescalation protocol\b",
            r"\bmunicipal education office investigates\b",
            r"\brational[- ]legal authority\b",
            r"\baudit trail\b",
        ],
        "freire": [
            r"\bconscienti[sz]ation\b",
            r"\bpower relations\b",
            r"\boppress",
            r"\bproblem[- ]posing education\b",
        ],
        "rogers": [
            r"\bcity[- ]wide rollout\b",
            r"\badopter categor",
            r"\bdiffusion of innovations\b",
        ],
    },
    "rogers": {
        "weber": [
            r"\brational[- ]legal authority\b",
            r"\baudit trail\b",
            r"\bimpersonal(ity)? of office\b",
        ],
        "freire": [
            r"\bconscienti[sz]ation\b",
            r"\bemancipat",
            r"\bproblem[- ]posing education\b",
        ],
        "montessori": [
            r"\bprepared environment\b",
            r"\bteacher as (a )?guide\b",
            r"\bauto[- ]education\b",
        ],
    },
}

OWN_ANCHORS: Dict[str, List[str]] = {
    "freire": [
        r"\bvoice\b",
        r"\bdialogue\b",
        r"\bparticipat",
        r"\blived experience\b",
        r"\bfreire\b",
        r"\bconscienti",
        r"\bpraxis\b",
        r"\bproblem[- ]posing\b",
    ],
    "weber": [
        r"\bauthorit",
        r"\brules?\b",
        r"\baccountab",
        r"\bdocument",
        r"\bweber\b",
        r"\bprocedure",
        r"\blegitima",
        r"\bbureaucrac",
        r"\bhierarch",
    ],
    "montessori": [
        r"\benvironment\b",
        r"\bautonom",
        r"\bobserv",
        r"\bhands[- ]on\b",
        r"\bmontessori\b",
        r"\bguide\b",
        r"\bauto[- ]education\b",
        r"\bliberty\b",
    ],
    "rogers": [
        r"\bpilot\b",
        r"\badopt",
        r"\bscal",
        r"\bdiffus",
        r"\brogers\b",
        r"\btrial",
        r"\brelative advantage\b",
        r"\bopinion leader",
        r"\bcompatibility\b",
    ],
}

HARD_FORBIDDEN: Dict[str, List[str]] = {
    "freire": [
        r"\bstart with (bureaucratic|top[- ]down|administrative)\b",
        r"\bbanking education is the solution\b",
    ],
    "weber": [r"\bonly (motivation|culture) without (structure|rules|process)\b"],
    "montessori": [r"\bgeneric motivation slogan"],
    "rogers": [
        r"\binstant city[- ]wide adoption\b",
        r"\broll out to all schools immediately\b",
        r"\bunconditional positive regard\b",
    ],
}


def _count_matches(text: str, patterns: List[str]) -> int:
    return sum(1 for pattern in patterns if re.search(pattern, text, re.IGNORECASE))


def _concept_patterns(concepts: List[str]) -> List[str]:
    patterns: List[str] = []
    for concept in concepts:
        token = re.escape((concept or "").strip())
        if not token:
            continue
        token = token.replace(r"\ ", r"[\s-]+")
        patterns.append(token)
    return patterns


def evaluate_theory_drift(agent_id: str, text: str, profile: Optional[dict] = None) -> Dict[str, Any]:
    """Return drift evaluation with warnings and a boolean hard_fail flag."""
    key = (agent_id or "").lower()
    lower_text = text or ""
    warnings: List[str] = []
    foreign_hits: Dict[str, int] = {}
    profile = profile or {}

    for foreign_id, patterns in FOREIGN_SIGNATURES.get(key, {}).items():
        hits = _count_matches(lower_text, patterns)
        if hits:
            foreign_hits[foreign_id] = hits

    own_patterns = list(OWN_ANCHORS.get(key, []))
    own_patterns.extend(_concept_patterns(profile.get("core_concepts") or []))
    own_hits = _count_matches(lower_text, own_patterns)
    hard_fail = False

    for pattern in HARD_FORBIDDEN.get(key, []):
        if re.search(pattern, lower_text, re.IGNORECASE):
            hard_fail = True
            warnings.append(f"Hard must_not_do pattern matched: {pattern}")

    total_foreign = sum(foreign_hits.values())
    if total_foreign >= 2 and own_hits == 0:
        hard_fail = True
        warnings.append(
            f"Answer uses other theories' language ({foreign_hits}) without own-theory anchors"
        )
    elif total_foreign >= 2 and own_hits < total_foreign:
        warnings.append(
            f"Possible theory drift toward {foreign_hits} (own anchors={own_hits})"
        )
    elif total_foreign == 1 and own_hits == 0:
        warnings.append(f"Weak own-theory anchors; foreign signals present: {foreign_hits}")

    if own_patterns and own_hits == 0 and len(lower_text.split()) >= 40:
        warnings.append("Answer does not use this theory's original core concepts")

    # Profile must_not_do: keyword heuristic from profile text
    must_not = profile.get("must_not_do") or []
    for item in must_not:
        item_l = item.lower()
        if "bureaucratic" in item_l or "top-down" in item_l:
            if re.search(r"\b(top[- ]down|bureaucratic fix)\b", lower_text, re.IGNORECASE) and own_hits < 2:
                warnings.append(f"May violate must_not_do: {item}")
        if "instant city" in item_l or "city-wide" in item_l:
            if re.search(r"\b(all schools immediately|instant (city|nationwide))\b", lower_text, re.IGNORECASE):
                hard_fail = True
                warnings.append(f"Violates must_not_do: {item}")
        if "carl rogers" in item_l:
            if re.search(r"\b(unconditional positive regard|person[- ]centered therap)", lower_text, re.IGNORECASE):
                hard_fail = True
                warnings.append(f"Violates must_not_do: {item}")

    return {
        "agent_id": key,
        "own_anchor_hits": own_hits,
        "foreign_hits": foreign_hits,
        "warnings": warnings,
        "hard_fail": hard_fail,
        "passed": not hard_fail,
    }


def drift_check_record(agent_id: str, text: str, profile: Optional[dict] = None) -> Dict[str, Any]:
    """Shape suitable for self_check.checks[]."""
    result = evaluate_theory_drift(agent_id, text, profile)
    detail = (
        f"own={result['own_anchor_hits']} foreign={result['foreign_hits'] or '{}'}"
        + (f" warnings={len(result['warnings'])}" if result["warnings"] else "")
    )
    return {
        "id": "anti_drift",
        "passed": result["passed"],
        "detail": detail,
        "warnings": result["warnings"],
        "foreign_hits": result["foreign_hits"],
        "own_anchor_hits": result["own_anchor_hits"],
    }
