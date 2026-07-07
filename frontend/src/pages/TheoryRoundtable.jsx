import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  advanceSequentialRun,
  askQuestion,
  checkHealth,
  fetchAgentsCatalog,
  fetchQuestions,
  fetchSelectedModel,
  finalizeSequentialRun,
  startSequentialRun,
} from "@/api";
import { AgentPersona } from "@/components/AgentPersona";
import { AgentResponse } from "@/components/AgentResponse";
import { DemoQuestionPicker } from "@/components/DemoQuestionPicker";
import { InsightBoard } from "@/components/InsightBoard";
import { SequentialTimeline } from "@/components/SequentialTimeline";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { extractAllInsights } from "@/utils/extractInsights";
import { useLanguage } from "@/i18n/LanguageContext";

const WORKFLOW_MODES = ["parallel", "sequential", "sequential_hitl"];
const AGENT_ORDER = ["freire", "weber", "montessori", "rogers"];

function personaStatus(agentKey, { loading, revealed, responses, errors }) {
  if (errors[agentKey]) return "error";
  if (responses[agentKey]) return revealed.has(agentKey) ? "done" : "thinking";
  if (loading) return "thinking";
  return "idle";
}

export default function TheoryRoundtable() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();

  const [agents, setAgents] = useState([]);
  const [question, setQuestion] = useState("");
  const [demoQuestions, setDemoQuestions] = useState([]);
  const [model, setModel] = useState("");
  const [workflowMode, setWorkflowMode] = useState("parallel");
  const [loading, setLoading] = useState(false);
  const [apiReady, setApiReady] = useState(null);
  const [error, setError] = useState("");

  const [result, setResult] = useState(null);
  const [sequentialRun, setSequentialRun] = useState(null);
  const [checkpointNote, setCheckpointNote] = useState("");
  const [revealed, setRevealed] = useState(new Set());
  const [selectedKey, setSelectedKey] = useState(null);

  useEffect(() => {
    checkHealth()
      .then((d) => setApiReady(d.llm_configured ?? d.openai_configured))
      .catch(() => setApiReady(false));

    fetchAgentsCatalog()
      .then((d) => setAgents(d.main_agents || []))
      .catch(() => {});

    fetchQuestions(lang)
      .then((d) => {
        setQuestion(d.main_question || "");
        setDemoQuestions(d.questions || []);
      })
      .catch(() => {});

    fetchSelectedModel()
      .then((d) => setModel(d.model || ""))
      .catch(() => {});
  }, [lang]);

  const responseMap = useMemo(() => {
    const map = {};
    const list = result?.responses || sequentialRun?.responses || [];
    for (const r of list) {
      const key = (r.agent_key || "").toLowerCase();
      if (key) map[key] = r;
    }
    return map;
  }, [result, sequentialRun]);

  const errorMap = useMemo(() => {
    const map = {};
    for (const [key, r] of Object.entries(responseMap)) {
      if (r.error) map[key] = r.error;
    }
    return map;
  }, [responseMap]);

  useEffect(() => {
    if (!result?.responses?.length) return;
    const keys = result.responses.map((r) => (r.agent_key || "").toLowerCase()).filter(Boolean);

    if (workflowMode !== "parallel") {
      setRevealed(new Set(keys));
      setSelectedKey(keys[0] || null);
      return;
    }

    setRevealed(new Set());
    let index = 0;
    const timer = setInterval(() => {
      if (index >= keys.length) {
        clearInterval(timer);
        return;
      }
      const key = keys[index];
      setRevealed((prev) => new Set([...prev, key]));
      setSelectedKey(key);
      index += 1;
    }, 500);
    return () => clearInterval(timer);
  }, [result, workflowMode]);

  const insights = useMemo(
    () => extractAllInsights(result?.responses?.filter((r) => revealed.has((r.agent_key || "").toLowerCase()))),
    [result, revealed]
  );

  const selectedResponse = selectedKey ? responseMap[selectedKey] : null;

  function resetSession() {
    setResult(null);
    setSequentialRun(null);
    setCheckpointNote("");
    setRevealed(new Set());
    setSelectedKey(null);
    setError("");
  }

  async function handleRun() {
    if (question.trim().length < 5) return;
    setLoading(true);
    setError("");
    resetSession();

    try {
      if (workflowMode === "sequential_hitl") {
        const run = await startSequentialRun(question.trim(), model, lang);
        setSequentialRun(run);
        const first = run.responses?.[0];
        if (first) setSelectedKey((first.agent_key || "").toLowerCase());
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
      const last = updated.responses?.[updated.responses.length - 1];
      if (last) setSelectedKey((last.agent_key || "").toLowerCase());
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

  const orderedAgents =
    agents.length > 0
      ? AGENT_ORDER.map((id) => agents.find((a) => a.id === id)).filter(Boolean)
      : AGENT_ORDER.map((id) => ({ id, title: id, theory: "", color: "#78716c" }));

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg bg-muted p-1">
          {WORKFLOW_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                setWorkflowMode(mode);
                resetSession();
              }}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                workflowMode === mode
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t(`roundtable.mode.${mode}`)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <DemoQuestionPicker
            questions={demoQuestions}
            onSelect={setQuestion}
            t={t}
            disabled={loading || Boolean(sequentialRun)}
          />
          <Button onClick={handleRun} disabled={loading || question.trim().length < 5 || Boolean(sequentialRun)}>
            {loading ? t("roundtable.running") : t("roundtable.run")}
          </Button>
        </div>
      </div>

      {apiReady === false && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t("stage3.apiMissing")} <code>backend/.env</code>
        </p>
      )}

      {/* Question */}
      <div className="rounded-2xl border-2 border-primary/15 bg-card p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {t("roundtable.questionLabel")}
        </p>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={2}
          disabled={Boolean(sequentialRun && sequentialRun.status !== "completed")}
          className="mt-2 w-full resize-none border-0 bg-transparent font-display text-2xl font-semibold leading-snug text-foreground focus:outline-none focus:ring-0"
          placeholder={t("stage3.placeholder")}
        />
      </div>

      {/* Personas */}
      <div className="grid grid-cols-2 gap-4 pt-2 lg:grid-cols-4">
        {orderedAgents.map((agent) => {
          const key = agent.id;
          const status = personaStatus(key, {
            loading,
            revealed,
            responses: responseMap,
            errors: errorMap,
          });
          return (
            <AgentPersona
              key={key}
              agentKey={key}
              label={agent.title || agent.id}
              theory={agent.theory}
              color={agent.color}
              status={status}
              selected={selectedKey === key}
              lang={lang}
              onClick={() => responseMap[key] && setSelectedKey(key)}
            />
          );
        })}
      </div>

      {/* Sequential HITL */}
      {sequentialRun && (
        <div className="space-y-4 rounded-2xl border bg-card p-5">
          <SequentialTimeline
            stages={sequentialRun.stages}
            currentVaihe={sequentialRun.current_vaihe}
            responses={sequentialRun.responses}
            t={t}
          />
          {sequentialRun.status === "awaiting_review" && (
            <div className="space-y-3 rounded-xl bg-muted/50 p-4">
              <textarea
                value={checkpointNote}
                onChange={(e) => setCheckpointNote(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                placeholder={t("stage3.checkpointPlaceholder")}
              />
              <Button onClick={handleAdvance} disabled={loading}>
                {sequentialRun.current_vaihe >= 4 ? t("stage3.completeWorkflow") : t("stage3.approveContinue")}
              </Button>
            </div>
          )}
        </div>
      )}

      {error && <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}

      {/* Insights */}
      <InsightBoard
        insights={insights}
        selectedKey={selectedKey}
        onSelect={setSelectedKey}
        title={t("roundtable.insights")}
      />

      {/* Selected response */}
      <AnimatePresence mode="wait">
        {selectedResponse && !selectedResponse.error && (
          <motion.div
            key={selectedKey}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl border bg-card p-5 shadow-sm"
            style={{ borderTopWidth: 4, borderTopColor: selectedResponse.color || "#78716c" }}
          >
            <h3 className="font-display text-xl font-bold">{selectedResponse.agent_label}</h3>
            <div className="mt-4 max-h-[420px] overflow-y-auto">
              <AgentResponse text={selectedResponse.response} compact />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {result && (
        <div className="flex justify-end pt-2">
          <Button onClick={() => navigate("/report")}>{t("stage3.viewReport")}</Button>
        </div>
      )}
    </div>
  );
}
