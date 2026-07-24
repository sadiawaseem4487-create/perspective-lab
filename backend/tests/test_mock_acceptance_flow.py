"""Mock acceptance / pilot flow (no real LLM network calls).

Covers the client path: Setup → Ask → Report → Compare → Rubric → Matrix → Export → Present.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, patch


def _enable_llm(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    from config import get_settings
    import main

    get_settings.cache_clear()
    main.settings = get_settings()


def _four_agent_payload():
    return [
        {
            "agent_key": "freire",
            "agent_number": 1,
            "agent_label": "Agent 1",
            "agent_name": "Paulo Freire",
            "response": "Freire mock answer with dialogue and praxis.",
            "latency_ms": 10,
        },
        {
            "agent_key": "weber",
            "agent_number": 2,
            "agent_label": "Agent 2",
            "agent_name": "Max Weber",
            "response": "Weber mock answer with rules and accountability.",
            "latency_ms": 12,
        },
        {
            "agent_key": "montessori",
            "agent_number": 3,
            "agent_label": "Agent 3",
            "agent_name": "Maria Montessori",
            "response": "Montessori mock answer with prepared environment.",
            "latency_ms": 11,
        },
        {
            "agent_key": "rogers",
            "agent_number": 4,
            "agent_label": "Agent 4",
            "agent_name": "Everett Rogers",
            "response": "Rogers mock answer with pilots and scaling.",
            "latency_ms": 9,
        },
    ]


@patch("main.ask_all_agents", new_callable=AsyncMock)
def test_mock_full_pilot_flow(mock_ask, client, tmp_path, monkeypatch):
    mock_ask.return_value = _four_agent_payload()
    _enable_llm(monkeypatch)

    # 1) Health + setup status
    health = client.get("/api/health")
    assert health.status_code in (200, 503)
    assert "setup_allowed" in health.json()

    setup = client.get("/api/setup/status")
    assert setup.status_code == 200
    assert setup.json()["setup_allowed"] is True

    # 2) Setup keys (temp env file)
    env_path = tmp_path / ".env"
    env_path.write_text("ENVIRONMENT=development\n", encoding="utf-8")
    monkeypatch.setattr("setup_keys.env_file_path", lambda _s=None: env_path)
    monkeypatch.setattr("setup_keys.setup_allowed", lambda _s=None: True)
    keys = client.post(
        "/api/setup/keys",
        json={
            "provider": "openrouter",
            "api_key": "sk-or-mock-acceptance-key",
            "model": "openai/gpt-4o-mini",
        },
    )
    assert keys.status_code == 200
    assert keys.json()["ok"] is True
    assert "OPENROUTER_API_KEY=sk-or-mock-acceptance-key" in env_path.read_text(encoding="utf-8")

    # 3) Case catalog + presentation + questions
    catalog = client.get("/api/agents/catalog")
    assert catalog.status_code == 200
    assert catalog.json()["case"]["id"] == "sao-paulo-dropout"

    presentation = client.get("/api/presentation")
    assert presentation.status_code == 200
    assert presentation.json()

    questions = client.get("/api/questions?lang=en")
    assert questions.status_code == 200

    # 4) Ask (mocked)
    question = "How can we reduce school dropout with community participation?"
    ask = client.post("/api/ask?mode=parallel", json={"question": question, "language": "en"})
    assert ask.status_code == 200, ask.text
    ask_payload = ask.json()
    session_id = ask_payload["session_id"]
    assert ask_payload["workflow_mode"] == "parallel"
    assert len(ask_payload["responses"]) == 4

    # 5) Report
    report = client.get(f"/api/reports/{session_id}")
    assert report.status_code == 200
    assert report.json()["session_id"] == session_id

    # 6) Compare + human guest
    comparison = client.get(f"/api/comparison/{session_id}")
    assert comparison.status_code == 200
    humans = client.post(
        f"/api/comparison/{session_id}/human",
        json={
            "respondents": [
                {
                    "name": "Mock Guest",
                    "role": "Teacher",
                    "answer": "Start with listening circles and clear school routines.",
                }
            ]
        },
    )
    assert humans.status_code == 200

    # 7) Rubric with two coders (kappa)
    for coder, ps2 in (("coder-a", 4), ("coder-b", 5)):
        rubric = client.post(
            f"/api/comparison/{session_id}/rubric",
            json={
                "participant_id": "p-mock",
                "coder_id": coder,
                "condition": "parallel",
                "pre_solution": "Generic advice.",
                "post_solution": "Dialogue first, then document owners and timelines.",
                "scores": {
                    "PS1": 3,
                    "PS2": ps2,
                    "PS3": 4,
                    "PS4": 3,
                    "PS5": 3,
                    "PS6": 4,
                },
                "notes": f"mock-{coder}",
            },
        )
        assert rubric.status_code == 200, rubric.text

    rubric_get = client.get(f"/api/comparison/{session_id}/rubric")
    assert rubric_get.status_code == 200
    inter = rubric_get.json()["inter_rater"]
    assert inter["coder_count"] == 2
    assert inter["exact_agreement"] is not None
    assert inter["cohens_kappa"] is not None

    # 8) Matrix
    matrix = client.get(f"/api/comparison/{session_id}/matrix")
    assert matrix.status_code == 200

    # 9) Exports
    for path in ("/api/export/json", "/api/export/csv", "/api/export/rubric.csv"):
        resp = client.get(path)
        assert resp.status_code == 200, path
        assert len(resp.content) > 10

    # cleanup human answers file if written into case pack
    from pathlib import Path

    human_path = (
        Path(__file__).resolve().parents[2]
        / "cases"
        / "sao-paulo-dropout"
        / "human_answers"
        / f"session_{session_id}.json"
    )
    if human_path.is_file() and "Mock Guest" in human_path.read_text(encoding="utf-8"):
        human_path.unlink()


def test_mock_digital_inclusion_case_pack():
    from infrastructure.cases.repository import CaseRepository, clear_case_cache
    from infrastructure.cases.resolver import resolve_case_paths

    clear_case_cache()
    paths = resolve_case_paths("digital-inclusion")
    repo = CaseRepository(paths)
    assert paths.manifest["id"] == "digital-inclusion"
    assert len(repo.get_main_agents()) == 4
    assert repo.load_presentation_config()
    clear_case_cache()


def test_mock_sequential_hitl_flow(client, monkeypatch):
    async def _run(question, vaihe, stage_outputs, model=None, human_note=""):
        order = ["freire", "weber", "montessori", "rogers"]
        agent_id = order[vaihe - 1]
        return {
            "agent_key": agent_id,
            "agent_number": vaihe,
            "agent_name": f"{agent_id.title()} Agent",
            "response": f"Mock sequential output from {agent_id} " + ("word " * 90),
            "sequential_stage": {"vaihe": vaihe, "role": "mock"},
            "error": None,
            "human_note_applied": human_note or None,
        }

    with patch(
        "application.sequential_hitl.run_single_sequential_stage",
        new_callable=AsyncMock,
        side_effect=_run,
    ):
        _enable_llm(monkeypatch)
        start = client.post(
            "/api/sequential/start",
            json={"question": "Mock sequential question for acceptance testing."},
        )
        assert start.status_code == 200
        run_id = start.json()["run_id"]
        assert start.json()["current_vaihe"] == 1

        adv = client.post(
            f"/api/sequential/{run_id}/advance",
            json={"human_note": "Focus on equity", "approved": True},
        )
        assert adv.status_code == 200
        assert adv.json()["current_vaihe"] >= 2
