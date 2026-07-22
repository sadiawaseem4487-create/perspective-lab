from engine.llm_theory_judge import _cohens_kappa, _parse_judge_json, inter_rater_agreement


def test_inter_rater_agreement_two_coders():
    ratings = [
        {"coder_id": "a", "scores": {"PS1": 3, "PS2": 4, "PS3": 4, "PS4": 2, "PS5": 3, "PS6": 4}},
        {"coder_id": "b", "scores": {"PS1": 3, "PS2": 5, "PS3": 4, "PS4": 2, "PS5": 3, "PS6": 4}},
    ]
    stats = inter_rater_agreement(ratings)
    assert stats["coder_count"] == 2
    assert stats["pairwise_comparisons"] == 1
    assert stats["exact_agreement"] == round(5 / 6, 3)
    assert stats["mean_abs_diff"] == round(1 / 6, 3)
    assert stats["cohens_kappa"] is not None
    assert -1.0 <= stats["cohens_kappa"] <= 1.0


def test_inter_rater_single_coder_has_no_agreement():
    stats = inter_rater_agreement([{"coder_id": "a", "scores": {"PS1": 3}}])
    assert stats["coder_count"] == 1
    assert stats["exact_agreement"] is None
    assert stats["cohens_kappa"] is None


def test_cohens_kappa_perfect_agreement():
    assert _cohens_kappa([1, 2, 3, 4], [1, 2, 3, 4]) == 1.0
    assert _cohens_kappa([1, 2, 3], [3, 2, 1]) < 1.0


def test_parse_judge_json_object():
    parsed = _parse_judge_json(
        '{"fidelity_score": 4, "passed": true, "rationale": "ok", "foreign_theory_risk": "low"}'
    )
    assert parsed["fidelity_score"] == 4
    assert parsed["passed"] is True


def test_parse_judge_json_embedded():
    parsed = _parse_judge_json(
        'Here is the result: {"fidelity_score": 2, "passed": false, "rationale": "drift"}'
    )
    assert parsed["fidelity_score"] == 2
    assert parsed["passed"] is False
