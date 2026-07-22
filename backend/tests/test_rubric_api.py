def test_rubric_get_empty(client, sample_session_id):
    response = client.get(f"/api/comparison/{sample_session_id}/rubric")
    assert response.status_code == 200
    payload = response.json()
    assert payload["session_id"] == sample_session_id
    assert "dimensions" in payload
    assert len(payload["dimensions"]) == 6


def test_rubric_save_and_reload(client, sample_session_id, case_pack_root):
    body = {
        "participant_id": "p-1",
        "coder_id": "coder-a",
        "condition": "parallel",
        "pre_solution": "Generic idea to reduce dropout.",
        "post_solution": "Listen to youth, then pilot with Rogers, document with Weber.",
        "scores": {"PS1": 3, "PS2": 4, "PS3": 4, "PS4": 2, "PS5": 3, "PS6": 4},
        "notes": "Improved framing after agents",
    }
    save = client.post(f"/api/comparison/{sample_session_id}/rubric", json=body)
    assert save.status_code == 200
    saved = save.json()
    assert saved["scores"]["PS2"] == 4
    assert saved["participant_id"] == "p-1"

    path = case_pack_root / "rubric_scores" / f"session_{sample_session_id}.json"
    assert path.is_file()

    reload_resp = client.get(f"/api/comparison/{sample_session_id}/rubric")
    assert reload_resp.status_code == 200
    reloaded = reload_resp.json()
    assert reloaded["scores"]["PS6"] == 4
    assert reloaded["condition"] == "parallel"


def test_rubric_inter_rater_two_coders(client, sample_session_id, case_pack_root):
    base = {
        "participant_id": "p-2",
        "condition": "parallel",
        "pre_solution": "Before.",
        "post_solution": "After agents.",
    }
    first = client.post(
        f"/api/comparison/{sample_session_id}/rubric",
        json={
            **base,
            "coder_id": "coder-a",
            "scores": {"PS1": 3, "PS2": 4, "PS3": 4, "PS4": 2, "PS5": 3, "PS6": 4},
            "notes": "a",
        },
    )
    assert first.status_code == 200

    second = client.post(
        f"/api/comparison/{sample_session_id}/rubric",
        json={
            **base,
            "coder_id": "coder-b",
            "scores": {"PS1": 3, "PS2": 5, "PS3": 4, "PS4": 2, "PS5": 3, "PS6": 4},
            "notes": "b",
        },
    )
    assert second.status_code == 200
    payload = second.json()
    assert len(payload["ratings"]) == 2
    assert payload["inter_rater"]["coder_count"] == 2
    assert payload["inter_rater"]["exact_agreement"] is not None

    path = case_pack_root / "rubric_scores" / f"session_{sample_session_id}.json"
    assert path.is_file()


def test_rubric_rejects_invalid_score(client, sample_session_id):
    response = client.post(
        f"/api/comparison/{sample_session_id}/rubric",
        json={"scores": {"PS1": 9}},
    )
    assert response.status_code == 422


def test_rubric_session_not_found(client):
    response = client.get("/api/comparison/999999/rubric")
    assert response.status_code == 404
