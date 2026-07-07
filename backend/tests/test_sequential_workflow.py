from unittest.mock import AsyncMock, patch

from engine.sequential_context import build_stage_question, get_sequential_stages


def test_sequential_stages_order():
    stages = get_sequential_stages()
    assert [agent_id for agent_id, _, _ in stages] == ["freire", "weber", "montessori", "rogers"]
    assert [slot for _, slot, _ in stages] == [1, 2, 3, 4]


def test_build_stage_question_includes_prior_outputs():
    question = "How can we reduce school dropout in São Paulo?"
    freire_out = "Problem map: missing student voices in policy design."
    weber_input = build_stage_question(question, {"freire": freire_out}, "weber")
    assert question in weber_input
    assert freire_out in weber_input
    assert "VAIHE 2" in weber_input or "Administrative service model" in weber_input


@patch("agents.service.ask_agent_slot", new_callable=AsyncMock)
def test_sequential_workflow_runs_four_stages(mock_ask):
    import asyncio

    from engine.sequential_workflow import run_sequential_workflow

    call_order = []

    async def _fake_ask(slot_number, agent_id, question, model=None):
        call_order.append(agent_id)
        return {
            "agent_key": agent_id,
            "agent_number": slot_number,
            "agent_name": f"{agent_id} Agent",
            "response": f"Output from {agent_id} " + ("word " * 90),
            "error": None,
        }

    mock_ask.side_effect = _fake_ask

    responses = asyncio.run(
        run_sequential_workflow("How can we reduce school dropout in São Paulo?", model="openai/gpt-4o-mini")
    )
    assert len(responses) == 4
    assert call_order == ["freire", "weber", "montessori", "rogers"]
    assert responses[0]["sequential_stage"]["vaihe"] == 1
    assert responses[3]["sequential_stage"]["role"] == "scaling_roadmap"


def test_ask_sequential_mode_api(client, monkeypatch):
    with patch("main.ask_all_agents", new_callable=AsyncMock) as mock_ask:
        mock_ask.return_value = [
            {
                "agent_key": "freire",
                "agent_number": 1,
                "agent_name": "Freire Agent",
                "response": "Stage 1",
                "sequential_stage": {"vaihe": 1, "role": "problem_map"},
                "error": None,
            },
            {
                "agent_key": "weber",
                "agent_number": 2,
                "agent_name": "Weber Agent",
                "response": "Stage 2",
                "sequential_stage": {"vaihe": 2, "role": "service_model"},
                "error": None,
            },
            {
                "agent_key": "montessori",
                "agent_number": 3,
                "agent_name": "Montessori Agent",
                "response": "Stage 3",
                "sequential_stage": {"vaihe": 3, "role": "school_day_redesign"},
                "error": None,
            },
            {
                "agent_key": "rogers",
                "agent_number": 4,
                "agent_name": "Rogers Agent",
                "response": "Stage 4",
                "sequential_stage": {"vaihe": 4, "role": "scaling_roadmap"},
                "error": None,
            },
        ]
        monkeypatch.setenv("OPENAI_API_KEY", "test-key")
        from config import get_settings
        import main

        get_settings.cache_clear()
        main.settings = get_settings()

        response = client.post(
            "/api/ask?mode=sequential",
            json={"question": "How can we reduce school dropout in São Paulo?", "mode": "sequential"},
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["workflow_mode"] == "sequential"
    mock_ask.assert_awaited_once()
    assert mock_ask.await_args.kwargs["mode"] == "sequential"
