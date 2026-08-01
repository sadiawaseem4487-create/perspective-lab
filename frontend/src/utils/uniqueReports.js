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

/** Prefer the exact active session when it still exists (guests/invites are per session). */
export function resolvePreferredSessionId(reports, lastSessionId) {
  const unique = uniqueReportsByQuestion(reports);
  if (!unique.length) return null;

  const lastId = lastSessionId ? Number(lastSessionId) : null;
  if (!lastId) return unique[0].session_id;

  // Exact id wins — never silently migrate to a newer twin of the same question.
  if (reports.some((r) => Number(r.session_id) === lastId)) return lastId;

  // Stale/missing id → newest unique report (same question if we can recover it).
  return unique[0].session_id;
}
