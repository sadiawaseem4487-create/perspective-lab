/**
 * Client persistence for active research session, draft, and Present playlist.
 * Keys are scoped by Live / Demo so the two modes stay separate.
 */

export const SS_LAST_SESSION = "last_session_id";

function modeKey(uiMode = "live") {
  return uiMode === "demo" ? "demo" : "live";
}

export function activeSessionStorageKey(uiMode = "live") {
  return `perspective_lab_active_session_id_${modeKey(uiMode)}`;
}

export function draftStorageKey(uiMode = "live") {
  return `perspective_lab_workspace_draft_${modeKey(uiMode)}`;
}

export function playlistStorageKey(uiMode = "live") {
  return `perspective_lab_present_playlist_${modeKey(uiMode)}`;
}

export function getActiveSessionId(uiMode = "live") {
  const fromLs = localStorage.getItem(activeSessionStorageKey(uiMode));
  if (fromLs) return Number(fromLs) || null;
  // Legacy unscoped key — only for live, then migrate
  if (modeKey(uiMode) === "live") {
    const legacy = localStorage.getItem("perspective_lab_active_session_id");
    if (legacy) return Number(legacy) || null;
    const fromSs = sessionStorage.getItem(SS_LAST_SESSION);
    return fromSs ? Number(fromSs) || null : null;
  }
  return null;
}

export function setActiveSessionId(sessionId, uiMode = "live") {
  const key = activeSessionStorageKey(uiMode);
  if (sessionId == null || Number.isNaN(Number(sessionId))) {
    localStorage.removeItem(key);
    if (modeKey(uiMode) === "live") {
      localStorage.removeItem("perspective_lab_active_session_id");
      sessionStorage.removeItem(SS_LAST_SESSION);
    }
    return;
  }
  const id = String(sessionId);
  localStorage.setItem(key, id);
  if (modeKey(uiMode) === "live") {
    localStorage.setItem("perspective_lab_active_session_id", id);
    sessionStorage.setItem(SS_LAST_SESSION, id);
  }
}

export function getDraftQuestion(uiMode = "live") {
  const scoped = localStorage.getItem(draftStorageKey(uiMode));
  if (scoped != null) return scoped;
  if (modeKey(uiMode) === "live") {
    return localStorage.getItem("perspective_lab_workspace_draft") || "";
  }
  return "";
}

export function setDraftQuestion(text, uiMode = "live") {
  const key = draftStorageKey(uiMode);
  const value = (text || "").trim();
  if (!value) {
    localStorage.removeItem(key);
    return;
  }
  localStorage.setItem(key, text);
}

export function clearDraftQuestion(uiMode = "live") {
  localStorage.removeItem(draftStorageKey(uiMode));
  if (modeKey(uiMode) === "live") {
    localStorage.removeItem("perspective_lab_workspace_draft");
  }
}

/** Ordered unique session ids for Present (per mode). */
export function getPresentPlaylist(uiMode = "live") {
  try {
    const raw =
      localStorage.getItem(playlistStorageKey(uiMode)) ||
      (modeKey(uiMode) === "live" ? localStorage.getItem("perspective_lab_present_playlist") : null);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(Number).filter((n) => Number.isFinite(n) && n > 0);
  } catch {
    return [];
  }
}

export function setPresentPlaylist(sessionIds, uiMode = "live") {
  const clean = [...new Set((sessionIds || []).map(Number).filter((n) => Number.isFinite(n) && n > 0))];
  const key = playlistStorageKey(uiMode);
  if (!clean.length) {
    localStorage.removeItem(key);
    return;
  }
  localStorage.setItem(key, JSON.stringify(clean));
}

/**
 * Map a saved report into the Workspace `result` shape used by TheoryRoundtable.
 */
export function reportToWorkspaceResult(report) {
  if (!report) return null;
  return {
    session_id: report.session_id,
    question: report.question,
    model: report.model,
    workflow_mode: report.workflow_mode || "parallel",
    ui_mode: report.ui_mode || "live",
    created_at: report.created_at,
    summary: report.summary,
    responses: report.responses || [],
  };
}
