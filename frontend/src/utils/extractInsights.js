import { firstActionBlock, firstTextBullet, parseAgentResponse } from "./parseAgentResponse";

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
    headline,
  };
}

export function extractAllInsights(responses) {
  return (responses || []).map(extractInsight).filter(Boolean);
}
