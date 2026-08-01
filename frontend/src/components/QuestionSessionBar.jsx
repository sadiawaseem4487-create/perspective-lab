import { Plus } from "lucide-react";
import { displayQuestion } from "@/utils/uniqueReports";
import { cn } from "@/lib/utils";

/**
 * Compact switcher for past research questions.
 * "New question" sits in the header (not in the scroll chip row).
 */
export function QuestionSessionBar({
  reports = [],
  sessionId,
  onSelect,
  onNewQuestion,
  newLabel,
  label,
  emptyLabel,
  className,
}) {
  if (!reports.length && !onNewQuestion) return null;

  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-3">
        {label ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            {label}
          </p>
        ) : (
          <span />
        )}
        {onNewQuestion && (
          <button
            type="button"
            onClick={onNewQuestion}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
              !sessionId
                ? "bg-orange-600 text-white hover:bg-orange-500"
                : "border border-white/15 text-slate-200 hover:bg-white/10"
            )}
          >
            <Plus className="h-3.5 w-3.5" />
            {newLabel || "New question"}
          </button>
        )}
      </div>

      {reports.length > 0 ? (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
          {reports.map((r, index) => {
            const active = sessionId === r.session_id;
            const q = displayQuestion(r.question);
            return (
              <button
                key={r.session_id}
                type="button"
                onClick={() => onSelect?.(r.session_id)}
                title={q}
                className={cn(
                  "group max-w-[13.5rem] shrink-0 rounded-xl border px-3 py-2 text-left transition-colors",
                  active
                    ? "border-sky-400/50 bg-sky-500/15 text-white"
                    : "border-white/10 bg-slate-950/35 text-slate-300 hover:border-white/20 hover:bg-white/5"
                )}
              >
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Q{index + 1}
                  <span className="ml-1.5 font-mono font-normal normal-case tracking-normal text-slate-600">
                    #{r.session_id}
                  </span>
                </span>
                <span className="mt-0.5 block truncate text-xs font-medium leading-snug text-slate-100">
                  {q || "—"}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        emptyLabel && <p className="text-xs text-slate-500">{emptyLabel}</p>
      )}
    </section>
  );
}

/**
 * Multi-select chips for Present playlist (order = selection order preserved via orderedIds).
 */
export function PresentPlaylistBar({
  reports = [],
  selectedIds = [],
  onChange,
  label,
  hint,
}) {
  function toggle(id) {
    const exists = selectedIds.includes(id);
    if (exists) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  function move(id, dir) {
    const index = selectedIds.indexOf(id);
    if (index < 0) return;
    const next = index + dir;
    if (next < 0 || next >= selectedIds.length) return;
    const copy = [...selectedIds];
    [copy[index], copy[next]] = [copy[next], copy[index]];
    onChange(copy);
  }

  return (
    <section className="space-y-2">
      {label && (
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          {label}
        </p>
      )}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
      <div className="flex flex-wrap gap-2">
        {reports.map((r, index) => {
          const id = r.session_id;
          const on = selectedIds.includes(id);
          const order = on ? selectedIds.indexOf(id) + 1 : null;
          const q = displayQuestion(r.question);
          return (
            <div key={id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => toggle(id)}
                title={q}
                className={cn(
                  "max-w-[14rem] rounded-xl border px-3 py-2 text-left text-xs transition-colors",
                  on
                    ? "border-orange-400/50 bg-orange-500/20 text-white"
                    : "border-white/10 text-slate-400 hover:border-white/25"
                )}
              >
                {order != null && (
                  <span className="mr-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-orange-500/40 text-[10px] font-bold">
                    {order}
                  </span>
                )}
                <span className="text-slate-500">Q{index + 1}</span> {q.slice(0, 40)}
                {q.length > 40 ? "…" : ""}
              </button>
              {on && selectedIds.length > 1 && (
                <span className="flex flex-col">
                  <button
                    type="button"
                    className="px-1 text-[10px] text-slate-500 hover:text-white"
                    onClick={() => move(id, -1)}
                    aria-label="Move earlier"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="px-1 text-[10px] text-slate-500 hover:text-white"
                    onClick={() => move(id, 1)}
                    aria-label="Move later"
                  >
                    ↓
                  </button>
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
