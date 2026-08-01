import {
  ChevronDown,
  ChevronUp,
  FileDown,
  FilePlus2,
  Pencil,
  Printer,
  RotateCcw,
  Table2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CLASSIFICATION_IDS,
  createCustomSection,
  createTableSection,
  ensureBriefMeta,
  moveSection,
  rebuildBriefCatalog,
  syncBriefToFraming,
} from "@/utils/decisionBrief";


function DataTableView({ block, numberLabel }) {
  const isGuest = block.id === "table_guests";
  return (
    <div className="overflow-x-auto">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {numberLabel}
        {block.caption ? ` ${block.caption}` : ""}
      </p>
      <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
        <colgroup>
          {isGuest ? (
            <>
              <col style={{ width: "18%" }} />
              <col style={{ width: "22%" }} />
              <col style={{ width: "60%" }} />
            </>
          ) : null}
        </colgroup>
        <thead>
          <tr>
            {(block.headers || []).map((h) => (
              <th
                key={h}
                className="border border-white/10 bg-slate-900/80 px-3 py-2 font-semibold text-slate-200"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(block.rows || []).map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={cn(
                    "border border-white/10 px-3 py-2 align-top text-slate-300",
                    isGuest && ci >= 2 && "whitespace-pre-wrap leading-relaxed"
                  )}
                >
                  {cell || "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BlockView({ block, tableLabel }) {
  if (block.type === "kicker" && block.text) {
    return (
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {block.text}
      </p>
    );
  }
  if (block.type === "lead" && block.text) {
    return (
      <p className="font-display text-[1.05rem] font-medium leading-snug text-slate-100">
        {block.text}
      </p>
    );
  }
  if (block.type === "heading" && block.text) {
    return (
      <h4 className="pt-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-slate-400">
        {block.text}
      </h4>
    );
  }
  if (block.type === "paragraph" && block.text) {
    return <p className="text-[15px] leading-[1.7] text-slate-300">{block.text}</p>;
  }
  if (block.type === "bullets" && block.items?.length) {
    return (
      <ul className="my-1 list-disc space-y-2 pl-5 marker:text-slate-500">
        {block.items
          .filter((item) => String(item).trim())
          .map((item, i) => (
            <li key={`${i}-${String(item).slice(0, 24)}`} className="pl-1 text-[15px] leading-[1.65] text-slate-300">
              {item}
            </li>
          ))}
      </ul>
    );
  }
  if (block.type === "table") {
    return <DataTableView block={block} numberLabel={tableLabel} />;
  }
  return null;
}

function tableToTsv(block) {
  const lines = [(block.headers || []).join("\t")];
  for (const row of block.rows || []) lines.push(row.join("\t"));
  return lines.join("\n");
}

function tsvToTable(text, prev) {
  const lines = String(text)
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l, i, arr) => l.length || i < arr.length - 1);
  if (!lines.length) {
    return { ...prev, headers: ["A"], rows: [[""]] };
  }
  const headers = lines[0].split("\t");
  const rows = lines.slice(1).map((line) => {
    const cells = line.split("\t");
    while (cells.length < headers.length) cells.push("");
    return cells.slice(0, headers.length);
  });
  return { ...prev, headers, rows: rows.length ? rows : [headers.map(() => "")] };
}

function BlockEditor({ block, onChange }) {
  const field =
    "w-full resize-y rounded-lg border border-white/15 bg-slate-950/60 px-3 py-2 text-[15px] text-slate-100 shadow-sm placeholder:text-slate-500 focus:border-orange-400/40 focus:outline-none focus:ring-1 focus:ring-orange-400/30";

  if (block.type === "kicker" || block.type === "lead" || block.type === "heading" || block.type === "paragraph") {
    return (
      <textarea
        value={block.text || ""}
        onChange={(e) => onChange({ ...block, text: e.target.value })}
        rows={block.type === "lead" ? 3 : block.type === "heading" || block.type === "kicker" ? 1 : 2}
        className={field}
      />
    );
  }
  if (block.type === "bullets") {
    return (
      <textarea
        value={(block.items || []).join("\n")}
        onChange={(e) =>
          onChange({
            ...block,
            items: e.target.value.split("\n"),
          })
        }
        rows={Math.min(12, Math.max(4, (block.items || []).length + 1))}
        className={cn(field, "font-sans")}
        placeholder="One bullet per line"
      />
    );
  }
  if (block.type === "table") {
    return (
      <div className="space-y-2">
        <input
          value={block.caption || ""}
          onChange={(e) => onChange({ ...block, caption: e.target.value })}
          className={field}
          placeholder="Table caption"
        />
        <textarea
          value={tableToTsv(block)}
          onChange={(e) => onChange(tsvToTable(e.target.value, block))}
          rows={Math.min(14, Math.max(5, (block.rows || []).length + 2))}
          className={cn(field, "font-mono text-xs")}
          placeholder={"Header1\tHeader2\nCell\tCell"}
        />
        <p className="text-[11px] text-slate-500">Tab-separated: first row = headers, then data rows.</p>
      </div>
    );
  }
  return null;
}

function classificationLabel(id, t) {
  return t(`stage4.class_${id}`) || id;
}

function SheetFooter({ classification, date, pageLabel }) {
  return (
    <footer className="brief-sheet-footer">
      <span>{classification}</span>
      <span>{pageLabel}</span>
      <span>{date}</span>
    </footer>
  );
}

function TocRow({ index, title, href, page }) {
  return (
    <li className="brief-toc-row">
      <span className="brief-toc-num">{index}.</span>
      <a href={href} className="brief-toc-title">
        {title}
      </a>
      <span className="brief-toc-dots" aria-hidden="true" />
      <span className="brief-toc-page">{page}</span>
    </li>
  );
}

/**
 * Decision brief — dark system UI; white paper only in Word/PDF export.
 */
export function ReportBriefDocument({
  brief: rawBrief,
  editing,
  onChange,
  onAddSection,
  onReset,
  onExportWord,
  onExportPdf,
  onPrint,
  pdfBusy,
  t,
}) {
  const brief = ensureBriefMeta(rawBrief, {
    coverSubtitle: t("stage4.coverSubtitle"),
    coverFootnote: t("stage4.coverFootnote"),
    preparedForDefault: t("stage4.preparedForDefault"),
  });
  if (!brief) return null;

  const cover = brief.cover;
  const classLabel = classificationLabel(cover.classification, t);
  const toc = [
    { id: "framing", title: t("stage4.framingLabel"), page: 1 },
    ...(brief.sections || []).map((s, i) => ({ id: s.id, title: s.title, page: i + 2 })),
  ];

  const tableNumbers = new Map();
  for (const tb of brief.tables || []) {
    if (tb.blockId) tableNumbers.set(tb.blockId, tb.number);
  }

  function patchBrief(patch) {
    let merged = {
      ...brief,
      ...patch,
      source: "edited",
      updatedAt: new Date().toISOString(),
    };
    if (Object.prototype.hasOwnProperty.call(patch, "framing")) {
      merged = syncBriefToFraming(merged, {
        coverSubtitle: t("stage4.coverSubtitle"),
        coverFootnote: t("stage4.coverFootnote"),
        preparedForDefault: t("stage4.preparedForDefault"),
        executiveLeadTpl: t("stage4.executiveLeadTpl"),
        recommendationsLeadTpl: t("stage4.recommendationsLeadTpl"),
        comparisonLeadTpl: t("stage4.comparisonLeadTpl"),
        conclusionLeadTpl: t("stage4.conclusionLeadTpl"),
        conclusionCloseTpl: t("stage4.conclusionCloseTpl"),
        conclusionLensTpl: t("stage4.conclusionLensTpl"),
        abstractTail: t("stage4.abstractTail"),
      });
    }
    const catalog = rebuildBriefCatalog(merged);
    onChange({ ...merged, ...catalog });
  }

  function patchCover(patch) {
    patchBrief({ cover: { ...cover, ...patch } });
  }

  function updateSection(index, patch) {
    const sections = brief.sections.map((s, i) => (i === index ? { ...s, ...patch } : s));
    patchBrief({ sections });
  }

  function updateBlock(sectionIndex, blockIndex, nextBlock) {
    const section = brief.sections[sectionIndex];
    const blocks = section.blocks.map((b, i) => (i === blockIndex ? nextBlock : b));
    updateSection(sectionIndex, { blocks });
  }

  function removeSection(index) {
    patchBrief({ sections: brief.sections.filter((_, i) => i !== index) });
  }

  function shiftSection(index, direction) {
    patchBrief({ sections: moveSection(brief.sections, index, direction) });
  }

  const field =
    "rounded-lg border border-white/15 bg-slate-950/60 px-2.5 py-1.5 text-sm text-slate-100 focus:border-orange-400/40 focus:outline-none";

  return (
    <div className="brief-desk">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
        <p className="text-xs text-slate-400">
          {brief.source === "edited" ? t("stage4.briefEdited") : t("stage4.briefGenerated")}
          {brief.updatedAt ? ` · ${new Date(brief.updatedAt).toLocaleString()}` : ""}
          {" · "}
          {t("stage4.sheetHint")}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-white/20 bg-transparent text-white hover:bg-white/10"
            onClick={onExportWord}
          >
            {t("stage4.exportWord")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-white/20 bg-transparent text-white hover:bg-white/10"
            onClick={onExportPdf}
            disabled={pdfBusy}
          >
            <FileDown className="mr-1.5 h-3.5 w-3.5" />
            {pdfBusy ? t("stage4.exportPdfBusy") : t("stage4.exportPdf")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-white/20 bg-transparent text-white hover:bg-white/10"
            onClick={onPrint}
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            {t("stage4.exportPrint")}
          </Button>
        </div>
      </div>

      <div className="brief-stack mx-auto">
        {/* ========== COVER ========== */}
        <article className="brief-sheet brief-sheet-cover">
          <div className="brief-cover-formal">
            {editing ? (
              <div className="mb-4 flex justify-center">
                <select
                  value={cover.classification}
                  onChange={(e) => patchCover({ classification: e.target.value })}
                  className={field}
                >
                  {CLASSIFICATION_IDS.map((id) => (
                    <option key={id} value={id}>
                      {classificationLabel(id, t)}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {editing ? (
              <input
                value={brief.title}
                onChange={(e) => patchBrief({ title: e.target.value })}
                className="w-full border-b border-white/20 bg-transparent pb-2 text-center font-sans text-lg font-bold uppercase tracking-wide text-white focus:outline-none sm:text-xl"
              />
            ) : (
              <h1 className="text-center font-sans text-lg font-bold uppercase tracking-wide text-white sm:text-xl">
                {brief.title}
              </h1>
            )}

            <div className="mt-14 space-y-10 text-center text-sm text-slate-200">
              <div>
                <p className="text-slate-400">{t("stage4.preparedFor")}</p>
                {editing ? (
                  <div className="mx-auto mt-1 max-w-md space-y-2">
                    <input
                      value={cover.preparedFor || ""}
                      onChange={(e) => patchCover({ preparedFor: e.target.value })}
                      className={cn(field, "w-full text-center font-semibold")}
                      placeholder={t("stage4.preparedForPh")}
                    />
                    <input
                      value={cover.preparedForTitle || ""}
                      onChange={(e) => patchCover({ preparedForTitle: e.target.value })}
                      className={cn(field, "w-full text-center")}
                      placeholder={t("stage4.preparedForTitlePh")}
                    />
                    <input
                      value={cover.preparedForOrg || ""}
                      onChange={(e) => patchCover({ preparedForOrg: e.target.value })}
                      className={cn(field, "w-full text-center")}
                      placeholder={t("stage4.preparedForOrgPh")}
                    />
                  </div>
                ) : (
                  <>
                    <p className="mt-1 font-semibold text-white">{cover.preparedFor || "—"}</p>
                    {cover.preparedForTitle ? (
                      <p className="text-slate-300">{cover.preparedForTitle}</p>
                    ) : null}
                    {cover.preparedForOrg ? (
                      <p className="text-slate-300">{cover.preparedForOrg}</p>
                    ) : null}
                  </>
                )}
              </div>

              <div>
                <p className="text-slate-400">{t("stage4.by")}</p>
                {editing ? (
                  <div className="mx-auto mt-1 max-w-md space-y-2">
                    <input
                      value={cover.preparedBy || ""}
                      onChange={(e) => patchCover({ preparedBy: e.target.value })}
                      className={cn(field, "w-full text-center font-semibold")}
                    />
                    <input
                      value={cover.preparedByTitle || ""}
                      onChange={(e) => patchCover({ preparedByTitle: e.target.value })}
                      className={cn(field, "w-full text-center")}
                      placeholder={t("stage4.preparedByTitlePh")}
                    />
                    <input
                      value={cover.preparedByOrg || ""}
                      onChange={(e) => patchCover({ preparedByOrg: e.target.value })}
                      className={cn(field, "w-full text-center")}
                      placeholder={t("stage4.preparedByOrgPh")}
                    />
                  </div>
                ) : (
                  <>
                    <p className="mt-1 font-semibold text-white">{cover.preparedBy}</p>
                    {cover.preparedByTitle ? (
                      <p className="text-slate-300">{cover.preparedByTitle}</p>
                    ) : null}
                    {cover.preparedByOrg ? (
                      <p className="text-slate-300">{cover.preparedByOrg}</p>
                    ) : null}
                  </>
                )}
              </div>

              <div>
                {editing ? (
                  <input
                    type="date"
                    value={cover.date || ""}
                    onChange={(e) => patchCover({ date: e.target.value })}
                    className={cn(field, "mx-auto")}
                  />
                ) : (
                  <p className="text-slate-200">
                    {cover.date
                      ? new Date(`${cover.date}T12:00:00`).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "—"}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-16 text-left">
              <p className="font-semibold text-white">{t("stage4.abstract")}</p>
              {editing ? (
                <textarea
                  value={cover.abstract || ""}
                  onChange={(e) => patchCover({ abstract: e.target.value })}
                  rows={5}
                  className={cn(field, "mt-2 w-full")}
                  placeholder={t("stage4.abstractPh")}
                />
              ) : (
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  {cover.abstract || t("stage4.abstractDefault")}
                </p>
              )}
            </div>

            <p className="mt-10 text-center text-[10px] uppercase tracking-[0.14em] text-slate-500">
              {classLabel}
            </p>
          </div>
          <SheetFooter classification={classLabel} date={cover.date} pageLabel={t("stage4.pageCover")} />
        </article>

        {/* ========== CONTENTS ========== */}
        <article className="brief-sheet">
          <h2 className="font-display text-2xl font-semibold text-white">{t("stage4.toc")}</h2>
          <ul className="brief-toc mt-6">
            {toc.map((item, i) => (
              <TocRow
                key={item.id}
                index={i + 1}
                title={item.title}
                href={`#brief-${item.id}`}
                page={item.page}
              />
            ))}
          </ul>
          <SheetFooter classification={classLabel} date={cover.date} pageLabel={t("stage4.pageContents")} />
        </article>

        {/* ========== LIST OF TABLES ========== */}
        <article className="brief-sheet">
          <h2 className="font-display text-2xl font-semibold text-white">
            {t("stage4.listOfTables")}
          </h2>
          {brief.tables?.length ? (
            <ul className="brief-toc mt-6">
              {brief.tables.map((tb) => (
                <TocRow
                  key={`${tb.id}-${tb.number}`}
                  index={tb.number}
                  title={tb.title}
                  href={`#brief-${tb.id}`}
                  page={toc.find((x) => x.id === tb.id)?.page || "—"}
                />
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm italic text-slate-500">{t("stage4.listNone")}</p>
          )}
          <SheetFooter classification={classLabel} date={cover.date} pageLabel={t("stage4.pageTables")} />
        </article>


        {/* ========== BODY ========== */}
        <article className="brief-sheet">
          <section id="brief-framing" className="border-b border-white/10 pb-8">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {t("stage4.pageLabel").replace("{n}", "1")}
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-white">
              {t("stage4.framingLabel")}
            </h2>
            {editing ? (
              <textarea
                value={brief.framing}
                onChange={(e) => patchBrief({ framing: e.target.value })}
                rows={7}
                className="mt-4 w-full resize-y rounded-lg border border-white/15 bg-slate-950/60 px-3 py-2 text-[15px] leading-[1.7] text-slate-100 focus:border-orange-400/40 focus:outline-none"
              />
            ) : (
              <p className="mt-4 whitespace-pre-wrap text-[15px] leading-[1.75] text-slate-300">
                {brief.framing}
              </p>
            )}
          </section>

          <div className="divide-y divide-white/10">
            {brief.sections.map((section, sectionIndex) => {
              const pageNum = sectionIndex + 2;
              return (
                <section key={section.id} id={`brief-${section.id}`} className="group relative py-8">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {t("stage4.pageLabel").replace("{n}", String(pageNum))}
                  </p>
                  <div className="mt-2 flex items-start justify-between gap-3">
                    {editing ? (
                      <input
                        value={section.title}
                        onChange={(e) => updateSection(sectionIndex, { title: e.target.value })}
                        className="min-w-0 flex-1 border-b border-white/20 bg-transparent pb-1 font-display text-xl font-semibold text-white focus:outline-none"
                      />
                    ) : (
                      <h2 className="font-display text-xl font-semibold text-white sm:text-[1.35rem]">
                        {section.title}
                      </h2>
                    )}
                    {editing && (
                      <div className="flex shrink-0 items-center gap-0.5 opacity-70 group-hover:opacity-100">
                        <button
                          type="button"
                          className="rounded p-1.5 text-slate-400 hover:bg-white/10"
                          onClick={() => shiftSection(sectionIndex, -1)}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded p-1.5 text-slate-400 hover:bg-white/10"
                          onClick={() => shiftSection(sectionIndex, 1)}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded p-1.5 text-slate-400 hover:bg-red-500/20 hover:text-red-300"
                          onClick={() => removeSection(sectionIndex)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 space-y-3">
                    {(section.blocks || []).map((block, blockIndex) => {
                      const tNum = tableNumbers.get(block.id);
                      return editing ? (
                        <BlockEditor
                          key={`${section.id}-b-${blockIndex}`}
                          block={block}
                          onChange={(next) => updateBlock(sectionIndex, blockIndex, next)}
                        />
                      ) : (
                        <BlockView
                          key={`${section.id}-b-${blockIndex}`}
                          block={block}
                          tableLabel={
                            tNum != null ? t("stage4.tableN").replace("{n}", String(tNum)) : t("stage4.table")
                          }
                        />
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>

          {editing && (
            <div className="flex flex-wrap gap-2 border-t border-dashed border-white/15 pt-6">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-white/20 bg-transparent text-slate-100 hover:bg-white/10"
                onClick={() => onAddSection(createCustomSection(t("stage4.newSectionTitle")))}
              >
                <FilePlus2 className="mr-1.5 h-3.5 w-3.5" />
                {t("stage4.addSection")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-white/20 bg-transparent text-slate-100 hover:bg-white/10"
                onClick={() => onAddSection(createTableSection(t("stage4.newTableTitle")))}
              >
                <Table2 className="mr-1.5 h-3.5 w-3.5" />
                {t("stage4.addTable")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-white/20 bg-transparent text-slate-400 hover:bg-white/10"
                onClick={onReset}
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                {t("stage4.resetBrief")}
              </Button>
            </div>
          )}

          <SheetFooter
            classification={classLabel}
            date={cover.date}
            pageLabel={t("stage4.pageBody").replace("{n}", String(1 + (brief.sections?.length || 0)))}
          />
        </article>
      </div>
    </div>
  );
}

export function ReportModeToggle({ editing, onToggle, t }) {
  return (
    <div className="inline-flex rounded-full border border-white/15 p-1 text-sm">
      <button
        type="button"
        onClick={() => onToggle(false)}
        className={cn(
          "rounded-full px-3 py-1.5 font-medium transition-colors",
          !editing ? "bg-white text-slate-900" : "text-slate-300 hover:text-white"
        )}
      >
        {t("stage4.modeRead")}
      </button>
      <button
        type="button"
        onClick={() => onToggle(true)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition-colors",
          editing ? "bg-white text-slate-900" : "text-slate-300 hover:text-white"
        )}
      >
        <Pencil className="h-3.5 w-3.5" />
        {t("stage4.modeEdit")}
      </button>
    </div>
  );
}
