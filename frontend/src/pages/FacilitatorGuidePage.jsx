import {
  CheckCircle2,
  FileText,
  GitCompare,
  Link2,
  MessageSquare,
  Presentation,
  Table2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { PageHero, PagePanel } from "@/components/PageChrome";
import { useLanguage } from "@/i18n/LanguageContext";

/** Matches sidebar research order (without Guide itself). */
const STEPS = [
  { key: "ask", to: "/question", icon: MessageSquare },
  { key: "compare", to: "/compare", icon: GitCompare },
  { key: "matrix", to: "/matrix", icon: Table2 },
  { key: "invite", to: "/share", icon: Link2 },
  { key: "report", to: "/report", icon: FileText },
  { key: "present", to: "/present", icon: Presentation },
];

export default function FacilitatorGuidePage() {
  const { t } = useLanguage();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHero
        badge={t("guide.badge")}
        title={t("guide.title")}
        size="sm"
        description={<p className="text-slate-400">{t("guide.desc")}</p>}
      />

      <PagePanel>
        <h3 className="text-sm font-semibold text-white">{t("guide.beforeTitle")}</h3>
        <ul className="mt-3 space-y-2 text-sm text-slate-300">
          {[1, 2, 3].map((n) => (
            <li key={n} className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              {t(`guide.before${n}`)}
            </li>
          ))}
        </ul>
      </PagePanel>

      <PagePanel>
        <h3 className="text-sm font-semibold text-white">{t("guide.runTitle")}</h3>
        <ol className="mt-4 space-y-2">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.key}>
                <Link
                  to={step.to}
                  className="flex items-start gap-3 rounded-xl border border-white/10 bg-slate-950/40 px-3.5 py-3 transition-colors hover:border-orange-500/30 hover:bg-orange-500/5"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-700/80 text-xs font-semibold text-white">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-semibold text-white">
                      <Icon className="h-3.5 w-3.5 text-orange-400" />
                      {t(`guide.step.${step.key}.title`)}
                    </p>
                    <p className="mt-1 text-xs leading-snug text-slate-400">
                      {t(`guide.step.${step.key}.body`)}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      </PagePanel>
    </div>
  );
}
