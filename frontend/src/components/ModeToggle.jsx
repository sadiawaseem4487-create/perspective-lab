import { FlaskConical, Zap } from "lucide-react";
import { APP_MODES, useAppMode } from "@/context/AppModeContext";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageContext";

export default function ModeToggle() {
  const { mode, setMode } = useAppMode();
  const { t } = useLanguage();
  const isDemo = mode === APP_MODES.demo;

  return (
    <div className="border-b border-slate-800 px-3 py-3">
      <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
        {t("shell.appMode")}
      </p>
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-900 p-1">
        <button
          type="button"
          onClick={() => setMode(APP_MODES.live)}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-xs font-semibold transition-all",
            !isDemo
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-400 hover:bg-slate-800 hover:text-white"
          )}
        >
          <Zap className="h-3.5 w-3.5" />
          {t("shell.modeLive")}
        </button>
        <button
          type="button"
          onClick={() => setMode(APP_MODES.demo)}
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-2 text-xs font-semibold transition-all",
            isDemo
              ? "bg-amber-400 text-slate-900 shadow-sm"
              : "text-slate-400 hover:bg-slate-800 hover:text-white"
          )}
          aria-pressed={isDemo}
        >
          <span className="flex items-center gap-1.5">
            <FlaskConical className="h-3.5 w-3.5" />
            {t("shell.modeDemo")}
          </span>
          <span
            className={cn(
              "text-[9px] font-medium uppercase tracking-wide",
              isDemo ? "text-slate-800/70" : "text-slate-500"
            )}
          >
            {t("shell.modeDemoSub")}
          </span>
        </button>
      </div>
    </div>
  );
}
