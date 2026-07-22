const CATEGORY_ORDER = [
  "quick_test",
  "problem_solving",
  "diagnosis",
  "policy",
  "pedagogy",
  "scaling",
  "stakeholders",
];

export function DemoQuestionPanel({ questions, activeText, onSelect, t }) {
  if (!questions?.length) return null;

  const sorted = [...questions].sort(
    (a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)
  );

  return (
    <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 backdrop-blur-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-amber-300/90">
        {t("demo.panelTitle")}
      </p>
      <p className="mt-1 text-sm text-slate-300">{t("demo.panelDesc")}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {sorted.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.text)}
            className={`rounded-full border px-3 py-1.5 text-left text-xs font-medium transition-all ${
              activeText === item.text
                ? "border-amber-400 bg-amber-400/20 text-amber-100"
                : "border-white/15 bg-white/5 text-slate-200 hover:border-amber-400/50 hover:bg-white/10"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </section>
  );
}

/** @deprecated use DemoQuestionPanel */
export function DemoQuestionPicker({ questions, onSelect, t, disabled }) {
  if (disabled) return null;
  return <DemoQuestionPanel questions={questions} activeText="" onSelect={onSelect} t={t} />;
}
