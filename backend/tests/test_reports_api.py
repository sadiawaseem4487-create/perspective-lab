def test_list_reports(client):
    response = client.get("/api/reports")
    assert response.status_code == 200
    reports = response.json()
    assert len(reports) >= 1
    first = reports[0]
    assert "session_id" in first
    assert "question" in first


def test_report_detail(client, sample_session_id):
    response = client.get(f"/api/reports/{sample_session_id}")
    assert response.status_code == 200
    report = response.json()
    assert report["session_id"] == sample_session_id
    assert len(report["responses"]) >= 1


def test_report_not_found(client):
    response = client.get("/api/reports/999999")
    assert response.status_code == 404


def test_list_sessions(client):
    response = client.get("/api/sessions")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
