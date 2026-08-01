/**
 * Client persistence for active research session, draft, and Present playlist.
 * Keys are scoped by Live/Demo and by user id so a new login never inherits
 * another account’s last problem.
 */

export const SS_LAST_SESSION = "last_session_id";

function modeKey(uiMode = "live") {
  return uiMode === "demo" ? "demo" : "live";
}

function userScope(userId) {
  if (userId == null || userId === "") return "anon";
  return `u${userId}`;
}

export function activeSessionStorageKey(uiMode = "live", userId) {
  return `perspective_lab_active_session_id_${modeKey(uiMode)}_${userScope(userId)}`;
}

export function draftStorageKey(uiMode = "live", userId) {
  return `perspective_lab_workspace_draft_${modeKey(uiMode)}_${userScope(userId)}`;
}

export function playlistStorageKey(uiMode = "live", userId) {
  return `perspective_lab_present_playlist_${modeKey(uiMode)}_${userScope(userId)}`;
}

export function getActiveSessionId(uiMode = "live", userId) {
  const fromLs = localStorage.getItem(activeSessionStorageKey(uiMode, userId));
  if (fromLs) return Number(fromLs) || null;

  // Legacy unscoped keys — only for anonymous / pre-auth local use
  if (userId == null || userId === "") {
    if (modeKey(uiMode) === "live") {
      const legacy = localStorage.getItem("perspective_lab_active_session_id");
      if (legacy) return Number(legacy) || null;
      const fromSs = sessionStorage.getItem(SS_LAST_SESSION);
      return fromSs ? Number(fromSs) || null : null;
    }
  }
  return null;
}

export function setActiveSessionId(sessionId, uiMode = "live", userId) {
  const key = activeSessionStorageKey(uiMode, userId);
  if (sessionId == null || Number.isNaN(Number(sessionId))) {
    localStorage.removeItem(key);
    if ((userId == null || userId === "") && modeKey(uiMode) === "live") {
      localStorage.removeItem("perspective_lab_active_session_id");
      sessionStorage.removeItem(SS_LAST_SESSION);
    }
    return;
  }
  const id = String(sessionId);
  localStorage.setItem(key, id);
  if ((userId == null || userId === "") && modeKey(uiMode) === "live") {
    localStorage.setItem("perspective_lab_active_session_id", id);
    sessionStorage.setItem(SS_LAST_SESSION, id);
  }
}

export function getDraftQuestion(uiMode = "live", userId) {
  const scoped = localStorage.getItem(draftStorageKey(uiMode, userId));
  if (scoped != null) return scoped;
  if ((userId == null || userId === "") && modeKey(uiMode) === "live") {
    return localStorage.getItem("perspective_lab_workspace_draft") || "";
  }
  return "";
}

export function setDraftQuestion(text, uiMode = "live", userId) {
  const key = draftStorageKey(uiMode, userId);
  const value = (text || "").trim();
  if (!value) {
    localStorage.removeItem(key);
    return;
  }
  localStorage.setItem(key, text);
}

export function clearDraftQuestion(uiMode = "live", userId) {
  localStorage.removeItem(draftStorageKey(uiMode, userId));
  if ((userId == null || userId === "") && modeKey(uiMode) === "live") {
    localStorage.removeItem("perspective_lab_workspace_draft");
  }
}

/** Ordered unique session ids for Present (per mode + user). */
export function getPresentPlaylist(uiMode = "live", userId) {
  try {
    const raw =
      localStorage.getItem(playlistStorageKey(uiMode, userId)) ||
      ((userId == null || userId === "") && modeKey(uiMode) === "live"
        ? localStorage.getItem("perspective_lab_present_playlist")
        : null);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(Number).filter((n) => Number.isFinite(n) && n > 0);
  } catch {
    return [];
  }
}

export function setPresentPlaylist(sessionIds, uiMode = "live", userId) {
  const clean = [...new Set((sessionIds || []).map(Number).filter((n) => Number.isFinite(n) && n > 0))];
  const key = playlistStorageKey(uiMode, userId);
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
