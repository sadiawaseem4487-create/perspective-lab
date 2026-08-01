def test_create_and_submit_invite(client, sample_session_id, case_pack_root):
    create = client.post(
        f"/api/comparison/{sample_session_id}/invites",
        json={"label": "Workshop A", "days_valid": 7, "max_responses": 10},
    )
    assert create.status_code == 200
    invite = create.json()
    assert invite["token"]
    assert invite["invite_url"].endswith(f"/invite/{invite['token']}")
    assert invite["label"] == "Workshop A"

    public = client.get(f"/api/invites/{invite['token']}")
    assert public.status_code == 200
    body = public.json()
    assert body["open"] is True
    assert body["question"]

    submit = client.post(
        f"/api/invites/{invite['token']}/answer",
        json={
            "name": "Guest Teacher",
            "role": "Teacher",
            "organization": "School 12",
            "email": "guest@example.com",
            "answer": "We should involve families and track early warning signs carefully.",
        },
    )
    assert submit.status_code == 200
    assert submit.json()["ok"] is True

    human = client.get(f"/api/comparison/{sample_session_id}/human")
    assert human.status_code == 200
    respondents = human.json()["respondents"]
    assert any(r.get("name") == "Guest Teacher" for r in respondents)
    guest = next(r for r in respondents if r["name"] == "Guest Teacher")
    assert guest["organization"] == "School 12"
    assert guest["source"] == "invite"

    listed = client.get(f"/api/comparison/{sample_session_id}/invites")
    assert listed.status_code == 200
    match = next(i for i in listed.json()["invites"] if i["token"] == invite["token"])
    assert match["response_count"] == 1

    closed = client.post(f"/api/invites/{invite['token']}/close")
    assert closed.status_code == 200
    blocked = client.post(
        f"/api/invites/{invite['token']}/answer",
        json={
            "name": "Another",
            "role": "",
            "answer": "This should be rejected because the invite is closed now.",
        },
    )
    assert blocked.status_code == 410


def test_multi_guest_append_list_and_csv(client, sample_session_id):
    create = client.post(
        f"/api/comparison/{sample_session_id}/invites",
        json={"label": "Workshop 100", "days_valid": 7, "max_responses": 100},
    )
    assert create.status_code == 200
    invite = create.json()
    assert invite["max_responses"] == 100
    token = invite["token"]

    for i in range(3):
        submit = client.post(
            f"/api/invites/{token}/answer",
            json={
                "name": f"Person {i+1}",
                "role": "Teacher",
                "organization": f"School {i+1}",
                "email": f"p{i+1}@example.com",
                "answer": f"Concrete action number {i+1}: involve families and mentors in weekly check-ins.",
            },
        )
        assert submit.status_code == 200, submit.text

    guests = client.get(f"/api/comparison/{sample_session_id}/guests")
    assert guests.status_code == 200
    payload = guests.json()
    assert payload["count"] >= 3
    assert payload["capacity"] == 100
    assert payload["remaining"] == payload["capacity"] - payload["count"]
    names = [r["name"] for r in payload["respondents"]]
    assert "Person 1" in names and "Person 3" in names
    assert all(r.get("response_id") for r in payload["respondents"] if r.get("source") == "invite")

    csv_resp = client.get(f"/api/comparison/{sample_session_id}/guests.csv")
    assert csv_resp.status_code == 200
    text = csv_resp.text
    assert "Person 1" in text
    assert "Person 3" in text
    assert "organization" in text.splitlines()[0]

    matrix = client.get(f"/api/comparison/{sample_session_id}/matrix")
    assert matrix.status_code == 200
    m = matrix.json()
    assert m["guest_count"] >= 3
    assert len(m["guest_summaries"]) >= 3


def test_invite_not_found(client):
    response = client.get("/api/invites/does-not-exist-token")
    assert response.status_code == 404
