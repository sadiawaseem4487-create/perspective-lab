/**
 * Lightweight status line for Workspace — keep processing feedback,
 * hide research plumbing (session id, model, latency) from the main surface.
 */
export function RunMetadataBar({ result, loading, isDemo, t }) {
  if (!result && !loading) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-white/10 pb-3 text-xs text-slate-400">
      <span className="inline-flex items-center gap-1.5 font-medium text-emerald-300/90">
        <span className="relative flex h-1.5 w-1.5">
          {loading ? (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          ) : null}
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </span>
        {loading ? t("roundtable.liveRunning") : t("roundtable.liveRun")}
      </span>
      {isDemo && <span className="text-amber-200/80">{t("demo.liveNote")}</span>}
    </div>
  );
}
