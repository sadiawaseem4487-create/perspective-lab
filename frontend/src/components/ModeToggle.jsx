import { FlaskConical, Zap } from "lucide-react";
import { APP_MODES, useAppMode } from "@/context/AppModeContext";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageContext";

export default function ModeToggle() {
  const { mode, setMode } = useAppMode();
  const { t } = useLanguage();

  return (
    <div className="px-3 pb-3">
      <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-sidebar-muted">
        {t("shell.appMode")}
      </p>
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-black/25 p-1">
        <button
          type="button"
          onClick={() => setMode(APP_MODES.live)}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-semibold transition-all",
            mode === APP_MODES.live
              ? "bg-white text-slate-900 shadow-sm"
              : "text-sidebar-foreground/80 hover:bg-white/10"
          )}
        >
          <Zap className="h-3.5 w-3.5" />
          {t("shell.modeLive")}
        </button>
        <button
          type="button"
          onClick={() => setMode(APP_MODES.demo)}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-semibold transition-all",
            mode === APP_MODES.demo
              ? "bg-amber-400 text-slate-900 shadow-sm"
              : "text-sidebar-foreground/80 hover:bg-white/10"
          )}
        >
          <FlaskConical className="h-3.5 w-3.5" />
          {t("shell.modeDemo")}
        </button>
      </div>
    </div>
  );
}
