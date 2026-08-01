/**
 * Native A4 PDF builder for decision briefs (text + tables, not HTML screenshots).
 */
import {
  ensureBriefMeta,
  formatCoverDate,
  prepareBriefForExport,
  syncBriefToFraming,
} from "@/utils/decisionBrief";

const MARGIN = 22;
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - MARGIN * 2;
const HEADER_Y = 14;
const FOOTER_Y = PAGE_H - 14;
const BODY_TOP = 26;
const BODY_BOTTOM = PAGE_H - 26;

/** jsPDF Helvetica is WinAnsi — strip characters that break layout. */
function pdfSafe(text) {
  return String(text ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014\u2015]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[\u2022\u2023\u25E6\u2043]/g, "-")
    .replace(/[\u00B7\u2219]/g, "-")
    .replace(/\u2192/g, "->")
    .replace(/\u2190/g, "<-")
    .replace(/\u00D7/g, "x")
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function shortTitle(title, max = 52) {
  const s = pdfSafe(title).replace(/\s+/g, " ");
  if (s.length <= max) return s;
  const slice = s.slice(0, max);
  const cut = slice.lastIndexOf(" ");
  return `${(cut > 20 ? slice.slice(0, cut) : slice).trim()}...`;
}

function applyHeaderFooter(doc, { headerTitle, classLabel, longDate, pageLabel }) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 2; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(90);
    doc.text("PerspectiveLab", MARGIN, HEADER_Y);
    doc.text(shortTitle(headerTitle), PAGE_W - MARGIN, HEADER_Y, { align: "right" });
    doc.setDrawColor(180);
    doc.setLineWidth(0.25);
    doc.line(MARGIN, HEADER_Y + 2.5, PAGE_W - MARGIN, HEADER_Y + 2.5);

    doc.line(MARGIN, FOOTER_Y - 3.5, PAGE_W - MARGIN, FOOTER_Y - 3.5);
    doc.text(pdfSafe(classLabel || ""), MARGIN, FOOTER_Y);
    doc.text(`${pdfSafe(pageLabel)} ${i - 1}`, PAGE_W / 2, FOOTER_Y, { align: "center" });
    doc.text(pdfSafe(longDate || ""), PAGE_W - MARGIN, FOOTER_Y, { align: "right" });
    doc.setTextColor(0);
  }
}

function ensureSpace(doc, y, need = 16) {
  if (y + need <= BODY_BOTTOM) return y;
  doc.addPage();
  return BODY_TOP;
}

function lineHeight(sizePt) {
  return sizePt * 0.38;
}

function writeCentered(doc, text, y, { size = 11, style = "normal", maxWidth = CONTENT_W } = {}) {
  const clean = pdfSafe(text);
  if (!clean) return y;
  doc.setFont("helvetica", style);
  doc.setFontSize(size);
  const lines = doc.splitTextToSize(clean, maxWidth);
  const lh = lineHeight(size);
  doc.text(lines, PAGE_W / 2, y, { align: "center" });
  return y + lines.length * lh + 2;
}

function writeParagraph(doc, text, y, { size = 10.5, style = "normal", indent = 0 } = {}) {
  const clean = pdfSafe(text);
  if (!clean) return y;
  doc.setFont("helvetica", style);
  doc.setFontSize(size);
  const width = CONTENT_W - indent;
  const lines = doc.splitTextToSize(clean, width);
  const lh = lineHeight(size);
  for (const line of lines) {
    y = ensureSpace(doc, y, lh + 1);
    doc.text(line, MARGIN + indent, y);
    y += lh;
  }
  return y + 4;
}

function writeHeading(doc, text, y, size = 13) {
  y = ensureSpace(doc, y, 18);
  const clean = pdfSafe(text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(size);
  doc.setTextColor(25);
  const lines = doc.splitTextToSize(clean, CONTENT_W);
  const lh = lineHeight(size);
  doc.text(lines, MARGIN, y);
  y += lines.length * lh + 1.5;
  doc.setDrawColor(170);
  doc.setLineWidth(0.35);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  doc.setTextColor(0);
  return y + 6;
}

function writeSubheading(doc, text, y) {
  y = ensureSpace(doc, y, 12);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(35);
  const lines = doc.splitTextToSize(pdfSafe(text), CONTENT_W);
  doc.text(lines, MARGIN, y);
  doc.setTextColor(0);
  return y + lines.length * lineHeight(11) + 4;
}

function writeBullets(doc, items, y) {
  const clean = (items || []).map((x) => pdfSafe(x)).filter(Boolean);
  for (const item of clean) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    const lines = doc.splitTextToSize(item, CONTENT_W - 8);
    const lh = lineHeight(10.5);
    const blockH = lines.length * lh + 2;
    y = ensureSpace(doc, y, Math.min(blockH, 24));
    doc.text("-", MARGIN, y);
    doc.text(lines, MARGIN + 5, y);
    y += lines.length * lh + 3;
  }
  return y + 2;
}

function writeTocLine(doc, index, title, y) {
  y = ensureSpace(doc, y, 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(30);
  const label = `${index}.  ${pdfSafe(title)}`;
  doc.text(label, MARGIN, y);
  doc.setTextColor(0);
  return y + 7.5;
}

function writeTable(doc, autoTable, block, caption, y) {
  const headers = (block.headers || []).map((h) => pdfSafe(h) || " ");
  const rows = (block.rows || []).map((row) =>
    (row || []).map((cell) => {
      const s = pdfSafe(cell);
      return s || "-";
    }),
  );
  if (!headers.length && !rows.length) return y;

  const colCount = Math.max(headers.length, ...rows.map((r) => r.length), 1);
  const captionLines = caption ? doc.splitTextToSize(pdfSafe(caption), CONTENT_W) : [];
  const needBefore = 10 + captionLines.length * 4.5 + 14;
  y = ensureSpace(doc, y, Math.min(needBefore, 40));

  if (captionLines.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(40);
    doc.text(captionLines, MARGIN, y);
    doc.setTextColor(0);
    y += captionLines.length * 4.2 + 3;
  }

  const fontSize = colCount >= 5 ? 7.5 : colCount >= 4 ? 8 : 8.5;
  const isGuestTable = block.id === "table_guests";
  const columnStyles = isGuestTable
    ? {
        0: { cellWidth: CONTENT_W * 0.18 },
        1: { cellWidth: CONTENT_W * 0.22 },
        2: { cellWidth: CONTENT_W * 0.6 },
      }
    : Object.fromEntries(Array.from({ length: colCount }, (_, i) => [i, { cellWidth: "auto" }]));

  autoTable(doc, {
    startY: y,
    head: headers.length ? [headers] : undefined,
    body: rows,
    margin: { left: MARGIN, right: MARGIN, top: BODY_TOP, bottom: 28 },
    tableWidth: CONTENT_W,
    styles: {
      font: "helvetica",
      fontSize,
      cellPadding: { top: 2, right: 2.2, bottom: 2, left: 2.2 },
      valign: "top",
      overflow: "linebreak",
      cellWidth: "wrap",
      textColor: [25, 25, 25],
      lineColor: [160, 160, 160],
      lineWidth: 0.2,
      minCellHeight: 6,
    },
    headStyles: {
      fillColor: [236, 236, 236],
      textColor: [15, 15, 15],
      fontStyle: "bold",
      fontSize: fontSize + 0.3,
    },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    columnStyles,
  });

  return (doc.lastAutoTable?.finalY || y) + 10;
}

function drawCoverPage(doc, meta, labels, longDate, classLabel) {
  const cover = meta.cover || {};
  const title = pdfSafe(meta.title || labels.docTitle || "Decision brief").toUpperCase();
  let y = 52;

  y = writeCentered(doc, title, y, { size: 15, style: "bold", maxWidth: CONTENT_W - 8 });
  y += 20;

  y = writeCentered(doc, labels.preparedFor || "Prepared for", y, { size: 10 });
  y += 1;
  y = writeCentered(doc, cover.preparedFor || "-", y, { size: 12, style: "bold" });
  if (cover.preparedForTitle) y = writeCentered(doc, cover.preparedForTitle, y, { size: 10.5 });
  if (cover.preparedForOrg) y = writeCentered(doc, cover.preparedForOrg, y, { size: 10.5 });
  y += 12;

  y = writeCentered(doc, labels.by || "By", y, { size: 10 });
  y += 1;
  y = writeCentered(doc, cover.preparedBy || "PerspectiveLab", y, { size: 12, style: "bold" });
  if (cover.preparedByTitle) y = writeCentered(doc, cover.preparedByTitle, y, { size: 10.5 });
  if (cover.preparedByOrg) y = writeCentered(doc, cover.preparedByOrg, y, { size: 10.5 });
  y += 14;

  y = writeCentered(doc, longDate, y, { size: 11 });
  y += 22;

  doc.setDrawColor(180);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(pdfSafe(labels.abstract || "Abstract"), MARGIN, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  const abstract =
    pdfSafe(cover.abstract) ||
    pdfSafe(labels.abstractDefault) ||
    "This decision brief synthesises four theory-driven agent perspectives.";
  const absLines = doc.splitTextToSize(abstract, CONTENT_W);
  const lh = lineHeight(10.5);
  for (const line of absLines) {
    if (y > PAGE_H - 40) break;
    doc.text(line, MARGIN, y);
    y += lh;
  }
  y += 16;

  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(pdfSafe(classLabel || "").toUpperCase(), PAGE_W / 2, Math.max(y, PAGE_H - 28), {
    align: "center",
  });
  doc.setTextColor(0);
}

/**
 * Build and download a properly paginated A4 PDF for the decision brief.
 */
export async function downloadBriefPdf(brief, options = {}) {
  const [{ jsPDF }, autoTableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableMod.default || autoTableMod;

  const labels = options.labels || {};
  const locale = options.locale || "en-US";
  let meta = prepareBriefForExport(brief);
  meta = syncBriefToFraming(ensureBriefMeta(meta, labels), labels);

  const cover = meta.cover || {};
  const classLabel = labels[`class_${cover.classification}`] || cover.classification || "internal";
  const longDate = formatCoverDate(cover.date, locale);
  const pageLabel = labels.page || "Page";
  const reportTitle = pdfSafe(meta.title || labels.docTitle || "Decision brief");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });

  drawCoverPage(doc, meta, labels, longDate, classLabel);

  doc.addPage();
  let y = BODY_TOP;
  y = writeHeading(doc, labels.toc || "Contents", y, 14);
  const tocItems = [
    labels.framing || "Problem framing",
    ...(meta.sections || []).map((s) => s.title),
  ];
  tocItems.forEach((title, i) => {
    y = writeTocLine(doc, i + 1, title, y);
  });

  doc.addPage();
  y = BODY_TOP;
  y = writeHeading(doc, labels.tot || "List of tables", y, 14);
  if (meta.tables?.length) {
    meta.tables.forEach((tb) => {
      y = writeTocLine(doc, tb.number, tb.title, y);
    });
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(110);
    doc.text(pdfSafe(labels.none || "None"), MARGIN, y);
    doc.setTextColor(0);
  }

  doc.addPage();
  y = BODY_TOP;
  y = writeHeading(doc, labels.framing || "Problem framing", y, 13);
  y = writeParagraph(doc, meta.framing || "-", y);

  for (const section of meta.sections || []) {
    y = ensureSpace(doc, y, 22);
    y = writeHeading(doc, section.title || "Section", y, 13);

    for (const block of section.blocks || []) {
      if (block.type === "kicker" && block.text) {
        y = ensureSpace(doc, y, 8);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(pdfSafe(block.text).toUpperCase(), MARGIN, y);
        doc.setTextColor(0);
        y += 5;
      } else if (block.type === "lead" && block.text) {
        y = writeParagraph(doc, block.text, y, { style: "bold", size: 11 });
      } else if (block.type === "heading" && block.text) {
        y = writeSubheading(doc, block.text, y);
      } else if (block.type === "paragraph" && block.text) {
        y = writeParagraph(doc, block.text, y);
      } else if (block.type === "bullets" && block.items?.length) {
        y = writeBullets(doc, block.items, y);
      } else if (block.type === "table") {
        const tMeta = meta.tables?.find((tb) => tb.blockId === block.id || tb.title === block.caption);
        const caption = tMeta
          ? `Table ${tMeta.number}. ${block.caption || section.title}`
          : block.caption || section.title;
        y = writeTable(doc, autoTable, block, caption, y);
      }
    }
  }

  applyHeaderFooter(doc, {
    headerTitle: reportTitle,
    classLabel,
    longDate,
    pageLabel,
  });

  doc.save(`decision-brief-session-${meta.sessionId || brief.sessionId || "draft"}.pdf`);
  return true;
}
