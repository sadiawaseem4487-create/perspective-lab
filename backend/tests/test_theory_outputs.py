from engine.comparison_matrix import build_comparison_matrix
from engine.output_formats import get_output_instructions_for_agent
from engine.response_parser import parse_agent_response
from engine.self_check import enrich_with_self_check
from engine.sequential_context import build_stage_question


SAMPLE_RESPONSE = """
Lived experience

- Students in peripheral neighborhoods are absent from policy design
- Family caregivers are rarely consulted about dropout

Naming the problem

- The problem is not only absence — it is institutional silence about youth voice

Critical question

- Whose knowledge counts when schools decide who belongs?

Collective action

Action: Run student listening circles in high-dropout districts
Owner: School leadership with community facilitators
Timeline: First 8 weeks of semester
Measure: Number of student-led proposals adopted

Reflection

- After circles, co-evaluate which proposals shifted power — and which did not

Theory link

- Freire's praxis requires reflection and collective action together

Assumptions

- Families can attend sessions without losing income

Uncertainty

- We do not yet know whether listening circles change municipal policy
"""

BULLET_TITLE_RESPONSE = """
- Lived experience
- Students fear dismissal when criticizing school lunch quality
- Families lack a platform to speak

- Naming the problem
- Lunch quality is treated as logistics, not dignity and belonging

- Critical question
- Who decides nutrition standards without those who eat the meals?

- Collective action
Action: Organize student and family listening sessions on lunch quality
Owner: School administrators with community organizations
Timeline: Next semester
Measure: Participant count and attendance correlation

- Reflection
- Review whether student proposals entered the meal contract cycle

- Theory link
- Paulo Freire: dialogue and conscientization before administrative redesign

- Assumptions
- Administrators will share decision power

- Uncertainty
- Budget constraints may limit menu changes
"""


def test_theory_native_output_instructions():
    instructions = get_output_instructions_for_agent("freire")
    assert "Lived experience" in instructions
    assert "Assumptions" in instructions
    assert "do NOT prefix the title with" in instructions
    assert "THEORY-NATIVE OUTPUT FORMAT" in instructions

    generic = get_output_instructions_for_agent("teacher")
    assert "Problem Diagnosis" in generic


def test_parse_theory_native_sections():
    parsed = parse_agent_response(SAMPLE_RESPONSE)
    titles = [section["title"] for section in parsed["sections"]]
    assert "Lived experience" in titles
    assert "Theory link" in titles
    assert "Assumptions" in titles


def test_parse_bullet_section_titles():
    parsed = parse_agent_response(BULLET_TITLE_RESPONSE)
    titles = [section["title"] for section in parsed["sections"]]
    assert titles[0] == "Lived experience"
    assert "Collective action" in titles
    assert len(parsed["sections"]) >= 6
    action = next(
        (b for s in parsed["sections"] if s["title"] == "Collective action" for b in s["bullets"] if b.get("type") == "action"),
        None,
    )
    assert action is not None
    assert "listening" in action["action"].lower()


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


def test_self_check_passes_bullet_title_response():
    record = {
        "agent_key": "freire",
        "agent_name": "Freire Agent",
        "response": BULLET_TITLE_RESPONSE + "\n" + ("Dialogue deepens critical consciousness in practice. " * 6),
        "error": None,
    }
    enriched = enrich_with_self_check("freire", record)
    assert enriched["structured_output"]["sections"]
    assert enriched["self_check"]["passed"] is True


def test_comparison_matrix_marks_schema_defaults():
    report = {
        "session_id": 1,
        "question": "Test?",
        "workflow_mode": "parallel",
        "responses": [
            {
                "agent_key": "freire",
                "agent_label": "Agent 1",
                "agent_name": "Freire Agent",
                "title": "Sociocultural Inspirer",
                "theory": "Paulo Freire",
                "color": "#c2410c",
                "response": BULLET_TITLE_RESPONSE,
                "error": None,
                "self_check": {"passed": True},
            }
        ],
    }
    matrix = build_comparison_matrix(report)
    assert "legend" in matrix
    freire = matrix["agents"][0]
    assert freire["sources"]["first_action"] == "answer"
    assert freire["values"]["first_action"]
    # solution_type may be schema_default if theory link extraction differs
    assert freire["sources"]["stakeholder"] in {"answer", "schema_default"}


def test_hitl_note_injected_into_stage_question():
    question = build_stage_question(
        "How do we reduce dropout?",
        {"freire": "Prior Freire map about missing voices."},
        "weber",
        human_note="Please emphasize documentation of absences within 24 hours.",
    )
    assert "HUMAN REVIEWER NOTE" in question
    assert "documentation of absences" in question
    assert "Prior Freire map" in question


def test_comparison_matrix_api(client, sample_session_id):
    response = client.get(f"/api/comparison/{sample_session_id}/matrix")
    assert response.status_code == 200
    payload = response.json()
    assert payload["session_id"] == sample_session_id
    assert len(payload["agents"]) >= 1
    assert len(payload["matrix"]) >= 5
    assert "main_focus" in payload["dimensions"]
    assert "legend" in payload


def test_comparison_matrix_not_found(client):
    response = client.get("/api/comparison/999999/matrix")
    assert response.status_code == 404
