import { extractInsight } from "@/utils/extractInsights";
import { parseAgentResponse } from "@/utils/parseAgentResponse";
import { displayQuestion } from "@/utils/uniqueReports";
import { getAgentLens, getAgentTheorist } from "@/lib/agentIcons";

const PRIORITY_SECTIONS = [
  "Final Recommendation",
  "Priority Actions",
  "Collective action",
  "Participatory action plan",
  "Administrative model",
  "Procedure and accountability plan",
  "School-day learning plan",
  "Pilot design",
  "Scaling roadmap",
  "Concrete activity",
  "Process design",
  "Problem Diagnosis",
  "Naming the problem",
  "Lived experience",
  "Authority map",
  "Observation",
  "Innovation framing",
];

function trimPoint(text, max = 140) {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  if (clean.length <= max) return clean;
  const slice = clean.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");
  return `${(lastSpace > 40 ? slice.slice(0, lastSpace) : slice).trim()}…`;
}

function bulletText(item) {
  if (!item) return "";
  if (item.type === "action") {
    return item.action || [item.owner, item.timeline, item.measure].filter(Boolean).join(" · ");
  }
  return item.text || "";
}

/**
 * Pull 3–5 presentation-ready key points from an agent response.
 */
export function extractKeyPoints(responseText, limit = 4) {
  const { sections, fallback } = parseAgentResponse(responseText || "");
  const points = [];
  const seen = new Set();

  function push(text) {
    const point = trimPoint(text, 150);
    if (!point) return;
    const key = point.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    points.push(point);
  }

  for (const title of PRIORITY_SECTIONS) {
    if (points.length >= limit) break;
    const section = sections.find((s) => s.title === title);
    if (!section) continue;
    for (const item of section.bullets || []) {
      if (points.length >= limit) break;
      push(bulletText(item));
    }
  }

  // Fallback: first bullets from any section
  if (points.length < 2) {
    for (const section of sections) {
      for (const item of section.bullets || []) {
        if (points.length >= limit) break;
        push(bulletText(item));
      }
      if (points.length >= limit) break;
    }
  }

  if (points.length === 0 && fallback) {
    const sentences = fallback
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 30);
    for (const sentence of sentences.slice(0, limit)) push(sentence);
  }

  return points.slice(0, limit);
}

function agentDeck(response, lang) {
  const key = (response.agent_key || "").toLowerCase();
  const insight = extractInsight(response);
  const points = extractKeyPoints(response.response, 4);
  return {
    agentKey: key,
    theorist: getAgentTheorist(key) || response.title || response.agent_label,
    lens: getAgentLens(key, lang),
    color: response.color || "#c2410c",
    takeaway: insight?.headline || points[0] || "",
    points: points.length ? points : insight?.headline ? [insight.headline] : [],
  };
}

/**
 * Build a facilitator-ready slide deck from a session report.
 */
export function buildPresentationSlides(report, t, lang = "en") {
  if (!report) return [];

  const question = displayQuestion(report.question);
  const agents = (report.responses || [])
    .filter((r) => r.response && !r.error)
    .map((r) => agentDeck(r, lang));

  const slides = [
    {
      id: "title",
      kind: "title",
      eyebrow: t("present.questionSlide"),
      title: question,
      subtitle: t("present.titleSub"),
    },
    {
      id: "agenda",
      kind: "agenda",
      eyebrow: t("present.agenda"),
      title: t("present.agendaTitle"),
      items: agents.map((a) => ({
        agentKey: a.agentKey,
        theorist: a.theorist,
        lens: a.lens,
        color: a.color,
      })),
    },
  ];

  for (const agent of agents) {
    slides.push({
      id: `agent-${agent.agentKey}`,
      kind: "agent",
      eyebrow: t("present.lensSlide"),
      agentKey: agent.agentKey,
      theorist: agent.theorist,
      lens: agent.lens,
      color: agent.color,
      takeaway: agent.takeaway,
      points: agent.points,
    });
  }

  if (agents.length >= 2) {
    slides.push({
      id: "synthesis",
      kind: "synthesis",
      eyebrow: t("present.synthesis"),
      title: t("present.synthesisTitle"),
      cards: agents.map((a) => ({
        agentKey: a.agentKey,
        theorist: a.theorist,
        color: a.color,
        takeaway: a.takeaway || a.points[0] || "",
      })),
    });
  }

  slides.push({
    id: "close",
    kind: "close",
    eyebrow: t("present.closeSlide"),
    title: t("present.closeBody"),
    prompts: [
      t("present.closePrompt1"),
      t("present.closePrompt2"),
      t("present.closePrompt3"),
    ],
  });

  return slides;
}
