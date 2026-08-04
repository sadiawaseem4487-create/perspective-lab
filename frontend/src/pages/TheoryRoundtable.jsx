import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  advanceSequentialRun,
  askQuestion,
  checkHealth,
  fetchAgentsCatalog,
  fetchComparison,
  fetchQuestions,
  fetchReport,
  fetchReports,
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
import { useAuth } from "@/context/AuthContext";
import { useWorkflowMode } from "@/context/WorkflowModeContext";
import { extractInsight } from "@/utils/extractInsights";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  clearDraftQuestion,
  getActiveSessionId,
  getDraftQuestion,
  reportToWorkspaceResult,
  setActiveSessionId,
  setDraftQuestion,
  setPresentPlaylist,
} from "@/utils/sessionWorkspace";
import { MIN_QUESTION_WORDS, assessQuestionQuality } from "@/utils/questionQuality";
import { displayQuestion, uniqueReportsByQuestion } from "@/utils/uniqueReports";

const AGENT_ORDER = ["freire", "weber", "montessori", "rogers"];

function personaStatus(agentKey, { loading, revealed, responses, errors }) {
  if (errors[agentKey]) return "error";
  if (responses[agentKey]) return revealed.has(agentKey) ? "done" : "thinking";
  if (loading) return "thinking";
  return "idle";
}

export default function TheoryRoundtable() {
  const { t, lang } = useLanguage();
  const { isDemo, mode } = useAppMode();
  const { workflowMode, setWorkflowMode } = useWorkflowMode();
  const { llmConfigured, llmSource, personalKey, refresh: refreshAuth, user } = useAuth();
  const navigate = useNavigate();
  const uiMode = isDemo ? "demo" : "live";
  const userId = user?.id;

  const [agents, setAgents] = useState([]);
  const [question, setQuestion] = useState("");
  const [demoQuestions, setDemoQuestions] = useState([]);
  const [sessionList, setSessionList] = useState([]);
  const [activeSessionId, setActiveSessionIdState] = useState(null);
  const [model, setModel] = useState("");
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const [apiReady, setApiReady] = useState(null);
  const [error, setError] = useState("");

  const [result, setResult] = useState(null);
  const [sequentialRun, setSequentialRun] = useState(null);
  const [guestHumans, setGuestHumans] = useState([]);
  const [checkpointNote, setCheckpointNote] = useState("");
  const [revealed, setRevealed] = useState(new Set());
  const [selectedKey, setSelectedKey] = useState(null);
  const askInFlightRef = useRef(false);

  useEffect(() => {
    if (personalKey?.model) setModel(personalKey.model);
  }, [personalKey]);

  function rememberSession(id) {
    setActiveSessionId(id, uiMode, userId);
    setActiveSessionIdState(id);
    setPresentPlaylist(id ? [id] : [], uiMode, userId);
  }

  function applyQuestionText(text, { persistDraft = true } = {}) {
    setQuestion(text);
    if (persistDraft) setDraftQuestion(text, uiMode, userId);
  }

  async function refreshSessionList() {
    try {
      const list = await fetchReports(uiMode);
      setSessionList(uniqueReportsByQuestion(list));
      return list;
    } catch {
      setSessionList([]);
      return [];
    }
  }

  async function loadSession(sessionId, { animateReveal = false } = {}) {
    if (!sessionId) return;
    setError("");
    setSequentialRun(null);
    setCheckpointNote("");
    try {
      const [report, comparison] = await Promise.all([
        fetchReport(sessionId),
        fetchComparison(sessionId).catch(() => ({ human_answers: [] })),
      ]);
      const mapped = reportToWorkspaceResult(report);
      setResult(mapped);
      applyQuestionText(displayQuestion(report.question));
      if (report.workflow_mode === "sequential" || report.workflow_mode === "sequential_hitl") {
        setWorkflowMode(report.workflow_mode);
      } else if (report.workflow_mode === "parallel") {
        setWorkflowMode("parallel");
      }
      setGuestHumans(comparison.human_answers || []);
      rememberSession(sessionId);

      const keys = (mapped.responses || [])
        .map((r) => (r.agent_key || "").toLowerCase())
        .filter(Boolean);
      if (animateReveal && (mapped.workflow_mode || "parallel") === "parallel") {
        setRevealed(new Set());
        setSelectedKey(keys[0] || null);
        let index = 0;
        const timer = setInterval(() => {
          if (index >= keys.length) {
            clearInterval(timer);
            return;
          }
          const key = keys[index];
          setRevealed((prev) => new Set([...prev, key]));
          index += 1;
        }, 400);
      } else {
        setRevealed(new Set(keys));
        setSelectedKey(keys[0] || null);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  function clearRunState() {
    setResult(null);
    setSequentialRun(null);
    setCheckpointNote("");
    setRevealed(new Set());
    setSelectedKey(null);
    setGuestHumans([]);
    setError("");
    setActiveSessionId(null, uiMode, userId);
    setActiveSessionIdState(null);
    setPresentPlaylist([], uiMode, userId);
    clearDraftQuestion(uiMode, userId);
  }

  function startNewProblem() {
    clearRunState();
    applyQuestionText("", { persistDraft: false });
  }

  useEffect(() => {
    let cancelled = false;
    async function refreshHealth() {
      try {
        const me = await refreshAuth();
        const fromAuth = Boolean(me?.llm?.configured);
        const health = await checkHealth();
        const fromHealth = Boolean(health.llm_configured ?? health.openai_configured);
        if (!cancelled) setApiReady(fromAuth || fromHealth);
      } catch {
        if (!cancelled) setApiReady(Boolean(llmConfigured));
      }
    }
    refreshHealth();
    window.addEventListener("focus", refreshHealth);
    const id = window.setInterval(refreshHealth, 15000);

    fetchAgentsCatalog()
      .then((d) => {
        if (!cancelled) setAgents(d.main_agents || []);
      })
      .catch(() => {});

    fetchQuestions(lang)
      .then((d) => {
        if (!cancelled) setDemoQuestions(d.questions || []);
      })
      .catch(() => {});

    fetchSelectedModel()
      .then((d) => {
        if (!cancelled) {
          setModel(personalKey?.model || d.model || "");
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      window.removeEventListener("focus", refreshHealth);
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  // Hydrate only this user's last in-progress workspace — never auto-run agents.
  // First login / no saved session → empty framing + guidelines.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setRestoring(true);
      setResult(null);
      setSequentialRun(null);
      setRevealed(new Set());
      setSelectedKey(null);
      setGuestHumans([]);
      setError("");
      setLoading(false);

      try {
        const list = await refreshSessionList();
        if (cancelled) return;

        const preferred = getActiveSessionId(uiMode, userId);
        const exists = preferred && list.some((r) => r.session_id === preferred);
        const draft = getDraftQuestion(uiMode, userId);

        if (exists) {
          await loadSession(preferred, { animateReveal: false });
        } else if (draft && draft.trim()) {
          applyQuestionText(draft, { persistDraft: false });
          setActiveSessionIdState(null);
        } else {
          applyQuestionText("", { persistDraft: false });
          setActiveSessionIdState(null);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || String(err));
      } finally {
        if (!cancelled) setRestoring(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, userId]);

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
    const sessionId = result?.session_id || activeSessionId;
    if (!sessionId) {
      setGuestHumans([]);
      return;
    }
    fetchComparison(sessionId)
      .then((data) => setGuestHumans(data.human_answers || []))
      .catch(() => setGuestHumans([]));
  }, [result?.session_id, activeSessionId]);

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

  async function handleRun() {
    if (askInFlightRef.current || loading || restoring) return;
    if (!assessQuestionQuality(question).ok) return;

    // Lock + UI feedback immediately so double-clicks cannot fire a second ask
    askInFlightRef.current = true;
    setLoading(true);
    setError("");
    setResult(null);
    setSequentialRun(null);
    setRevealed(new Set());
    setSelectedKey(null);

    try {
      const alreadyReady = Boolean(llmConfigured || apiReady || personalKey?.configured);
      let ready = alreadyReady;
      if (!alreadyReady) {
        const me = await refreshAuth().catch(() => null);
        ready = Boolean(
          me?.llm?.configured || llmConfigured || apiReady || personalKey?.configured
        );
        setApiReady(ready);
      }
      if (!ready) {
        setError(t("stage3.apiMissing"));
        navigate("/settings?tab=api");
        return;
      }

      if (workflowMode === "sequential_hitl") {
        const run = await startSequentialRun(question.trim(), model, lang, uiMode);
        setSequentialRun(run);
        const first = run.responses?.[0];
        if (first) setSelectedKey((first.agent_key || "").toLowerCase());
      } else {
        const data = await askQuestion(question.trim(), model, lang, workflowMode, uiMode);
        setResult(data);
        rememberSession(data.session_id);
        setDraftQuestion(question.trim(), uiMode, userId);
        await refreshSessionList();

        const keys = (data.responses || [])
          .map((r) => (r.agent_key || "").toLowerCase())
          .filter(Boolean);
        const failed = (data.responses || []).filter((r) => r.error);
        if (failed.length) {
          setError(
            t("roundtable.partialFail").replace("{count}", String(failed.length))
          );
        }
        if (workflowMode === "parallel") {
          // Reveal all at once — staged timers felt like the app was stuck / needed another click
          setRevealed(new Set(keys));
          setSelectedKey(keys[0] || null);
        } else {
          setRevealed(new Set(keys));
          setSelectedKey(keys[0] || null);
        }
      }
    } catch (err) {
      setError(err.message || t("roundtable.askFailed"));
    } finally {
      askInFlightRef.current = false;
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
        rememberSession(updated.session_id);
        setResult({
          session_id: updated.session_id,
          question: updated.question,
          workflow_mode: "sequential",
          responses: updated.responses,
        });
        await refreshSessionList();
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
  const currentSessionId = result?.session_id || activeSessionId;
  const quality = assessQuestionQuality(question);
  const wordCount = quality.wordCount;
  const framingReady = quality.ok;
  const keyReady = Boolean(llmConfigured || apiReady || personalKey?.configured);
  // Enable Ask whenever framing is ready — missing key routes to Settings on click
  const canAsk = !loading && !restoring && framingReady && !sequentialRun;

  const qualityHint = (() => {
    if (framingReady) {
      return t("roundtable.wordCountOk").replace("{count}", String(wordCount));
    }
    const key = {
      too_short: "roundtable.wordCountHint",
      repetitive: "roundtable.qualityRepetitive",
      junk: "roundtable.qualityJunk",
    }[quality.reason] || "roundtable.wordCountHint";
    return t(key)
      .replace("{min}", String(MIN_QUESTION_WORDS))
      .replace("{count}", String(wordCount));
  })();

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="max-w-3xl space-y-3">
        <p className="type-kicker">{t("workspace.heroBadge")}</p>
        <h1 className="type-page-title">{t("workspace.heroTitle")}</h1>
        <p className="type-body">
          {isDemo ? t("workspace.heroDescDemo") : t("workspace.heroDesc")}
        </p>
      </header>

      {!keyReady && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <p>{t("stage3.apiMissing")}</p>
          <Link
            to="/settings?tab=api"
            className="mt-2 inline-flex page-btn-primary px-3 py-1.5 text-xs"
          >
            {t("stage3.openSettings")}
          </Link>
        </div>
      )}

      {keyReady && llmSource === "server" && !personalKey?.configured && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-100/90">
          <p>{t("stage3.apiUsingServer")}</p>
        </div>
      )}

      {restoring && (
        <p className="text-sm text-slate-400">{t("workspace.restoring")}</p>
      )}

      {!restoring && !question.trim() && !result && !sequentialRun && !loading && (
        <div className="rounded-2xl border border-orange-500/25 bg-orange-500/5 px-5 py-4 text-sm text-slate-300">
          <p className="font-semibold text-slate-100">{t("workspace.guideTitle")}</p>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-slate-400">
            <li>{t("workspace.guide1")}</li>
            <li>{t("workspace.guide2")}</li>
            <li>{t("workspace.guide3")}</li>
            <li>{t("workspace.guide4")}</li>
          </ol>
          <p className="mt-3 text-xs text-slate-500">{t("workspace.guideHint")}</p>
        </div>
      )}

      {isDemo && (
        <DemoQuestionPanel
          questions={demoQuestions}
          activeText={question}
          onSelect={(text) => {
            if (result || sequentialRun) clearRunState();
            applyQuestionText(text);
          }}
          t={t}
        />
      )}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md sm:p-5">
        <textarea
          id="research-question"
          value={question}
          onChange={(e) => applyQuestionText(e.target.value)}
          rows={isDemo ? 12 : 6}
          disabled={Boolean(sequentialRun && sequentialRun.status !== "completed")}
          className="w-full resize-y border-0 bg-transparent font-sans text-[length:var(--text-body)] font-normal leading-[var(--leading-body)] text-slate-200 placeholder:text-slate-500 focus:outline-none"
          placeholder={t("roundtable.questionPlaceholder")}
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3 text-xs">
          <p className={framingReady ? "text-slate-500" : "text-amber-200/90"}>
            {qualityHint}
          </p>
          <p className="tabular-nums text-slate-500">
            {wordCount}/{MIN_QUESTION_WORDS}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {(result || question.trim()) ? (
          <button
            type="button"
            onClick={startNewProblem}
            className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            {t("workspace.newProblem")}
          </button>
        ) : (
          <span />
        )}
        <Button
          size="lg"
          onClick={handleRun}
          disabled={!canAsk}
          className="rounded-full bg-white px-8 text-slate-900 hover:bg-slate-200"
        >
          {loading ? t("roundtable.running") : t("roundtable.run")}
        </Button>
      </div>

      <RunMetadataBar result={result} loading={loading} isDemo={isDemo} t={t} />

      {loading && !result?.responses?.length && (
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm text-slate-300">
          <p className="font-medium text-slate-100">{t("roundtable.running")}</p>
          <p className="mt-1 text-xs text-slate-500">
            Four theory agents answer in parallel. Free cloud hosting can wake slowly on the first ask.
          </p>
        </div>
      )}

      <AnimatePresence mode="wait">
        {sessionActive ? (
          <motion.div
            key={result?.session_id || sequentialRun?.run_id || "loading"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-5"
          >
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {t("roundtable.agentStrip")}
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
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
                      onClick={() => setSelectedKey(key)}
                    />
                  );
                })}
              </div>
            </div>

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

            {selectedResponse?.error && (
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {selectedResponse.error}
              </p>
            )}
          </motion.div>
        ) : (
          <motion.p
            key="waiting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center text-sm text-slate-500"
          >
            {t("roundtable.summonAgents")}
          </motion.p>
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

      {error && <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}

      {(guestHumans.length > 0 || allDone) && (
        <GuestChairs
          humans={guestHumans}
          showLink
          compactEmpty
          sessionId={currentSessionId || undefined}
        />
      )}

      {allDone && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {t("workspace.nextSteps")}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              asChild
              className="rounded-full border-white/20 bg-transparent text-white hover:bg-white/10"
            >
              <Link to="/report">{t("nav.report")}</Link>
            </Button>
            <Button
              variant="outline"
              asChild
              className="rounded-full border-white/20 bg-transparent text-white hover:bg-white/10"
            >
              <Link to="/compare">{t("nav.compare")}</Link>
            </Button>
            <Button
              variant="outline"
              asChild
              className="rounded-full border-white/20 bg-transparent text-white hover:bg-white/10"
            >
              <Link to={currentSessionId ? `/share?session=${currentSessionId}` : "/share"}>
                {t("nav.share")}
              </Link>
            </Button>
            <Button
              asChild
              className="rounded-full bg-white text-slate-900 hover:bg-slate-200"
            >
              <Link to="/present">{t("nav.present")}</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
