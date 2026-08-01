const PREFIX = "perspective_lab_decision_brief";

function storageKey(sessionId, uiMode = "live") {
  return `${PREFIX}_${uiMode}_${sessionId}`;
}

export function loadBrief(sessionId, uiMode = "live") {
  if (sessionId == null) return null;
  try {
    const raw = localStorage.getItem(storageKey(sessionId, uiMode));
    if (!raw) return null;
    const data = JSON.parse(raw);
    const version = Number(data?.version);
    // Accept current brief schema versions (legacy 1–2 and generated 7–8+).
    if (!data || !Number.isFinite(version) || version < 1 || version > 20 || !Array.isArray(data.sections)) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function saveBrief(brief, uiMode = "live") {
  if (!brief?.sessionId) return;
  try {
    localStorage.setItem(
      storageKey(brief.sessionId, uiMode),
      JSON.stringify({ ...brief, updatedAt: new Date().toISOString() })
    );
  } catch {
    /* ignore quota */
  }
}

export function clearBrief(sessionId, uiMode = "live") {
  if (sessionId == null) return;
  try {
    localStorage.removeItem(storageKey(sessionId, uiMode));
  } catch {
    /* ignore */
  }
}
