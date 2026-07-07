import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchComparison, fetchReports, saveHumanAnswers } from "../api";
import { AgentResponse } from "../components/AgentResponse";
import { useLanguage } from "../i18n/LanguageContext";

const emptyPerson = () => ({ name: "", role: "", answer: "" });

export default function Stage5Compare() {
  const { t } = useLanguage();
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
        setReports(list);
        const id = lastId ? Number(lastId) : list[0]?.session_id;
        if (id) loadComparison(id);
      })
      .catch((err) => setError(err.message));
  }, []);

  async function loadComparison(id) {
    setSessionId(id);
    setSaved(false);
    try {
      const data = await fetchComparison(id);
      setComparison(data);
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
    <div className="space-y-6">
      <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-orange-700">{t("stage5.badge")}</p>
        <h2 className="font-display text-3xl font-bold text-stone-900">{t("stage5.title")}</h2>
        <p className="mt-2 text-stone-600">
          {t("stage5.desc")}{" "}
          <code className="rounded bg-stone-100 px-1">cases/&lt;case&gt;/human_answers/</code>.
        </p>
      </section>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {saved && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{t("stage5.saved")}</p>}

      <div className="flex flex-wrap gap-2">
        {reports.map((r) => (
          <button
            key={r.session_id}
            type="button"
            onClick={() => loadComparison(r.session_id)}
            className={`rounded-lg border px-3 py-2 text-sm ${
              sessionId === r.session_id ? "border-orange-400 bg-orange-50" : "border-stone-200"
            }`}
          >
            #{r.session_id}
          </button>
        ))}
      </div>

      {comparison && (
        <>
          <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-semibold text-blue-900">{t("stage5.researchQuestion")}</p>
            <p className="mt-1 text-blue-950">{comparison.question}</p>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-stone-900">{t("stage5.addHuman")}</h3>
            <p className="mt-1 text-sm text-stone-500">{t("stage5.addHumanDesc")}</p>
            <div className="mt-4 space-y-4">
              {people.map((person, index) => (
                <div key={index} className="rounded-xl border border-stone-200 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      value={person.name}
                      onChange={(e) => updatePerson(index, "name", e.target.value)}
                      placeholder={t("stage5.namePh")}
                      className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                    />
                    <input
                      value={person.role}
                      onChange={(e) => updatePerson(index, "role", e.target.value)}
                      placeholder={t("stage5.rolePh")}
                      className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <textarea
                    value={person.answer}
                    onChange={(e) => updatePerson(index, "answer", e.target.value)}
                    rows={4}
                    placeholder={t("stage5.answerPh")}
                    className="mt-3 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                  />
                  {people.length > 1 && (
                    <button type="button" onClick={() => setPeople((p) => p.filter((_, i) => i !== index))} className="mt-2 text-sm text-red-600">
                      {t("stage5.remove")}
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" onClick={() => setPeople((p) => [...p, emptyPerson()])} className="rounded-lg border border-stone-300 px-4 py-2 text-sm">
                {t("stage5.addPerson")}
              </button>
              <button type="button" onClick={handleSaveHuman} disabled={saving} className="rounded-lg bg-orange-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {saving ? t("common.saving") : t("stage5.saveHuman")}
              </button>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-bold text-stone-900">{t("stage5.aiSolutions")}</h3>
            <div className="grid gap-4 lg:grid-cols-2">
              {comparison.agent_solutions.map((a) => (
                <article key={a.agent_label} className="rounded-xl border border-orange-200 bg-orange-50/50 p-4">
                  <h4 className="font-bold text-orange-900">
                    {a.agent_label} — {t("stage5.aiLabel")}
                  </h4>
                  <div className="mt-3 max-h-80 overflow-y-auto">
                    <AgentResponse text={a.solution} compact />
                  </div>
                </article>
              ))}
            </div>
          </section>

          {comparison.human_answers?.length > 0 && (
            <section className="space-y-4">
              <h3 className="text-lg font-bold text-stone-900">{t("stage5.humanSolutions")}</h3>
              <div className="grid gap-4 lg:grid-cols-2">
                {comparison.human_answers.map((h, i) => (
                  <article key={i} className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                    <h4 className="font-bold text-emerald-900">
                      {h.name}
                      {h.role ? ` — ${h.role}` : ""} — {t("stage5.humanLabel")}
                    </h4>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-stone-700">{h.answer}</p>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <div className="flex justify-between">
        <Link to="/report" className="rounded-xl border border-stone-300 px-6 py-3 font-semibold text-stone-700">
          {t("stage5.back")}
        </Link>
      </div>
    </div>
  );
}
