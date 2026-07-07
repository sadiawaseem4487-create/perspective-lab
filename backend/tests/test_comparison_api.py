def test_comparison_view(client, sample_session_id):
    response = client.get(f"/api/comparison/{sample_session_id}")
    assert response.status_code == 200
    payload = response.json()
    assert payload["session_id"] == sample_session_id
    assert len(payload["agent_solutions"]) >= 1
    assert isinstance(payload["human_answers"], list)


def test_human_answers_empty_by_default(client, sample_session_id):
    response = client.get(f"/api/comparison/{sample_session_id}/human")
    assert response.status_code == 200
    payload = response.json()
    assert payload["session_id"] == sample_session_id
    assert payload["respondents"] == [] or isinstance(payload["respondents"], list)


def test_save_and_reload_human_answers(client, sample_session_id, case_pack_root):
    human_path = case_pack_root / "human_answers" / f"session_{sample_session_id}.json"
    backup = human_path.read_text(encoding="utf-8") if human_path.is_file() else None

    try:
        body = {
            "respondents": [
                {
                    "name": "Test Researcher",
                    "role": "Facilitator",
                    "answer": "This is a test human answer for comparison validation.",
                }
            ]
        }
        save_response = client.post(f"/api/comparison/{sample_session_id}/human", json=body)
        assert save_response.status_code == 200
        saved = save_response.json()
        assert len(saved["respondents"]) == 1

        comparison = client.get(f"/api/comparison/{sample_session_id}").json()
        assert len(comparison["human_answers"]) == 1
        assert comparison["human_answers"][0]["name"] == "Test Researcher"
    finally:
        if backup is None:
            if human_path.is_file():
                human_path.unlink()
        else:
            human_path.write_text(backup, encoding="utf-8")

        from application import clear_case_cache

        clear_case_cache()


def test_human_answers_session_not_found(client):
    response = client.post(
        "/api/comparison/999999/human",
        json={
            "respondents": [
                {
                    "name": "Nobody",
                    "role": "",
                    "answer": "This answer should not be saved anywhere.",
                }
            ]
        },
    )
    assert response.status_code == 404
