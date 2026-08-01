import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageAlert, PageHero } from "../components/PageChrome";
import { fetchSession, fetchSessions } from "../api";
import { useAppMode } from "@/context/AppModeContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { setActiveSessionId } from "@/utils/sessionWorkspace";

export default function HistoryPage() {
  const { t, lang } = useLanguage();
  const { isDemo } = useAppMode();
  const navigate = useNavigate();
  const uiMode = isDemo ? "demo" : "live";
  const locale = lang === "fi" ? "fi-FI" : lang === "pt" ? "pt-BR" : "en-GB";

  const [sessions, setSessions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchSessions()
      .then(setSessions)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function openSession(id) {
    try {
      setError("");
      const data = await fetchSession(id);
      setSelected(data);
    } catch (err) {
      setError(err.message);
    }
  }

  function restoreSession(sessionId) {
    setActiveSessionId(sessionId, uiMode);
    navigate(`/compare?session=${sessionId}`);
  }

  return (
    <div className="space-y-6">
      <PageHero
        badge={t("nav.history")}
        title={t("history.title")}
        description={t("history.desc")}
      />

      {error && <PageAlert variant="error">{error}</PageAlert>}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
          <h3 className="text-sm font-semibold text-white">{t("history.sessions")}</h3>
          <ul className="mt-3 max-h-[520px] space-y-2 overflow-y-auto">
            {loading && <li className="text-sm text-slate-400">{t("common.loading")}</li>}
            {!loading && sessions.length === 0 && (
              <li className="text-sm text-slate-400">{t("history.empty")}</li>
            )}
            {sessions.map((session) => (
              <li key={session.id}>
                <button
                  type="button"
                  onClick={() => openSession(session.id)}
                  className={`w-full rounded-lg border px-3 py-3 text-left text-sm transition ${
                    selected?.id === session.id
                      ? "border-orange-400/60 bg-orange-500/10"
                      : "border-white/10 hover:bg-white/5"
                  }`}
                >
                  <p className="font-medium text-white">#{session.id}</p>
                  <p className="mt-1 line-clamp-2 text-slate-300">{session.question}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(session.created_at).toLocaleString(locale)}
                    {session.workflow_mode ? ` · ${session.workflow_mode}` : ""}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="rounded-xl border border-white/10 bg-slate-950/40 p-6">
          {!selected ? (
            <p className="text-slate-400">{t("history.select")}</p>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-400">
                    {t("shell.session")} #{selected.id}
                  </p>
                  <h3 className="mt-1 text-xl font-semibold text-white">{selected.question}</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => restoreSession(selected.id)}
                    className="page-btn-primary px-3 py-2 text-xs"
                  >
                    {t("history.openCompare")}
                  </button>
                  <Link
                    to={`/report?session=${selected.id}`}
                    onClick={() => setActiveSessionId(selected.id, uiMode)}
                    className="page-btn-secondary px-3 py-2 text-xs"
                  >
                    {t("history.openReport")}
                  </Link>
                </div>
              </div>
              <div className="space-y-4">
                {(selected.responses || []).map((response) => (
                  <article
                    key={response.agent_key}
                    className="rounded-lg border border-white/10 p-4"
                  >
                    <h4 className="font-semibold text-orange-300">
                      {response.agent_name || response.agent_key}
                    </h4>
                    {response.error ? (
                      <p className="mt-2 text-sm text-red-300">{response.error}</p>
                    ) : (
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
                        {response.response}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
