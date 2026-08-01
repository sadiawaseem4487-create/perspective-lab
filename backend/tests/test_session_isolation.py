def test_session_isolation_between_users(client, monkeypatch):
    monkeypatch.setenv("AUTH_REQUIRED", "true")
    monkeypatch.setenv("AUTH_SECRET", "unit-test-auth-secret")
    from config import get_settings
    from database import save_session

    get_settings.cache_clear()

    a = client.post(
        "/api/auth/register",
        json={"email": "owner.a@example.com", "password": "password123", "name": "A"},
    )
    b = client.post(
        "/api/auth/register",
        json={"email": "owner.b@example.com", "password": "password123", "name": "B"},
    )
    assert a.status_code == 200
    assert b.status_code == 200
    token_a = a.json()["token"]
    token_b = b.json()["token"]
    user_a = a.json()["user"]["id"]
    user_b = b.json()["user"]["id"]

    sid_a = save_session(
        "Question from A",
        [{"agent_key": "freire", "agent_name": "Freire", "response": "A answer"}],
        user_id=user_a,
    )
    sid_b = save_session(
        "Question from B",
        [{"agent_key": "freire", "agent_name": "Freire", "response": "B answer"}],
        user_id=user_b,
    )

    list_a = client.get("/api/sessions", headers={"Authorization": f"Bearer {token_a}"})
    assert list_a.status_code == 200
    ids_a = {row["id"] for row in list_a.json()}
    assert sid_a in ids_a
    assert sid_b not in ids_a

    list_b = client.get("/api/sessions", headers={"Authorization": f"Bearer {token_b}"})
    assert list_b.status_code == 200
    ids_b = {row["id"] for row in list_b.json()}
    assert sid_b in ids_b
    assert sid_a not in ids_b

    steal = client.get(
        f"/api/sessions/{sid_a}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert steal.status_code == 404

    own = client.get(
        f"/api/sessions/{sid_a}",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert own.status_code == 200
    assert own.json()["question"] == "Question from A"
