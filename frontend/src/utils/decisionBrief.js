import { buildReadableAnalysis } from "@/utils/buildReadableAnalysis";
import { buildAgentComparison } from "@/utils/buildAgentComparison";
import { extractHighlights, extractInsight } from "@/utils/extractInsights";
import { getAgentLens, getAgentTheorist } from "@/lib/agentIcons";
import { cleanAgentText } from "@/utils/parseAgentResponse";
import { displayQuestion } from "@/utils/uniqueReports";
import { createTextClaimer, polishBriefForClarity } from "@/utils/briefQuality";
import { normalizeGuestAnswer } from "@/utils/guestAnswer";

const AGENT_ORDER = ["freire", "weber", "montessori", "rogers"];
const CELL_MAX = 110;
const BULLET_MAX = 140;
const LEAD_MAX = 160;
/** Guest perspectives keep the full answer (invite cap is 8000). */
const GUEST_ANSWER_MAX = 8000;

export function newSectionId(prefix = "sec") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function clip(text, max) {
  const cleaned = cleanAgentText(String(text || ""))
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";
  if (cleaned.length <= max) return cleaned;
  const slice = cleaned.slice(0, max);
  const cut = slice.lastIndexOf(" ");
  return `${(cut > max * 0.45 ? slice.slice(0, cut) : slice).trim()}…`;
}

/** Full guest answer for brief tables — preserve structure, soft-cap only at invite max. */
function guestPerspectiveCell(raw) {
  const answer = normalizeGuestAnswer(cleanAgentText(raw || ""));
  if (!answer) return "";
  if (answer.length <= GUEST_ANSWER_MAX) return answer;
  return `${answer.slice(0, GUEST_ANSWER_MAX).trim()}…`;
}

/** Build a concrete report title from the problem framing (not a generic label). */
export function buildReportTitle(framing, L = {}) {
  const text = cleanAgentText(framing || "").trim();
  const fallback = L.docTitle || "Decision brief";
  if (!text) return fallback;

  const focusBlock =
    text.match(/focus questions?\s*\n([\s\S]*?)(?:\n\s*\n|$)/i) ||
    text.match(/perguntas-foco\s*\n([\s\S]*?)(?:\n\s*\n|$)/i) ||
    text.match(/painopistekysymykset\s*\n([\s\S]*?)(?:\n\s*\n|$)/i);

  if (focusBlock) {
    const first = focusBlock[1]
      .split("\n")
      .map((l) => l.replace(/^\s*\d+[.)]\s*/, "").replace(/^[•\-]\s*/, "").trim())
      .find((l) => l.length > 18);
    if (first) {
      const titled = first.replace(/[?]+$/, "").trim();
      return clipTitleCase(titled, 92) || fallback;
    }
  }

  const inlineFocus = text.match(/focus questions?:\s*(.+?)(?:\n|$)/i);
  if (inlineFocus?.[1]) {
    return clipTitleCase(inlineFocus[1].replace(/[?]+$/, "").trim(), 92) || fallback;
  }

  const context =
    text.match(/context\s*\n(.+?)(?:\n\s*\n|constraints?|limites|focus)/is) ||
    text.match(/contexto\s*\n(.+?)(?:\n\s*\n|limites|perguntas)/is);
  if (context?.[1]) {
    const sentence = context[1].replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s+/)[0];
    if (sentence && sentence.length > 24) {
      return clipTitleCase(sentence.replace(/[.]+$/, ""), 92) || fallback;
    }
  }

  const firstLine = text
    .split(/\n+/)
    .map((l) => l.trim())
    .find((l) => l.length > 24 && !/^(context|constraints?|focus|contexto|limites)/i.test(l));
  if (firstLine) return clipTitleCase(firstLine, 92) || fallback;
  return clipTitleCase(text, 92) || fallback;
}

function clipTitleCase(raw, max) {
  let s = String(raw || "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.]+$/, "");
  if (!s) return "";
  if (s.length <= max) return s;
  const slice = s.slice(0, max);
  const cut = slice.lastIndexOf(" ");
  return `${(cut > max * 0.5 ? slice.slice(0, cut) : slice).trim()}…`;
}

function shortHeaderTitle(title, max = 48) {
  const s = String(title || "").replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  const slice = s.slice(0, max);
  const cut = slice.lastIndexOf(" ");
  return `${(cut > 20 ? slice.slice(0, cut) : slice).trim()}…`;
}

/** Parse structured problem framing into parts used across the brief. */
export function extractFramingParts(framing) {
  const text = cleanAgentText(framing || "").trim();
  const parts = { context: "", constraints: [], focus: [], raw: text };
  if (!text) return parts;

  const ctx =
    text.match(/context\s*\n([\s\S]*?)(?=\n\s*(?:constraints?|limites|focus questions?|perguntas-foco)\b)/i) ||
    text.match(/contexto\s*\n([\s\S]*?)(?=\n\s*(?:limites|perguntas-foco|focus)\b)/i);
  if (ctx) parts.context = ctx[1].replace(/\s+/g, " ").trim();

  const cons =
    text.match(/constraints?\s*\n([\s\S]*?)(?=\n\s*(?:focus questions?|perguntas-foco)\b|$)/i) ||
    text.match(/limites\s*\n([\s\S]*?)(?=\n\s*(?:perguntas-foco|focus)\b|$)/i);
  if (cons) {
    parts.constraints = cons[1]
      .split("\n")
      .map((l) => l.replace(/^[•\-\d.)\s]+/, "").trim())
      .filter((l) => l.length > 2)
      .slice(0, 6);
  }

  const focus =
    text.match(/focus questions?\s*\n([\s\S]*?)$/i) ||
    text.match(/perguntas-foco\s*\n([\s\S]*?)$/i);
  if (focus) {
    parts.focus = focus[1]
      .split("\n")
      .map((l) => l.replace(/^\s*\d+[.)]\s*/, "").replace(/^[•\-]\s*/, "").trim())
      .filter((l) => l.length > 8)
      .slice(0, 5);
  }

  if (!parts.context) {
    const first = text.split(/\n{2,}/)[0]?.replace(/\s+/g, " ").trim() || "";
    if (first.length > 20) parts.context = first;
  }
  return parts;
}

function topicFromFraming(framing, L = {}) {
  return buildReportTitle(framing, L);
}

/** Narrative copy that always tracks the current problem framing. */
export function buildFramingNarratives(framing, L = {}) {
  const parts = extractFramingParts(framing);
  const topic = topicFromFraming(framing, L);
  const focusOne = parts.focus[0] ? parts.focus[0].replace(/[?]+$/, "").trim() : topic;
  const contextBit = clip(parts.context || framing || topic, 180);

  const executiveLead = (
    L.executiveLeadTpl ||
    "Four theory lenses reviewed this problem framing: {topic}. The table below captures each one-line takeaway; later sections keep only what changes the decision."
  ).replace(/\{topic\}/g, topic);

  const recommendationsLead = (
    L.recommendationsLeadTpl ||
    "Start with these actions for “{topic}”. Assign owners before the next review."
  ).replace(/\{topic\}/g, topic);

  const comparisonLead = (
    L.comparisonLeadTpl ||
    "Side-by-side extract for “{topic}”. Empty cells mean that answer did not state the item."
  ).replace(/\{topic\}/g, topic);

  const conclusionLead = (
    L.conclusionLeadTpl ||
    "On “{topic}”, no single theory is enough on its own. A workable path combines shared priorities with lens-specific checks."
  ).replace(/\{topic\}/g, topic);

  const conclusionClose = (
    L.conclusionCloseTpl ||
    "Treat this brief as a handover on “{focus}”: keep shared priorities, and log disagreements as open questions."
  ).replace(/\{focus\}/g, focusOne).replace(/\{topic\}/g, topic);

  const abstract =
    [
      contextBit,
      parts.focus.length
        ? `Focus: ${parts.focus.map((f, i) => `${i + 1}) ${f}`).join(" ")}`
        : "",
      parts.constraints.length
        ? `Constraints: ${parts.constraints.slice(0, 3).join("; ")}.`
        : "",
      L.abstractTail ||
        "This brief synthesises four theory-driven agent perspectives and recommends next steps for decision owners.",
    ]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

  return {
    topic,
    focusOne,
    executiveLead,
    recommendationsLead,
    comparisonLead,
    conclusionLead,
    conclusionClose,
    abstract: clip(abstract, 520).replace(/…$/, "") || buildCoverAbstract(framing, L),
  };
}

function framingBlock(type, text, extra = {}) {
  return { type, text, sync: "framing", ...extra };
}

/**
 * Keep title / abstract / framing-linked paragraphs aligned with brief.framing.
 * Tables and perspective content are left alone (they come from agent answers).
 */
export function syncBriefToFraming(brief, labels = {}) {
  if (!brief) return brief;
  const framing = String(brief.framing || "").trim();
  const narratives = buildFramingNarratives(framing, labels);
  const title = narratives.topic;

  const sections = (brief.sections || []).map((section) => {
    const blocks = (section.blocks || []).map((block) => {
      if (block.sync !== "framing") return block;
      if (section.id === "executive" && block.type === "paragraph") {
        return { ...block, text: narratives.executiveLead };
      }
      if (section.id === "recommendations" && block.type === "paragraph") {
        return { ...block, text: narratives.recommendationsLead };
      }
      if (section.id === "comparison" && block.type === "paragraph") {
        return { ...block, text: narratives.comparisonLead };
      }
      if (section.id === "conclusion" && block.type === "paragraph") {
        return { ...block, text: narratives.conclusionLead };
      }
      if (section.id === "conclusion" && block.type === "bullets") {
        const items = [...(block.items || [])];
        if (items.length) {
          items[items.length - 1] = narratives.conclusionClose;
        }
        return { ...block, items };
      }
      return block;
    });
    return { ...section, blocks };
  });

  return {
    ...brief,
    title,
    sections,
    cover: {
      ...(brief.cover || {}),
      abstract: narratives.abstract,
      subtitle: labels.coverSubtitle || brief.cover?.subtitle || "Multi-theory decision brief",
    },
    framingFingerprint: framingFingerprint(framing),
  };
}

export function framingFingerprint(framing) {
  return cleanAgentText(framing || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Fingerprint of agent answers + guest opinions for a session (regen when content changes). */
export function contentFingerprint(report, humanAnswers = []) {
  const chunks = [];
  const responses = [...(report?.responses || [])].sort((a, b) =>
    String(a.agent_key || "").localeCompare(String(b.agent_key || ""))
  );
  for (const r of responses) {
    chunks.push(
      `${String(r.agent_key || "").toLowerCase()}|${cleanAgentText(r.response || "").slice(0, 500)}|${r.error || ""}`
    );
  }
  for (const h of humanAnswers || []) {
    chunks.push(
      `guest|${String(h.name || "").trim()}|${cleanAgentText(h.answer || "").slice(0, 500)}`
    );
  }
  return framingFingerprint(chunks.join("\n"));
}

/** Upsert guest table into an edited brief without wiping other edits. */
export function mergeGuestsIntoBrief(brief, humanAnswers = [], labels = {}) {
  if (!brief) return brief;
  const guestRows = [];
  for (const h of humanAnswers || []) {
    const name = String(h?.name || "").trim();
    const answer = guestPerspectiveCell(h?.answer);
    if (!name || !answer) continue;
    guestRows.push([
      name,
      [h.role, h.organization].filter(Boolean).join(" · ") || "—",
      answer,
    ]);
  }

  const sections = [...(brief.sections || [])];
  const cmpIdx = sections.findIndex((s) => s.id === "comparison" || s.type === "comparison");
  const guestLead =
    labels.guestsLead || "Human guest views on the same problem framing.";
  const guestCaption = labels.guests || "Guest participants";
  const guestHeaders = [
    labels.colGuest || "Guest",
    labels.colRole || "Role",
    labels.colPerspective || "Perspective",
  ];

  if (cmpIdx >= 0) {
    const section = { ...sections[cmpIdx] };
    const blocks = (section.blocks || []).filter(
      (b) => b.id !== "table_guests" && !(b.type === "paragraph" && b.text === guestLead)
    );
    if (guestRows.length) {
      blocks.push({ type: "paragraph", text: guestLead });
      blocks.push({
        type: "table",
        id: "table_guests",
        caption: guestCaption,
        headers: guestHeaders,
        rows: guestRows,
      });
    }
    section.blocks = blocks;
    sections[cmpIdx] = section;
  } else if (guestRows.length) {
    sections.splice(
      Math.max(0, sections.findIndex((s) => s.id === "conclusion")),
      0,
      {
        id: "comparison",
        type: "comparison",
        title: labels.comparison || "Comparison across perspectives",
        blocks: [
          { type: "paragraph", text: guestLead },
          {
            type: "table",
            id: "table_guests",
            caption: guestCaption,
            headers: guestHeaders,
            rows: guestRows,
          },
        ],
      }
    );
  }

  return {
    ...brief,
    sections,
    updatedAt: new Date().toISOString(),
  };
}

function bulletText(bullet) {
  if (!bullet) return "";
  if (bullet.type === "action") {
    const bits = [bullet.action];
    if (bullet.owner) bits.push(`Who: ${bullet.owner}`);
    return bits.filter(Boolean).join(" — ");
  }
  return bullet.text || "";
}

/**
 * Compact handover brief — not a dump of full agent transcripts.
 * Dedupes across sections so clarity stays clean without a visible score panel.
 */
export function generateDecisionBrief(report, opts = {}) {
  const lang = opts.lang || "en";
  const L = {
    docTitle: "Decision brief",
    executive: "Executive summary",
    framing: "Problem framing",
    comparison: "Comparison across perspectives",
    recommendations: "Recommended next steps",
    diagnosis: "What's going on",
    actions: "What to do",
    why: "Why this lens",
    limits: "Limits",
    takeawaysHeading: "Perspective takeaways",
    sharedActions: "Shared priorities",
    priorityActions: "Priority actions",
    preparedForDefault: "Programme decision owners",
    guests: "Guest perspectives",
    guestsLead: "Human guest views on the same problem framing.",
    ...opts.labels,
  };

  const claim = createTextClaimer();
  const sessionId = report?.session_id;
  const humanAnswers = opts.humanAnswers || [];
  const framing = displayQuestion(report?.question || "");
  const narratives = buildFramingNarratives(framing, L);
  const responses = [...(report?.responses || [])].sort((a, b) => {
    const ia = AGENT_ORDER.indexOf((a.agent_key || "").toLowerCase());
    const ib = AGENT_ORDER.indexOf((b.agent_key || "").toLowerCase());
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });

  const takeawayRows = [];
  for (const r of responses) {
    if (!r.response || r.error) continue;
    const key = (r.agent_key || "").toLowerCase();
    const theorist = getAgentTheorist(key) || r.agent_name || r.agent_label || key;
    const lens = getAgentLens(key, lang);
    const insight = extractInsight(r);
    const headline = insight?.headline ? claim.tryClaim(clip(insight.headline, CELL_MAX)) : null;
    if (headline) takeawayRows.push([theorist, lens, headline]);
  }

  // Shared priorities: only lines not already used as takeaways
  const shared = [];
  for (const r of responses) {
    if (!r.response || r.error) continue;
    for (const h of extractHighlights(r.response, 2)) {
      const kept = claim.tryClaim(clip(h, BULLET_MAX));
      if (kept) shared.push(kept);
      if (shared.length >= 4) break;
    }
    if (shared.length >= 4) break;
  }

  const executiveItems = [];
  if (takeawayRows.length) {
    executiveItems.push(framingBlock("paragraph", narratives.executiveLead));
    executiveItems.push({
      type: "table",
      id: "table_takeaways",
      caption: L.takeawaysHeading,
      headers: [L.colTheorist || "Theorist", L.colLens || "Lens", L.colTakeaway || "Key takeaway"],
      rows: takeawayRows,
    });
  }
  if (shared.length) {
    executiveItems.push({ type: "heading", text: L.sharedActions });
    executiveItems.push({ type: "bullets", items: shared });
  }
  if (!executiveItems.length) {
    executiveItems.push(framingBlock("paragraph", narratives.executiveLead));
  }

  const sections = [
    {
      id: "executive",
      type: "executive",
      title: L.executive,
      blocks: executiveItems,
    },
  ];

  const comparisonRows = buildAgentComparison(responses, lang);
  const nextSteps = [];
  for (const row of comparisonRows) {
    const kept = claim.tryClaim(clip(row.firstAction || "", BULLET_MAX));
    if (kept) nextSteps.push(kept);
    if (nextSteps.length >= 4) break;
  }
  if (nextSteps.length) {
    sections.push({
      id: "recommendations",
      type: "recommendations",
      title: L.recommendations,
      blocks: [
        framingBlock("paragraph", narratives.recommendationsLead),
        { type: "bullets", items: nextSteps },
      ],
    });
  }

  for (const r of responses) {
    if (!r.response || r.error) continue;
    const key = (r.agent_key || "").toLowerCase();
    const theorist = getAgentTheorist(key) || r.agent_name || key;
    const lens = getAgentLens(key, lang);
    const readable = buildReadableAnalysis(r.response, {
      diagnosis: L.diagnosis,
      actions: L.actions,
      why: L.why,
      limits: L.limits,
    });
    const actionSec = readable.sections.find((s) => s.title === L.actions);
    const actionItems = [];
    for (const b of actionSec?.bullets || []) {
      const kept = claim.tryClaim(clip(bulletText(b), BULLET_MAX));
      if (kept) actionItems.push(kept);
      if (actionItems.length >= 3) break;
    }

    const blocks = [];
    if (lens) blocks.push({ type: "kicker", text: lens });
    if (actionItems.length) {
      blocks.push({ type: "heading", text: L.priorityActions });
      blocks.push({ type: "bullets", items: actionItems });
    } else {
      blocks.push({
        type: "paragraph",
        text: "Additional actions for this lens are covered in Recommended next steps.",
      });
    }

    sections.push({
      id: `perspective_${key || newSectionId("p")}`,
      type: "perspective",
      agentKey: key,
      title: theorist,
      blocks,
    });
  }

  if (comparisonRows.length || humanAnswers.length) {
    const tableRows = comparisonRows.map((row) => {
      const theorist =
        getAgentTheorist(row.agentKey) || row.agentLabel || row.agentKey || "—";
      return [
        theorist,
        claim.tryClaim(clip(row.mainFocus || "", 90)) || "—",
        clip(row.mainStakeholder || "", 60) || "—",
        claim.tryClaim(clip(row.successMetric || "", 90)) || "—",
      ];
    });

    const blocks = [framingBlock("paragraph", narratives.comparisonLead)];
    if (tableRows.length) {
      blocks.push({
        type: "table",
        id: "table_comparison",
        caption: L.comparison,
        headers: [
          L.colTheorist || "Theorist",
          L.colFocus || "Focus",
          L.colWho || "Who",
          L.colSuccess || "Success / limits",
        ],
        rows: tableRows,
      });
    }

    // Guests always appear here (not filtered by agent-text dedupe).
    const guestRows = [];
    for (const h of humanAnswers) {
      const name = String(h?.name || "").trim();
      const answer = guestPerspectiveCell(h?.answer);
      if (!name || !answer) continue;
      guestRows.push([
        name,
        [h.role, h.organization].filter(Boolean).join(" · ") || "—",
        answer,
      ]);
    }
    if (guestRows.length) {
      blocks.push({
        type: "paragraph",
        text:
          L.guestsLead ||
          "Human guest views on the same problem framing.",
      });
      blocks.push({
        type: "table",
        id: "table_guests",
        caption: L.guests || "Guest participants",
        headers: [
          L.colGuest || "Guest",
          L.colRole || "Role",
          L.colPerspective || "Perspective",
        ],
        rows: guestRows,
      });
    }

    sections.push({
      id: "comparison",
      type: "comparison",
      title: L.comparison,
      blocks,
    });
  }

  const guestCount = (humanAnswers || []).filter(
    (h) => String(h?.name || "").trim() && cleanAgentText(h?.answer || "").trim()
  ).length;

  const conclusionBullets = [];
  if (takeawayRows.length) {
    conclusionBullets.push(
      (L.conclusionLensTpl || L.conclusionLens || "Four lenses contributed distinct takeaways on “{topic}”.").replace(
        /\{topic\}/g,
        narratives.topic
      )
    );
  }
  if (guestCount) {
    conclusionBullets.push(
      L.conclusionGuests ||
        "Guest perspectives are included above; weigh them alongside the theory lenses in the decision record."
    );
  }
  if (nextSteps.length) {
    conclusionBullets.push(
      L.conclusionActions ||
        "Immediate next steps are listed above; assign owners and a review date before the next decision meeting."
    );
  }
  conclusionBullets.push(narratives.conclusionClose);

  sections.push({
    id: "conclusion",
    type: "conclusion",
    title: L.conclusion || "Conclusion",
    blocks: [
      framingBlock("paragraph", narratives.conclusionLead),
      { type: "bullets", items: conclusionBullets.filter(Boolean).slice(0, 5), sync: "framing" },
    ],
  });

  sections.push({
    id: "references",
    type: "references",
    title: L.references || "References",
    blocks: [
      {
        type: "paragraph",
        text:
          L.referencesLead ||
          "Add sources used for this brief before external circulation.",
      },
      {
        type: "bullets",
        items: [
          L.referencePlaceholder1 || "[1] Author. (Year). Title. Publisher or URL.",
          L.referencePlaceholder2 || "[2] Author. (Year). Title. Publisher or URL.",
          L.referencePlaceholder3 || "[3] Author. (Year). Title. Publisher or URL.",
        ],
      },
    ],
  });

  const now = new Date().toISOString();
  const dateOnly = (report?.created_at || now).slice(0, 10);
  const draft = {
    version: 8,
    sessionId,
    title: narratives.topic,
    framing,
    framingFingerprint: framingFingerprint(framing),
    contentFingerprint: contentFingerprint(report, humanAnswers),
    sections,
    tables: [],
    figures: [],
    cover: {
      classification: "internal",
      date: dateOnly,
      preparedBy: L.preparedByName || "PerspectiveLab",
      preparedByTitle: L.preparedByTitle || "Research platform",
      preparedByOrg: L.preparedByOrg || "PerspectiveLab",
      preparedFor: L.preparedForDefault || "Programme decision owners",
      preparedForTitle: L.preparedForTitle || "Decision owners",
      preparedForOrg: L.preparedForOrg || "",
      subtitle: L.coverSubtitle || "Multi-theory decision brief",
      abstract: narratives.abstract,
      footnote: L.coverFootnote || "",
    },
    generatedAt: now,
    updatedAt: now,
    source: "generated",
  };

  const polished = polishBriefForClarity(draft, {
    preparedFor: L.preparedForDefault || "Programme decision owners",
  });
  const synced = syncBriefToFraming(polished, L);
  const catalog = rebuildBriefCatalog(synced);
  return { ...synced, ...catalog };
}

/** Long cover date like “April 11, 2005”. */
export function formatCoverDate(isoDate, locale = "en-US") {
  const raw = String(isoDate || "").slice(0, 10);
  const d = raw ? new Date(`${raw}T12:00:00`) : new Date();
  if (Number.isNaN(d.getTime())) return raw || "";
  try {
    return d.toLocaleDateString(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return raw;
  }
}

function buildCoverAbstract(framing, L = {}) {
  const text = cleanAgentText(framing || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) {
    return (
      L.abstractDefault ||
      "This decision brief synthesises four theory-driven agent perspectives on the stated problem and recommends next steps for decision owners."
    );
  }
  if (text.length <= 420) return text;
  const slice = text.slice(0, 420);
  const cut = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf(" "));
  return `${(cut > 200 ? slice.slice(0, cut + (slice[cut] === "." ? 1 : 0)) : slice).trim()}${cut > 200 && slice[cut] === "." ? "" : "…"}`;
}

export const CLASSIFICATION_IDS = ["public", "internal", "confidential"];

export function rebuildBriefCatalog(brief) {
  const tables = [];
  let tn = 1;
  for (const section of brief.sections || []) {
    for (const block of section.blocks || []) {
      if (block.type === "table") {
        tables.push({
          id: section.id,
          number: tn,
          title: block.caption || section.title,
          blockId: block.id,
        });
        tn += 1;
      }
    }
  }
  return { tables, figures: [] };
}

export function ensureBriefMeta(brief, labelDefaults = {}) {
  if (!brief) return brief;
  const dateOnly = (brief.cover?.date || brief.generatedAt || new Date().toISOString()).slice(0, 10);

  // Drop figure blocks from older saved briefs
  const sectionsNoFigures = (brief.sections || []).map((section) => ({
    ...section,
    blocks: (section.blocks || []).filter((b) => b.type !== "figure"),
  }));

  const base = {
    ...brief,
    version: brief.version || 7,
    sections: sectionsNoFigures,
    figures: [],
  };

  const synced = syncBriefToFraming(base, labelDefaults);
  const catalog = rebuildBriefCatalog(synced);
  const prior = synced.cover || {};

  return {
    ...synced,
    tables:
      catalog.tables.length > 0
        ? catalog.tables
        : Array.isArray(brief.tables)
          ? brief.tables
          : [],
    figures: [],
    cover: {
      classification: prior.classification || "internal",
      date: dateOnly,
      preparedBy: prior.preparedBy || labelDefaults.preparedByName || "PerspectiveLab",
      preparedByTitle:
        prior.preparedByTitle || labelDefaults.preparedByTitle || "Research platform",
      preparedByOrg: prior.preparedByOrg || labelDefaults.preparedByOrg || "PerspectiveLab",
      preparedFor:
        String(prior.preparedFor || "").trim() ||
        labelDefaults.preparedForDefault ||
        "Programme decision owners",
      preparedForTitle:
        prior.preparedForTitle || labelDefaults.preparedForTitle || "Decision owners",
      preparedForOrg: prior.preparedForOrg || labelDefaults.preparedForOrg || "",
      subtitle: prior.subtitle || labelDefaults.coverSubtitle || "Multi-theory decision brief",
      abstract: prior.abstract || buildCoverAbstract(synced.framing, labelDefaults),
      footnote: prior.footnote || labelDefaults.coverFootnote || "",
    },
  };
}

export function createCustomSection(title = "New section") {
  return {
    id: newSectionId("custom"),
    type: "custom",
    title,
    blocks: [{ type: "bullets", items: [""] }],
  };
}

export function createTableBlock(caption = "Summary table") {
  return {
    type: "table",
    id: newSectionId("table"),
    caption,
    headers: ["Column A", "Column B", "Column C"],
    rows: [
      ["", "", ""],
      ["", "", ""],
    ],
  };
}

export function createTableSection(title = "New table") {
  return {
    id: newSectionId("table_sec"),
    type: "custom",
    title,
    blocks: [createTableBlock(title)],
  };
}

export function moveSection(sections, index, direction) {
  const next = [...sections];
  const target = index + direction;
  if (target < 0 || target >= next.length) return sections;
  const tmp = next[index];
  next[index] = next[target];
  next[target] = tmp;
  return next;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Clean / tighten a brief right before Word or PDF export.
 */
export function prepareBriefForExport(brief) {
  if (!brief) return brief;
  const meta = syncBriefToFraming(ensureBriefMeta(brief), {
    coverSubtitle: brief.cover?.subtitle,
    preparedForDefault: brief.cover?.preparedFor,
  });
  const polished = polishBriefForClarity(meta, {
    preparedFor: meta.cover?.preparedFor || "Programme decision owners",
  });

  const cleanBlocks = (blocks) =>
    (blocks || [])
      .map((block) => {
        if (block.type === "bullets") {
          const items = (block.items || [])
            .map((item) => clip(item, BULLET_MAX))
            .filter(Boolean)
            .slice(0, 6);
          return { ...block, items };
        }
        if (block.type === "table") {
          const isGuestTable = block.id === "table_guests";
          return {
            ...block,
            caption: clip(block.caption || "", 120),
            headers: (block.headers || []).map((h) => clip(h, 40)),
            rows: (block.rows || [])
              .map((row) =>
                row.map((cell, ci) => {
                  // Keep full guest perspective text (usually column index 2).
                  if (isGuestTable && ci >= 2) return guestPerspectiveCell(cell);
                  if (isGuestTable) return String(cell || "").trim() || "—";
                  return clip(cell, CELL_MAX);
                })
              )
              .filter((row) => row.some((c) => c && c !== "—")),
          };
        }
        if (block.text) {
          return { ...block, text: clip(block.text, block.type === "lead" ? LEAD_MAX : 320) };
        }
        return block;
      })
      .filter((block) => {
        if (block.type === "bullets") return (block.items || []).length > 0;
        if (block.type === "table") return (block.rows || []).length > 0;
        if (block.type === "heading" || block.type === "kicker") return Boolean(block.text);
        if (block.text != null) return Boolean(String(block.text).trim());
        return true;
      });

  const sections = (polished.sections || [])
    .map((section) => ({
      ...section,
      title: clip(section.title || "", 80),
      blocks: cleanBlocks(section.blocks),
    }))
    .filter((s) => (s.blocks || []).length > 0);

  const cleaned = {
    ...polished,
    title: clip(polished.title || "Decision brief", 80),
    framing: cleanAgentText(polished.framing || "").trim(),
    sections,
  };
  const catalog = rebuildBriefCatalog(cleaned);
  return { ...cleaned, ...catalog };
}

function framingToHtml(framing) {
  const text = cleanAgentText(framing || "").trim();
  if (!text) return "<p>—</p>";
  const paras = text
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, " ").trim())
    .filter(Boolean);
  if (paras.length <= 1) {
    return `<p>${escapeHtml(text.replace(/\n/g, " "))}</p>`;
  }
  return paras.map((p) => `<p>${escapeHtml(p)}</p>`).join("\n");
}

export function briefToHtmlDocument(brief, { labels = {}, locale = "en-US" } = {}) {
  const meta = prepareBriefForExport(brief);
  const cover = meta.cover;
  const classLabel = labels[`class_${cover.classification}`] || cover.classification;
  const framingTitle = labels.framing || "Problem framing";
  const tocTitle = labels.toc || "Contents";
  const totTitle = labels.tot || "List of tables";
  const noneLabel = labels.none || "None";
  const preparedForLabel = labels.preparedFor || "Prepared for";
  const byLabel = labels.by || "By";
  const abstractLabel = labels.abstract || "Abstract";
  const pageLabel = labels.page || "Page";
  const longDate = formatCoverDate(cover.date, locale);
  const reportTitle = String(meta.title || labels.docTitle || "Decision brief").trim();
  const coverTitle = reportTitle.toUpperCase();
  const headerTitle = shortHeaderTitle(reportTitle, 52);
  const abstractText =
    String(cover.abstract || "").trim() ||
    labels.abstractDefault ||
    "This decision brief synthesises four theory-driven agent perspectives on the stated problem.";

  const tocItems = [
    { id: "framing", title: framingTitle },
    ...(meta.sections || []).map((s) => ({ id: s.id, title: s.title })),
  ];

  const pageBreak = `<br clear="all" style="page-break-before:always;mso-break-type:section-break" />`;

  const partyBlock = (label, name, title, org) => `
    <div class="cover-party" align="center">
      <p class="cover-label">${escapeHtml(label)}</p>
      <p class="cover-name"><b>${escapeHtml(name || "—")}</b></p>
      ${title ? `<p class="cover-role">${escapeHtml(title)}</p>` : ""}
      ${org ? `<p class="cover-org">${escapeHtml(org)}</p>` : ""}
    </div>`;

  const coverHtml = `
    <div class="cover" align="center">
      <p class="cover-spacer-top">&nbsp;</p>
      <h1 class="cover-title">${escapeHtml(coverTitle)}</h1>
      <p class="cover-spacer-mid">&nbsp;</p>
      ${partyBlock(
        preparedForLabel,
        cover.preparedFor,
        cover.preparedForTitle,
        cover.preparedForOrg
      )}
      <p class="cover-spacer-sm">&nbsp;</p>
      ${partyBlock(byLabel, cover.preparedBy, cover.preparedByTitle, cover.preparedByOrg)}
      <p class="cover-spacer-sm">&nbsp;</p>
      <p class="cover-date">${escapeHtml(longDate)}</p>
      <div class="cover-abstract" align="left">
        <p class="cover-abstract-label"><b>${escapeHtml(abstractLabel)}</b></p>
        <p class="cover-abstract-body">${escapeHtml(abstractText)}</p>
      </div>
      <p class="cover-class">${escapeHtml(classLabel)}</p>
    </div>`;

  const tocHtml = `
    <div class="front-matter">
      <h2 class="front-title">${escapeHtml(tocTitle)}</h2>
      <ol class="toc">
        ${tocItems
          .map((item, i) => `<li><span class="n">${i + 1}.</span> ${escapeHtml(item.title)}</li>`)
          .join("")}
      </ol>
    </div>`;

  const tablesHtml = `
    <div class="front-matter">
      <h2 class="front-title">${escapeHtml(totTitle)}</h2>
      ${
        meta.tables?.length
          ? `<ol class="toc">${meta.tables
              .map((tb) => `<li>Table ${tb.number}. ${escapeHtml(tb.title)}</li>`)
              .join("")}</ol>`
          : `<p class="empty">${escapeHtml(noneLabel)}</p>`
      }
    </div>`;

  const bodyParts = [];
  bodyParts.push(`<h2>${escapeHtml(framingTitle)}</h2>`);
  bodyParts.push(framingToHtml(meta.framing));

  for (const section of meta.sections || []) {
    bodyParts.push(`<h2>${escapeHtml(section.title)}</h2>`);
    for (const block of section.blocks || []) {
      if (block.type === "kicker" && block.text) {
        bodyParts.push(`<p class="kicker">${escapeHtml(block.text)}</p>`);
      } else if (block.type === "lead" && block.text) {
        bodyParts.push(`<p class="lead"><b>${escapeHtml(block.text)}</b></p>`);
      } else if (block.type === "heading" && block.text) {
        bodyParts.push(`<h3>${escapeHtml(block.text)}</h3>`);
      } else if (block.type === "paragraph" && block.text) {
        bodyParts.push(`<p>${escapeHtml(block.text)}</p>`);
      } else if (block.type === "bullets" && block.items?.length) {
        bodyParts.push("<ul>");
        for (const item of block.items) {
          if (String(item).trim()) bodyParts.push(`<li>${escapeHtml(item)}</li>`);
        }
        bodyParts.push("</ul>");
      } else if (block.type === "table") {
        const tMeta = meta.tables?.find((tb) => tb.blockId === block.id || tb.title === block.caption);
        const caption = tMeta
          ? `Table ${tMeta.number}. ${block.caption || section.title}`
          : block.caption || section.title;
        const colCount = Math.max(1, (block.headers || []).length);
        const width = Math.floor(100 / colCount);
        bodyParts.push(`<p class="caption"><b>${escapeHtml(caption)}</b></p>`);
        bodyParts.push(
          `<table class="data" border="1" cellspacing="0" cellpadding="6" width="100%" style="border-collapse:collapse;width:100%;">`
        );
        bodyParts.push("<thead><tr>");
        for (const h of block.headers || []) {
          bodyParts.push(
            `<th width="${width}%" bgcolor="#F0F0F0" align="left" valign="top"><b>${escapeHtml(h)}</b></th>`
          );
        }
        bodyParts.push("</tr></thead><tbody>");
        for (const row of block.rows || []) {
          bodyParts.push("<tr>");
          for (let i = 0; i < colCount; i += 1) {
            const raw = String(row[i] ?? "—");
            const html =
              block.id === "table_guests" && i >= 2
                ? escapeHtml(raw).replace(/\n/g, "<br>")
                : escapeHtml(raw);
            bodyParts.push(`<td width="${width}%" valign="top">${html}</td>`);
          }
          bodyParts.push("</tr>");
        }
        bodyParts.push("</tbody></table>");
      }
    }
  }

  const headerFooterDefs = `
    <div style="mso-element:header" id="h1">
      <table class="hf" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td class="hf-left" align="left">PerspectiveLab</td>
          <td class="hf-right" align="right">${escapeHtml(headerTitle)}</td>
        </tr>
      </table>
      <p class="hf-rule">&nbsp;</p>
    </div>
    <div style="mso-element:footer" id="f1">
      <p class="hf-rule">&nbsp;</p>
      <table class="hf" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td class="hf-left" align="left">${escapeHtml(classLabel)}</td>
          <td class="hf-center" align="center">${escapeHtml(pageLabel)}
            <span style="mso-field-code:' PAGE '"><span>1</span></span>
          </td>
          <td class="hf-right" align="right">${escapeHtml(longDate)}</td>
        </tr>
      </table>
    </div>`;

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8" />
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<title>${escapeHtml(reportTitle)}</title>
<!--[if gte mso 9]>
<xml>
  <w:WordDocument>
    <w:View>Print</w:View>
    <w:Zoom>100</w:Zoom>
    <w:DoNotOptimizeForBrowser/>
  </w:WordDocument>
</xml>
<![endif]-->
<style>
  @page CoverPage {
    size: A4;
    margin: 2.5cm 2.5cm 2.5cm 2.5cm;
    mso-header-margin: 1cm;
    mso-footer-margin: 1cm;
    mso-header: none;
    mso-footer: none;
  }
  @page MainPage {
    size: A4;
    margin: 2.6cm 2.5cm 2.6cm 2.5cm;
    mso-header-margin: 1.1cm;
    mso-footer-margin: 1.1cm;
    mso-header: h1;
    mso-footer: f1;
    mso-paper-source: 0;
  }
  div.CoverPage { page: CoverPage; }
  div.MainPage { page: MainPage; }

  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11pt;
    color: #000;
    line-height: 1.5;
    background: #fff;
  }
  .cover { text-align: center; min-height: 90vh; }
  .cover-spacer-top { margin: 0; padding: 0; font-size: 36pt; line-height: 36pt; }
  .cover-spacer-mid { margin: 0; padding: 0; font-size: 28pt; line-height: 28pt; }
  .cover-spacer-sm { margin: 0; padding: 0; font-size: 16pt; line-height: 16pt; }
  .cover-title {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 16pt;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    margin: 0 auto;
    max-width: 90%;
    line-height: 1.35;
  }
  .cover-party { margin: 0 auto 6pt; }
  .cover-label, .cover-role, .cover-org, .cover-date {
    font-size: 11pt;
    font-weight: normal;
    margin: 0 0 2pt;
  }
  .cover-name { font-size: 11pt; margin: 0 0 2pt; }
  .cover-abstract {
    text-align: left;
    margin: 48pt auto 0;
    max-width: 92%;
  }
  .cover-abstract-label { margin: 0 0 6pt; font-size: 11pt; }
  .cover-abstract-body { margin: 0; font-size: 11pt; text-align: left; }
  .cover-class {
    margin-top: 28pt;
    font-size: 9pt;
    color: #555;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .front-title {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 14pt;
    font-weight: bold;
    margin: 0 0 14pt;
    border: none;
  }
  h2 {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 13pt;
    font-weight: bold;
    margin: 18pt 0 8pt;
    border-bottom: 1px solid #ccc;
    padding-bottom: 4pt;
  }
  h3 { font-size: 11pt; margin: 12pt 0 4pt; color: #222; }
  p { margin: 0 0 8pt; }
  ul { margin: 0 0 10pt 18pt; padding: 0; }
  li { margin: 0 0 4pt; }
  .kicker { font-size: 9pt; text-transform: uppercase; letter-spacing: 1px; color: #555; margin-bottom: 2pt; }
  .lead { font-size: 11pt; margin-bottom: 8pt; }
  .caption { font-size: 10pt; margin: 10pt 0 4pt; }
  .toc { margin: 0 0 12pt 18pt; padding: 0; }
  .toc li { margin: 4pt 0; }
  .toc .n { color: #444; margin-right: 4pt; }
  .empty { color: #666; font-style: italic; }
  table.data { border-collapse: collapse; width: 100%; margin: 0 0 14pt; font-size: 9.5pt; }
  table.data th, table.data td { border: 1px solid #999; padding: 5pt 6pt; vertical-align: top; }
  table.data th { background: #f0f0f0; }
  table.hf { width: 100%; border: none; }
  .hf-left, .hf-right, .hf-center {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 9pt;
    color: #444;
  }
  .hf-rule {
    margin: 2pt 0 0;
    border-bottom: 1px solid #999;
    font-size: 1pt;
    line-height: 1pt;
  }
  p.MsoHeader, p.MsoFooter { margin: 0; }
  @media print {
    .print-running-header {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      display: flex;
      justify-content: space-between;
      font-size: 9pt;
      color: #444;
      border-bottom: 1px solid #999;
      padding: 0 0 4pt;
    }
    .print-running-footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      justify-content: space-between;
      font-size: 9pt;
      color: #444;
      border-top: 1px solid #999;
      padding: 4pt 0 0;
    }
    .CoverPage .print-running-header,
    .CoverPage .print-running-footer { display: none !important; }
  }
  @media screen {
    .print-running-header, .print-running-footer { display: none; }
  }
</style>
</head>
<body>
<div class="CoverPage">
${coverHtml}
</div>
${pageBreak}
<div class="MainPage">
  <div class="print-running-header">
    <span>PerspectiveLab</span>
    <span>${escapeHtml(headerTitle)}</span>
  </div>
  <div class="print-running-footer">
    <span>${escapeHtml(classLabel)}</span>
    <span>${escapeHtml(pageLabel)}</span>
    <span>${escapeHtml(longDate)}</span>
  </div>
  ${tocHtml}
  ${pageBreak}
  ${tablesHtml}
  ${pageBreak}
  <div class="body">${bodyParts.join("\n")}</div>
  ${headerFooterDefs}
</div>
</body>
</html>`;
}

export function downloadBriefWord(brief, options) {
  const html = briefToHtmlDocument(brief, options);
  const blob = new Blob(["\ufeff", html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `decision-brief-session-${brief.sessionId || "draft"}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Open browser print dialog (separate from PDF download). */
export function printBriefDocument(brief, options) {
  const html = briefToHtmlDocument(brief, options);
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => {
    w.print();
  }, 400);
  return true;
}

/** @deprecated use printBriefDocument */
export function printBriefPdf(brief, options) {
  return printBriefDocument(brief, options);
}

