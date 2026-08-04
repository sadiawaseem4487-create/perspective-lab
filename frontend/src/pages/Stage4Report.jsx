import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageAlert, PageHero } from "../components/PageChrome";
import { ReportBriefDocument, ReportModeToggle } from "../components/ReportBriefDocument";
import { fetchHumanAnswers, fetchReport, fetchReports } from "../api";
import { useLanguage } from "../i18n/LanguageContext";
import { useAppMode } from "@/context/AppModeContext";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import {
  displayQuestion,
  resolvePreferredSessionId,
  uniqueReportsByQuestion,
} from "@/utils/uniqueReports";
import { getActiveSessionId, setActiveSessionId, setPresentPlaylist } from "@/utils/sessionWorkspace";
import { clearBrief, loadBrief, saveBrief } from "@/utils/briefStorage";
import { downloadBriefPdf } from "@/utils/briefPdf";
import {
  contentFingerprint,
  downloadBriefWord,
  ensureBriefMeta,
  framingFingerprint,
  generateDecisionBrief,
  mergeGuestsIntoBrief,
  printBriefDocument,
  syncBriefToFraming,
} from "@/utils/decisionBrief";

export default function Stage4Report() {
  const { t, lang } = useLanguage();
  const { isDemo } = useAppMode();
  const { user } = useAuth();
  const userId = user?.id;
  const uiMode = isDemo ? "demo" : "live";
  const [reports, setReports] = useState([]);
  const [selected, setSelected] = useState(null);
  const [humanAnswers, setHumanAnswers] = useState([]);
  const [brief, setBrief] = useState(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [exportNote, setExportNote] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const locale = lang === "fi" ? "fi-FI" : lang === "pt" ? "pt-BR" : "en-GB";

  const briefLabels = useMemo(
    () => ({
      docTitle: t("stage4.briefTitle"),
      executive: t("stage4.executive"),
      framing: t("stage4.framingLabel"),
      comparison: t("stage4.comparisonBrief"),
      appendix: t("stage4.appendix"),
      diagnosis: t("roundtable.analysisDiagnosis"),
      actions: t("roundtable.analysisActions"),
      why: t("roundtable.analysisWhy"),
      limits: t("roundtable.analysisLimits"),
      preparedForDefault: t("stage4.preparedForDefault"),
      preparedForTitle: t("stage4.preparedForTitleDefault"),
      preparedForOrg: t("stage4.preparedForOrgDefault"),
      preparedByName: t("stage4.preparedByNameDefault"),
      preparedByTitle: t("stage4.preparedByTitleDefault"),
      preparedByOrg: t("stage4.preparedByOrgDefault"),
      abstractDefault: t("stage4.abstractDefault"),
      recommendations: t("stage4.recommendations"),
      priorityActions: t("stage4.priorityActions"),
      executiveLeadTpl: t("stage4.executiveLeadTpl"),
      recommendationsLeadTpl: t("stage4.recommendationsLeadTpl"),
      comparisonLeadTpl: t("stage4.comparisonLeadTpl"),
      conclusionLeadTpl: t("stage4.conclusionLeadTpl"),
      conclusionCloseTpl: t("stage4.conclusionCloseTpl"),
      conclusionLensTpl: t("stage4.conclusionLensTpl"),
      abstractTail: t("stage4.abstractTail"),
      conclusion: t("stage4.conclusion"),
      conclusionLead: t("stage4.conclusionLead"),
      conclusionLens: t("stage4.conclusionLens"),
      conclusionActions: t("stage4.conclusionActions"),
      conclusionClose: t("stage4.conclusionClose"),
      conclusionGuests: t("stage4.conclusionGuests"),
      guests: t("stage4.guests"),
      guestsLead: t("stage4.guestsLead"),
      references: t("stage4.references"),
      referencesLead: t("stage4.referencesLead"),
      referencePlaceholder1: t("stage4.referencePlaceholder1"),
      referencePlaceholder2: t("stage4.referencePlaceholder2"),
      referencePlaceholder3: t("stage4.referencePlaceholder3"),
      takeawaysHeading: t("stage4.takeawaysHeading"),
      sharedActions: t("stage4.sharedActions"),
      coverSubtitle: t("stage4.coverSubtitle"),
      coverFootnote: t("stage4.coverFootnote"),
      colTheorist: t("stage4.colTheorist"),
      colLens: t("stage4.colLens"),
      colTakeaway: t("stage4.colTakeaway"),
      colFocus: t("stage4.comparison.mainFocus"),
      colAction: t("stage4.comparison.firstAction"),
      colWho: t("stage4.comparison.mainStakeholder"),
      colSuccess: t("stage4.comparison.successMetric"),
      colGuest: t("stage4.colGuest"),
      colRole: t("stage4.colRole"),
      colPerspective: t("stage4.colPerspective"),
    }),
    [t]
  );

  const exportLabels = useMemo(
    () => ({
      framing: t("stage4.framingLabel"),
      toc: t("stage4.toc"),
      tot: t("stage4.listOfTables"),
      none: t("stage4.listNone"),
      date: t("stage4.docDate"),
      preparedBy: t("stage4.preparedBy"),
      preparedFor: t("stage4.preparedFor"),
      by: t("stage4.by"),
      abstract: t("stage4.abstract"),
      abstractDefault: t("stage4.abstractDefault"),
      page: t("stage4.pageWord"),
      docTitle: t("stage4.briefTitle"),
      session: t("stage4.session"),
      class_public: t("stage4.class_public"),
      class_internal: t("stage4.class_internal"),
      class_confidential: t("stage4.class_confidential"),
      coverSubtitle: t("stage4.coverSubtitle"),
      coverFootnote: t("stage4.coverFootnote"),
      footnoteDefault: t("stage4.docFootnoteDefault"),
    }),
    [t]
  );

  function buildFreshBrief(report, guests = [], { fast = true } = {}) {
    return ensureBriefMeta(
      generateDecisionBrief(report, {
        lang,
        labels: briefLabels,
        humanAnswers: guests,
        fast,
      }),
      briefLabels
    );
  }

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      setLoading(true);
      setError("");
      const activeId = getActiveSessionId(uiMode, userId);

      // Reports list is for the dropdown only — do not block first paint.
      const listPromise = fetchReports(uiMode)
        .then((list) => {
          if (cancelled) return [];
          const unique = uniqueReportsByQuestion(list);
          setReports(unique);
          return unique;
        })
        .catch((err) => {
          if (!cancelled) setError(err.message);
          return [];
        });

      try {
        if (activeId) {
          await loadReport(activeId);
        } else {
          const unique = await listPromise;
          if (cancelled) return;
          const id = resolvePreferredSessionId(unique, null) || unique[0]?.session_id;
          if (id) {
            await loadReport(id);
          } else {
            setSelected(null);
            setHumanAnswers([]);
            setBrief(null);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
      await listPromise;
    }

    hydrate();
    // Defer PDF libs until after brief paint so they don't compete for bandwidth.
    const idle =
      typeof requestIdleCallback === "function"
        ? requestIdleCallback(() => {
            import("jspdf").catch(() => {});
            import("jspdf-autotable").catch(() => {});
          })
        : setTimeout(() => {
            import("jspdf").catch(() => {});
            import("jspdf-autotable").catch(() => {});
          }, 1500);
    return () => {
      cancelled = true;
      if (typeof cancelIdleCallback === "function" && typeof idle === "number") {
        cancelIdleCallback(idle);
      } else {
        clearTimeout(idle);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uiMode, lang]);

  async function loadReport(sessionId) {
    try {
      const [data, human] = await Promise.all([
        fetchReport(sessionId),
        fetchHumanAnswers(sessionId).catch(() => ({ human_answers: [] })),
      ]);
      setActiveSessionId(sessionId, uiMode, userId);
      setPresentPlaylist([sessionId], uiMode, userId);
      const report = {
        ...data,
        question: displayQuestion(data.question),
      };
      const guests = human.human_answers || [];
      setSelected(report);
      setHumanAnswers(guests);
      const saved = loadBrief(sessionId, uiMode);
      const reportFp = framingFingerprint(report.question);
      const savedFp =
        saved?.framingFingerprint || framingFingerprint(saved?.framing || "");
      const framingMatches = Boolean(savedFp) && savedFp === reportFp;
      const contentFp = contentFingerprint(report, guests);
      const isEdited =
        saved?.source === "edited" && Number(saved?.version || 0) >= 7 && framingMatches;
      const cacheHit =
        saved &&
        Number(saved?.version || 0) >= 7 &&
        framingMatches &&
        saved.contentFingerprint === contentFp;

      let next;
      if (isEdited) {
        // Keep facilitator edits; always refresh guest cells from live full answers.
        next = mergeGuestsIntoBrief(ensureBriefMeta(saved, briefLabels), guests, briefLabels);
        next = syncBriefToFraming(
          { ...next, contentFingerprint: contentFp, source: "edited" },
          briefLabels
        );
      } else if (cacheHit) {
        next = ensureBriefMeta(saved, briefLabels);
      } else {
        // Fast draft first so the page paints; polish later when idle.
        next = buildFreshBrief(report, guests, { fast: true });
        clearBrief(sessionId, uiMode);
        const polishSessionId = sessionId;
        const schedule =
          typeof requestIdleCallback === "function" ? requestIdleCallback : (fn) => setTimeout(fn, 0);
        schedule(() => {
          try {
            const polished = buildFreshBrief(report, guests, { fast: false });
            const current = loadBrief(polishSessionId, uiMode);
            if (current?.source === "edited") return;
            if (getActiveSessionId(uiMode, userId) !== polishSessionId) return;
            saveBrief(polished, uiMode);
            setBrief(polished);
          } catch {
            /* keep fast draft */
          }
        });
      }
      saveBrief(next, uiMode);
      setBrief(next);
      setEditing(false);
      setError("");
      setExportNote("");
    } catch (err) {
      setError(err.message);
    }
  }

  function handleBriefChange(next) {
    setBrief(next);
    saveBrief(next, uiMode);
  }

  function handleAddSection(section) {
    if (!brief) return;
    const next = {
      ...brief,
      sections: [...brief.sections, section],
      source: "edited",
      updatedAt: new Date().toISOString(),
    };
    handleBriefChange(ensureBriefMeta(next, briefLabels));
  }

  function handleReset() {
    if (!selected) return;
    if (!window.confirm(t("stage4.resetConfirm"))) return;
    clearBrief(selected.session_id, uiMode);
    const fresh = buildFreshBrief(selected, humanAnswers, { fast: false });
    setBrief(fresh);
    saveBrief(fresh, uiMode);
  }

  function handleExportWord() {
    if (!brief) return;
    downloadBriefWord(brief, { labels: exportLabels, locale });
    setExportNote(t("stage4.exportWordDone"));
  }

  async function handleExportPdf() {
    if (!brief || pdfBusy) return;
    setPdfBusy(true);
    setExportNote(t("stage4.exportPdfBusy"));
    try {
      await downloadBriefPdf(brief, { labels: exportLabels, locale });
      setExportNote(t("stage4.exportPdfDone"));
    } catch (err) {
      setExportNote(err?.message || t("stage4.exportPdfFailed"));
    } finally {
      setPdfBusy(false);
    }
  }

  function handlePrint() {
    if (!brief) return;
    const ok = printBriefDocument(brief, { labels: exportLabels, locale });
    setExportNote(ok ? t("stage4.exportPrintHint") : t("stage4.exportPdfBlocked"));
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHero
        badge={t("stage4.badge")}
        title={t("stage4.title")}
        description={<p className="text-slate-400">{t("stage4.descBrief")}</p>}
      >
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <ReportModeToggle editing={editing} onToggle={setEditing} t={t} />
          {selected && (
            <select
              className="rounded-full border border-white/15 bg-slate-950/70 px-3 py-1.5 text-sm text-slate-200"
              value={selected.session_id}
              onChange={(e) => loadReport(Number(e.target.value))}
            >
              {reports.map((r) => (
                <option key={r.session_id} value={r.session_id}>
                  #{r.session_id} · {(r.question || "").slice(0, 48)}
                  {(r.question || "").length > 48 ? "…" : ""}
                </option>
              ))}
            </select>
          )}
        </div>
      </PageHero>

      {error && <PageAlert>{error}</PageAlert>}
      {exportNote && <p className="text-sm text-slate-400">{exportNote}</p>}

      {loading && !brief ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-6 py-12 text-center text-slate-400">
          {t("stage4.loadingBrief")}
        </div>
      ) : !selected || !brief ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-6 py-12 text-center text-slate-400">
          {reports.length === 0 ? t("stage4.noReports") : t("stage4.selectReport")}
          {reports.length > 0 && (
            <ul className="mx-auto mt-6 max-w-lg space-y-2 text-left">
              {reports.slice(0, 8).map((r) => (
                <li key={r.session_id}>
                  <button
                    type="button"
                    onClick={() => loadReport(r.session_id)}
                    className={cn(
                      "w-full rounded-xl border border-white/10 px-4 py-3 text-left text-sm text-slate-300 hover:border-orange-400/40 hover:bg-white/5"
                    )}
                  >
                    <span className="font-medium text-orange-300">#{r.session_id}</span>
                    <span className="mt-1 block line-clamp-2">{r.question}</span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {r.created_at ? new Date(r.created_at).toLocaleString(locale) : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <ReportBriefDocument
          brief={brief}
          editing={editing}
          onChange={handleBriefChange}
          onAddSection={handleAddSection}
          onReset={handleReset}
          onExportWord={handleExportWord}
          onExportPdf={handleExportPdf}
          onPrint={handlePrint}
          pdfBusy={pdfBusy}
          t={t}
        />
      )}

      <div className="flex flex-wrap justify-between gap-3">
        <Link to="/question" className="page-btn-secondary">
          {t("stage4.back")}
        </Link>
        <Link to="/compare" className="page-btn-success">
          {t("stage4.compare")}
        </Link>
      </div>
    </div>
  );
}
