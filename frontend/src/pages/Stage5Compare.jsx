import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Presentation, Users } from "lucide-react";
import { fetchComparison, fetchReports, saveHumanAnswers } from "../api";
import { AgentAvatar } from "../components/AgentAvatar";
import { AgentResponse } from "../components/AgentResponse";
import { GuestChairs } from "../components/GuestChairs";
import { PageAlert, PageHero, PagePanel } from "../components/PageChrome";
import { RubricScorePanel } from "../components/RubricScorePanel";
import { SessionQuestionPicker } from "../components/SessionQuestionPicker";
import { useLanguage } from "../i18n/LanguageContext";
import { getAgentLens, getAgentTheorist } from "@/lib/agentIcons";
import {
  displayQuestion,
  resolvePreferredSessionId,
  uniqueReportsByQuestion,
} from "@/utils/uniqueReports";

const emptyPerson = () => ({ name: "", role: "", answer: "" });

export default function Stage5Compare() {
  const { t, lang } = useLanguage();
  const [reports, setReports] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [people, setPeople] = useState([emptyPerson()]);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const lastId = sessionStorage.getItem("last_session_id");
    fetchReports()
      .then((list) => {
        const unique = uniqueReportsByQuestion(list);
        setReports(unique);
        const id = resolvePreferredSessionId(list, lastId);
        if (id) loadComparison(id);
      })
      .catch((err) => setError(err.message));
  }, []);

  async function loadComparison(id) {
    setSessionId(id);
    setSaved(false);
    try {
      const data = await fetchComparison(id);
      setComparison({
        ...data,
        question: displayQuestion(data.question),
      });
      setPeople(data.human_answers?.length ? data.human_answers : [emptyPerson()]);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }

  function updatePerson(index, field, value) {
    setPeople((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  }

  async function handleSaveHuman() {
    setSaving(true);
    setError("");
    try {
      const valid = people.filter((p) => p.name.trim() && p.answer.trim().length >= 5);
      if (valid.length === 0) throw new Error(t("stage5.needPerson"));
      await saveHumanAnswers(sessionId, valid);
      await loadComparison(sessionId);
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHero
        badge={t("stage5.badge")}
        title={t("stage5.title")}
        description={<p className="max-w-2xl text-slate-400">{t("stage5.desc")}</p>}
      />

      {error && <PageAlert>{error}</PageAlert>}
      {saved && <PageAlert variant="success">{t("stage5.saved")}</PageAlert>}

      <PagePanel className="!py-4">
        <SessionQuestionPicker
          reports={reports}
          sessionId={sessionId}
          onSelect={loadComparison}
          label={t("stage5.pickSession")}
          showingLabel={t("stage5.showingSession")}
          runsLabel={t("stage5.runs")}
        />
        <p className="mt-2 text-xs text-slate-500">{t("stage5.uniqueHint")}</p>
      </PagePanel>

      {comparison && (
        <>
          <section className="relative overflow-hidden rounded-2xl border border-sky-500/20 bg-sky-500/10 px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300/90">
              {t("stage5.researchQuestion")}
            </p>
            <p className="mt-2 font-display text-xl font-semibold leading-snug text-white sm:text-2xl">
              {comparison.question}
            </p>
          </section>

          <PagePanel>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-xl font-semibold text-white">
                  {t("stage5.addHuman")}
                </h3>
                <p className="mt-1 text-sm text-slate-400">{t("stage5.addHumanDesc")}</p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {people.map((person, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 sm:p-5"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      value={person.name}
                      onChange={(e) => updatePerson(index, "name", e.target.value)}
                      placeholder={t("stage5.namePh")}
                      className="page-input"
                    />
                    <input
                      value={person.role}
                      onChange={(e) => updatePerson(index, "role", e.target.value)}
                      placeholder={t("stage5.rolePh")}
                      className="page-input"
                    />
                  </div>
                  <textarea
                    value={person.answer}
                    onChange={(e) => updatePerson(index, "answer", e.target.value)}
                    rows={4}
                    placeholder={t("stage5.answerPh")}
                    className="page-input mt-3 w-full"
                  />
                  {people.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setPeople((p) => p.filter((_, i) => i !== index))}
                      className="mt-2 text-sm text-red-400 hover:text-red-300"
                    >
                      {t("stage5.remove")}
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setPeople((p) => [...p, emptyPerson()])}
                className="page-btn-secondary px-4 py-2 text-sm"
              >
                {t("stage5.addPerson")}
              </button>
              <button
                type="button"
                onClick={handleSaveHuman}
                disabled={saving}
                className="page-btn-primary px-4 py-2 text-sm"
              >
                {saving ? t("common.saving") : t("stage5.saveHuman")}
              </button>
            </div>
          </PagePanel>

          <section className="space-y-4">
            <h3 className="font-display text-xl font-semibold text-white">
              {t("stage5.aiSolutions")}
            </h3>
            <div className="grid gap-4 lg:grid-cols-2">
              {comparison.agent_solutions.map((a) => {
                const key = a.agent_key || "";
                const theorist = getAgentTheorist(key) || a.title || a.agent_label;
                const lens = getAgentLens(key, lang);
                return (
                  <article
                    key={`${key}-${a.agent_number}`}
                    className="overflow-hidden rounded-2xl border border-orange-500/25 bg-orange-500/[0.07]"
                  >
                    <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
                      <AgentAvatar
                        agentKey={key || "freire"}
                        color={a.color || "#c2410c"}
                        status="done"
                        className="h-14 w-12 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-orange-300/80">
                          {t("stage5.aiLabel")}
                        </p>
                        <h4 className="truncate font-semibold text-white">{theorist}</h4>
                        {lens && <p className="truncate text-xs text-slate-400">{lens}</p>}
                      </div>
                    </div>
                    <div className="max-h-72 overflow-y-auto p-4">
                      <AgentResponse text={a.solution} compact polished dark />
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <GuestChairs humans={comparison.human_answers || []} />
        </>
      )}

      {sessionId && <RubricScorePanel sessionId={sessionId} t={t} />}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6">
        <Link to="/report" className="page-btn-secondary px-5 py-2.5 text-sm">
          {t("stage5.back")}
        </Link>
        <Link
          to="/present"
          className="page-btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm"
        >
          <Presentation className="h-4 w-4" />
          {t("nav.present")}
        </Link>
      </div>
    </div>
  );
}
