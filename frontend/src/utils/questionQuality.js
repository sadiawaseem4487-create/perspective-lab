/** Framing quality gates — block empty, repeated junk, and non-questions from burning API calls. */

export const MIN_QUESTION_WORDS = 8;
export const MIN_UNIQUE_WORDS = 5;

const JUNK_ONLY =
  /^(test(ing)?|asdf|qwerty|lorem|ipsum|xxx|spam|foo|bar|baz|hello|hi|hey)([,\s.!?-]+\1)*[.\s!?]*$/i;

function normalizeToken(raw) {
  return raw
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

export function tokenize(text = "") {
  return (text.match(/\S+/g) || []).map(normalizeToken).filter(Boolean);
}

export function countWords(text = "") {
  return tokenize(text).length;
}

/**
 * @returns {{ ok: boolean, reason: string|null, wordCount: number, uniqueCount: number }}
 */
export function assessQuestionQuality(text = "") {
  const cleaned = text.trim();
  const tokens = tokenize(cleaned);
  const wordCount = tokens.length;
  const unique = new Set(tokens);
  const uniqueCount = unique.size;

  if (wordCount < MIN_QUESTION_WORDS) {
    return { ok: false, reason: "too_short", wordCount, uniqueCount };
  }

  if (JUNK_ONLY.test(cleaned.replace(/\s+/g, " "))) {
    return { ok: false, reason: "junk", wordCount, uniqueCount };
  }

  if (uniqueCount < MIN_UNIQUE_WORDS) {
    return { ok: false, reason: "repetitive", wordCount, uniqueCount };
  }

  // Dominant token > 40% of words → spam / filler
  const freq = {};
  for (const t of tokens) freq[t] = (freq[t] || 0) + 1;
  const top = Math.max(...Object.values(freq));
  if (top / wordCount > 0.4) {
    return { ok: false, reason: "repetitive", wordCount, uniqueCount };
  }

  return { ok: true, reason: null, wordCount, uniqueCount };
}

export function questionMeetsQuality(text = "") {
  return assessQuestionQuality(text).ok;
}
