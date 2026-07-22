"""Human-in-the-loop sequential workflow orchestration."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from application import save_report
from database import create_sequential_run, get_sequential_run, save_session, update_sequential_run
from engine.sequential_context import SEQUENTIAL_STAGES
from engine.sequential_workflow import run_single_sequential_stage


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_json(value: str, default: Any) -> Any:
    if not value:
        return default
    return json.loads(value)


def serialize_run(row: dict) -> dict:
    return {
        "run_id": row["id"],
        "question": row["question"],
        "model": row.get("model"),
        "language": row.get("language", "en"),
        "current_vaihe": row["current_vaihe"],
        "status": row["status"],
        "stage_outputs": _parse_json(row.get("stage_outputs", "{}"), {}),
        "responses": _parse_json(row.get("responses", "[]"), []),
        "human_checkpoints": _parse_json(row.get("human_checkpoints", "[]"), []),
        "session_id": row.get("session_id"),
        "created_at": row.get("created_at"),
        "updated_at": row.get("updated_at"),
        "stages": [
            {
                "vaihe": slot,
                "agent_id": agent_id,
                "role": role,
                "label": agent_id.title(),
            }
            for agent_id, slot, role in SEQUENTIAL_STAGES
        ],
    }


async def start_sequential_hitl(question: str, model: Optional[str], language: str = "en") -> dict:
    now = _now()
    run_id = create_sequential_run(
        {
            "question": question,
            "model": model,
            "language": language,
            "current_vaihe": 0,
            "status": "running",
            "stage_outputs": "{}",
            "responses": "[]",
            "human_checkpoints": "[]",
            "created_at": now,
            "updated_at": now,
        }
    )

    response = await run_single_sequential_stage(question, vaihe=1, stage_outputs={}, model=model)
    stage_outputs: Dict[str, str] = {}
    if not response.get("error"):
        stage_outputs[response["agent_key"]] = response.get("response", "")

    update_sequential_run(
        run_id,
        {
            "current_vaihe": 1,
            "status": "awaiting_review",
            "stage_outputs": json.dumps(stage_outputs),
            "responses": json.dumps([response]),
            "updated_at": _now(),
        },
    )
    return serialize_run(get_sequential_run(run_id))


async def advance_sequential_hitl(
    run_id: int,
    human_note: str = "",
    approved: bool = True,
) -> dict:
    row = get_sequential_run(run_id)
    if not row:
        raise ValueError("Sequential run not found")
    if row["status"] == "completed":
        return serialize_run(row)
    if row["status"] != "awaiting_review":
        raise ValueError(f"Run is not awaiting review (status={row['status']})")
    if not approved:
        raise ValueError("Stage not approved")

    checkpoints: List[dict] = _parse_json(row.get("human_checkpoints", "[]"), [])
    checkpoints.append(
        {
            "vaihe": row["current_vaihe"],
            "note": human_note.strip(),
            "approved_at": _now(),
        }
    )

    stage_outputs: Dict[str, str] = _parse_json(row.get("stage_outputs", "{}"), {})
    responses: List[dict] = _parse_json(row.get("responses", "[]"), [])
    current = row["current_vaihe"]

    if current >= len(SEQUENTIAL_STAGES):
        return _finalize_run(run_id, row, responses, checkpoints)

    next_vaihe = current + 1
    update_sequential_run(
        run_id,
        {
            "status": "running",
            "human_checkpoints": json.dumps(checkpoints),
            "updated_at": _now(),
        },
    )

    response = await run_single_sequential_stage(
        row["question"],
        vaihe=next_vaihe,
        stage_outputs=stage_outputs,
        model=row.get("model"),
        human_note=human_note.strip(),
    )
    responses.append(response)
    if not response.get("error"):
        stage_outputs[response["agent_key"]] = response.get("response", "")

    update_sequential_run(
        run_id,
        {
            "current_vaihe": next_vaihe,
            "status": "awaiting_review",
            "stage_outputs": json.dumps(stage_outputs),
            "responses": json.dumps(responses),
            "human_checkpoints": json.dumps(checkpoints),
            "updated_at": _now(),
        },
    )
    return serialize_run(get_sequential_run(run_id))


def _finalize_run(run_id: int, row: dict, responses: List[dict], checkpoints: List[dict]) -> dict:
    session_id = save_session(row["question"], responses, workflow_mode="sequential")
    save_report(
        {
            "session_id": session_id,
            "question": row["question"],
            "created_at": _now(),
            "model": row.get("model"),
            "workflow_mode": "sequential",
            "human_checkpoints": checkpoints,
            "responses": responses,
        }
    )
    update_sequential_run(
        run_id,
        {
            "status": "completed",
            "session_id": session_id,
            "human_checkpoints": json.dumps(checkpoints),
            "updated_at": _now(),
        },
    )
    result = serialize_run(get_sequential_run(run_id))
    result["session_id"] = session_id
    return result


async def finalize_sequential_hitl(
    run_id: int,
    human_note: str = "",
    approved: bool = True,
) -> dict:
    row = get_sequential_run(run_id)
    if not row:
        raise ValueError("Sequential run not found")
    if row["status"] == "completed":
        return serialize_run(row)
    if not approved:
        raise ValueError("Workflow not approved")

    checkpoints: List[dict] = _parse_json(row.get("human_checkpoints", "[]"), [])
    if row["status"] == "awaiting_review":
        checkpoints.append(
            {
                "vaihe": row["current_vaihe"],
                "note": human_note.strip(),
                "approved_at": _now(),
                "final": True,
            }
        )

    responses: List[dict] = _parse_json(row.get("responses", "[]"), [])
    return _finalize_run(run_id, row, responses, checkpoints)
