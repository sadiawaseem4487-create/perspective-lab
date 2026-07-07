const API = "/api";
const EXPORT_KEY_STORAGE = "perspective_lab_export_key";

export function getExportKey() {
  return sessionStorage.getItem(EXPORT_KEY_STORAGE) || "";
}

export function setExportKey(key) {
  if (key) sessionStorage.setItem(EXPORT_KEY_STORAGE, key);
  else sessionStorage.removeItem(EXPORT_KEY_STORAGE);
}

async function parseResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || "Request failed");
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

export async function askQuestion(question, model, language = "en") {
  const res = await fetch(`${API}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, model: model || undefined, language }),
  });
  return parseResponse(res);
}

export async function fetchReports() {
  const res = await fetch(`${API}/reports`);
  return parseResponse(res);
}

export async function fetchReport(sessionId) {
  const res = await fetch(`${API}/reports/${sessionId}`);
  return parseResponse(res);
}

export async function fetchComparison(sessionId) {
  const res = await fetch(`${API}/comparison/${sessionId}`);
  return parseResponse(res);
}

export async function saveHumanAnswers(sessionId, respondents) {
  const res = await fetch(`${API}/comparison/${sessionId}/human`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ respondents }),
  });
  return parseResponse(res);
}

export async function checkHealth() {
  const res = await fetch(`${API}/health`);
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
  link.download = format === "csv" ? "case-responses.csv" : "case-responses.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
