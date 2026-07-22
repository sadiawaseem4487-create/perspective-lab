const SECTION_TITLES = [
  "Problem Diagnosis",
  "Theory-Based Reasoning",
  "Priority Actions",
  "Action Plan",
  "Implementation Steps",
  "Risks and Limitations",
  "Success Indicators",
  "Final Recommendation",
  "Missing voices",
  "Power and participation analysis",
  "Participatory action plan",
  "Theory link",
  "Authority and rule gaps",
  "Administrative model",
  "Procedure and accountability plan",
  "Environment diagnosis",
  "Autonomy and activity redesign",
  "School-day learning plan",
  "Adoption barriers and enablers",
  "Pilot design",
  "Scaling roadmap",
  "Lived experience",
  "Naming the problem",
  "Critical question",
  "Collective action",
  "Reflection",
  "Authority map",
  "Responsibility",
  "Process design",
  "Documentation",
  "Accountability",
  "Legitimacy",
  "Observation",
  "Prepared environment",
  "Learner choice",
  "Concrete activity",
  "Teacher as guide",
  "Independent learning",
  "Innovation framing",
  "Adopter analysis",
  "Communication channels",
  "Assumptions",
  "Uncertainty",
];

const ACTION_SECTIONS = new Set([
  "Priority Actions",
  "Pilot design",
  "Scaling roadmap",
  "Participatory action plan",
  "Procedure and accountability plan",
  "School-day learning plan",
  "Administrative model",
  "Implementation Steps",
  "Collective action",
  "Process design",
  "Concrete activity",
]);

const CANONICAL_TITLES = {
  "action plan": "Priority Actions",
  "priority actions": "Priority Actions",
  "problem diagnosis": "Problem Diagnosis",
  "theory-based reasoning": "Theory-Based Reasoning",
  "implementation steps": "Implementation Steps",
  "risks and limitations": "Risks and Limitations",
  "success indicators": "Success Indicators",
  "final recommendation": "Final Recommendation",
};

const SECTION_TITLE_SET = new Set(SECTION_TITLES.map((t) => t.toLowerCase()));

const SECTION_PATTERN = new RegExp(
  `^\\s*(?:#{1,6}\\s*)?(?:\\d+\\.\\s*)?(?:\\*\\*)?(${SECTION_TITLES.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?:\\*\\*)?\\s*:?\\s*$`,
  "gim"
);

const BULLET_SECTION_PATTERN = new RegExp(
  `^-\\s+(${SECTION_TITLES.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\s*$`,
  "gim"
);

export function cleanAgentText(text) {
  if (!text) return "";
  return text
    .replace(/\r\n/g, "\n")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/^---+$/gm, "")
    .replace(/^\|.+\|$/gm, "")
    .replace(/^\s*[-•]\s*\|/gm, "- ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function canonicalTitle(title) {
  return CANONICAL_TITLES[title.toLowerCase()] || title;
}

function isSectionTitle(text) {
  return SECTION_TITLE_SET.has(canonicalTitle(text).toLowerCase());
}

function parseActionBlock(text) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const block = { action: "", owner: "", timeline: "", measure: "" };
  let hasField = false;

  for (const line of lines) {
    const normalized = line.replace(/^[-•*]\s+/, "");
    const match = normalized.match(/^(Action|Owner|Timeline|Measure)\s*:\s*(.+)$/i);
    if (match) {
      const key = match[1].toLowerCase();
      block[key] = match[2].trim();
      hasField = true;
    }
  }

  return hasField ? block : null;
}

function leftoverBullets(chunk) {
  const items = [];
  for (const line of chunk.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^(Action|Owner|Timeline|Measure)\s*:/i.test(trimmed.replace(/^[-•*]\s+/, ""))) continue;
    const text = trimmed.replace(/^[-•*]\s+/, "").replace(/^\d+\.\s+/, "").trim();
    if (!text || isSectionTitle(text)) continue;
    items.push({ type: "bullet", text });
  }
  return items;
}

function extractActionItems(body) {
  const normalized = body.replace(/^-\s*(Action\s*:)/gim, "$1");
  const chunks = normalized.split(/\n(?=Action\s*:)/i).map((c) => c.trim()).filter(Boolean);
  const items = [];

  for (const chunk of chunks) {
    const actionBlock = parseActionBlock(chunk);
    if (actionBlock) {
      items.push({ type: "action", ...actionBlock });
      items.push(...leftoverBullets(chunk));
    }
  }

  return items;
}

function extractBullets(block, sectionTitle) {
  if (ACTION_SECTIONS.has(sectionTitle)) {
    const actionItems = extractActionItems(block);
    if (actionItems.length > 0) {
      return actionItems.slice(0, 8);
    }
  }

  const items = [];
  const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    const bullet = line.replace(/^[-•*]\s+/, "").replace(/^\d+\.\s+/, "").trim();
    if (!bullet) continue;
    if (isSectionTitle(bullet)) continue;

    const inlineAction = parseActionBlock(bullet);
    if (inlineAction && ACTION_SECTIONS.has(sectionTitle)) {
      items.push({ type: "action", ...inlineAction });
    } else {
      const multilineAction = parseActionBlock(line);
      if (multilineAction && /^Action\s*:/i.test(bullet)) {
        items.push({ type: "action", ...multilineAction });
      } else {
        items.push({ type: "bullet", text: bullet });
      }
    }
  }

  if (items.length === 0 && block.trim()) {
    return [{ type: "bullet", text: block.trim() }];
  }

  return items.slice(0, ACTION_SECTIONS.has(sectionTitle) ? 8 : 6);
}

function splitByMatches(cleaned, matches) {
  const sections = [];
  for (let i = 0; i < matches.length; i += 1) {
    const title = canonicalTitle(matches[i][1]);
    const start = matches[i].index + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : cleaned.length;
    const body = cleaned.slice(start, end).trim();
    const bullets = extractBullets(body, title);
    const existing = sections.find((s) => s.title === title);
    if (existing) {
      existing.bullets.push(...bullets);
    } else {
      sections.push({ title, bullets });
    }
  }
  return sections;
}

function dedupeMatches(matches) {
  const sorted = [...matches].sort((a, b) => a.index - b.index);
  const result = [];
  for (const match of sorted) {
    const last = result[result.length - 1];
    if (!last || match.index >= last.index + last[0].length) {
      result.push(match);
    }
  }
  return result;
}

export function parseAgentResponse(text) {
  const cleaned = cleanAgentText(text);
  if (!cleaned) return { sections: [], fallback: "" };

  const lineMatches = [...cleaned.matchAll(SECTION_PATTERN)];
  const bulletMatches = [...cleaned.matchAll(BULLET_SECTION_PATTERN)];
  const allMatches = dedupeMatches([...lineMatches, ...bulletMatches]);

  if (allMatches.length === 0) {
    return { sections: [], fallback: cleaned };
  }

  return { sections: splitByMatches(cleaned, allMatches), fallback: "" };
}

export function getSectionBullets(sections, title) {
  const section = sections.find((s) => s.title === title);
  if (!section) return [];
  return section.bullets.map((b) => (b.type === "action" ? b.action : b.text)).filter(Boolean);
}

export function firstTextBullet(sections, title) {
  const section = sections.find((s) => s.title === title);
  if (!section) return "";
  const bullet = section.bullets.find((b) => b.type === "bullet" && b.text);
  return bullet?.text || "";
}

export function firstActionBlock(sections) {
  for (const section of sections) {
    const action = section.bullets.find((b) => b.type === "action");
    if (action) return action;
  }
  const legacy = sections.find((s) => s.title === "Priority Actions");
  return legacy?.bullets.find((b) => b.type === "action") || null;
}

export { SECTION_TITLES, ACTION_SECTIONS };
