from application.question_quality import assess_question_quality, validate_question_framing


def test_rejects_repeated_junk():
    ok, msg = assess_question_quality(
        "testing testing testing testing testing testing testing testing"
    )
    assert ok is False
    assert "repetitive" in msg.lower() or "placeholder" in msg.lower() or "repeats" in msg.lower()


def test_rejects_comma_padded_repeats():
    ok, _ = assess_question_quality("testing , testing , testing , testing , testing")
    assert ok is False


def test_rejects_too_short():
    ok, _ = assess_question_quality("just testing this")
    assert ok is False


def test_accepts_statement_framing_without_question_mark():
    ok, msg = assess_question_quality(
        "Municipal schools face rising secondary dropout and limited budget this year overall"
    )
    assert ok is True
    assert msg == ""


def test_accepts_clear_framing():
    text = (
        "How should municipal education teams involve families and community partners "
        "to reduce secondary school dropout in São Paulo this year?"
    )
    ok, msg = assess_question_quality(text)
    assert ok is True
    assert msg == ""
    assert validate_question_framing(text) == text.strip()
