import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Lightbulb, ListOrdered, ShieldCheck, X, XCircle } from "lucide-react";
import { runTheoryJudge } from "@/api";
import { AgentAvatar } from "@/components/AgentAvatar";
import { AgentResponse, ResponseSummary } from "@/components/AgentResponse";
import { getAgentLens, getAgentTheorist } from "@/lib/agentIcons";
import { parseAgentResponse } from "@/utils/parseAgentResponse";
import { Button } from "@/components/ui/button";

export function AgentDetailPanel({
  agentKey,
  title,
  color,
  lang,
  response,
  takeaway,
  onClose,
  t,
  diagnosticQuestion = "",
  reasoningChain = [],
  selfCheck = null,
}) {
  const [judge, setJudge] = useState(null);
  const [judgeLoading, setJudgeLoading] = useState(false);
  const [judgeError, setJudgeError] = useState("");

  if (!response) return null;

  const { sections } = parseAgentResponse(response);
  const checks = selfCheck?.checks || [];

  async function handleJudge() {
    setJudgeLoading(true);
    setJudgeError("");
    try {
      const data = await runTheoryJudge(agentKey, response);
      setJudge(data.judge);
    } catch (err) {
      setJudgeError(err.message);
    } finally {
      setJudgeLoading(false);
    }
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/90 shadow-2xl backdrop-blur-xl"
      style={{ boxShadow: `0 0 40px ${color}22` }}
    >
      <div
        className="h-1 w-full"
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
      />

      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div className="flex gap-4">
          <AgentAvatar agentKey={agentKey} color={color} status="done" className="h-24 w-20 shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              {getAgentTheorist(agentKey)}
            </p>
            <h3 className="mt-1 text-xl font-semibold text-white">{title}</h3>
            <p className="mt-1 text-sm text-slate-400">{getAgentLens(agentKey, lang)}</p>
            {diagnosticQuestion && (
              <p className="mt-2 text-sm italic text-slate-300">
                {t?.("roundtable.diagnosticQuestion") || "Diagnostic question"}: {diagnosticQuestion}
              </p>
            )}
          </div>
        </div>
        {onClose && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {reasoningChain?.length > 0 && (
        <div className="mx-5 mt-4 rounded-xl border border-white/10 bg-slate-900/50 px-4 py-3">
          <p className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <ListOrdered className="h-3.5 w-3.5" />
            {t?.("roundtable.reasoningChain") || "Intended reasoning chain"}
          </p>
          <ol className="space-y-1.5 text-sm text-slate-300">
            {reasoningChain.map((step, index) => (
              <li key={step} className="flex gap-2">
                <span className="shrink-0 font-mono text-xs text-orange-400">{index + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {selfCheck && (
        <div className="mx-5 mt-3 rounded-xl border border-white/10 bg-slate-900/40 px-4 py-3">
          <p className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {selfCheck.passed ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <XCircle className="h-3.5 w-3.5 text-amber-400" />
            )}
            {t?.("roundtable.selfCheck") || "Self-check"} —{" "}
            {selfCheck.passed
              ? t?.("roundtable.selfCheckPass") || "passed"
              : t?.("roundtable.selfCheckFail") || "needs review"}
          </p>
          <ul className="space-y-1 text-xs text-slate-400">
            {checks.map((check) => (
              <li key={check.id}>
                <div className="flex gap-2">
                  <span className={check.passed ? "text-emerald-400" : "text-amber-400"}>
                    {check.passed ? "✓" : "!"}
                  </span>
                  <span>
                    {check.id}: {check.detail}
                  </span>
                </div>
                {check.id === "anti_drift" &&
                  (check.warnings || []).map((warning) => (
                    <p key={warning} className="ml-5 mt-0.5 text-amber-300/90">
                      · {warning}
                    </p>
                  ))}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-white/20 bg-transparent text-xs text-white hover:bg-white/10"
              onClick={handleJudge}
              disabled={judgeLoading}
            >
              <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
              {judgeLoading
                ? t?.("roundtable.judgeRunning") || "Judging…"
                : t?.("roundtable.runJudge") || "Run LLM fidelity judge"}
            </Button>
            {judge && (
              <p className={`text-xs ${judge.passed ? "text-emerald-300" : "text-amber-300"}`}>
                {judge.skipped
                  ? judge.detail
                  : `${t?.("roundtable.judgeScore") || "Fidelity"} ${judge.fidelity_score}/5 — ${judge.detail}`}
              </p>
            )}
            {judgeError && <p className="text-xs text-red-300">{judgeError}</p>}
          </div>
        </div>
      )}

      {takeaway && (
        <div className="mx-5 mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-amber-300">
            <Lightbulb className="h-3.5 w-3.5" />
            {t?.("roundtable.keyTakeaway") || "Key takeaway"}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-amber-50">{takeaway}</p>
        </div>
      )}

      {sections.length > 1 && (
        <div className="px-5 pt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {t?.("roundtable.fullAnswer") || "Full answer"} — {sections.length} parts
          </p>
          <ResponseSummary sections={sections} />
        </div>
      )}

      <div className="max-h-[520px] overflow-y-auto px-5 py-4">
        <AgentResponse text={response} compact polished dark />
      </div>
    </motion.section>
  );
}
