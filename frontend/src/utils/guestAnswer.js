/**
 * Normalize guest free-text for display / brief storage.
 * Preserves line breaks so numbered lists and bullets stay readable.
 */
export function normalizeGuestAnswer(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** True when an answer is long enough that collapse UI may help (optional). */
export function isLongGuestAnswer(text, threshold = 480) {
  return normalizeGuestAnswer(text).length > threshold;
}

const NUMBERED = /^\s*(\d+)[.)]\s+(.+)$/;
const BULLET = /^\s*[-*•]\s+(.+)$/;

/**
 * Parse guest free-text into typed blocks for polished UI rendering.
 * @returns {{ type: 'heading'|'bullet'|'para'|'gap', text?: string, n?: string }[]}
 */
export function parseGuestAnswerBlocks(text) {
  const lines = normalizeGuestAnswer(text).split("\n");
  const blocks = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (blocks.length && blocks[blocks.length - 1].type !== "gap") {
        blocks.push({ type: "gap" });
      }
      continue;
    }
    const numbered = trimmed.match(NUMBERED);
    if (numbered) {
      blocks.push({ type: "heading", n: numbered[1], text: numbered[2].trim() });
      continue;
    }
    const bullet = trimmed.match(BULLET);
    if (bullet) {
      blocks.push({ type: "bullet", text: bullet[1].trim() });
      continue;
    }
    blocks.push({ type: "para", text: trimmed });
  }
  while (blocks.length && blocks[blocks.length - 1].type === "gap") blocks.pop();
  return blocks;
}
