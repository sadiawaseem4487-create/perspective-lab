def test_health_ok(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["database_ok"] is True
    assert "version" in payload
    assert "llm_configured" in payload
    assert payload["environment"] == "development"
