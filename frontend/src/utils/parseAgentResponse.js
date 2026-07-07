const SECTION_TITLES = [
  "Problem Diagnosis",
  "Theory-Based Reasoning",
  "Priority Actions",
  "Action Plan",
  "Implementation Steps",
  "Risks and Limitations",
  "Success Indicators",
  "Final Recommendation",
];

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

const SECTION_PATTERN = new RegExp(
  `^\\s*(?:#{1,6}\\s*)?(?:\\d+\\.\\s*)?(?:\\*\\*)?(${SECTION_TITLES.join("|")})(?:\\*\\*)?\\s*:?\\s*$`,
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

function parseActionBlock(text) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const block = { action: "", owner: "", timeline: "", measure: "" };
  let hasField = false;

  for (const line of lines) {
    const match = line.match(/^(Action|Owner|Timeline|Measure)\s*:\s*(.+)$/i);
    if (match) {
      const key = match[1].toLowerCase();
      block[key] = match[2].trim();
      hasField = true;
    }
  }

  return hasField ? block : null;
}

function extractBullets(block, sectionTitle) {
  const items = [];

  if (sectionTitle === "Priority Actions") {
    const chunks = block.split(/\n(?=Action\s*:)/i).map((c) => c.trim()).filter(Boolean);
    for (const chunk of chunks) {
      const actionBlock = parseActionBlock(chunk);
      if (actionBlock) {
        items.push({ type: "action", ...actionBlock });
      }
    }
    if (items.length > 0) {
      return items.slice(0, 4);
    }
  }

  const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const bullet = line.replace(/^[-•*]\s+/, "").replace(/^\d+\.\s+/, "").trim();
    if (!bullet) continue;
    if (SECTION_TITLES.some((t) => bullet.toLowerCase() === t.toLowerCase())) continue;
    const actionBlock = parseActionBlock(bullet);
    if (actionBlock && sectionTitle === "Priority Actions") {
      items.push({ type: "action", ...actionBlock });
    } else {
      items.push({ type: "bullet", text: bullet });
    }
  }

  if (items.length === 0 && block.trim()) {
    return [{ type: "bullet", text: block.trim() }];
  }

  return items.slice(0, sectionTitle === "Priority Actions" ? 4 : 5);
}

export function parseAgentResponse(text) {
  const cleaned = cleanAgentText(text);
  if (!cleaned) return { sections: [], fallback: "" };

  const matches = [...cleaned.matchAll(SECTION_PATTERN)];
  if (matches.length === 0) {
    return { sections: [], fallback: cleaned };
  }

  const sections = [];
  for (let i = 0; i < matches.length; i += 1) {
    const title = canonicalTitle(matches[i][1]);
    const start = matches[i].index + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : cleaned.length;
    const body = cleaned.slice(start, end).trim();
    const existing = sections.find((s) => s.title === title);
    const bullets = extractBullets(body, title);
    if (existing) {
      existing.bullets.push(...bullets);
    } else {
      sections.push({ title, bullets });
    }
  }

  return { sections, fallback: "" };
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
  const section = sections.find((s) => s.title === "Priority Actions");
  if (!section) return null;
  return section.bullets.find((b) => b.type === "action") || null;
}
