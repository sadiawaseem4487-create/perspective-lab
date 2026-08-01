"""Framing quality gates shared by Ask / sequential start."""

from __future__ import annotations

import re
import unicodedata
from typing import Tuple

MIN_QUESTION_WORDS = 8
MIN_UNIQUE_WORDS = 5

_JUNK_ONLY = re.compile(
    r"^(test(ing)?|asdf|qwerty|lorem|ipsum|xxx|spam|foo|bar|baz|hello|hi|hey)"
    r"([,\s.!?-]+\1)*[.\s!?]*$",
    re.IGNORECASE,
)

_TOKEN = re.compile(r"\S+")


def _normalize_token(raw: str) -> str:
    text = unicodedata.normalize("NFKD", raw.lower())
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    return re.sub(r"^[^\w]+|[^\w]+$", "", text, flags=re.UNICODE)


def tokenize(text: str) -> list:
    return [t for t in (_normalize_token(m.group(0)) for m in _TOKEN.finditer(text or "")) if t]


def count_words(text: str) -> int:
    return len(tokenize(text))


def assess_question_quality(text: str) -> Tuple[bool, str]:
    cleaned = (text or "").strip()
    tokens = tokenize(cleaned)
    word_count = len(tokens)
    unique_count = len(set(tokens))

    if word_count < MIN_QUESTION_WORDS:
        return False, (
            f"Question needs at least {MIN_QUESTION_WORDS} words "
            f"(got {word_count})."
        )

    compact = re.sub(r"\s+", " ", cleaned)
    if _JUNK_ONLY.match(compact):
        return False, (
            "Framing looks like placeholder or test text — describe a real situation."
        )

    if unique_count < MIN_UNIQUE_WORDS:
        return False, (
            "Framing is too repetitive — use at least a few distinct words."
        )

    freq = {}
    for token in tokens:
        freq[token] = freq.get(token, 0) + 1
    top = max(freq.values()) if freq else 0
    if word_count and top / word_count > 0.4:
        return False, "Framing repeats the same words too often — add real context."

    return True, ""


def validate_question_framing(question: str) -> str:
    cleaned = (question or "").strip()
    ok, message = assess_question_quality(cleaned)
    if not ok:
        raise ValueError(message)
    return cleaned
