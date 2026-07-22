import { useEffect, useState } from "react";
import { fetchRubricScores, saveRubricScores } from "@/api";
import { PagePanel } from "@/components/PageChrome";

const CONDITIONS = [
  { id: "baseline", label: "Baseline (human alone)" },
  { id: "single", label: "Single agent" },
  { id: "parallel", label: "Parallel multi-theory" },
  { id: "sequential", label: "Sequential chain" },
];

const EMPTY_SCORES = { PS1: 0, PS2: 0, PS3: 0, PS4: 0, PS5: 0, PS6: 0 };

export function RubricScorePanel({ sessionId, t }) {
  const [dimensions, setDimensions] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [interRater, setInterRater] = useState(null);
  const [form, setForm] = useState({
    participant_id: "",
    coder_id: "",
    condition: "parallel",
    pre_solution: "",
    post_solution: "",
    scores: { ...EMPTY_SCORES },
    notes: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function applyPayload(data) {
    setDimensions(data.dimensions || []);
    setRatings(data.ratings || []);
    setInterRater(data.inter_rater || null);
    setForm({
      participant_id: data.participant_id || "",
      coder_id: data.coder_id || "",
      condition: data.condition || "parallel",
      pre_solution: data.pre_solution || "",
      post_solution: data.post_solution || "",
      scores: { ...EMPTY_SCORES, ...(data.scores || {}) },
      notes: data.notes || "",
    });
  }

  useEffect(() => {
    if (!sessionId) return;
    setMessage("");
    setError("");
    fetchRubricScores(sessionId)
      .then(applyPayload)
      .catch((err) => setError(err.message));
  }, [sessionId]);

  function setScore(id, value) {
    setForm((prev) => ({
      ...prev,
      scores: { ...prev.scores, [id]: Number(value) },
    }));
  }

  function loadCoder(coderId) {
    const rating = ratings.find((r) => r.coder_id === coderId);
    if (!rating) return;
    setForm((prev) => ({
      ...prev,
      coder_id: rating.coder_id,
      scores: { ...EMPTY_SCORES, ...(rating.scores || {}) },
      notes: rating.notes || "",
    }));
  }

  async function handleSave() {
    if (!sessionId) return;
    if (!form.coder_id.trim()) {
      setError(t?.("rubric.needCoder") || "Enter a coder ID for inter-rater scoring.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const scored = Object.fromEntries(
        Object.entries(form.scores).filter(([, v]) => Number(v) >= 1)
      );
      const saved = await saveRubricScores(sessionId, { ...form, scores: scored });
      applyPayload(saved);
      setMessage(t?.("rubric.saved") || "Rubric scores saved.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!sessionId) return null;

  return (
    <PagePanel>
      <h3 className="font-display text-xl font-semibold text-white">
        {t?.("rubric.title") || "Problem-solving rubric"}
      </h3>
      <p className="mt-1 text-sm text-slate-400">
        {t?.("rubric.desc") ||
          "Score how well a human solution improves after using agents (1–5). Multiple coders supported."}
      </p>

      {interRater && interRater.coder_count >= 2 && (
        <div className="mt-3 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-100">
          {t?.("rubric.agreement") || "Inter-rater"}: {interRater.coder_count} coders · exact{" "}
          {interRater.exact_agreement != null
            ? `${Math.round(interRater.exact_agreement * 100)}%`
            : "—"}{" "}
          · MAD {interRater.mean_abs_diff ?? "—"}
          {interRater.cohens_kappa != null && (
            <> · κ {interRater.cohens_kappa}</>
          )}
        </div>
      )}

      {ratings.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {ratings.map((rating) => (
            <button
              key={rating.coder_id}
              type="button"
              onClick={() => loadCoder(rating.coder_id)}
              className="rounded-lg border border-white/15 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10"
            >
              {rating.coder_id}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <input
          className="page-input"
          placeholder={t?.("rubric.participant") || "Participant ID"}
          value={form.participant_id}
          onChange={(e) => setForm((p) => ({ ...p, participant_id: e.target.value }))}
        />
        <input
          className="page-input"
          placeholder={t?.("rubric.coder") || "Coder ID"}
          value={form.coder_id}
          onChange={(e) => setForm((p) => ({ ...p, coder_id: e.target.value }))}
        />
        <select
          className="page-select sm:col-span-2"
          value={form.condition}
          onChange={(e) => setForm((p) => ({ ...p, condition: e.target.value }))}
        >
          {CONDITIONS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t?.("rubric.pre") || "Pre-solution (before agents)"}
          </label>
          <textarea
            className="page-input mt-1 w-full"
            rows={4}
            value={form.pre_solution}
            onChange={(e) => setForm((p) => ({ ...p, pre_solution: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t?.("rubric.post") || "Post-solution (after agents)"}
          </label>
          <textarea
            className="page-input mt-1 w-full"
            rows={4}
            value={form.post_solution}
            onChange={(e) => setForm((p) => ({ ...p, post_solution: e.target.value }))}
          />
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {(dimensions.length
          ? dimensions
          : Object.keys(EMPTY_SCORES).map((id) => ({ id, label: id, min: 1, max: 5 }))
        ).map((dim) => (
          <div
            key={dim.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-slate-900/40 px-3 py-2"
          >
            <div>
              <p className="text-sm font-medium text-white">
                {dim.id} — {dim.label}
              </p>
            </div>
            <select
              className="page-select w-24"
              value={form.scores[dim.id] || 0}
              onChange={(e) => setScore(dim.id, e.target.value)}
            >
              <option value={0}>—</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <textarea
        className="page-input mt-4 w-full"
        rows={2}
        placeholder={t?.("rubric.notes") || "Coder notes"}
        value={form.notes}
        onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" className="page-btn-primary px-4 py-2 text-sm" onClick={handleSave} disabled={saving}>
          {saving ? t?.("common.saving") || "Saving…" : t?.("rubric.save") || "Save rubric"}
        </button>
        {message && <p className="text-sm text-emerald-300">{message}</p>}
        {error && <p className="text-sm text-red-300">{error}</p>}
      </div>
    </PagePanel>
  );
}
