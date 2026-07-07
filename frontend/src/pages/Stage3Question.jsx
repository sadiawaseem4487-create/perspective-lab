import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  advanceSequentialRun,
  askQuestion,
  checkHealth,
  fetchQuestions,
  fetchSelectedModel,
  finalizeSequentialRun,
  startSequentialRun,
} from "../api";
import { AgentResponse } from "../components/AgentResponse";
import { AgentComparisonSummary } from "../components/AgentComparisonSummary";
import { SequentialTimeline } from "../components/SequentialTimeline";
import { useLanguage } from "../i18n/LanguageContext";

const WORKFLOW_MODES = ["parallel", "sequential", "sequential_hitl"];

function AgentCard({ agent, agentLabel }) {
  const label = agent.agent_label || agentLabel || `Agent ${agent.agent_number || "?"}`;
  return (
    <article
      className="rounded-2xl border bg-white p-5 shadow-sm"
      style={{ borderTopWidth: 4, borderTopColor: agent.color || "#78716c" }}
    >
      <h3 className="text-lg font-bold text-stone-900">{label}</h3>
      {agent.sequential_stage && (
        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-orange-700">
          Vaihe {agent.sequential_stage.vaihe}: {agent.sequential_stage.role.replace(/_/g, " ")}
        </p>
      )}
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
  const [workflowMode, setWorkflowMode] = useState("parallel");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [sequentialRun, setSequentialRun] = useState(null);
  const [checkpointNote, setCheckpointNote] = useState("");
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

  function resetResults() {
    setResult(null);
    setSequentialRun(null);
    setCheckpointNote("");
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    resetResults();

    try {
      if (workflowMode === "sequential_hitl") {
        const run = await startSequentialRun(question.trim(), model, lang);
        setSequentialRun(run);
      } else {
        const data = await askQuestion(question.trim(), model, lang, workflowMode);
        setResult(data);
        sessionStorage.setItem("last_session_id", String(data.session_id));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdvance() {
    if (!sequentialRun) return;
    setLoading(true);
    setError("");
    try {
      const isFinal = sequentialRun.current_vaihe >= 4;
      const updated = isFinal
        ? await finalizeSequentialRun(sequentialRun.run_id, checkpointNote)
        : await advanceSequentialRun(sequentialRun.run_id, checkpointNote);
      setSequentialRun(updated);
      setCheckpointNote("");
      if (updated.status === "completed" && updated.session_id) {
        sessionStorage.setItem("last_session_id", String(updated.session_id));
        setResult({
          session_id: updated.session_id,
          question: updated.question,
          workflow_mode: "sequential",
          responses: updated.responses,
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const activeSequentialResponse =
    sequentialRun?.responses?.[sequentialRun.responses.length - 1] || null;

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

      <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-stone-800">{t("stage3.workflowMode")}</p>
        <div className="mt-3 flex flex-wrap gap-3">
          {WORKFLOW_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                setWorkflowMode(mode);
                resetResults();
              }}
              className={`rounded-xl border px-4 py-2 text-sm font-semibold ${
                workflowMode === mode
                  ? "border-orange-700 bg-orange-800 text-white"
                  : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
              }`}
            >
              {t(`stage3.mode.${mode}`)}
            </button>
          ))}
        </div>
        {workflowMode === "sequential_hitl" && (
          <p className="mt-3 text-sm text-stone-600">{t("stage3.hitlDesc")}</p>
        )}
        {workflowMode === "sequential" && (
          <p className="mt-3 text-sm text-stone-600">{t("stage3.sequentialDesc")}</p>
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
            disabled={Boolean(sequentialRun && sequentialRun.status !== "completed")}
          />
          <button
            type="submit"
            disabled={loading || question.trim().length < 5 || Boolean(sequentialRun)}
            className="rounded-xl bg-orange-800 px-8 py-3 text-lg font-semibold text-white hover:bg-orange-900 disabled:opacity-50"
          >
            {loading ? t("stage3.loading") : t(`stage3.submit.${workflowMode}`)}
          </button>
        </form>
        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      </section>

      {sequentialRun && (
        <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-bold text-stone-900">{t("stage3.sequentialTimeline")}</h3>
          <SequentialTimeline
            stages={sequentialRun.stages}
            currentVaihe={sequentialRun.current_vaihe}
            responses={sequentialRun.responses}
            t={t}
          />

          {activeSequentialResponse && sequentialRun.status === "awaiting_review" && (
            <AgentCard agent={activeSequentialResponse} />
          )}

          {sequentialRun.status === "awaiting_review" && (
            <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900">{t("stage3.checkpointTitle")}</p>
              <textarea
                value={checkpointNote}
                onChange={(e) => setCheckpointNote(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-amber-200 px-3 py-2 text-sm"
                placeholder={t("stage3.checkpointPlaceholder")}
              />
              <button
                type="button"
                onClick={handleAdvance}
                disabled={loading}
                className="rounded-xl bg-orange-800 px-6 py-2 font-semibold text-white hover:bg-orange-900 disabled:opacity-50"
              >
                {loading
                  ? t("stage3.loading")
                  : sequentialRun.current_vaihe >= 4
                    ? t("stage3.completeWorkflow")
                    : t("stage3.approveContinue")}
              </button>
            </div>
          )}
        </section>
      )}

      {result && (
        <section className="space-y-4">
          {result.workflow_mode === "sequential" && sequentialRun?.stages && (
            <SequentialTimeline
              stages={sequentialRun.stages}
              currentVaihe={4}
              responses={result.responses}
              t={t}
            />
          )}
          <h3 className="text-xl font-bold text-stone-900">
            {result.workflow_mode === "sequential" ? t("stage3.sequentialSolutions") : t("stage3.solutions")}
          </h3>
          <div className={`grid gap-5 ${result.workflow_mode === "sequential" ? "grid-cols-1" : "lg:grid-cols-2"}`}>
            {result.responses.map((agent) => (
              <AgentCard
                key={`${agent.agent_key}-${agent.sequential_stage?.vaihe || agent.agent_number}`}
                agent={agent}
                agentLabel={`${t("common.agent")} ${agent.agent_number}`}
              />
            ))}
          </div>
          {result.workflow_mode === "parallel" && (
            <AgentComparisonSummary responses={result.responses} lang={lang} t={t} />
          )}
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
