import { parseAgentResponse } from "@/utils/parseAgentResponse";

/** Shared Full-analysis shape across all theory agents. */
const BLOCKS = [
  {
    id: "diagnosis",
    titles: new Set([
      "Lived experience",
      "Naming the problem",
      "Critical question",
      "Problem Diagnosis",
      "Observation",
      "Environment diagnosis",
      "Authority map",
      "Authority and rule gaps",
      "Innovation framing",
      "Adopter analysis",
      "Adoption barriers and enablers",
    ]),
  },
  {
    id: "actions",
    titles: new Set([
      "Collective action",
      "Priority Actions",
      "Participatory action plan",
      "Administrative model",
      "Procedure and accountability plan",
      "School-day learning plan",
      "Autonomy and activity redesign",
      "Pilot design",
      "Scaling roadmap",
      "Process design",
      "Concrete activity",
      "Documentation",
      "Accountability",
      "Responsibility",
      "Prepared environment",
      "Learner choice",
      "Teacher as guide",
      "Independent learning",
      "Communication channels",
      "Implementation Steps",
      "Action Plan",
      "Final Recommendation",
      "Success Indicators",
    ]),
  },
  {
    id: "why",
    titles: new Set(["Theory link", "Theory-Based Reasoning", "Reflection", "Legitimacy"]),
  },
  {
    id: "limits",
    titles: new Set(["Assumptions", "Uncertainty", "Risks and Limitations"]),
  },
];

const DEFAULT_LABELS = {
  diagnosis: "What's going on",
  actions: "What to do",
  why: "Why this lens",
  limits: "Limits",
};

function bulletKey(bullet) {
  if (bullet.type === "action") {
    return `a:${bullet.action || ""}|${bullet.owner || ""}|${bullet.timeline || ""}`;
  }
  return `b:${bullet.text || ""}`;
}

/**
 * Remap theory-native sections into four readable blocks for Full analysis.
 * @param {string} text
 * @param {Partial<typeof DEFAULT_LABELS>} [labels]
 * @returns {{ sections: Array<{ title: string, bullets: array }>, fallback: string }}
 */
export function buildReadableAnalysis(text, labels = {}) {
  const resolved = { ...DEFAULT_LABELS, ...labels };
  const { sections, fallback } = parseAgentResponse(text);

  if (!sections.length) {
    if (!fallback) return { sections: [], fallback: "" };
    return {
      sections: [
        {
          title: resolved.diagnosis,
          bullets: [{ type: "bullet", text: fallback }],
        },
      ],
      fallback: "",
    };
  }

  const used = new Set();
  const out = [];

  for (const block of BLOCKS) {
    const bullets = [];
    const seen = new Set();

    for (const section of sections) {
      if (!block.titles.has(section.title)) continue;
      used.add(section.title);
      for (const bullet of section.bullets || []) {
        const key = bulletKey(bullet);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        bullets.push(bullet);
      }
    }

    // Cap length so Full analysis stays scannable
    const capped = bullets.slice(0, block.id === "actions" ? 8 : 6);
    if (capped.length > 0) {
      out.push({ title: resolved[block.id], bullets: capped });
    }
  }

  // Any unmatched theory sections → append under diagnosis (rare custom titles)
  const leftovers = [];
  const leftoverSeen = new Set();
  for (const section of sections) {
    if (used.has(section.title)) continue;
    for (const bullet of section.bullets || []) {
      const key = bulletKey(bullet);
      if (!key || leftoverSeen.has(key)) continue;
      leftoverSeen.add(key);
      leftovers.push(bullet);
    }
  }
  if (leftovers.length > 0) {
    const diagnosis = out.find((s) => s.title === resolved.diagnosis);
    if (diagnosis) {
      diagnosis.bullets = [...diagnosis.bullets, ...leftovers].slice(0, 8);
    } else {
      out.unshift({ title: resolved.diagnosis, bullets: leftovers.slice(0, 6) });
    }
  }

  return { sections: out, fallback: "" };
}
