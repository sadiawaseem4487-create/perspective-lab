import pytest


@pytest.mark.parametrize("lang", ["en", "pt", "fi"])
def test_questions_load_for_each_language(client, lang):
    response = client.get(f"/api/questions?lang={lang}")
    assert response.status_code == 200
    payload = response.json()
    assert payload["language"] == lang
    assert len(payload["main_question"]) > 20
    assert len(payload["questions"]) >= 1


def test_questions_invalid_language_falls_back_to_en(client):
    response = client.get("/api/questions?lang=xx")
    assert response.status_code == 200
    payload = response.json()
    assert payload["language"] == "en"
    assert payload["main_question"]


def test_models_config(client):
    response = client.get("/api/models")
    assert response.status_code == 200
    payload = response.json()
    assert len(payload["models"]) >= 1
    assert payload.get("default_model")


def test_tools_config(client):
    response = client.get("/api/tools")
    assert response.status_code == 200
    assert isinstance(response.json(), dict)
