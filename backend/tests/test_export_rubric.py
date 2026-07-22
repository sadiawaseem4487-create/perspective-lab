"""Tests for rubric CSV export."""


def test_export_rubric_csv_empty(client):
    response = client.get("/api/export/rubric.csv")
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    text = response.content.decode("utf-8-sig")
    header = text.strip().splitlines()[0]
    assert "session_id" in header
    assert "PS1" in header
    assert "exact_agreement" in header
    assert "cohens_kappa" in header


def test_export_rubric_csv_with_scores(client, sample_session_id, case_pack_root):
    body = {
        "participant_id": "p-export",
        "coder_id": "coder-a",
        "condition": "parallel",
        "pre_solution": "Before.",
        "post_solution": "After.",
        "scores": {"PS1": 3, "PS2": 4, "PS3": 4, "PS4": 2, "PS5": 3, "PS6": 4},
        "notes": "export-test",
    }
    save = client.post(f"/api/comparison/{sample_session_id}/rubric", json=body)
    assert save.status_code == 200

    response = client.get("/api/export/rubric.csv")
    assert response.status_code == 200
    text = response.content.decode("utf-8-sig")
    assert str(sample_session_id) in text
    assert "coder-a" in text
    assert "p-export" in text
    assert "parallel" in text
