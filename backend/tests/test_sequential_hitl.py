from unittest.mock import AsyncMock, patch

import pytest


def _stage_response(agent_id: str, vaihe: int, role: str, slot: int) -> dict:
    return {
        "agent_key": agent_id,
        "agent_number": slot,
        "agent_name": f"{agent_id.title()} Agent",
        "response": f"Output from {agent_id} " + ("word " * 90),
        "sequential_stage": {"vaihe": vaihe, "role": role},
        "error": None,
    }


@pytest.fixture()
def mock_stage_runner():
    stages = [
        ("freire", 1, "problem_map"),
        ("weber", 2, "service_model"),
        ("montessori", 3, "school_day_redesign"),
        ("rogers", 4, "scaling_roadmap"),
    ]

    async def _run(question, vaihe, stage_outputs, model=None, human_note=""):
        agent_id, slot, role = stages[vaihe - 1]
        result = _stage_response(agent_id, vaihe, role, slot)
        if human_note:
            result["human_note_applied"] = human_note
        return result

    with patch(
        "application.sequential_hitl.run_single_sequential_stage",
        new_callable=AsyncMock,
        side_effect=_run,
    ) as mock:
        yield mock


def test_sequential_start_runs_vaihe_one(client, monkeypatch, mock_stage_runner):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    from config import get_settings
    import main

    get_settings.cache_clear()
    main.settings = get_settings()

    response = client.post(
        "/api/sequential/start",
        json={"question": "How can we reduce school dropout in São Paulo?"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "awaiting_review"
    assert payload["current_vaihe"] == 1
    assert len(payload["responses"]) == 1
    assert payload["responses"][0]["agent_key"] == "freire"
    assert len(payload["stages"]) == 4
    mock_stage_runner.assert_awaited_once()


def test_sequential_advance_runs_next_stage(client, monkeypatch, mock_stage_runner):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    from config import get_settings
    import main

    get_settings.cache_clear()
    main.settings = get_settings()

    start = client.post(
        "/api/sequential/start",
        json={"question": "How can we reduce school dropout in São Paulo?"},
    ).json()
    run_id = start["run_id"]

    advanced = client.post(
        f"/api/sequential/{run_id}/advance",
        json={"human_note": "Looks good", "approved": True},
    )

    assert advanced.status_code == 200
    payload = advanced.json()
    assert payload["status"] == "awaiting_review"
    assert payload["current_vaihe"] == 2
    assert len(payload["responses"]) == 2
    assert payload["human_checkpoints"][0]["vaihe"] == 1
    assert mock_stage_runner.await_count == 2
    assert mock_stage_runner.await_args.kwargs.get("human_note") == "Looks good"


def test_sequential_finalize_completes_run(client, monkeypatch, mock_stage_runner):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    from config import get_settings
    import main

    get_settings.cache_clear()
    main.settings = get_settings()

    start = client.post(
        "/api/sequential/start",
        json={"question": "How can we reduce school dropout in São Paulo?"},
    ).json()
    run_id = start["run_id"]

    for _ in range(3):
        client.post(
            f"/api/sequential/{run_id}/advance",
            json={"approved": True},
        )

    finalized = client.post(
        f"/api/sequential/{run_id}/finalize",
        json={"human_note": "Ship it", "approved": True},
    )

    assert finalized.status_code == 200
    payload = finalized.json()
    assert payload["status"] == "completed"
    assert payload["session_id"]
    assert len(payload["responses"]) == 4

    status = client.get(f"/api/sequential/{run_id}")
    assert status.status_code == 200
    assert status.json()["status"] == "completed"


def test_sequential_status_not_found(client):
    response = client.get("/api/sequential/99999")
    assert response.status_code == 404
