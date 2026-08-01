import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Bot, Users } from "lucide-react";
import { fetchComparison, fetchReports, saveHumanAnswers } from "../api";
import { AgentAvatar } from "../components/AgentAvatar";
import { AgentResponse } from "../components/AgentResponse";
import { GuestResponsesPanel } from "../components/GuestResponsesPanel";
import { PageAlert, PageHero, PagePanel, ResearchQuestionBlock } from "../components/PageChrome";
import { useLanguage } from "../i18n/LanguageContext";
import { useAppMode } from "@/context/AppModeContext";
import { useAuth } from "@/context/AuthContext";
import { getAgentLens, getAgentTheorist } from "@/lib/agentIcons";
import { cn } from "@/lib/utils";
import { getActiveSessionId, setActiveSessionId } from "@/utils/sessionWorkspace";
import {
  displayQuestion,
  resolvePreferredSessionId,
  uniqueReportsByQuestion,
} from "@/utils/uniqueReports";

const emptyPerson = () => ({
  name: "",
  role: "",
  organization: "",
  email: "",
  answer: "",
});

const TABS = [
  { id: "agents", icon: Bot, labelKey: "stage5.tabAgents" },
  { id: "guests", icon: Users, labelKey: "stage5.tabGuests" },
];

/**
 * Compare: agent answers vs guest answers for one research question.
 * Invite creation lives on /share.
 */
export default function Stage5Compare() {
  const { t, lang } = useLanguage();
  const { isDemo } = useAppMode();
  const { user } = useAuth();
  const userId = user?.id;
  const uiMode = isDemo ? "demo" : "live";
  const [params] = useSearchParams();
  const [sessionId, setSessionId] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [manual, setManual] = useState(emptyPerson());
  const [showManual, setShowManual] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("agents");

  useEffect(() => {
    const fromQuery = Number(params.get("session"));
    const tabQuery = params.get("tab");
    if (tabQuery === "guests" || tabQuery === "agents") {
      setTab(tabQuery);
    } else if (tabQuery === "score") {
      setTab("agents");
    }

    async function hydrate() {
      setLoading(true);
      try {
        const list = await fetchReports(uiMode);
        const unique = uniqueReportsByQuestion(list);
        const id =
          fromQuery ||
          resolvePreferredSessionId(list, getActiveSessionId(uiMode, userId)) ||
          unique[0]?.session_id;
        if (!id) {
          setSessionId(null);
          setComparison(null);
          return;
        }
        await loadComparison(id);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    hydrate();

    function onFocus() {
      hydrate();
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, uiMode]);

  async function loadComparison(id) {
    setSessionId(id);
    setActiveSessionId(id, uiMode, userId);
    setSaved(false);
    setManual(emptyPerson());
    setShowManual(false);
    try {
      const data = await fetchComparison(id);
      setComparison({
        ...data,
        question: displayQuestion(data.question),
      });
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSaveManual() {
    setSaving(true);
    setError("");
    try {
      if (!manual.name.trim() || manual.answer.trim().length < 5) {
        throw new Error(t("stage5.needPerson"));
      }
      await saveHumanAnswers(sessionId, [{ ...manual, source: "manual" }]);
      await loadComparison(sessionId);
      setSaved(true);
      setTab("guests");
      setShowManual(false);
      setManual(emptyPerson());
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const guestCount = comparison?.human_answers?.length || 0;
  const agentCount = comparison?.agent_solutions?.length || 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHero
        badge={t("stage5.badge")}
        title={t("stage5.title")}
        size="sm"
        description={<p className="max-w-xl text-slate-400">{t("stage5.descSimple")}</p>}
      />

      {error && <PageAlert>{error}</PageAlert>}
      {saved && <PageAlert variant="success">{t("stage5.saved")}</PageAlert>}

      {loading && (
        <PagePanel>
          <p className="text-sm text-slate-400">{t("common.loading") || "Loading…"}</p>
        </PagePanel>
      )}

      {!loading && !comparison && (
        <PagePanel>
          <p className="text-sm text-slate-300">{t("stage5.noSession")}</p>
          <Link to="/question" className="page-btn-primary mt-4 inline-flex px-4 py-2 text-sm">
            {t("stage5.runFirst")}
          </Link>
        </PagePanel>
      )}

      {comparison && (
        <>
          <ResearchQuestionBlock
            label={t("stage5.researchQuestion")}
            question={comparison.question}
            meta={`${agentCount} ${t("stage5.agentsShort")}${
              guestCount > 0 ? ` · ${guestCount} ${t("stage5.guestsShort")}` : ""
            }`}
          />

          <div className="flex flex-wrap gap-1.5 rounded-lg border border-white/10 bg-slate-950/50 p-1">
            {TABS.map(({ id, icon: Icon, labelKey }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "inline-flex min-w-[6.5rem] flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 font-medium transition-colors",
                  "text-[length:var(--text-sm)]",
                  tab === id
                    ? "bg-orange-600 text-white shadow-sm"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {t(labelKey)}
                  {id === "agents" && agentCount > 0 ? ` (${agentCount})` : ""}
                  {id === "guests" && guestCount > 0 ? ` (${guestCount})` : ""}
                </span>
              </button>
            ))}
          </div>

          {tab === "agents" && (
            <section className="space-y-3">
              <p className="text-xs text-slate-500">{t("stage5.aiSolutionsDesc")}</p>
              <div className="grid gap-3 lg:grid-cols-2">
                {(comparison.agent_solutions || []).map((a) => {
                  const key = a.agent_key || "";
                  const theorist = getAgentTheorist(key) || a.title || a.agent_label;
                  const lens = getAgentLens(key, lang);
                  return (
                    <article
                      key={`${key}-${a.agent_number}`}
                      className="overflow-hidden rounded-xl border border-orange-500/25 bg-orange-500/[0.07]"
                    >
                      <div className="flex items-center gap-2.5 border-b border-white/10 px-3 py-2">
                        <AgentAvatar
                          agentKey={key || "freire"}
                          color={a.color || "#c2410c"}
                          status="done"
                          className="h-10 w-8 shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="truncate text-sm font-semibold text-white">{theorist}</h4>
                          {lens && <p className="truncate text-[11px] text-slate-500">{lens}</p>}
                        </div>
                      </div>
                      <div className="max-h-64 overflow-y-auto px-3 py-2">
                        <AgentResponse text={a.solution} compact polished dark />
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {tab === "guests" && (
            <div className="space-y-4">
              <GuestResponsesPanel
                sessionId={sessionId}
                humans={comparison.human_answers || []}
                capacity={100}
                compact
                inviteHref={`/share?session=${sessionId}`}
                onRefresh={() => loadComparison(sessionId)}
              />

              <PagePanel>
                {!showManual ? (
                  <button
                    type="button"
                    onClick={() => setShowManual(true)}
                    className="page-btn-secondary px-4 py-2 text-sm"
                  >
                    {t("stage5.addOneManual")}
                  </button>
                ) : (
                  <>
                    <h3 className="type-section">{t("stage5.addOneManual")}</h3>
                    <p className="type-sm mt-1">{t("stage5.addOneManualDesc")}</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <input
                        value={manual.name}
                        onChange={(e) => setManual((p) => ({ ...p, name: e.target.value }))}
                        placeholder={t("stage5.namePh")}
                        className="page-input"
                      />
                      <input
                        value={manual.role}
                        onChange={(e) => setManual((p) => ({ ...p, role: e.target.value }))}
                        placeholder={t("stage5.rolePh")}
                        className="page-input"
                      />
                      <input
                        value={manual.organization}
                        onChange={(e) => setManual((p) => ({ ...p, organization: e.target.value }))}
                        placeholder={t("stage5.orgPh")}
                        className="page-input"
                      />
                      <input
                        type="email"
                        value={manual.email}
                        onChange={(e) => setManual((p) => ({ ...p, email: e.target.value }))}
                        placeholder={t("stage5.emailPh")}
                        className="page-input"
                      />
                    </div>
                    <textarea
                      value={manual.answer}
                      onChange={(e) => setManual((p) => ({ ...p, answer: e.target.value }))}
                      rows={4}
                      placeholder={t("stage5.answerPh")}
                      className="page-input mt-3 w-full"
                    />
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleSaveManual}
                        disabled={saving}
                        className="page-btn-primary px-4 py-2 text-sm"
                      >
                        {saving ? t("common.saving") : t("stage5.saveHuman")}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowManual(false);
                          setManual(emptyPerson());
                        }}
                        className="page-btn-secondary px-4 py-2 text-sm"
                      >
                        {t("common.cancel") || "Cancel"}
                      </button>
                    </div>
                  </>
                )}
              </PagePanel>
            </div>
          )}
        </>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
        <Link to="/question" className="page-btn-secondary px-4 py-2 text-xs">
          {t("stage5.backWorkspace")}
        </Link>
        <div className="flex flex-wrap gap-2">
          <Link to="/matrix" className="page-btn-secondary px-4 py-2 text-xs">
            {t("shell.matrix")}
          </Link>
          {sessionId && (
            <Link to={`/share?session=${sessionId}`} className="page-btn-secondary px-4 py-2 text-xs">
              {t("nav.share")}
            </Link>
          )}
          <Link to="/report" className="page-btn-primary px-4 py-2 text-xs">
            {t("nav.report")}
          </Link>
        </div>
      </div>
    </div>
  );
}
