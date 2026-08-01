/**
 * Demo sample framings — cards that load a fuller problem scenario into the workspace.
 */
export function DemoQuestionPanel({ questions, activeText, onSelect, t }) {
  if (!questions?.length) return null;

  return (
    <section className="space-y-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-300/90">
          {t("demo.panelTitle")}
        </p>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">{t("demo.panelDesc")}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {questions.map((item) => {
          const selected = activeText === item.text;
          const preview = (item.text || "").replace(/\s+/g, " ").trim().slice(0, 110);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.text)}
              className={`rounded-2xl border px-4 py-3.5 text-left transition-colors ${
                selected
                  ? "border-amber-400/50 bg-amber-500/15 text-white"
                  : "border-white/10 bg-slate-950/40 text-slate-200 hover:border-amber-400/35 hover:bg-white/[0.04]"
              }`}
            >
              <p className="text-sm font-semibold text-white">{item.label}</p>
              <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-400">
                {preview}
                {(item.text || "").length > 110 ? "…" : ""}
              </p>
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-amber-300/80">
                {t("demo.useFraming")}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/** @deprecated use DemoQuestionPanel */
export function DemoQuestionPicker({ questions, onSelect, t, disabled }) {
  if (disabled) return null;
  return <DemoQuestionPanel questions={questions} activeText="" onSelect={onSelect} t={t} />;
}
