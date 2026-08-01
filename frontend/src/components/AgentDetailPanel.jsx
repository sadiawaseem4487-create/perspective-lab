import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, ChevronDown, BookOpen, Lightbulb, ShieldCheck, X, XCircle } from "lucide-react";
import { runTheoryJudge } from "@/api";
import { AgentAvatar } from "@/components/AgentAvatar";
import { AgentResponse } from "@/components/AgentResponse";
import { getAgentLens, getAgentTheorist } from "@/lib/agentIcons";
import { extractHighlights } from "@/utils/extractInsights";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Clear reading layers:
 * 1) Who + takeaway
 * 2) A few highlights
 * 3) Full analysis (opt-in)
 * 4) Research notes (opt-in, last)
 */
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
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [researchOpen, setResearchOpen] = useState(false);

  if (!response) return null;

  const theorist = getAgentTheorist(agentKey);
  const lens = getAgentLens(agentKey, lang);
  const highlights = extractHighlights(response, 4);
  const checks = selfCheck?.checks || [];
  const hasResearch =
    (reasoningChain && reasoningChain.length > 0) ||
    Boolean(selfCheck) ||
    Boolean(diagnosticQuestion);

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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/90 shadow-xl backdrop-blur-xl"
    >
      <div
        className="h-0.5 w-full"
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
      />

      {/* Who */}
      <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <AgentAvatar agentKey={agentKey} color={color} status="done" className="h-11 w-9 shrink-0" />
          <div className="min-w-0">
            <h3 className="font-display text-lg font-semibold text-white">{theorist || title}</h3>
            <p className="text-sm text-slate-400">{lens}</p>
          </div>
        </div>
        {onClose && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="shrink-0 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="space-y-4 px-5 pb-4">
        {/* 1. Takeaway */}
        {takeaway && (
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-300/90">
              <Lightbulb className="h-3.5 w-3.5" />
              {t?.("roundtable.keyTakeaway") || "Key takeaway"}
            </p>
            <p className="mt-2 text-base font-medium leading-relaxed text-white">{takeaway}</p>
          </div>
        )}

        {/* 2. Highlights */}
        {highlights.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {t?.("roundtable.highlights") || "Main points"}
            </p>
            <ul className="mt-2 space-y-2">
              {highlights.map((point) => (
                <li key={point} className="flex gap-2.5 text-sm leading-relaxed text-slate-300">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-orange-400/80" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 3. Full analysis — closed by default */}
        <div className="border-t border-white/10 pt-3">
          <button
            type="button"
            onClick={() => setAnalysisOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-2 text-left"
            aria-expanded={analysisOpen}
          >
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-300/90">
              <BookOpen className="h-3.5 w-3.5" />
              {t?.("roundtable.fullAnalysis") || "Full analysis"}
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-amber-300/70 transition-transform",
                analysisOpen && "rotate-180"
              )}
            />
          </button>
          <div
            className={cn(
              "grid transition-[grid-template-rows] duration-200 ease-out",
              analysisOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            )}
          >
            <div className="overflow-hidden">
              <div className="max-h-[22rem] overflow-y-auto pt-2">
                <AgentResponse
                  text={response}
                  compact
                  polished
                  dark
                  collapsible
                  layout="readable"
                  readableLabels={{
                    diagnosis: t?.("roundtable.analysisDiagnosis") || "What's going on",
                    actions: t?.("roundtable.analysisActions") || "What to do",
                    why: t?.("roundtable.analysisWhy") || "Why this lens",
                    limits: t?.("roundtable.analysisLimits") || "Limits",
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 4. Research notes — closed, last, quieter */}
        {hasResearch && (
          <div className="border-t border-white/10 pt-3">
            <button
              type="button"
              onClick={() => setResearchOpen((v) => !v)}
              className="flex w-full items-center justify-between gap-2 text-left text-xs text-slate-500 hover:text-slate-300"
              aria-expanded={researchOpen}
            >
              <span>{t?.("roundtable.researchNotes") || "Research notes"}</span>
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", researchOpen && "rotate-180")} />
            </button>

            <div
              className={cn(
                "grid transition-[grid-template-rows] duration-200 ease-out",
                researchOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              )}
            >
              <div className="overflow-hidden">
                <div className="space-y-3 pt-3 text-sm text-slate-400">
                  {diagnosticQuestion && (
                    <p>
                      <span className="font-medium text-slate-300">
                        {t?.("roundtable.diagnosticQuestion") || "Focus"}:{" "}
                      </span>
                      {diagnosticQuestion}
                    </p>
                  )}

                  {reasoningChain?.length > 0 && (
                    <ol className="list-decimal space-y-1 pl-4">
                      {reasoningChain.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  )}

                  {selfCheck && (
                    <div className="space-y-2">
                      <p className="flex items-center gap-1.5 text-xs">
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
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 border-white/15 bg-transparent text-xs text-slate-300 hover:bg-white/5"
                        onClick={handleJudge}
                        disabled={judgeLoading}
                      >
                        <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                        {judgeLoading
                          ? t?.("roundtable.judgeRunning") || "Judging…"
                          : t?.("roundtable.runJudge") || "Check theory fidelity"}
                      </Button>
                      {judge && (
                        <p className={`text-xs ${judge.passed ? "text-emerald-300" : "text-amber-300"}`}>
                          {judge.skipped
                            ? judge.detail
                            : `${t?.("roundtable.judgeScore") || "Fidelity"} ${judge.fidelity_score}/5 — ${judge.detail}`}
                        </p>
                      )}
                      {judgeError && <p className="text-xs text-red-300">{judgeError}</p>}
                      {/* Technical check ids only if something failed */}
                      {!selfCheck.passed && checks.length > 0 && (
                        <ul className="space-y-1 text-xs text-slate-500">
                          {checks
                            .filter((c) => !c.passed)
                            .map((check) => (
                              <li key={check.id}>
                                {check.id}: {check.detail}
                              </li>
                            ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.section>
  );
}
