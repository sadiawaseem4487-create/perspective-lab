import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  advanceSequentialRun,
  askQuestion,
  checkHealth,
  fetchAgentsCatalog,
  fetchComparison,
  fetchQuestions,
  fetchSelectedModel,
  finalizeSequentialRun,
  startSequentialRun,
} from "@/api";
import { AgentDetailPanel } from "@/components/AgentDetailPanel";
import { AgentPersona } from "@/components/AgentPersona";
import { DemoQuestionPanel } from "@/components/DemoQuestionPicker";
import { GuestChairs } from "@/components/GuestChairs";
import { RunMetadataBar } from "@/components/RunMetadataBar";
import { SequentialFlowGraph } from "@/components/SequentialFlowGraph";
import { Button } from "@/components/ui/button";
import { useAppMode } from "@/context/AppModeContext";
import { cn } from "@/lib/utils";
import { extractInsight } from "@/utils/extractInsights";
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
  const { isDemo } = useAppMode();
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
  const [guestHumans, setGuestHumans] = useState([]);
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
      .then((d) => setDemoQuestions(d.questions || []))
      .catch(() => {});

    fetchSelectedModel()
      .then((d) => setModel(d.model || ""))
      .catch(() => {});
  }, [lang]);

  useEffect(() => {
    resetSession();
    if (isDemo) {
      if (demoQuestions.length > 0) setQuestion(demoQuestions[0].text);
    } else {
      setQuestion("");
    }
  }, [isDemo, lang]);

  useEffect(() => {
    if (isDemo && demoQuestions.length > 0 && !question) {
      setQuestion(demoQuestions[0].text);
    }
  }, [demoQuestions, isDemo, question]);

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
    const sessionId = result?.session_id || Number(sessionStorage.getItem("last_session_id"));
    if (!sessionId) {
      setGuestHumans([]);
      return;
    }
    fetchComparison(sessionId)
      .then((data) => setGuestHumans(data.human_answers || []))
      .catch(() => setGuestHumans([]));
  }, [result?.session_id]);

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
      if (index === 0) setSelectedKey(key);
      index += 1;
    }, 600);
    return () => clearInterval(timer);
  }, [result, workflowMode]);

  const insightMap = useMemo(() => {
    const map = {};
    for (const r of result?.responses || []) {
      const key = (r.agent_key || "").toLowerCase();
      const insight = extractInsight(r);
      if (key && insight) map[key] = insight.headline;
    }
    return map;
  }, [result]);

  const selectedResponse = selectedKey ? responseMap[selectedKey] : null;
  const selectedAgent = agents.find((a) => a.id === selectedKey);
  const allDone = revealed.size >= 4 && result?.responses?.length >= 4;

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
    setResult(null);
    setSequentialRun(null);
    setRevealed(new Set());
    setSelectedKey(null);

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
      : AGENT_ORDER.map((id) => ({ id, title: id, color: "#78716c" }));

  const sessionActive = loading || Boolean(result) || Boolean(sequentialRun);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur-sm">
          {WORKFLOW_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                setWorkflowMode(mode);
                resetSession();
              }}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-all",
                workflowMode === mode
                  ? "bg-white text-slate-900 shadow"
                  : "text-slate-400 hover:text-white"
              )}
            >
              {t(`roundtable.mode.${mode}`)}
            </button>
          ))}
        </div>
        <Button
          size="lg"
          onClick={handleRun}
          disabled={loading || question.trim().length < 5 || Boolean(sequentialRun)}
          className="rounded-full bg-white px-8 text-slate-900 hover:bg-slate-200"
        >
          {loading ? t("roundtable.running") : t("roundtable.run")}
        </Button>
      </div>

      {apiReady === false && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {t("stage3.apiMissing")} <code>backend/.env</code>
        </p>
      )}

      {isDemo && (
        <DemoQuestionPanel
          questions={demoQuestions}
          activeText={question}
          onSelect={setQuestion}
          t={t}
        />
      )}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
        <textarea
          id="research-question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={isDemo ? 2 : 3}
          disabled={Boolean(sequentialRun && sequentialRun.status !== "completed")}
          className="w-full resize-none border-0 bg-transparent text-2xl font-medium leading-snug text-white placeholder:text-slate-500 focus:outline-none"
          placeholder={t("roundtable.questionPlaceholder")}
        />
      </div>

      <RunMetadataBar result={result} loading={loading} isDemo={isDemo} t={t} />

      {loading && result?.responses?.length > 0 && (
        <p className="text-center text-sm text-slate-400">
          {t("roundtable.progress").replace("{count}", String(revealed.size)).replace("{total}", "4")}
        </p>
      )}

      <AnimatePresence mode="wait">
        {sessionActive ? (
          <motion.div
            key={result?.session_id || sequentialRun?.run_id || "loading"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {orderedAgents.map((agent, index) => {
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
                  index={index}
                  agentKey={key}
                  label={agent.title || agent.id}
                  color={agent.color}
                  status={status}
                  selected={selectedKey === key}
                  lang={lang}
                  takeaway={insightMap[key] || ""}
                  readLabel={t("roundtable.tapToRead")}
                  onClick={() => setSelectedKey(key)}
                />
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            key="waiting"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl border border-dashed border-white/15 bg-slate-900/30 px-6 py-14 text-center"
          >
            <p className="text-sm font-medium text-slate-400">{t("roundtable.waiting")}</p>
            <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-500">
              {t("roundtable.summonAgents")}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {sequentialRun && (
        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
            {t("stage3.sequentialTimeline")}
          </p>
          <SequentialFlowGraph
            stages={sequentialRun.stages}
            currentVaihe={sequentialRun.current_vaihe}
            responses={sequentialRun.responses}
            status={sequentialRun.status}
            checkpointNote={checkpointNote}
            onCheckpointNoteChange={setCheckpointNote}
            onAdvance={handleAdvance}
            loading={loading}
            t={t}
          />
        </div>
      )}

      {sessionActive && <GuestChairs humans={guestHumans} showLink />}

      {error && <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}

      {selectedResponse && !selectedResponse.error && (
        <AgentDetailPanel
          agentKey={selectedKey}
          title={selectedAgent?.title || selectedResponse.agent_label}
          color={selectedResponse.color || selectedAgent?.color}
          lang={lang}
          response={selectedResponse.response}
          takeaway={insightMap[selectedKey]}
          diagnosticQuestion={selectedAgent?.diagnostic_question || ""}
          reasoningChain={selectedAgent?.reasoning_chain || []}
          selfCheck={selectedResponse.self_check || null}
          onClose={() => setSelectedKey(null)}
          t={t}
        />
      )}

      {allDone && (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-white/10 pt-4">
          <Button variant="outline" asChild className="rounded-full border-white/20 bg-transparent text-white hover:bg-white/10">
            <Link to="/matrix">{t("shell.matrix")}</Link>
          </Button>
          <Button onClick={() => navigate("/report")} className="rounded-full bg-white text-slate-900 hover:bg-slate-200">
            {t("stage3.viewReport")}
          </Button>
        </div>
      )}
    </div>
  );
}
