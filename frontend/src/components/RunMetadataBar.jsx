export function RunMetadataBar({ result, loading, isDemo, t }) {
  if (!result && !loading) return null;

  const responses = result?.responses || [];
  const model = responses.find((r) => r.model)?.model || "—";
  const totalLatency = responses.reduce((sum, r) => sum + (r.latency_ms || 0), 0);
  const avgLatency = responses.length ? Math.round(totalLatency / responses.length) : 0;

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-300">
          <span className="relative flex h-2 w-2">
            {loading ? (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            ) : null}
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          {loading ? t("roundtable.liveRunning") : t("roundtable.liveRun")}
        </span>
        {result?.session_id && (
          <span className="text-slate-300">
            {t("roundtable.session")} <strong className="text-white">#{result.session_id}</strong>
          </span>
        )}
        <span className="text-slate-300">
          {t("roundtable.model")} <code className="text-emerald-100">{model}</code>
        </span>
        {avgLatency > 0 && (
          <span className="text-slate-300">
            {t("roundtable.latency")} ~{(totalLatency / 1000).toFixed(1)}s
          </span>
        )}
        {isDemo && <span className="text-amber-200/90">{t("demo.liveNote")}</span>}
      </div>
      {result?.question && (
        <p className="mt-2 text-sm leading-snug text-slate-200">
          <span className="font-medium text-slate-400">{t("roundtable.askedQuestion")}: </span>
          {result.question}
        </p>
      )}
    </div>
  );
}
