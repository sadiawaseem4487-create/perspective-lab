/**
 * Session list helpers — collapse duplicate asks of the same research question.
 */

const LANG_MARKER = "\n\nIMPORTANT: Respond entirely in";

/** Strip backend language instruction so the research question reads cleanly. */
export function displayQuestion(question) {
  let q = (question || "").trim();
  const idx = q.indexOf(LANG_MARKER);
  if (idx >= 0) q = q.slice(0, idx).trim();
  return q;
}

/** Normalize for equality (case / whitespace / language suffix). */
export function normalizeQuestionKey(question) {
  return displayQuestion(question).toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Keep one entry per unique question.
 * Assumes `reports` is newest-first (as returned by the API).
 * Attaches `run_count` for how many sessions shared that question.
 */
export function uniqueReportsByQuestion(reports = []) {
  const counts = new Map();
  for (const report of reports) {
    const key = normalizeQuestionKey(report.question);
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const seen = new Set();
  const unique = [];
  for (const report of reports) {
    const key = normalizeQuestionKey(report.question);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push({
      ...report,
      question: displayQuestion(report.question),
      run_count: counts.get(key) || 1,
    });
  }
  return unique;
}

/** Prefer latest unique report that matches lastSessionId's question. */
export function resolvePreferredSessionId(reports, lastSessionId) {
  const unique = uniqueReportsByQuestion(reports);
  if (!unique.length) return null;

  const lastId = lastSessionId ? Number(lastSessionId) : null;
  if (!lastId) return unique[0].session_id;

  const original = reports.find((r) => r.session_id === lastId);
  if (!original) return unique[0].session_id;

  const key = normalizeQuestionKey(original.question);
  const match = unique.find((r) => normalizeQuestionKey(r.question) === key);
  return match?.session_id || unique[0].session_id;
}
