import { getAgentLens, getAgentTheorist } from "@/lib/agentIcons";

export function WorkspaceGuide({ t, lang, workflowMode }) {
  const steps = [
    t("roundtable.step1"),
    t("roundtable.step2"),
    t("roundtable.step3"),
  ];

  return (
    <section className="rounded-2xl border border-dashed border-primary/25 bg-card/80 p-6">
      <h2 className="text-base font-semibold text-foreground">{t("roundtable.howItWorks")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t(`roundtable.modeHint.${workflowMode}`)}</p>
      <ol className="mt-4 grid gap-3 sm:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step} className="flex gap-3 rounded-xl bg-muted/40 p-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {index + 1}
            </span>
            <p className="text-sm leading-snug text-foreground">{step}</p>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-xs text-muted-foreground">{t("roundtable.agentIntro")}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {["freire", "weber", "montessori", "rogers"].map((key) => (
          <div key={key} className="rounded-lg border bg-background px-3 py-2 text-xs">
            <p className="font-semibold text-foreground">{getAgentTheorist(key)}</p>
            <p className="mt-0.5 text-muted-foreground">{getAgentLens(key, lang)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
