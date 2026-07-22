def test_presentation_config_api(client):
    response = client.get("/api/presentation")
    assert response.status_code == 200
    payload = response.json()
    assert payload["case_id"] == "sao-paulo-dropout"
    assert payload.get("topic")
    assert payload.get("introduction")
    assert payload.get("case_study")
    assert payload.get("conclusion")
    assert isinstance(payload.get("sources"), list)
    assert len(payload["sources"]) >= 1
    assert payload["sources"][0].get("url")
