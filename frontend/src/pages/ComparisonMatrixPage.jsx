import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchComparisonMatrix, fetchReports } from "@/api";
import { PageAlert, PageHero, PagePanel, ResearchQuestionBlock } from "@/components/PageChrome";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAppMode } from "@/context/AppModeContext";
import { useAuth } from "@/context/AuthContext";
import { getAgentLens, getAgentTheorist } from "@/lib/agentIcons";
import { cn } from "@/lib/utils";
import { getActiveSessionId, setActiveSessionId } from "@/utils/sessionWorkspace";
import {
  displayQuestion,
  resolvePreferredSessionId,
  uniqueReportsByQuestion,
} from "@/utils/uniqueReports";

/** Research-only rows — hide from the professional matrix view. */
const HIDDEN_DIMENSIONS = new Set(["self_check_passed"]);

function columnTitle(col, lang) {
  if (col.kind === "guest") {
    return col.guest_name || col.agent_label || "Guest";
  }
  const key = col.agent_key || "";
  return getAgentTheorist(key) || col.agent_label || key || "Agent";
}

function columnSubtitle(col, lang) {
  if (col.kind === "guest") {
    return [col.guest_role, col.guest_organization].filter(Boolean).join(" · ") || "Guest";
  }
  return getAgentLens(col.agent_key, lang) || "";
}

function formatCell(value) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === "" || value == null) return "—";
  return String(value);
}

function MatrixTable({ matrix, columns, lang, t }) {
  const rows = (matrix || []).filter((row) => !HIDDEN_DIMENSIONS.has(row.dimension));

  if (!rows.length) {
    return <p className="text-sm text-slate-400">{t("matrixPage.empty")}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full min-w-[720px] border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-white/10 bg-slate-950/80">
            <th className="w-36 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              {t("matrixPage.dimension")}
            </th>
            {columns.map((col) => {
              const key = col.column_key || col.agent_key;
              const isGuest = col.kind === "guest";
              return (
                <th key={key} className="min-w-[10rem] px-3 py-2.5 align-bottom">
                  <div className="flex items-start gap-2">
                    <span
                      className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: isGuest ? "#34d399" : col.color || "#78716c" }}
                    />
                    <span className="min-w-0">
                      <span className={cn("block text-sm font-semibold", isGuest ? "text-emerald-100" : "text-white")}>
                        {columnTitle(col, lang)}
                      </span>
                      {columnSubtitle(col, lang) && (
                        <span className="mt-0.5 block text-[11px] font-normal text-slate-500">
                          {columnSubtitle(col, lang)}
                        </span>
                      )}
                    </span>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.dimension} className="border-b border-white/5 last:border-0">
              <td className="px-3 py-2.5 align-top text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {row.label}
              </td>
              {columns.map((col) => {
                const key = col.column_key || col.agent_key;
                const isGuest = col.kind === "guest";
                const source = row.sources?.[key];
                const display = formatCell(row.values[key]);
                const isDefault = source === "schema_default";
                return (
                  <td
                    key={key}
                    className={cn(
                      "px-3 py-2.5 align-top text-[13px] leading-snug whitespace-pre-wrap",
                      isGuest ? "bg-emerald-950/20 text-slate-300" : "text-slate-200",
                      isDefault && "text-slate-500"
                    )}
                  >
                    {display}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ComparisonMatrixPage() {
  const { t, lang } = useLanguage();
  const { isDemo } = useAppMode();
  const { user } = useAuth();
  const userId = user?.id;
  const uiMode = isDemo ? "demo" : "live";
  const [sessionId, setSessionId] = useState(null);
  const [matrixData, setMatrixData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function hydrate() {
      setLoading(true);
      try {
        const list = await fetchReports(uiMode);
        const unique = uniqueReportsByQuestion(list);
        const id =
          resolvePreferredSessionId(list, getActiveSessionId(uiMode, userId)) || unique[0]?.session_id;
        if (!id) {
          setSessionId(null);
          setMatrixData(null);
          return;
        }
        setSessionId(id);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    hydrate();

    function onFocus() {
      hydrate();
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [uiMode]);

  useEffect(() => {
    if (!sessionId) return;
    setActiveSessionId(sessionId, uiMode, userId);
    setLoading(true);
    fetchComparisonMatrix(sessionId)
      .then((data) => {
        setMatrixData(data);
        setError("");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [sessionId, uiMode]);

  const columns = matrixData?.columns || matrixData?.agents || [];
  const guestCount = matrixData?.guest_count || 0;

  const guestNote = useMemo(() => {
    if (!guestCount) return "";
    const shown = matrixData?.guest_columns_shown || 0;
    const limit = matrixData?.guest_column_limit || 8;
    if (guestCount > limit) {
      return t("shell.matrixGuestCap")
        .replace("{shown}", String(shown))
        .replace("{total}", String(guestCount));
    }
    return "";
  }, [guestCount, matrixData, t]);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHero
        badge={t("shell.matrix")}
        title={t("shell.matrixTitle")}
        size="sm"
        description={<p className="max-w-xl text-slate-400">{t("shell.matrixDesc")}</p>}
      />

      {error && <PageAlert>{error}</PageAlert>}

      {loading && (
        <PagePanel>
          <p className="text-sm text-slate-400">{t("common.loading") || "Loading…"}</p>
        </PagePanel>
      )}

      {!loading && !matrixData && (
        <PagePanel>
          <p className="text-sm text-slate-300">{t("stage4.noReports")}</p>
          <Link to="/question" className="page-btn-primary mt-4 inline-flex px-4 py-2 text-sm">
            {t("stage5.runFirst")}
          </Link>
        </PagePanel>
      )}

      {!loading && matrixData && (
        <>
          <ResearchQuestionBlock
            label={t("stage5.researchQuestion")}
            question={displayQuestion(matrixData.question)}
            meta={`${columns.filter((c) => c.kind !== "guest").length} ${t("stage5.agentsShort")}${
              guestCount > 0 ? ` · ${guestCount} ${t("stage5.guestsShort")}` : ""
            }${matrixData.workflow_mode ? ` · ${matrixData.workflow_mode}` : ""}`}
          />

          {guestNote && <p className="type-meta">{guestNote}</p>}

          <MatrixTable matrix={matrixData.matrix} columns={columns} lang={lang} t={t} />

          {(matrixData.guest_summaries || []).length > 0 && (
            <section className="space-y-2">
              <h3 className="type-section">
                {t("guests.listTitle")}
                <span className="ml-2 type-meta font-normal normal-case tracking-normal">
                  ({guestCount})
                </span>
              </h3>
              <div className="overflow-x-auto rounded-xl border border-emerald-500/20">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-emerald-500/15 bg-emerald-950/30">
                    <tr>
                      <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-emerald-400/80">
                        #
                      </th>
                      <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-emerald-400/80">
                        {t("matrixPage.colName")}
                      </th>
                      <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-emerald-400/80">
                        {t("matrixPage.colRole")}
                      </th>
                      <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-emerald-400/80">
                        {t("matrixPage.colAnswer")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {matrixData.guest_summaries.map((g, i) => (
                      <tr key={g.response_id || i} className="border-b border-white/5 last:border-0">
                        <td className="px-3 py-2 align-top text-slate-500">{i + 1}</td>
                        <td className="px-3 py-2 align-top font-medium text-white">{g.name}</td>
                        <td className="px-3 py-2 align-top text-slate-400">
                          {[g.role, g.organization].filter(Boolean).join(" · ") || "—"}
                        </td>
                        <td className="px-3 py-2 align-top whitespace-pre-wrap leading-relaxed text-slate-300">
                          {g.answer || g.values?.main_focus || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
            <Link to="/compare" className="page-btn-secondary px-4 py-2 text-xs">
              {t("nav.compare")}
            </Link>
            <div className="flex flex-wrap gap-2">
              <Link
                to={sessionId ? `/share?session=${sessionId}` : "/share"}
                className="page-btn-secondary px-4 py-2 text-xs"
              >
                {t("nav.share")}
              </Link>
              <Link to="/report" className="page-btn-primary px-4 py-2 text-xs">
                {t("nav.report")}
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
