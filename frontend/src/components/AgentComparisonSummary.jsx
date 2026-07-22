import { useMemo } from "react";
import { buildAgentComparison } from "../utils/buildAgentComparison";

export function AgentComparisonSummary({ responses, lang, t }) {
  const rows = useMemo(() => buildAgentComparison(responses, lang), [responses, lang]);

  if (rows.length === 0) return null;

  const fields = [
    { key: "mainFocus", label: t("stage4.comparison.mainFocus") },
    { key: "firstAction", label: t("stage4.comparison.firstAction") },
    { key: "mainStakeholder", label: t("stage4.comparison.mainStakeholder") },
    { key: "solutionType", label: t("stage4.comparison.solutionType") },
    { key: "successMetric", label: t("stage4.comparison.successMetric") },
  ];

  return (
    <section className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-5">
      <h3 className="text-lg font-bold text-white">{t("stage4.comparison.title")}</h3>
      <p className="mt-1 text-xs text-slate-400">
        {t("stage4.comparison.honestyNote") ||
          "Fields are extracted from each answer. Empty cells mean the answer did not contain that information (not a hidden profile default)."}
      </p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {rows.map((row) => (
          <article
            key={row.agentLabel}
            className="rounded-xl border border-white/10 bg-slate-900/50 p-4"
            style={{ borderTopWidth: 4, borderTopColor: row.color }}
          >
            <h4 className="font-bold text-white">{row.agentLabel}</h4>
            <dl className="mt-3 space-y-2.5 text-sm">
              {fields.map((field) => (
                <div key={field.key}>
                  <dt className="font-semibold text-slate-300">{field.label}</dt>
                  <dd className="mt-0.5 leading-snug text-slate-400">
                    {row[field.key] || "—"}
                    {row.sources?.[field.key] === "missing" && !row[field.key] ? (
                      <span className="ml-2 text-[10px] uppercase tracking-wide text-slate-600">
                        not in answer
                      </span>
                    ) : null}
                  </dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}
