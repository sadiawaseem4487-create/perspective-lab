export function SequentialTimeline({ stages, currentVaihe, responses, t }) {
  const responseByVaihe = {};
  for (const response of responses || []) {
    const vaihe = response?.sequential_stage?.vaihe;
    if (vaihe) responseByVaihe[vaihe] = response;
  }

  return (
    <ol className="grid gap-3 md:grid-cols-4">
      {(stages || []).map((stage) => {
        const done = currentVaihe > stage.vaihe || responseByVaihe[stage.vaihe];
        const active = currentVaihe === stage.vaihe;
        const response = responseByVaihe[stage.vaihe];
        return (
          <li
            key={stage.vaihe}
            className={`rounded-xl border p-4 ${
              active
                ? "border-orange-500 bg-orange-50"
                : done
                  ? "border-emerald-300 bg-emerald-50/70"
                  : "border-stone-200 bg-stone-50"
            }`}
          >
            <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
              {t("stage3.vaihe")} {stage.vaihe}
            </p>
            <p className="mt-1 font-semibold text-stone-900">{stage.label}</p>
            <p className="mt-1 text-xs text-stone-600">{stage.role.replace(/_/g, " ")}</p>
            {response?.self_check && (
              <p
                className={`mt-2 text-xs font-medium ${
                  response.self_check.passed ? "text-emerald-700" : "text-amber-700"
                }`}
              >
                {response.self_check.passed ? t("stage3.selfCheckOk") : t("stage3.selfCheckWarn")}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
