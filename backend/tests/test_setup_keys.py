"""Tests for first-run / desktop API key setup."""

from config import get_settings
from setup_keys import apply_llm_keys, setup_allowed


def test_setup_status(client):
    response = client.get("/api/setup/status")
    assert response.status_code == 200
    payload = response.json()
    assert "llm_configured" in payload
    assert payload["setup_allowed"] is True


def test_setup_keys_writes_env(client, tmp_path, monkeypatch):
    env_path = tmp_path / ".env"
    env_path.write_text("ENVIRONMENT=development\n", encoding="utf-8")
    monkeypatch.setattr("setup_keys.env_file_path", lambda _s=None: env_path)
    monkeypatch.setattr("setup_keys.setup_allowed", lambda _s=None: True)
    get_settings.cache_clear()

    response = client.post(
        "/api/setup/keys",
        json={
            "provider": "openrouter",
            "api_key": "sk-or-test-key-123456",
            "model": "openai/gpt-4o-mini",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    text = env_path.read_text(encoding="utf-8")
    assert "OPENROUTER_API_KEY=sk-or-test-key-123456" in text
    assert "LLM_PROVIDER=openrouter" in text


def test_setup_allowed_false_in_production(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-or-prod-key-xxxxx")
    monkeypatch.setenv("EXPORT_API_KEY", "export-secret")
    get_settings.cache_clear()
    assert setup_allowed(get_settings()) is False
    get_settings.cache_clear()
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    monkeypatch.delenv("EXPORT_API_KEY", raising=False)
    get_settings.cache_clear()


def test_apply_llm_keys_unit(tmp_path, monkeypatch):
    env_path = tmp_path / ".env"
    env_path.write_text("ENVIRONMENT=development\nFOO=bar\n", encoding="utf-8")
    monkeypatch.setattr("setup_keys.env_file_path", lambda _s=None: env_path)
    monkeypatch.setattr("setup_keys.setup_allowed", lambda _s=None: True)
    get_settings.cache_clear()

    path = apply_llm_keys(provider="openai", api_key="sk-openai-test-key", model="gpt-4o-mini")
    assert path == env_path
    text = env_path.read_text(encoding="utf-8")
    assert "FOO=bar" in text
    assert "OPENAI_API_KEY=sk-openai-test-key" in text
    assert "LLM_PROVIDER=openai" in text
