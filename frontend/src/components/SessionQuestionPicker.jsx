import { cn } from "@/lib/utils";

/**
 * One chip/card per unique research question (duplicates collapsed).
 */
export function SessionQuestionPicker({
  reports = [],
  sessionId,
  onSelect,
  label,
  showingLabel,
  runsLabel = "runs",
}) {
  const selected = reports.find((r) => r.session_id === sessionId);

  return (
    <div>
      {label && (
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </label>
      )}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {reports.map((r) => {
          const active = sessionId === r.session_id;
          return (
            <button
              key={r.session_id}
              type="button"
              onClick={() => onSelect?.(r.session_id)}
              className={cn(
                "rounded-xl border px-3.5 py-3 text-left transition-colors",
                active
                  ? "border-orange-500/50 bg-orange-500/15 text-white"
                  : "border-white/10 text-slate-300 hover:border-white/25 hover:bg-white/5"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-orange-300">#{r.session_id}</span>
                {r.run_count > 1 && (
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-500">
                    {r.run_count} {runsLabel}
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-sm leading-snug text-slate-200">{r.question}</p>
            </button>
          );
        })}
      </div>
      {selected?.question && showingLabel && (
        <p className="mt-3 text-sm text-slate-400">
          {showingLabel} #{sessionId}
        </p>
      )}
    </div>
  );
}
