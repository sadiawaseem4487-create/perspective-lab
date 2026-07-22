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

function pickLocale(value, lang, fallback = "") {
  if (value == null) return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    return value[lang] || value.en || Object.values(value).find((v) => typeof v === "string") || fallback;
  }
  return fallback;
}

function pickLocalizedBlock(block, lang) {
  if (!block || typeof block !== "object") return {};
  if (block.en || block.pt || block.fi) {
    return block[lang] || block.en || block.pt || block.fi || {};
  }
  return block;
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

function agentDeck(response, lang, presentation) {
  const key = (response.agent_key || "").toLowerCase();
  const insight = extractInsight(response);
  const points = extractKeyPoints(response.response, 4);
  const blurbs = presentation?.lens_blurbs || {};
  const lensBlurb = pickLocale(blurbs[key], lang, getAgentLens(key, lang));
  return {
    agentKey: key,
    theorist: getAgentTheorist(key) || response.title || response.agent_label,
    lens: lensBlurb || getAgentLens(key, lang),
    color: response.color || "#c2410c",
    takeaway: insight?.headline || points[0] || "",
    points: points.length ? points : insight?.headline ? [insight.headline] : [],
  };
}

/**
 * Academic deck: Topic → Introduction → Key concepts → Case study → Synthesis → Conclusion → Sources
 */
export function buildPresentationSlides(report, t, lang = "en", presentation = null) {
  if (!report) return [];

  const question = displayQuestion(report.question);
  const caseTitle = presentation?.case_title || "";
  const agents = (report.responses || [])
    .filter((r) => r.response && !r.error)
    .map((r) => agentDeck(r, lang, presentation));

  const intro = pickLocalizedBlock(presentation?.introduction, lang);
  const caseStudy = pickLocalizedBlock(presentation?.case_study, lang);
  const conclusion = pickLocalizedBlock(presentation?.conclusion, lang);
  const topic = pickLocale(presentation?.topic, lang, t("present.topicDefault"));
  const topicSub = pickLocale(presentation?.topic_subtitle, lang, t("present.titleSub"));

  const slides = [
    {
      id: "topic",
      kind: "topic",
      eyebrow: t("present.sectionTopic"),
      title: topic,
      subtitle: topicSub,
      caseTitle,
      question,
      questionLabel: t("present.questionSlide"),
    },
    {
      id: "introduction",
      kind: "introduction",
      eyebrow: t("present.sectionIntro"),
      title: intro.title || t("present.introTitle"),
      bullets: intro.bullets?.length
        ? intro.bullets
        : [t("present.introBullet1"), t("present.introBullet2"), t("present.introBullet3")],
    },
    {
      id: "key-concepts-overview",
      kind: "agenda",
      eyebrow: t("present.sectionKeyConcepts"),
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
      id: `concept-${agent.agentKey}`,
      kind: "agent",
      eyebrow: t("present.sectionKeyConcepts"),
      agentKey: agent.agentKey,
      theorist: agent.theorist,
      lens: agent.lens,
      color: agent.color,
      takeaway: agent.takeaway,
      points: agent.points,
    });
  }

  slides.push({
    id: "case-study",
    kind: "case_study",
    eyebrow: t("present.sectionCase"),
    title: caseStudy.title || caseTitle || t("present.caseTitle"),
    paragraphs: caseStudy.paragraphs || [],
    bullets: caseStudy.bullets || [],
    question,
  });

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
    id: "conclusion",
    kind: "conclusion",
    eyebrow: t("present.sectionConclusion"),
    title: conclusion.title || t("present.closeBody"),
    prompts: conclusion.prompts?.length
      ? conclusion.prompts
      : [t("present.closePrompt1"), t("present.closePrompt2"), t("present.closePrompt3")],
  });

  const sources = (presentation?.sources || []).map((source) => ({
    label: source.label,
    url: source.url,
    note: pickLocale(source.note, lang, ""),
  }));

  if (sources.length) {
    slides.push({
      id: "sources",
      kind: "sources",
      eyebrow: t("present.sectionSources"),
      title: t("present.sourcesTitle"),
      sources,
    });
  }

  return slides;
}
