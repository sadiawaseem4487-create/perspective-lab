import pytest
from unittest.mock import AsyncMock, patch


def test_theory_profiles_exist():
    from application import list_theory_profiles

    profiles = list_theory_profiles()
    ids = {profile["agent_id"] for profile in profiles}
    assert ids == {"freire", "weber", "montessori", "rogers"}


def test_freire_profile_has_diagnostic_question():
    from application import load_theory_profile

    profile = load_theory_profile("freire")
    assert profile["diagnostic_question"]
    assert len(profile["reasoning_chain"]) >= 3


@patch("agents.service.ask_agent_slot", new_callable=AsyncMock)
def test_parallel_workflow_fan_out(mock_ask):
    import asyncio

    from engine.parallel_workflow import run_parallel_workflow

    mock_ask.side_effect = [
        {
            "agent_key": "freire",
            "agent_number": 1,
            "agent_name": "Freire Agent",
            "response": "Paulo Freire participatory response " + ("word " * 90),
            "error": None,
        },
        {
            "agent_key": "weber",
            "agent_number": 2,
            "agent_name": "Weber Agent",
            "response": "Max Weber administrative response " + ("word " * 90),
            "error": None,
        },
        {
            "agent_key": "montessori",
            "agent_number": 3,
            "agent_name": "Montessori Agent",
            "response": "Maria Montessori environment response " + ("word " * 90),
            "error": None,
        },
        {
            "agent_key": "rogers",
            "agent_number": 4,
            "agent_name": "Rogers Agent",
            "response": "Everett Rogers diffusion response " + ("word " * 90),
            "error": None,
        },
    ]

    responses = asyncio.run(
        run_parallel_workflow("Test question for parallel graph?", model="openai/gpt-4o-mini")
    )
    assert len(responses) == 4
    assert mock_ask.await_count == 4
    assert [r["agent_number"] for r in responses] == [1, 2, 3, 4]


def test_ask_parallel_mode_query_param(client):
    with patch("main.ask_all_agents", new_callable=AsyncMock) as mock_ask:
        mock_ask.return_value = [
            {
                "agent_key": "freire",
                "agent_number": 1,
                "agent_name": "Freire Agent",
                "response": "ok",
                "error": None,
            },
            {
                "agent_key": "weber",
                "agent_number": 2,
                "agent_name": "Weber Agent",
                "response": "ok",
                "error": None,
            },
            {
                "agent_key": "montessori",
                "agent_number": 3,
                "agent_name": "Montessori Agent",
                "response": "ok",
                "error": None,
            },
            {
                "agent_key": "rogers",
                "agent_number": 4,
                "agent_name": "Rogers Agent",
                "response": "ok",
                "error": None,
            },
        ]
        response = client.post(
            "/api/ask?mode=parallel",
            json={"question": "How can we reduce school dropout in São Paulo?"},
        )
    assert response.status_code == 503
    mock_ask.assert_not_called()


def test_ask_parallel_mode_with_llm(client, monkeypatch):
    with patch("main.ask_all_agents", new_callable=AsyncMock) as mock_ask:
        mock_ask.return_value = [
            {
                "agent_key": "freire",
                "agent_number": 1,
                "agent_name": "Freire Agent",
                "response": "ok",
                "error": None,
            },
            {
                "agent_key": "weber",
                "agent_number": 2,
                "agent_name": "Weber Agent",
                "response": "ok",
                "error": None,
            },
            {
                "agent_key": "montessori",
                "agent_number": 3,
                "agent_name": "Montessori Agent",
                "response": "ok",
                "error": None,
            },
            {
                "agent_key": "rogers",
                "agent_number": 4,
                "agent_name": "Rogers Agent",
                "response": "ok",
                "error": None,
            },
        ]
        monkeypatch.setenv("OPENAI_API_KEY", "test-key")
        from config import get_settings
        import main

        get_settings.cache_clear()
        main.settings = get_settings()

        response = client.post(
            "/api/ask?mode=parallel",
            json={"question": "How can we reduce school dropout in São Paulo?"},
        )
    assert response.status_code == 200
    mock_ask.assert_awaited_once()
    assert mock_ask.await_args.kwargs["mode"] == "parallel"
    assert response.json()["workflow_mode"] == "parallel"


def test_ask_sequential_mode_not_implemented(client, monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    from config import get_settings
    import main

    get_settings.cache_clear()
    main.settings = get_settings()

    response = client.post(
        "/api/ask?mode=sequential",
        json={"question": "How can we reduce school dropout in São Paulo?"},
    )
    assert response.status_code == 501
