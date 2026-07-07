import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { askQuestion, checkHealth, fetchQuestions, fetchSelectedModel } from "../api";
import { AgentResponse } from "../components/AgentResponse";
import { AgentComparisonSummary } from "../components/AgentComparisonSummary";
import { useLanguage } from "../i18n/LanguageContext";

function AgentCard({ agent, agentLabel }) {
  const label = agent.agent_label || agentLabel || `Agent ${agent.agent_number || "?"}`;
  return (
    <article
      className="rounded-2xl border bg-white p-5 shadow-sm"
      style={{ borderTopWidth: 4, borderTopColor: agent.color }}
    >
      <h3 className="text-lg font-bold text-stone-900">{label}</h3>
      {agent.error ? (
        <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{agent.error}</p>
      ) : (
        <div className="mt-3 max-h-[520px] overflow-y-auto pr-1">
          <AgentResponse text={agent.response} />
        </div>
      )}
    </article>
  );
}

export default function Stage3Question() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [question, setQuestion] = useState("");
  const [model, setModel] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [apiReady, setApiReady] = useState(null);

  useEffect(() => {
    checkHealth()
      .then((d) => setApiReady(d.llm_configured ?? d.openai_configured))
      .catch(() => setApiReady(false));
    fetchQuestions(lang)
      .then((d) => setQuestion(d.main_question || ""))
      .catch(() => {});
    fetchSelectedModel()
      .then((d) => setModel(d.model || ""))
      .catch(() => {});
  }, [lang]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await askQuestion(question.trim(), model, lang);
      setResult(data);
      sessionStorage.setItem("last_session_id", String(data.session_id));
    } catch (err) {
      setError(err.message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-orange-700">{t("stage3.badge")}</p>
        <h2 className="font-display text-3xl font-bold text-stone-900">{t("stage3.title")}</h2>
        <p className="mt-2 text-stone-600">{t("stage3.desc")}</p>
        {model && (
          <p className="mt-2 text-sm text-stone-500">
            {t("stage3.usingModel")}: {model}
          </p>
        )}
      </section>

      {apiReady === false && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {t("stage3.apiMissing")} <code>backend/.env</code>
        </div>
      )}

      <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-stone-300 px-4 py-3 text-lg text-stone-900"
            placeholder={t("stage3.placeholder")}
            required
          />
          <button
            type="submit"
            disabled={loading || question.trim().length < 5}
            className="rounded-xl bg-orange-800 px-8 py-3 text-lg font-semibold text-white hover:bg-orange-900 disabled:opacity-50"
          >
            {loading ? t("stage3.loading") : t("stage3.submit")}
          </button>
        </form>
        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      </section>

      {result && (
        <section className="space-y-4">
          <h3 className="text-xl font-bold text-stone-900">{t("stage3.solutions")}</h3>
          <div className="grid gap-5 lg:grid-cols-2">
            {result.responses.map((agent) => (
              <AgentCard
                key={agent.agent_key}
                agent={agent}
                agentLabel={`${t("common.agent")} ${agent.agent_number}`}
              />
            ))}
          </div>
          <AgentComparisonSummary responses={result.responses} lang={lang} t={t} />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => navigate("/report")}
              className="rounded-xl bg-orange-800 px-6 py-3 font-semibold text-white hover:bg-orange-900"
            >
              {t("stage3.viewReport")}
            </button>
          </div>
        </section>
      )}

      <div className="flex justify-between">
        <Link to="/models" className="rounded-xl border border-stone-300 px-6 py-3 font-semibold text-stone-700">
          {t("common.back")}
        </Link>
      </div>
    </div>
  );
}
