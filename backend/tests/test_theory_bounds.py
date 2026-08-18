from engine.profiles import GENERIC_LENS_BOUNDARY, format_lens_boundary, format_profile_instructions
from engine.sequential_context import build_stage_question
from engine.theory_judge import evaluate_theory_drift
from application import load_theory_profile, list_theory_profiles


CLASSICAL_IDS = {"freire", "weber", "montessori", "rogers"}


def test_all_classical_profiles_encode_original_ideology():
    profiles = list_theory_profiles()
    ids = {profile["agent_id"] for profile in profiles}
    assert ids == CLASSICAL_IDS
    for profile in profiles:
        assert profile.get("ideology")
        assert len(profile.get("core_concepts") or []) >= 5
        assert len(profile.get("forbidden_frames") or []) >= 3
        assert any("primary method" in item.lower() or "adopt" in item.lower() for item in profile["must_not_do"])


def test_freire_prompt_bound_uses_original_ideology():
    block = format_profile_instructions("freire")
    assert "THEORY BOUNDARY" in block
    assert "Pedagogy of the Oppressed" in block
    assert "conscientization" in block.lower() or "conscientização" in block.lower()
    assert "Weberian" in block or "Weber" in block
    assert "banking education" in block.lower()


def test_unprofiled_agent_gets_generic_lens_bound():
    block = format_lens_boundary("teacher")
    assert block == GENERIC_LENS_BOUNDARY
    assert "Stay strictly inside" in block


def test_weber_fails_when_freire_is_the_main_frame():
    text = """
    Listening circles and conscientization will emancipate families.
    Problem-posing education and co-design with students is the entire plan.
    """
    result = evaluate_theory_drift("weber", text, load_theory_profile("weber"))
    assert result["passed"] is False
    assert result["foreign_hits"].get("freire", 0) >= 2


def test_sequential_stage_forbids_becoming_prior_theorist():
    question = build_stage_question(
        "How do we reduce dropout?",
        {"freire": "Prior Freire map about missing voices."},
        "weber",
        human_note="Please emphasize documentation of absences within 24 hours.",
    )
    assert "ONLY through your own original ideology" in question
    assert "do not copy their methods" in question
    assert "HUMAN REVIEWER NOTE" in question
    assert "Prior Freire map" in question
