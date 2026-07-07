from unittest.mock import AsyncMock, patch


def _enable_llm(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    from config import get_settings

    get_settings.cache_clear()
    import main

    main.settings = get_settings()


def test_ask_requires_llm_key(client):
    response = client.post(
        "/api/ask",
        json={"question": "How can we reduce school dropout in São Paulo?"},
    )
    assert response.status_code == 503
    assert "API key" in response.json()["detail"]


def test_ask_validates_question_length(client):
    response = client.post("/api/ask", json={"question": "hi"})
    assert response.status_code == 422


@patch("main.ask_all_agents", new_callable=AsyncMock)
def test_ask_success_creates_session_and_report(mock_ask, client, tmp_path, monkeypatch):
    mock_ask.return_value = [
        {
            "agent_key": "freire",
            "agent_number": 1,
            "agent_label": "Agent 1",
            "agent_name": "Paulo Freire",
            "response": "Test response from Freire.",
            "latency_ms": 10,
        },
        {
            "agent_key": "weber",
            "agent_number": 2,
            "agent_label": "Agent 2",
            "agent_name": "Max Weber",
            "response": "Test response from Weber.",
            "latency_ms": 12,
        },
        {
            "agent_key": "montessori",
            "agent_number": 3,
            "agent_label": "Agent 3",
            "agent_name": "Maria Montessori",
            "response": "Test response from Montessori.",
            "latency_ms": 11,
        },
        {
            "agent_key": "rogers",
            "agent_number": 4,
            "agent_label": "Agent 4",
            "agent_name": "Everett Rogers",
            "response": "Test response from Rogers.",
            "latency_ms": 9,
        },
    ]

    _enable_llm(monkeypatch)

    question = "How can we reduce school dropout in São Paulo?"
    response = client.post("/api/ask", json={"question": question, "language": "en"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["question"] == question
    assert len(payload["responses"]) == 4

    session_id = payload["session_id"]
    session = client.get(f"/api/sessions/{session_id}").json()
    assert session["question"] == question

    report = client.get(f"/api/reports/{session_id}").json()
    assert report["session_id"] == session_id
    assert len(report["responses"]) == 4


@patch("main.ask_all_agents", new_callable=AsyncMock)
def test_ask_all_agents_fail(mock_ask, client, monkeypatch):
    mock_ask.return_value = [
        {"agent_key": "freire", "error": "timeout"},
        {"agent_key": "weber", "error": "timeout"},
        {"agent_key": "montessori", "error": "timeout"},
        {"agent_key": "rogers", "error": "timeout"},
    ]

    _enable_llm(monkeypatch)

    response = client.post(
        "/api/ask",
        json={"question": "How can we reduce school dropout in São Paulo?"},
    )
    assert response.status_code == 502
