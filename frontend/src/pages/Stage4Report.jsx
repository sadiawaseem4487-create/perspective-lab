import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ExportButtons } from "../components/ExportButtons";
import { AgentResponse } from "../components/AgentResponse";
import { AgentComparisonSummary } from "../components/AgentComparisonSummary";
import { fetchReport, fetchReports } from "../api";
import { useLanguage } from "../i18n/LanguageContext";

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
        setReports(list);
        const id = lastId ? Number(lastId) : list[0]?.session_id;
        if (id) loadReport(id);
      })
      .catch((err) => setError(err.message));
  }, []);

  async function loadReport(sessionId) {
    try {
      const data = await fetchReport(sessionId);
      setSelected(data);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-orange-700">{t("stage4.badge")}</p>
        <h2 className="font-display text-3xl font-bold text-stone-900">{t("stage4.title")}</h2>
        <p className="mt-2 text-stone-600">
          {t("stage4.desc")} <code className="rounded bg-stone-100 px-1">cases/&lt;case&gt;/reports/</code>.
        </p>
        <div className="mt-4">
          <ExportButtons />
        </div>
      </section>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <h3 className="font-semibold text-stone-800">{t("stage4.savedReports")}</h3>
          <ul className="mt-3 max-h-[480px] space-y-2 overflow-y-auto">
            {reports.length === 0 && (
              <li className="text-sm text-stone-500">{t("stage4.noReports")}</li>
            )}
            {reports.map((r) => (
              <li key={r.session_id}>
                <button
                  type="button"
                  onClick={() => loadReport(r.session_id)}
                  className={`w-full rounded-xl border px-3 py-3 text-left text-sm ${
                    selected?.session_id === r.session_id
                      ? "border-orange-300 bg-orange-50"
                      : "border-stone-200 hover:bg-stone-50"
                  }`}
                >
                  <p className="font-medium">
                    {t("stage4.report")} #{r.session_id}
                  </p>
                  <p className="mt-1 line-clamp-2 text-stone-600">{r.question}</p>
                  <p className="mt-1 text-xs text-stone-400">
                    {r.created_at ? new Date(r.created_at).toLocaleString(locale) : ""}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          {!selected ? (
            <p className="text-stone-500">{t("stage4.selectReport")}</p>
          ) : (
            <div className="space-y-6">
              <div className="border-b border-stone-200 pb-4">
                <p className="text-sm text-stone-500">
                  {t("stage4.report")} — #{selected.session_id}
                </p>
                <h3 className="mt-1 text-xl font-bold text-stone-900">{selected.question}</h3>
                <p className="mt-2 text-sm text-stone-500">
                  {t("stage4.model")}: {selected.model}
                </p>
                {selected.summary && (
                  <p className="mt-1 text-sm text-stone-500">
                    {selected.summary.successful}/{selected.summary.total_agents} {t("stage4.agentsResponded")}
                  </p>
                )}
              </div>
              <div className="space-y-4">
                {selected.responses?.map((r) => (
                  <article key={r.agent_key} className="rounded-xl border border-stone-200 p-4">
                    <h4 className="font-bold text-stone-900">
                      {r.agent_label || `${t("common.agent")} ${r.agent_number}`}
                      {r.agent_name && r.agent_name !== r.agent_label ? (
                        <span className="ml-2 text-sm font-medium text-stone-500">({r.agent_name})</span>
                      ) : null}
                    </h4>
                    <div className="mt-3 max-h-[28rem] overflow-y-auto">
                      <AgentResponse text={r.response || r.error} compact />
                    </div>
                  </article>
                ))}
              </div>

              <AgentComparisonSummary responses={selected.responses} lang={lang} t={t} />
            </div>
          )}
        </section>
      </div>

      <div className="flex flex-wrap justify-between gap-3">
        <Link to="/question" className="rounded-xl border border-stone-300 px-6 py-3 font-semibold text-stone-700">
          {t("stage4.back")}
        </Link>
        <Link to="/compare" className="rounded-xl bg-emerald-800 px-6 py-3 font-semibold text-white hover:bg-emerald-900">
          {t("stage4.compare")}
        </Link>
        <Link to="/agents" className="rounded-xl bg-stone-800 px-6 py-3 font-semibold text-white hover:bg-stone-900">
          {t("stage4.newSession")}
        </Link>
      </div>
    </div>
  );
}
