def test_register_login_and_personal_key(client, monkeypatch):
    monkeypatch.setenv("AUTH_REQUIRED", "true")
    monkeypatch.setenv("AUTH_SECRET", "unit-test-auth-secret")
    from config import get_settings

    get_settings.cache_clear()

    reg = client.post(
        "/api/auth/register",
        json={"email": "lab.user@example.com", "password": "password123", "name": "Lab"},
    )
    assert reg.status_code == 200
    token = reg.json()["token"]
    assert token

    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["authenticated"] is True
    assert me.json()["user"]["email"] == "lab.user@example.com"

    saved = client.put(
        "/api/auth/llm-key",
        headers={"Authorization": f"Bearer {token}"},
        json={"provider": "openrouter", "api_key": "sk-or-v1-testkey123456", "model": "openai/gpt-4o-mini"},
    )
    assert saved.status_code == 200
    assert saved.json()["personal_key"]["configured"] is True

    login = client.post(
        "/api/auth/login",
        json={"email": "lab.user@example.com", "password": "password123"},
    )
    assert login.status_code == 200
    assert login.json()["token"]

    # Re-register with same credentials signs in instead of 422 "already exists"
    again = client.post(
        "/api/auth/register",
        json={"email": "lab.user@example.com", "password": "password123", "name": "Lab"},
    )
    assert again.status_code == 200
    assert again.json()["token"]

    conflict = client.post(
        "/api/auth/register",
        json={"email": "lab.user@example.com", "password": "wrong-password", "name": "Lab"},
    )
    assert conflict.status_code == 422
    assert "already exists" in conflict.json()["detail"].lower()