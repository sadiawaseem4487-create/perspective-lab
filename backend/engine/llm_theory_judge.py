"""Optional LLM-as-judge for theory fidelity (semantic, beyond rules).

Enable with THEORY_JUDGE_LLM=true. Also available on-demand via API.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

JUDGE_SYSTEM = """You are a research methods judge for PerspectiveLab.
Score whether an agent answer stays faithful to ONE classical theory lens.
Return ONLY compact JSON with keys:
  fidelity_score (1-5 integer),
  passed (boolean — true if score >= 3),
  rationale (one short sentence),
  foreign_theory_risk (none|low|medium|high).
Do not rewrite the answer. Do not add markdown."""


async def llm_theory_fidelity_check(
    agent_id: str,
    text: str,
    profile: Optional[dict] = None,
    model: Optional[str] = None,
) -> Dict[str, Any]:
    """Call the configured LLM to judge theory fidelity. Never raises to callers."""
    from agents.service import get_client
    from config import get_settings

    settings = get_settings()
    if not settings.llm_configured:
        return {
            "id": "llm_fidelity",
            "passed": True,
            "skipped": True,
            "detail": "LLM not configured — skipped",
        }

    theory = (profile or {}).get("theory") or agent_id
    diagnostic = (profile or {}).get("diagnostic_question") or ""
    must_not = "; ".join((profile or {}).get("must_not_do") or [])
    user = (
        f"Agent id: {agent_id}\n"
        f"Theory: {theory}\n"
        f"Diagnostic question: {diagnostic}\n"
        f"Must not do: {must_not or 'n/a'}\n\n"
        f"Answer to judge:\n{(text or '')[:4000]}"
    )

    try:
        client = get_client()
        completion = await client.chat.completions.create(
            model=model or settings.llm_model,
            messages=[
                {"role": "system", "content": JUDGE_SYSTEM},
                {"role": "user", "content": user},
            ],
            temperature=0.1,
            max_tokens=220,
        )
        raw = (completion.choices[0].message.content or "").strip()
        parsed = _parse_judge_json(raw)
        score = int(parsed.get("fidelity_score") or 0)
        passed = bool(parsed.get("passed")) if "passed" in parsed else score >= 3
        return {
            "id": "llm_fidelity",
            "passed": passed,
            "skipped": False,
            "detail": parsed.get("rationale") or f"fidelity_score={score}",
            "fidelity_score": score,
            "foreign_theory_risk": parsed.get("foreign_theory_risk") or "unknown",
            "raw": raw[:500],
        }
    except Exception as exc:
        logger.exception("LLM theory judge failed for %s", agent_id)
        return {
            "id": "llm_fidelity",
            "passed": True,
            "skipped": True,
            "detail": f"Judge error (non-blocking): {exc}",
        }


def _parse_judge_json(raw: str) -> dict:
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", raw)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass
    score_match = re.search(r"fidelity_score[\"']?\s*[:=]\s*(\d)", raw, re.I)
    score = int(score_match.group(1)) if score_match else 0
    return {
        "fidelity_score": score,
        "passed": score >= 3,
        "rationale": raw[:180],
        "foreign_theory_risk": "unknown",
    }


def _cohens_kappa(labels_a: list, labels_b: list) -> Optional[float]:
    """Unweighted Cohen's kappa for two equal-length label lists."""
    n = len(labels_a)
    if n == 0 or n != len(labels_b):
        return None
    cats = sorted(set(labels_a) | set(labels_b))
    if len(cats) < 2:
        return 1.0 if labels_a == labels_b else 0.0

    index = {c: i for i, c in enumerate(cats)}
    k = len(cats)
    matrix = [[0] * k for _ in range(k)]
    for a, b in zip(labels_a, labels_b):
        matrix[index[a]][index[b]] += 1

    po = sum(matrix[i][i] for i in range(k)) / n
    row = [sum(matrix[i][j] for j in range(k)) / n for i in range(k)]
    col = [sum(matrix[i][j] for i in range(k)) / n for j in range(k)]
    pe = sum(row[i] * col[i] for i in range(k))
    if pe >= 0.999999:
        return 1.0 if po >= 0.999999 else 0.0
    return round((po - pe) / (1.0 - pe), 3)


def inter_rater_agreement(ratings: list) -> Dict[str, Any]:
    """Pairwise exact-agreement, MAD, and Cohen's kappa across PS dimensions."""
    dims = ["PS1", "PS2", "PS3", "PS4", "PS5", "PS6"]
    usable = [r for r in ratings if isinstance(r.get("scores"), dict) and r["scores"]]
    if len(usable) < 2:
        return {
            "coder_count": len(usable),
            "exact_agreement": None,
            "mean_abs_diff": None,
            "cohens_kappa": None,
            "pairwise_comparisons": 0,
        }

    exact_hits = 0
    exact_total = 0
    abs_sum = 0.0
    abs_n = 0
    pairs = 0
    kappa_values: list = []

    for i in range(len(usable)):
        for j in range(i + 1, len(usable)):
            pairs += 1
            a = usable[i]["scores"]
            b = usable[j]["scores"]
            labels_a: list = []
            labels_b: list = []
            for dim in dims:
                if dim not in a or dim not in b:
                    continue
                va, vb = int(a[dim]), int(b[dim])
                exact_total += 1
                if va == vb:
                    exact_hits += 1
                abs_sum += abs(va - vb)
                abs_n += 1
                labels_a.append(va)
                labels_b.append(vb)
            kappa = _cohens_kappa(labels_a, labels_b)
            if kappa is not None:
                kappa_values.append(kappa)

    mean_kappa = round(sum(kappa_values) / len(kappa_values), 3) if kappa_values else None

    return {
        "coder_count": len(usable),
        "exact_agreement": round(exact_hits / exact_total, 3) if exact_total else None,
        "mean_abs_diff": round(abs_sum / abs_n, 3) if abs_n else None,
        "cohens_kappa": mean_kappa,
        "pairwise_comparisons": pairs,
    }
