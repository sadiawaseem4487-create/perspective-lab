import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ExportButtons } from "../components/ExportButtons";
import { AgentResponse } from "../components/AgentResponse";
import { AgentComparisonSummary } from "../components/AgentComparisonSummary";
import { PageAlert, PageHero, PagePanel } from "../components/PageChrome";
import { fetchReport, fetchReports } from "../api";
import { useLanguage } from "../i18n/LanguageContext";
import { cn } from "@/lib/utils";
import {
  displayQuestion,
  resolvePreferredSessionId,
  uniqueReportsByQuestion,
} from "@/utils/uniqueReports";

export default function Stage4Report() {
  const { t, lang } = useLanguage();
  const [reports, setReports] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const locale = lang === "fi" ? "fi-FI" : lang === "pt" ? "pt-BR" : "en-GB";

  useEffect(() => {
    const lastId = sessionStorage.getItem("last_session_id");
    fetchReports()
      .then((list) => {
        const unique = uniqueReportsByQuestion(list);
        setReports(unique);
        const id = resolvePreferredSessionId(list, lastId);
        if (id) loadReport(id);
      })
      .catch((err) => setError(err.message));
  }, []);

  async function loadReport(sessionId) {
    try {
      const data = await fetchReport(sessionId);
      setSelected({
        ...data,
        question: displayQuestion(data.question),
      });
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHero
        badge={t("stage4.badge")}
        title={t("stage4.title")}
        description={<p className="text-slate-400">{t("stage4.descClean")}</p>}
      >
        <div className="mt-4">
          <ExportButtons />
        </div>
      </PageHero>

      {error && <PageAlert>{error}</PageAlert>}

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <PagePanel className="p-4">
          <h3 className="font-semibold text-white">{t("stage4.savedReports")}</h3>
          <p className="mt-1 text-xs text-slate-500">{t("stage5.uniqueHint")}</p>
          <ul className="mt-3 max-h-[480px] space-y-2 overflow-y-auto">
            {reports.length === 0 && (
              <li className="text-sm text-slate-500">{t("stage4.noReports")}</li>
            )}
            {reports.map((r) => (
              <li key={r.session_id}>
                <button
                  type="button"
                  onClick={() => loadReport(r.session_id)}
                  className={cn(
                    "w-full rounded-xl border px-3 py-3 text-left text-sm transition-colors",
                    selected?.session_id === r.session_id
                      ? "border-orange-500/40 bg-orange-500/10 text-white"
                      : "border-white/10 text-slate-300 hover:bg-white/5"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-orange-300">#{r.session_id}</p>
                    {r.run_count > 1 && (
                      <span className="text-[10px] uppercase tracking-wide text-slate-500">
                        {r.run_count} {t("stage5.runs")}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-3 text-slate-300">{r.question}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {r.created_at ? new Date(r.created_at).toLocaleString(locale) : ""}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </PagePanel>

        <PagePanel>
          {!selected ? (
            <p className="text-slate-500">{t("stage4.selectReport")}</p>
          ) : (
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-4">
                <p className="text-sm text-slate-500">
                  {t("stage4.report")} — #{selected.session_id}
                </p>
                <h3 className="mt-1 text-xl font-bold text-white">{selected.question}</h3>
                <p className="mt-2 text-sm text-slate-400">
                  {t("stage4.model")}: {selected.model}
                </p>
                {selected.summary && (
                  <p className="mt-1 text-sm text-slate-400">
                    {selected.summary.successful}/{selected.summary.total_agents}{" "}
                    {t("stage4.agentsResponded")}
                  </p>
                )}
              </div>
              <div className="space-y-4">
                {selected.responses?.map((r) => (
                  <article key={r.agent_key} className="rounded-xl border border-white/10 bg-slate-900/40 p-4">
                    <h4 className="font-bold text-white">
                      {r.agent_label || `${t("common.agent")} ${r.agent_number}`}
                      {r.agent_name && r.agent_name !== r.agent_label ? (
                        <span className="ml-2 text-sm font-medium text-slate-400">
                          ({r.agent_name})
                        </span>
                      ) : null}
                    </h4>
                    <div className="mt-3 max-h-[28rem] overflow-y-auto">
                      <AgentResponse text={r.response || r.error} compact polished dark />
                    </div>
                  </article>
                ))}
              </div>

              <AgentComparisonSummary responses={selected.responses} lang={lang} t={t} />
            </div>
          )}
        </PagePanel>
      </div>

      <div className="flex flex-wrap justify-between gap-3">
        <Link to="/question" className="page-btn-secondary">
          {t("stage4.back")}
        </Link>
        <Link to="/compare" className="page-btn-success">
          {t("stage4.compare")}
        </Link>
        <Link to="/agents" className="rounded-xl bg-slate-700 px-6 py-3 font-semibold text-white hover:bg-slate-600">
          {t("stage4.newSession")}
        </Link>
      </div>
    </div>
  );
}
