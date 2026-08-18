from unittest.mock import AsyncMock, patch


def _enable_llm(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    from config import get_settings

    get_settings.cache_clear()
    import main

    main.settings = get_settings()


def test_ask_requires_login_when_auth_on(client, monkeypatch):
    monkeypatch.setenv("AUTH_REQUIRED", "true")
    monkeypatch.setenv("AUTH_SECRET", "test-secret-for-ask")
    from config import get_settings

    get_settings.cache_clear()
    import main

    main.settings = get_settings()

    response = client.post(
        "/api/ask",
        json={"question": "How should municipal education teams involve families and community partners to reduce secondary school dropout in São Paulo this year, and what measurable first steps should they take within ninety days?"},
    )
    assert response.status_code == 401
    assert "Login" in response.json()["detail"]


def test_ask_requires_llm_key_when_none_available(client, monkeypatch):
    """Without personal key and without server key, Ask returns 503."""
    monkeypatch.setenv("AUTH_REQUIRED", "true")
    monkeypatch.setenv("AUTH_SECRET", "test-secret-for-ask")
    monkeypatch.setenv("OPENAI_API_KEY", "")
    monkeypatch.setenv("OPENROUTER_API_KEY", "")
    from config import Settings, get_settings
    from auth_service import create_user, issue_token

    # Ignore backend/.env keys for this test (empty env vars would otherwise fall through).
    monkeypatch.setattr(Settings, "llm_configured", property(lambda self: False))
    monkeypatch.setattr(Settings, "llm_api_key", property(lambda self: ""))
    get_settings.cache_clear()
    import main

    main.settings = get_settings()
    user = create_user("tester-nokey@example.com", "password123", "Tester")
    token = issue_token(user["id"])

    response = client.post(
        "/api/ask",
        headers={"Authorization": f"Bearer {token}"},
        json={"question": "How should municipal education teams involve families and community partners to reduce secondary school dropout in São Paulo this year, and what measurable first steps should they take within ninety days?"},
    )
    assert response.status_code == 503
    assert "API key" in response.json()["detail"]


@patch("main.ask_all_agents", new_callable=AsyncMock)
def test_ask_uses_server_key_without_personal_key(mock_ask, client, monkeypatch):
    """Signed-in users can ask via server OPENAI/OPENROUTER key when they have none."""
    monkeypatch.setenv("AUTH_REQUIRED", "true")
    monkeypatch.setenv("AUTH_SECRET", "test-secret-for-ask")
    _enable_llm(monkeypatch)
    from auth_service import create_user, issue_token

    mock_ask.return_value = [
        {
            "agent_key": "freire",
            "agent_number": 1,
            "agent_label": "Agent 1",
            "agent_name": "Paulo Freire",
            "response": "Server-key response.",
            "latency_ms": 10,
        },
        {
            "agent_key": "weber",
            "agent_number": 2,
            "agent_label": "Agent 2",
            "agent_name": "Max Weber",
            "response": "Server-key response.",
            "latency_ms": 10,
        },
        {
            "agent_key": "montessori",
            "agent_number": 3,
            "agent_label": "Agent 3",
            "agent_name": "Maria Montessori",
            "response": "Server-key response.",
            "latency_ms": 10,
        },
        {
            "agent_key": "rogers",
            "agent_number": 4,
            "agent_label": "Agent 4",
            "agent_name": "Everett Rogers",
            "response": "Server-key response.",
            "latency_ms": 10,
        },
    ]
    user = create_user("tester-server@example.com", "password123", "Tester")
    token = issue_token(user["id"])
    response = client.post(
        "/api/ask",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "question": (
                "How should municipal education teams involve families and community "
                "partners to reduce secondary school dropout in São Paulo this year, "
                "and what measurable first steps should they take within ninety days?"
            )
        },
    )
    assert response.status_code == 200
    mock_ask.assert_awaited_once()


def test_ask_validates_question_length(client, monkeypatch):
    _enable_llm(monkeypatch)
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

    question = "How should municipal education teams involve families and community partners to reduce secondary school dropout in São Paulo this year, and what measurable first steps should they take within ninety days?"
    response = client.post("/api/ask", json={"question": question, "language": "en"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["question"] == question
    assert payload["workflow_mode"] == "parallel"
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
        json={"question": "How should municipal education teams involve families and community partners to reduce secondary school dropout in São Paulo this year, and what measurable first steps should they take within ninety days?"},
    )
    assert response.status_code == 502
    assert "All agents failed" in response.json()["detail"]
    assert "timeout" in response.json()["detail"]
