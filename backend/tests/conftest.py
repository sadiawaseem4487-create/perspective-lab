import json
from pathlib import Path

import pytest
from starlette.testclient import TestClient


@pytest.fixture()
def project_root() -> Path:
    return Path(__file__).resolve().parents[2]


@pytest.fixture()
def case_pack_root(project_root) -> Path:
    return project_root / "cases" / "sao-paulo-dropout"


@pytest.fixture()
def client(tmp_path, monkeypatch):
    db_path = tmp_path / "test_sessions.db"
    monkeypatch.setenv("DATABASE_PATH", str(db_path))
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("OPENAI_API_KEY", "")
    monkeypatch.setenv("OPENROUTER_API_KEY", "")
    monkeypatch.delenv("EXPORT_API_KEY", raising=False)

    from config import get_settings

    get_settings.cache_clear()

    from application import clear_case_cache

    clear_case_cache()

    from database import init_db

    init_db()

    import main

    main.settings = get_settings()

    with TestClient(main.app) as test_client:
        yield test_client

    get_settings.cache_clear()
    clear_case_cache()
    main.settings = get_settings()


@pytest.fixture()
def restore_slot_assignments(case_pack_root):
    path = case_pack_root / "agents" / "slot_assignments.json"
    original = path.read_text(encoding="utf-8")
    yield
    path.write_text(original, encoding="utf-8")
    from application import clear_case_cache

    clear_case_cache()


@pytest.fixture()
def restore_selected_model(case_pack_root):
    path = case_pack_root / "models" / "selected_model.json"
    original = path.read_text(encoding="utf-8")
    yield
    path.write_text(original, encoding="utf-8")
    from application import clear_case_cache

    clear_case_cache()


@pytest.fixture()
def sample_session_id(case_pack_root) -> int:
    reports = sorted(case_pack_root.glob("reports/report_session_*.json"))
    if not reports:
        pytest.skip("No sample reports in case pack")
    data = json.loads(reports[0].read_text(encoding="utf-8"))
    return int(data["session_id"])
