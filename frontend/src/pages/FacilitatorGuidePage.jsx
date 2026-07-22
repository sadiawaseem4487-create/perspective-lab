import { CheckCircle2, ClipboardList, FileDown, GitCompare, MessageSquare, Presentation } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHero, PagePanel } from "@/components/PageChrome";
import { useLanguage } from "@/i18n/LanguageContext";

const STEPS = [
  { key: "ask", to: "/question", icon: MessageSquare },
  { key: "report", to: "/report", icon: ClipboardList },
  { key: "compare", to: "/compare", icon: GitCompare },
  { key: "present", to: "/present", icon: Presentation },
  { key: "export", to: "/export", icon: FileDown },
];

export default function FacilitatorGuidePage() {
  const { t } = useLanguage();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHero
        badge={t("guide.badge")}
        title={t("guide.title")}
        description={<p className="text-slate-400">{t("guide.desc")}</p>}
      />

      <PagePanel>
        <h3 className="font-display text-lg font-semibold text-white">{t("guide.beforeTitle")}</h3>
        <ul className="mt-3 space-y-2 text-sm text-slate-300">
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            {t("guide.before1")}
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            {t("guide.before2")}
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            {t("guide.before3")}
          </li>
        </ul>
      </PagePanel>

      <PagePanel>
        <h3 className="font-display text-lg font-semibold text-white">{t("guide.runTitle")}</h3>
        <ol className="mt-4 space-y-3">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.key}>
                <Link
                  to={step.to}
                  className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4 transition-colors hover:border-orange-500/30 hover:bg-orange-500/5"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-700/80 text-sm font-semibold text-white">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 font-semibold text-white">
                      <Icon className="h-4 w-4 text-orange-400" />
                      {t(`guide.step.${step.key}.title`)}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">{t(`guide.step.${step.key}.body`)}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      </PagePanel>

      <PagePanel>
        <h3 className="font-display text-lg font-semibold text-white">{t("guide.integrityTitle")}</h3>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-300">
          <li>{t("guide.integrity1")}</li>
          <li>{t("guide.integrity2")}</li>
          <li>{t("guide.integrity3")}</li>
        </ul>
      </PagePanel>
    </div>
  );
}
