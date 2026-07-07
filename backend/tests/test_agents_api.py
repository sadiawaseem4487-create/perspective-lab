DEFAULT_AGENTS = ["freire", "weber", "montessori", "rogers"]


def test_agents_catalog_has_case_manifest(client):
    response = client.get("/api/agents/catalog")
    assert response.status_code == 200
    payload = response.json()

    assert payload["case"]["id"] == "sao-paulo-dropout"
    assert payload["case"]["workflow"]["default_agents"] == DEFAULT_AGENTS

    agent_ids = {agent["id"] for agent in payload["agents"]}
    for agent_id in DEFAULT_AGENTS:
        assert agent_id in agent_ids


def test_slot_agent_pairs(client):
    response = client.get("/api/agents")
    assert response.status_code == 200
    pairs = response.json()
    assert len(pairs) == 4
    for index, pair in enumerate(pairs, start=1):
        assert pair["slot_number"] == index
        assert pair["agent_id"]


def test_assignments_round_trip(client, restore_slot_assignments):
    get_response = client.get("/api/agents/assignments")
    assert get_response.status_code == 200
    original = get_response.json()["assignments"]

    swapped = dict(original)
    swapped["agent_2"] = "freire" if original["agent_2"] != "freire" else "weber"

    post_response = client.post("/api/agents/assignments", json=swapped)
    assert post_response.status_code == 200
    assert post_response.json()["status"] == "saved"
    assert post_response.json()["assignments"]["agent_2"] == swapped["agent_2"]

    pairs = client.get("/api/agents").json()
    assert pairs[1]["agent_id"] == swapped["agent_2"]


def test_model_selection_round_trip(client, restore_selected_model):
    target_model = "openai/gpt-4o-mini"

    post_response = client.post("/api/model/selected", json={"model": target_model})
    assert post_response.status_code == 200
    assert post_response.json()["model"] == target_model

    get_response = client.get("/api/model/selected")
    assert get_response.status_code == 200
    assert get_response.json()["model"] == target_model
