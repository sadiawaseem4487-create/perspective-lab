import { extractInsight } from "@/utils/extractInsights";
import {
  firstActionBlock,
  firstTextBullet,
  parseAgentResponse,
} from "@/utils/parseAgentResponse";
import { buildReportTitle, extractFramingParts } from "@/utils/decisionBrief";
import { displayQuestion } from "@/utils/uniqueReports";
import { getAgentLens, getAgentTheorist } from "@/lib/agentIcons";
import { normalizeGuestAnswer } from "@/utils/guestAnswer";

function trimPoint(text, max = 120) {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  if (clean.length <= max) return clean;
  const slice = clean.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");
  return `${(lastSpace > 36 ? slice.slice(0, lastSpace) : slice).trim()}…`;
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
 * Same title logic as the decision brief — short hero for slides.
 * Structured framing parts so the topic slide is never a wall of text.
 */
function topicFromReport(question, t) {
  const framing = displayQuestion(question);
  const title = buildReportTitle(framing, { docTitle: t("present.questionSlide") });
  const parts = extractFramingParts(framing);
  const focus = (parts.focus || []).map((q) => trimPoint(q, 110)).filter(Boolean).slice(0, 3);
  const constraints = (parts.constraints || [])
    .map((c) => trimPoint(c, 90))
    .filter(Boolean)
    .slice(0, 3);
  const context = trimPoint(parts.context || "", 160);

  // Unstructured one-liner questions: use the question itself as title, no dump.
  const shortAsk =
    !parts.focus.length &&
    !parts.constraints.length &&
    (!parts.context || parts.context === framing.replace(/\s+/g, " ").trim());

  return {
    title: title || trimPoint(framing, 92) || t("present.questionSlide"),
    context: shortAsk ? "" : context,
    focus,
    constraints,
    // Fallback list if no structured focus but framing is a short question
    list: focus.length ? focus : shortAsk && framing.length <= 140 ? [] : [],
  };
}

const FOCUS_TITLES = [
  "Problem Diagnosis",
  "Naming the problem",
  "Lived experience",
  "Authority map",
  "Observation",
  "Innovation framing",
];

const ACTION_TITLES = [
  "Priority Actions",
  "Participatory action plan",
  "Collective action",
  "Procedure and accountability plan",
  "School-day learning plan",
  "Pilot design",
  "Concrete activity",
  "Process design",
  "Scaling roadmap",
];

/**
 * Structured talking points for one theorist slide (aligned with Report comparison).
 */
function agentDeck(response, lang, presentation, t) {
  const key = (response.agent_key || "").toLowerCase();
  const { sections } = parseAgentResponse(response.response || "");
  const blurbs = presentation?.lens_blurbs || {};
  const lens = pickLocale(blurbs[key], lang, getAgentLens(key, lang));

  let focus = "";
  for (const title of FOCUS_TITLES) {
    focus = firstTextBullet(sections, title);
    if (focus) break;
  }

  const actionBlock = firstActionBlock(sections);
  let action = actionBlock?.action || "";
  if (!action) {
    for (const title of ACTION_TITLES) {
      action = firstTextBullet(sections, title);
      if (action) break;
    }
  }

  const who = (actionBlock?.owner || "").trim();
  const insight = extractInsight(response);

  if (!focus && insight?.headline) focus = insight.headline;
  if (!action && insight?.headline && insight.headline !== focus) action = insight.headline;

  const rows = [
    { key: "focus", label: t("present.rowFocus"), text: trimPoint(focus, 140) },
    { key: "action", label: t("present.rowAction"), text: trimPoint(action, 140) },
    { key: "who", label: t("present.rowWho"), text: trimPoint(who, 80) },
  ].filter((row) => row.text);

  if (!rows.length && insight?.headline) {
    rows.push({ key: "focus", label: t("present.rowFocus"), text: trimPoint(insight.headline, 140) });
  }

  return {
    agentKey: key,
    theorist: getAgentTheorist(key) || response.title || response.agent_label,
    lens,
    color: response.color || "#c2410c",
    rows,
  };
}

function guestCards(humanAnswers) {
  const all = (humanAnswers || [])
    .filter((h) => (h?.name || "").trim() && (h?.answer || "").trim())
    .map((h) => ({
      name: h.name.trim(),
      role: [h.role, h.organization].filter(Boolean).join(" · "),
      answer: normalizeGuestAnswer(h.answer),
    }));
  return {
    guests: all.slice(0, 100),
    omitted: Math.max(0, all.length - 100),
  };
}

/** One roster (if many) + one slide per guest — readable in the room. */
function appendGuestSlides(slides, guestPack, t, idPrefix = "") {
  const guests = guestPack?.guests || guestPack || [];
  const omitted = guestPack?.omitted || 0;
  if (!guests.length) return;
  const p = idPrefix ? `${idPrefix}-` : "";

  if (guests.length > 1 || omitted > 0) {
    slides.push({
      id: `${p}guest-roster`,
      kind: "guest-roster",
      eyebrow: t("present.sectionGuests"),
      title: t("present.guestsRosterTitle"),
      subtitle: t("present.guestsRosterSub"),
      guests,
      omitted,
    });
  }

  guests.forEach((guest, index) => {
    slides.push({
      id: `${p}guest-${index}`,
      kind: "guest",
      eyebrow:
        guests.length > 1
          ? t("present.guestSlide")
              .replace("{n}", String(index + 1))
              .replace("{total}", String(guests.length))
          : t("present.sectionGuests"),
      title: guest.name,
      subtitle: guest.role || t("present.guestsSub"),
      guest,
      guestIndex: index,
      guestTotal: guests.length,
    });
  });
}

/**
 * Professional room deck aligned with the decision brief:
 * Title page (once) → Framing? → Lenses → Theorists → Guests? → Discussion
 */
export function buildPresentationSlides(
  report,
  t,
  lang = "en",
  presentation = null,
  humanAnswers = []
) {
  if (!report) return [];

  const topic = topicFromReport(report.question, t);
  const agents = (report.responses || [])
    .filter((r) => r.response && !r.error)
    .map((r) => agentDeck(r, lang, presentation, t));
  const guests = guestCards(humanAnswers);
  const conclusion = pickLocalizedBlock(presentation?.conclusion, lang);

  // Title page only — never repeat this hero on later slides.
  // Eyebrow stays generic ("Topic") so case-pack branding cannot contradict the question.
  const slides = [
    {
      id: "title",
      kind: "title",
      eyebrow: t("present.sectionTopic"),
      title: topic.title,
    },
  ];

  const hasFraming =
    Boolean(topic.context) || topic.focus.length > 0 || topic.constraints.length > 0;
  if (hasFraming) {
    // Drop focus lines that duplicate the title page headline.
    const titleNorm = topic.title.toLowerCase().replace(/[?.…]+$/g, "").trim();
    const focus = topic.focus.filter((q) => {
      const n = q.toLowerCase().replace(/[?.…]+$/g, "").trim();
      return n !== titleNorm && !titleNorm.startsWith(n) && !n.startsWith(titleNorm);
    });
    slides.push({
      id: "framing",
      kind: "framing",
      eyebrow: t("present.sectionTopic"),
      title: t("present.framingTitle"),
      context: topic.context,
      contextLabel: t("present.contextLabel"),
      focusLabel: t("present.focusLabel"),
      constraintsLabel: t("present.constraintsLabel"),
      focus,
      constraints: topic.constraints,
    });
  }

  slides.push({
    id: "lenses",
    kind: "agenda",
    eyebrow: t("present.sectionKeyConcepts"),
    title: t("present.agendaTitle"),
    subtitle: t("present.agendaSub"),
    items: agents.map((a) => ({
      agentKey: a.agentKey,
      theorist: a.theorist,
      lens: a.lens,
      color: a.color,
    })),
  });

  agents.forEach((agent, index) => {
    slides.push({
      id: `lens-${agent.agentKey}`,
      kind: "agent",
      eyebrow: `${t("present.lensSlide")} ${index + 1} / ${agents.length}`,
      agentKey: agent.agentKey,
      theorist: agent.theorist,
      lens: agent.lens,
      color: agent.color,
      rows: agent.rows,
    });
  });

  if (guests.guests?.length) {
    appendGuestSlides(slides, guests, t);
  }

  slides.push({
    id: "discussion",
    kind: "conclusion",
    eyebrow: t("present.closeSlide"),
    title: conclusion.title || t("present.closeBody"),
    prompts: conclusion.prompts?.length
      ? conclusion.prompts
      : [t("present.closePrompt1"), t("present.closePrompt2"), t("present.closePrompt3")],
  });

  return slides;
}

/**
 * Multi-question: one title page → short per-question sections (no repeated title pages).
 */
export function buildMultiSessionPresentationSlides(
  sessions = [],
  t,
  lang = "en",
  presentation = null
) {
  const usable = (sessions || []).filter((s) => s?.report);
  if (!usable.length) return [];
  if (usable.length === 1) {
    return buildPresentationSlides(
      usable[0].report,
      t,
      lang,
      presentation,
      usable[0].humanAnswers || []
    );
  }

  const conclusion = pickLocalizedBlock(presentation?.conclusion, lang);
  const titles = usable.map((s) => topicFromReport(s.report.question, t).title).filter(Boolean);

  // Single title page listing all questions — not repeated later.
  const slides = [
    {
      id: "title",
      kind: "title",
      eyebrow: t("present.sectionTopic"),
      title: t("present.playlistQuestions"),
      list: titles,
    },
  ];

  usable.forEach((session, index) => {
    const report = session.report;
    const topic = topicFromReport(report.question, t);
    const agents = (report.responses || [])
      .filter((r) => r.response && !r.error)
      .map((r) => agentDeck(r, lang, presentation, t));
    const guests = guestCards(session.humanAnswers);
    const prefix = `q${index + 1}`;

    // Thin section marker — not a second title page.
    slides.push({
      id: `${prefix}-marker`,
      kind: "agenda",
      eyebrow: t("present.playlistPart").replace("{n}", String(index + 1)),
      title: topic.title,
      subtitle: t("present.playlistPartSub"),
      items: agents.map((a) => ({
        agentKey: a.agentKey,
        theorist: a.theorist,
        lens: a.lens,
        color: a.color,
      })),
    });

    agents.forEach((agent, ai) => {
      slides.push({
        id: `${prefix}-lens-${agent.agentKey}`,
        kind: "agent",
        eyebrow: `${t("present.lensSlide")} ${ai + 1} / ${agents.length}`,
        agentKey: agent.agentKey,
        theorist: agent.theorist,
        lens: agent.lens,
        color: agent.color,
        rows: agent.rows,
      });
    });

    if (guests.guests?.length) {
      appendGuestSlides(slides, guests, t, prefix);
    }
  });

  slides.push({
    id: "discussion-multi",
    kind: "conclusion",
    eyebrow: t("present.closeSlide"),
    title: conclusion.title || t("present.closeBody"),
    prompts: conclusion.prompts?.length
      ? conclusion.prompts
      : [t("present.closePrompt1"), t("present.closePrompt2"), t("present.closePrompt3")],
  });

  return slides;
}

/** @deprecated kept for any imports that still call extractKeyPoints */
export function extractKeyPoints(responseText, limit = 3) {
  const { sections, fallback } = parseAgentResponse(responseText || "");
  const points = [];
  for (const section of sections) {
    for (const item of section.bullets || []) {
      if (points.length >= limit) break;
      const text = item.type === "action" ? item.action : item.text;
      const clean = trimPoint(text, 130);
      if (clean) points.push(clean);
    }
    if (points.length >= limit) break;
  }
  if (!points.length && fallback) points.push(trimPoint(fallback, 130));
  return points.slice(0, limit);
}
