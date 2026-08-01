/**
 * Silent clarity polish for decision briefs.
 * Runs behind the scenes so exports stay clean without a user-facing score panel.
 */

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function textKey(text) {
  return normalize(text).slice(0, 56);
}

function isNearDuplicate(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.length > 24 && nb.length > 24 && (na.includes(nb) || nb.includes(na))) return true;
  const ka = textKey(a);
  const kb = textKey(b);
  return ka.length > 20 && kb.length > 20 && (ka === kb || ka.startsWith(kb) || kb.startsWith(ka));
}

const JUNK_RE =
  /\b(lorem ipsum|asdf|test test|xxx|placeholder|add your notes here|todo:)\b/i;

/**
 * Claim unique strings across the document (first occurrence wins).
 */
export function createTextClaimer() {
  const claimed = [];
  return {
    tryClaim(text) {
      const cleaned = String(text || "")
        .replace(/\s+/g, " ")
        .trim();
      if (!cleaned || cleaned === "—") return null;
      if (JUNK_RE.test(cleaned)) return null;
      if (claimed.some((c) => isNearDuplicate(c, cleaned))) return null;
      claimed.push(cleaned);
      return cleaned;
    },
    has(text) {
      return claimed.some((c) => isNearDuplicate(c, text));
    },
  };
}

/**
 * Auto-heal a brief so clarity checks pass (no UI required).
 */
export function polishBriefForClarity(brief, defaults = {}) {
  if (!brief) return brief;
  const claim = createTextClaimer();

  const preparedFor =
    String(brief.cover?.preparedFor || "").trim() ||
    defaults.preparedFor ||
    "Programme decision owners";

  const sections = [];
  for (const section of brief.sections || []) {
    const preserveGuests = section.type === "guests" || section.id === "guests";
    const blocks = [];
    for (const block of section.blocks || []) {
      if (block.type === "bullets") {
        if (preserveGuests) {
          const items = (block.items || []).map((item) => String(item || "").trim()).filter(Boolean);
          if (items.length) blocks.push({ ...block, items });
          continue;
        }
        const items = [];
        for (const item of block.items || []) {
          const kept = claim.tryClaim(item);
          if (kept) items.push(kept);
        }
        if (items.length) blocks.push({ ...block, items });
        continue;
      }
      if (block.type === "table") {
        const isGuestTable = block.id === "table_guests";
        const rows = (block.rows || []).map((row) =>
          row.map((cell, idx) => {
            // Keep theorist / guest name labels even if repeated across tables
            if (idx === 0 || isGuestTable) return String(cell || "—").trim() || "—";
            const raw = String(cell || "").trim();
            if (!raw || raw === "—") return "—";
            if (JUNK_RE.test(raw)) return "—";
            if (claim.has(raw)) return "—";
            claim.tryClaim(raw);
            return raw;
          })
        );
        blocks.push({ ...block, rows });
        continue;
      }
      if (block.type === "paragraph" || block.type === "lead" || block.type === "heading" || block.type === "kicker") {
        const text = String(block.text || "").trim();
        if (!text) continue;
        if (block.type === "heading" || block.type === "kicker") {
          blocks.push(block);
          continue;
        }
        // Boilerplate leads are allowed once; skip junk
        if (JUNK_RE.test(text)) continue;
        if (block.type === "lead") {
          const kept = claim.tryClaim(text);
          if (kept) blocks.push({ ...block, text: kept });
          continue;
        }
        blocks.push(block);
        continue;
      }
      if (block.type === "figure") {
        blocks.push(block);
        continue;
      }
      blocks.push(block);
    }
    if (blocks.length) sections.push({ ...section, blocks });
  }

  return {
    ...brief,
    sections,
    cover: {
      ...(brief.cover || {}),
      preparedFor,
      preparedBy: brief.cover?.preparedBy || "PerspectiveLab",
      classification: brief.cover?.classification || "internal",
    },
  };
}

/**
 * Internal quality gate (not shown in UI). Returns score 0–100.
 */
export function assessBriefQuality(brief) {
  const issues = [];
  if (!brief) {
    return { ok: false, score: 0, issues: [{ severity: "error", key: "assessMissing" }] };
  }

  if (!String(brief.framing || "").trim() || String(brief.framing).trim().split(/\s+/).length < 8) {
    issues.push({ severity: "warn", key: "assessThinFraming" });
  }

  if (!brief.cover?.preparedFor?.trim()) {
    issues.push({ severity: "warn", key: "assessPreparedFor" });
  }

  const bySection = new Map();
  for (const section of brief.sections || []) {
    const texts = [];
    for (const block of section.blocks || []) {
      if (block.text && (block.type === "lead" || block.type === "paragraph" || block.type === "bullets")) {
        // ignore
      }
      if (block.items) texts.push(...block.items.filter((x) => String(x).trim().length > 40));
      if (block.type === "table") {
        for (const row of block.rows || []) {
          for (let i = 1; i < row.length; i += 1) {
            if (String(row[i] || "").trim().length > 40) texts.push(row[i]);
          }
        }
      }
      if (block.type === "lead" && block.text) texts.push(block.text);
      if (JUNK_RE.test(block.text || "") || (block.items || []).some((i) => JUNK_RE.test(i))) {
        issues.push({ severity: "error", key: "assessJunk", params: { where: section.title } });
      }
    }
    bySection.set(section.id || section.title, texts);
  }

  const sectionEntries = [...bySection.entries()];
  let repeats = 0;
  for (let i = 0; i < sectionEntries.length; i += 1) {
    for (let j = i + 1; j < sectionEntries.length; j += 1) {
      const [idA, textsA] = sectionEntries[i];
      const [idB, textsB] = sectionEntries[j];
      for (const a of textsA) {
        for (const b of textsB) {
          if (isNearDuplicate(a, b)) {
            issues.push({
              severity: "warn",
              key: "assessRepeat",
              params: { a: idA, b: idB },
            });
            repeats += 1;
            if (repeats >= 4) break;
          }
        }
        if (repeats >= 4) break;
      }
      if (repeats >= 4) break;
    }
    if (repeats >= 4) break;
  }

  const hasTable = (brief.sections || []).some((s) =>
    (s.blocks || []).some((b) => b.type === "table")
  );
  if (!hasTable) {
    issues.push({ severity: "warn", key: "assessNoTable" });
  }

  const errors = issues.filter((i) => i.severity === "error").length;
  const warns = issues.filter((i) => i.severity === "warn").length;
  const score = Math.max(0, 100 - errors * 25 - warns * 8);
  return {
    ok: errors === 0 && warns === 0,
    score,
    issues: issues.slice(0, 12),
  };
}

export function formatAssessIssue(issue, t) {
  const p = issue.params || {};
  const map = {
    assessMissing: () => t("stage4.assessMissing"),
    assessThinFraming: () => t("stage4.assessThinFraming"),
    assessPreparedFor: () => t("stage4.assessPreparedFor"),
    assessJunk: () => t("stage4.assessJunk").replace("{where}", p.where || ""),
    assessRepeat: () =>
      t("stage4.assessRepeat").replace("{a}", p.a || "").replace("{b}", p.b || ""),
    assessNoTable: () => t("stage4.assessNoTable"),
    assessEmptySection: () => t("stage4.assessEmptySection").replace("{title}", p.title || ""),
  };
  return (map[issue.key] || (() => issue.key))();
}
