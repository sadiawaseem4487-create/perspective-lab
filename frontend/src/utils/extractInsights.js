import {
  cleanAgentText,
  firstActionBlock,
  firstTextBullet,
  parseAgentResponse,
} from "./parseAgentResponse";

function trimAtWord(text, max = 130) {
  if (!text || text.length <= max) return text || "";
  const slice = text.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");
  return `${(lastSpace > 50 ? slice.slice(0, lastSpace) : slice).trim()}…`;
}

const ACTION_SECTIONS = [
  "Priority Actions",
  "Participatory action plan",
  "Administrative model",
  "Procedure and accountability plan",
  "School-day learning plan",
  "Autonomy and activity redesign",
  "Pilot design",
  "Scaling roadmap",
];

function firstActionInAnySection(sections) {
  const action = firstActionBlock(sections);
  if (action?.action) return action.action;

  for (const title of ACTION_SECTIONS) {
    const section = sections.find((s) => s.title === title);
    if (!section) continue;
    const block = section.bullets.find((b) => b.type === "action" && b.action);
    if (block?.action) return block.action;
    const bullet = section.bullets.find((b) => b.type === "bullet" && b.text);
    if (bullet?.text) return bullet.text;
  }

  return firstTextBullet(sections, "Problem Diagnosis") || "";
}

export function extractInsight(response) {
  if (!response?.response || response.error) return null;
  const { sections, fallback } = parseAgentResponse(response.response);
  let headline = firstActionInAnySection(sections);
  if (!headline && fallback) headline = fallback.slice(0, 140);
  if (!headline) return null;

  return {
    agentKey: (response.agent_key || response.agent_id || "").toLowerCase(),
    agentLabel: response.agent_label || response.agent_name,
    color: response.color || "#78716c",
    headline: trimAtWord(headline, 160),
  };
}

const HIGHLIGHT_SECTIONS = [
  "Collective action",
  "Priority Actions",
  "Participatory action plan",
  "Pilot design",
  "Procedure and accountability plan",
  "School-day learning plan",
  "Concrete activity",
  "Process design",
  "Naming the problem",
  "Problem Diagnosis",
];

/** Up to `max` plain bullets for the Workspace overview (not full theory dump). */
export function extractHighlights(responseText, max = 4) {
  if (!responseText) return [];
  const { sections, fallback } = parseAgentResponse(responseText);
  const points = [];
  const seen = new Set();

  function push(text) {
    const cleaned = trimAtWord(cleanAgentText(text || ""), 180);
    if (!cleaned || seen.has(cleaned)) return;
    seen.add(cleaned);
    points.push(cleaned);
  }

  for (const title of HIGHLIGHT_SECTIONS) {
    if (points.length >= max) break;
    const section = sections.find((s) => s.title === title);
    if (!section) continue;
    for (const bullet of section.bullets || []) {
      if (points.length >= max) break;
      if (bullet.type === "action" && bullet.action) push(bullet.action);
      else if (bullet.text) push(bullet.text);
    }
  }

  if (points.length < 2) {
    for (const section of sections) {
      if (points.length >= max) break;
      for (const bullet of section.bullets || []) {
        if (points.length >= max) break;
        if (bullet.type === "action" && bullet.action) push(bullet.action);
        else if (bullet.text) push(bullet.text);
      }
    }
  }

  if (points.length === 0 && fallback) {
    push(fallback.split("\n").find((l) => l.trim().length > 40) || fallback);
  }

  return points.slice(0, max);
}

export function extractAllInsights(responses) {
  return (responses || []).map(extractInsight).filter(Boolean);
}
