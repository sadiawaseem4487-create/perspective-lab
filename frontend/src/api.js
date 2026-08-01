function resolveApiBase() {
  const fromEnv = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  // Vercel static UI → existing Render API (same GitHub repo, split hosting)
  if (typeof window !== "undefined") {
    const host = window.location.hostname || "";
    if (host.endsWith(".vercel.app") || host.endsWith(".vercel.sh")) {
      return "https://perspective-lab.onrender.com";
    }
  }
  return "";
}

const API_BASE = resolveApiBase();
const API = `${API_BASE}/api`;
const EXPORT_KEY_STORAGE = "perspective_lab_export_key";
const AUTH_TOKEN_STORAGE = "perspective_lab_auth_token";

export function getExportKey() {
  return sessionStorage.getItem(EXPORT_KEY_STORAGE) || "";
}

export function setExportKey(key) {
  if (key) sessionStorage.setItem(EXPORT_KEY_STORAGE, key);
  else sessionStorage.removeItem(EXPORT_KEY_STORAGE);
}

export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_STORAGE) || "";
}

export function setAuthToken(token) {
  if (token) localStorage.setItem(AUTH_TOKEN_STORAGE, token);
  else localStorage.removeItem(AUTH_TOKEN_STORAGE);
}

function authHeaders(extra = {}) {
  const headers = { ...extra };
  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function parseResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data.detail;
    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((d) => d.msg || JSON.stringify(d)).join("; ")
          : "Request failed";
    throw new Error(message);
  }
  return data;
}

export async function fetchAgents() {
  const res = await fetch(`${API}/agents`);
  return parseResponse(res);
}

export async function fetchAgentsCatalog() {
  const res = await fetch(`${API}/agents/catalog`);
  return parseResponse(res);
}

export async function fetchPresentationConfig() {
  const res = await fetch(`${API}/presentation`);
  return parseResponse(res);
}

export async function fetchAssignments() {
  const res = await fetch(`${API}/agents/assignments`);
  return parseResponse(res);
}

export async function saveAssignments(assignments) {
  const res = await fetch(`${API}/agents/assignments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(assignments),
  });
  return parseResponse(res);
}

export async function fetchModels() {
  const res = await fetch(`${API}/models`);
  return parseResponse(res);
}

export async function fetchSelectedModel() {
  const res = await fetch(`${API}/model/selected`);
  return parseResponse(res);
}

export async function selectModel(model) {
  const res = await fetch(`${API}/model/selected`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model }),
  });
  return parseResponse(res);
}

export async function fetchQuestions(lang = "en") {
  const res = await fetch(`${API}/questions?lang=${lang}`);
  return parseResponse(res);
}

export async function askQuestion(question, model, language = "en", mode = "parallel", uiMode = "live") {
  const res = await fetch(`${API}/ask`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      question,
      model: model || undefined,
      language,
      mode,
      ui_mode: uiMode === "demo" ? "demo" : "live",
    }),
  });
  return parseResponse(res);
}

export async function startSequentialRun(question, model, language = "en", uiMode = "live") {
  const res = await fetch(`${API}/sequential/start`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      question,
      model: model || undefined,
      language,
      ui_mode: uiMode === "demo" ? "demo" : "live",
    }),
  });
  return parseResponse(res);
}

export async function fetchSequentialRun(runId) {
  const res = await fetch(`${API}/sequential/${runId}`, { headers: authHeaders() });
  return parseResponse(res);
}

export async function advanceSequentialRun(runId, humanNote = "") {
  const res = await fetch(`${API}/sequential/${runId}/advance`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ human_note: humanNote, approved: true }),
  });
  return parseResponse(res);
}

export async function finalizeSequentialRun(runId, humanNote = "") {
  const res = await fetch(`${API}/sequential/${runId}/finalize`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ human_note: humanNote, approved: true }),
  });
  return parseResponse(res);
}

export async function fetchReports(uiMode) {
  const qs = uiMode ? `?ui_mode=${encodeURIComponent(uiMode)}` : "";
  const res = await fetch(`${API}/reports${qs}`, { headers: authHeaders() });
  return parseResponse(res);
}

export async function fetchReport(sessionId) {
  const res = await fetch(`${API}/reports/${sessionId}`, { headers: authHeaders() });
  return parseResponse(res);
}

export async function fetchSessions(limit = 50) {
  const res = await fetch(`${API}/sessions?limit=${limit}`, { headers: authHeaders() });
  return parseResponse(res);
}

export async function fetchSession(sessionId) {
  const res = await fetch(`${API}/sessions/${sessionId}`, { headers: authHeaders() });
  return parseResponse(res);
}

export async function fetchComparison(sessionId) {
  const res = await fetch(`${API}/comparison/${sessionId}`, { headers: authHeaders() });
  return parseResponse(res);
}

export async function fetchComparisonMatrix(sessionId) {
  const res = await fetch(`${API}/comparison/${sessionId}/matrix`, { headers: authHeaders() });
  return parseResponse(res);
}

export async function saveHumanAnswers(sessionId, respondents) {
  const res = await fetch(`${API}/comparison/${sessionId}/human`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ respondents }),
  });
  return parseResponse(res);
}

export async function createInvite(sessionId, payload = {}) {
  const res = await fetch(`${API}/comparison/${sessionId}/invites`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  return parseResponse(res);
}

export async function listInvites(sessionId) {
  const res = await fetch(`${API}/comparison/${sessionId}/invites`, { headers: authHeaders() });
  return parseResponse(res);
}

export async function closeInvite(token) {
  const res = await fetch(`${API}/invites/${token}/close`, {
    method: "POST",
    headers: authHeaders(),
  });
  return parseResponse(res);
}

export async function fetchInvite(token) {
  const res = await fetch(`${API}/invites/${token}`);
  return parseResponse(res);
}

export async function submitInviteAnswer(token, payload) {
  const res = await fetch(`${API}/invites/${token}/answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse(res);
}

export async function listSessionGuests(sessionId) {
  const res = await fetch(`${API}/comparison/${sessionId}/guests`, { headers: authHeaders() });
  return parseResponse(res);
}

export async function downloadGuestsCsv(sessionId) {
  const res = await fetch(`${API}/comparison/${sessionId}/guests.csv`, { headers: authHeaders() });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Guest export failed");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `session-${sessionId}-guests.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function fetchRubricScores(sessionId) {
  const res = await fetch(`${API}/comparison/${sessionId}/rubric`, { headers: authHeaders() });
  return parseResponse(res);
}

export async function saveRubricScores(sessionId, payload) {
  const res = await fetch(`${API}/comparison/${sessionId}/rubric`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  return parseResponse(res);
}

export async function runTheoryJudge(agentId, text, model) {
  const res = await fetch(`${API}/theory-judge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agent_id: agentId, text, model: model || undefined }),
  });
  return parseResponse(res);
}

export async function checkHealth() {
  const res = await fetch(`${API}/health`, { headers: authHeaders() });
  return parseResponse(res);
}

export async function fetchSetupStatus() {
  const res = await fetch(`${API}/setup/status`, { headers: authHeaders() });
  return parseResponse(res);
}

export async function saveSetupKeys({ provider, api_key, model }) {
  const res = await fetch(`${API}/setup/keys`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ provider, api_key, model }),
  });
  return parseResponse(res);
}

export async function saveUserLlmKey({ provider, api_key, model }) {
  const res = await fetch(`${API}/auth/llm-key`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ provider, api_key, model }),
  });
  return parseResponse(res);
}

export async function fetchAuthMe() {
  const res = await fetch(`${API}/auth/me`, { headers: authHeaders() });
  if (res.status === 401) {
    setAuthToken("");
    return {
      authenticated: false,
      user: null,
      auth_required: true,
      personal_key: null,
      llm: { configured: false },
    };
  }
  return parseResponse(res);
}

export async function login(email, password) {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await parseResponse(res);
  if (data.token) setAuthToken(data.token);
  return data;
}

export async function register(email, password, name = "") {
  const res = await fetch(`${API}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });
  const data = await parseResponse(res);
  if (data.token) setAuthToken(data.token);
  return data;
}

export async function logout() {
  const res = await fetch(`${API}/auth/logout`, {
    method: "POST",
    headers: authHeaders(),
  });
  setAuthToken("");
  return parseResponse(res);
}

export async function downloadExport(format) {
  const exportKey = getExportKey();
  const headers = {};
  if (exportKey) headers["X-Export-Key"] = exportKey;
  const res = await fetch(`${API}/export/${format}`, { headers });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Export failed");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const filenames = {
    csv: "case-responses.csv",
    json: "case-responses.json",
    "rubric.csv": "case-rubric-scores.csv",
  };
  link.download = filenames[format] || `case-export.${format}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
