from engine.theory_judge import drift_check_record, evaluate_theory_drift


def test_freire_passes_with_own_anchors():
    text = """
    Lived experience and dialogue with students
    Freire emphasizes participation and voice
    Collective action with families
    """
    result = evaluate_theory_drift("freire", text)
    assert result["passed"] is True
    assert result["own_anchor_hits"] >= 2


def test_freire_hard_fail_on_foreign_without_anchors():
    text = """
    Implement a case-management system with escalation protocol
    and an audit trail for rational-legal compliance.
    City-wide rollout of diffusion of innovations adopter categories.
    """
    result = evaluate_theory_drift("freire", text)
    assert result["passed"] is False
    assert result["foreign_hits"]


def test_drift_check_record_shape():
    record = drift_check_record("weber", "Authority rules and accountability documentation per Weber.")
    assert record["id"] == "anti_drift"
    assert "passed" in record
    assert "detail" in record
