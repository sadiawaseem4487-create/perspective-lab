import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Cpu, KeyRound, Users } from "lucide-react";
import { PageHero } from "@/components/PageChrome";
import { useLanguage } from "@/i18n/LanguageContext";
import { cn } from "@/lib/utils";
import SetupWizardPage from "@/pages/SetupWizardPage";
import Stage1Agents from "@/pages/Stage1Agents";
import Stage2Models from "@/pages/Stage2Models";

const TABS = [
  { id: "api", icon: KeyRound, labelKey: "settings.tabApi" },
  { id: "agents", icon: Users, labelKey: "settings.tabAgents" },
  { id: "models", icon: Cpu, labelKey: "settings.tabModels" },
];

/**
 * Single Settings surface for API key, agents, and models.
 */
export default function SettingsPage() {
  const { t } = useLanguage();
  const [params, setParams] = useSearchParams();
  const requested = params.get("tab");
  const [tab, setTab] = useState(
    TABS.some((item) => item.id === requested) ? requested : "api"
  );

  useEffect(() => {
    if (TABS.some((item) => item.id === requested)) {
      setTab(requested);
    }
  }, [requested]);

  function selectTab(id) {
    setTab(id);
    setParams(id === "api" ? {} : { tab: id }, { replace: true });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHero
        badge={t("settings.badge")}
        title={t("settings.title")}
        size="sm"
        description={<p className="text-slate-400">{t("settings.desc")}</p>}
      />

      <div className="flex flex-wrap gap-1.5 rounded-lg border border-white/10 bg-slate-950/50 p-1">
        {TABS.map(({ id, icon: Icon, labelKey }) => (
          <button
            key={id}
            type="button"
            onClick={() => selectTab(id)}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors min-w-[6.5rem]",
              tab === id
                ? "bg-orange-600 text-white shadow-sm"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {t(labelKey)}
          </button>
        ))}
      </div>

      {tab === "api" && <SetupWizardPage embedded />}
      {tab === "agents" && <Stage1Agents embedded />}
      {tab === "models" && <Stage2Models embedded />}
    </div>
  );
}
