import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ClipboardList, MessageSquare, PenLine } from "lucide-react";
import { fetchReports, fetchRubricScores, saveRubricScores } from "@/api";
import { PageAlert, PageHero, PagePanel } from "@/components/PageChrome";
import { useLanguage } from "@/i18n/LanguageContext";
import { resolvePreferredSessionId, uniqueReportsByQuestion } from "@/utils/uniqueReports";

const CONDITIONS = [
  { id: "baseline", key: "baseline" },
  { id: "single", key: "single" },
  { id: "parallel", key: "parallel" },
  { id: "sequential", key: "sequential" },
];

export default function StudyProtocolPage() {
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const [participantId, setParticipantId] = useState("");
  const [coderId, setCoderId] = useState("coder-1");
  const [condition, setCondition] = useState("parallel");
  const [preSolution, setPreSolution] = useState("");
  const [postSolution, setPostSolution] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const lastId = sessionStorage.getItem("last_session_id");
    fetchReports()
      .then((list) => {
        const unique = uniqueReportsByQuestion(list);
        const id = resolvePreferredSessionId(list, lastId);
        if (id) setSessionId(id);
        else if (unique[0]?.session_id) setSessionId(unique[0].session_id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    fetchRubricScores(sessionId)
      .then((data) => {
        if (data.participant_id) setParticipantId(data.participant_id);
        if (data.condition) setCondition(data.condition);
        if (data.pre_solution) setPreSolution(data.pre_solution);
        if (data.post_solution) setPostSolution(data.post_solution);
        if (data.coder_id) setCoderId(data.coder_id);
      })
      .catch(() => {});
  }, [sessionId]);

  const steps = useMemo(
    () => [
      { n: 1, title: t("study.step1Title"), body: t("study.step1Body"), icon: ClipboardList },
      { n: 2, title: t("study.step2Title"), body: t("study.step2Body"), icon: PenLine },
      { n: 3, title: t("study.step3Title"), body: t("study.step3Body"), icon: MessageSquare },
      { n: 4, title: t("study.step4Title"), body: t("study.step4Body"), icon: PenLine },
    ],
    [t]
  );

  async function saveProgress(extra = {}) {
    if (!sessionId) {
      setError(t("study.needSession"));
      return false;
    }
    setSaving(true);
    setError("");
    try {
      await saveRubricScores(sessionId, {
        participant_id: participantId,
        coder_id: coderId || "coder-1",
        condition,
        pre_solution: preSolution,
        post_solution: postSolution,
        scores: {},
        notes: "",
        ...extra,
      });
      setMessage(t("study.saved"));
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function nextFromStep2() {
    const ok = await saveProgress();
    if (ok) setStep(3);
  }

  async function finish() {
    const ok = await saveProgress();
    if (ok) setStep(5);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHero
        badge={t("study.badge")}
        title={t("study.title")}
        description={<p className="text-slate-400">{t("study.desc")}</p>}
      />

      {error && <PageAlert>{error}</PageAlert>}
      {message && <PageAlert variant="success">{message}</PageAlert>}

      <PagePanel>
        <ol className="flex flex-wrap gap-2">
          {steps.map((s) => (
            <li key={s.n}>
              <button
                type="button"
                onClick={() => setStep(s.n)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  step === s.n
                    ? "bg-orange-700 text-white"
                    : "border border-white/10 bg-slate-950/40 text-slate-300"
                }`}
              >
                {s.n}. {s.title}
              </button>
            </li>
          ))}
        </ol>
      </PagePanel>

      {step === 1 && (
        <PagePanel>
          <h3 className="font-display text-lg font-semibold text-white">{t("study.step1Title")}</h3>
          <p className="mt-1 text-sm text-slate-400">{t("study.step1Body")}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input
              className="page-input"
              placeholder={t("study.participant")}
              value={participantId}
              onChange={(e) => setParticipantId(e.target.value)}
            />
            <input
              className="page-input"
              placeholder={t("study.coder")}
              value={coderId}
              onChange={(e) => setCoderId(e.target.value)}
            />
            <select
              className="page-input sm:col-span-2"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
            >
              {CONDITIONS.map((c) => (
                <option key={c.id} value={c.id}>
                  {t(`study.condition.${c.key}`)}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="page-btn-primary mt-4 px-4 py-2 text-sm"
            onClick={() => setStep(2)}
          >
            {t("common.next")} <ArrowRight className="ml-1 inline h-4 w-4" />
          </button>
        </PagePanel>
      )}

      {step === 2 && (
        <PagePanel>
          <h3 className="font-display text-lg font-semibold text-white">{t("study.step2Title")}</h3>
          <p className="mt-1 text-sm text-slate-400">{t("study.step2Body")}</p>
          <textarea
            className="page-input mt-4 w-full"
            rows={8}
            value={preSolution}
            onChange={(e) => setPreSolution(e.target.value)}
            placeholder={t("study.prePh")}
          />
          <button
            type="button"
            className="page-btn-primary mt-4 px-4 py-2 text-sm disabled:opacity-50"
            disabled={saving || !preSolution.trim()}
            onClick={nextFromStep2}
          >
            {saving ? t("common.saving") : t("study.savePre")}
          </button>
        </PagePanel>
      )}

      {step === 3 && (
        <PagePanel>
          <h3 className="font-display text-lg font-semibold text-white">{t("study.step3Title")}</h3>
          <p className="mt-1 text-sm text-slate-400">{t("study.step3Body")}</p>
          <p className="mt-3 text-sm text-slate-300">
            {t("study.session")}: {sessionId ? `#${sessionId}` : t("study.noSessionYet")}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link to="/question" className="page-btn-primary px-4 py-2 text-sm">
              {t("study.openWorkspace")}
            </Link>
            <button type="button" className="page-btn-secondary px-4 py-2 text-sm" onClick={() => setStep(4)}>
              {t("study.agentsDone")}
            </button>
          </div>
        </PagePanel>
      )}

      {step === 4 && (
        <PagePanel>
          <h3 className="font-display text-lg font-semibold text-white">{t("study.step4Title")}</h3>
          <p className="mt-1 text-sm text-slate-400">{t("study.step4Body")}</p>
          <textarea
            className="page-input mt-4 w-full"
            rows={8}
            value={postSolution}
            onChange={(e) => setPostSolution(e.target.value)}
            placeholder={t("study.postPh")}
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              className="page-btn-primary px-4 py-2 text-sm disabled:opacity-50"
              disabled={saving || !postSolution.trim()}
              onClick={finish}
            >
              {saving ? t("common.saving") : t("study.finish")}
            </button>
            {sessionId && (
              <Link to="/compare" className="page-btn-secondary px-4 py-2 text-sm">
                {t("study.openRubric")}
              </Link>
            )}
          </div>
        </PagePanel>
      )}

      {step === 5 && (
        <PagePanel>
          <h3 className="font-display text-lg font-semibold text-white">{t("study.doneTitle")}</h3>
          <p className="mt-2 text-sm text-slate-300">{t("study.doneBody")}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link to="/compare" className="page-btn-primary px-4 py-2 text-sm">
              {t("study.openRubric")}
            </Link>
            <Link to="/export" className="page-btn-secondary px-4 py-2 text-sm">
              {t("nav.export")}
            </Link>
            <Link to="/present" className="page-btn-secondary px-4 py-2 text-sm">
              {t("nav.present")}
            </Link>
          </div>
        </PagePanel>
      )}
    </div>
  );
}
