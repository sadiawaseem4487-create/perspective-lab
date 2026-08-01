def test_production_forces_auth_required(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("AUTH_REQUIRED", "false")
    monkeypatch.setenv("AUTH_SECRET", "unit-test-auth-secret")
    from config import get_settings
    from auth_service import auth_required

    get_settings.cache_clear()
    assert auth_required() is True
    get_settings.cache_clear()


def test_staging_forces_auth_required(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "staging")
    monkeypatch.setenv("AUTH_REQUIRED", "false")
    from config import get_settings
    from auth_service import auth_required

    get_settings.cache_clear()
    assert auth_required() is True
    get_settings.cache_clear()


def test_development_can_disable_auth(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("AUTH_REQUIRED", "false")
    from config import get_settings
    from auth_service import auth_required

    get_settings.cache_clear()
    assert auth_required() is False
    get_settings.cache_clear()
