from engine.comparison_matrix import build_comparison_matrix
from engine.output_formats import get_output_instructions_for_agent
from engine.response_parser import parse_agent_response
from engine.self_check import enrich_with_self_check


SAMPLE_RESPONSE = """
Missing voices

- Students in peripheral neighborhoods are absent from policy design
- Family caregivers are rarely consulted

Power and participation analysis

- Paulo Freire emphasizes dialogue and conscientization
- Schools reproduce silence instead of participation

Participatory action plan

Action: Run student listening circles in high-dropout districts
Owner: School leadership with community facilitators
Timeline: First 8 weeks of semester
Measure: Number of student-led proposals adopted

Theory link

- Freire's praxis requires reflection and collective action together
"""


def test_theory_native_output_instructions():
    instructions = get_output_instructions_for_agent("freire")
    assert "Missing voices" in instructions
    assert "THEORY-NATIVE OUTPUT FORMAT" in instructions

    generic = get_output_instructions_for_agent("teacher")
    assert "Problem Diagnosis" in generic


def test_parse_theory_native_sections():
    parsed = parse_agent_response(SAMPLE_RESPONSE)
    titles = [section["title"] for section in parsed["sections"]]
    assert "Missing voices" in titles
    assert "Theory link" in titles


def test_self_check_passes_sample_freire_response():
    record = {
        "agent_key": "freire",
        "agent_name": "Freire Agent",
        "response": SAMPLE_RESPONSE + "\n" + ("Additional participatory detail. " * 8),
        "error": None,
    }
    enriched = enrich_with_self_check("freire", record)
    assert "structured_output" in enriched
    assert "self_check" in enriched
    assert enriched["self_check"]["passed"] is True


def test_comparison_matrix_api(client, sample_session_id):
    response = client.get(f"/api/comparison/{sample_session_id}/matrix")
    assert response.status_code == 200
    payload = response.json()
    assert payload["session_id"] == sample_session_id
    assert len(payload["agents"]) >= 1
    assert len(payload["matrix"]) >= 5
    assert "main_focus" in payload["dimensions"]


def test_comparison_matrix_not_found(client):
    response = client.get("/api/comparison/999999/matrix")
    assert response.status_code == 404
