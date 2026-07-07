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
    <section className="rounded-xl border border-orange-200 bg-orange-50/40 p-5">
      <h3 className="text-lg font-bold text-stone-900">{t("stage4.comparison.title")}</h3>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {rows.map((row) => (
          <article
            key={row.agentLabel}
            className="rounded-xl border border-white bg-white p-4 shadow-sm"
            style={{ borderTopWidth: 4, borderTopColor: row.color }}
          >
            <h4 className="font-bold text-stone-900">{row.agentLabel}</h4>
            <dl className="mt-3 space-y-2.5 text-sm">
              {fields.map((field) => (
                <div key={field.key}>
                  <dt className="font-semibold text-stone-800">{field.label}</dt>
                  <dd className="mt-0.5 leading-snug text-stone-600">{row[field.key] || "—"}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}
