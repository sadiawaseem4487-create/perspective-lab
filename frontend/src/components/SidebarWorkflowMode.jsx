import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { WORKFLOW_MODES, useWorkflowMode } from "@/context/WorkflowModeContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { cn } from "@/lib/utils";

/**
 * Sidebar slice: pick Parallel / Chain / Chain+review with collapsible description.
 */
export default function SidebarWorkflowMode() {
  const { t } = useLanguage();
  const { workflowMode, setWorkflowMode } = useWorkflowMode();
  const [open, setOpen] = useState(true);

  return (
    <div className="border-b border-slate-800 px-3 py-3">
      <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
        {t("shell.workflowMode")}
      </p>

      <div className="space-y-1 rounded-xl bg-slate-900 p-1">
        {WORKFLOW_MODES.map((id) => {
          const selected = workflowMode === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setWorkflowMode(id)}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition-colors",
                selected
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <span>{t(`roundtable.modeCard.${id}.title`)}</span>
              {id === "parallel" && (
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                    selected ? "bg-emerald-600/20 text-emerald-800" : "bg-emerald-500/10 text-emerald-400/80"
                  )}
                >
                  {t("roundtable.modeRecommended")}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-2 flex w-full items-center justify-between gap-2 rounded-lg px-1 py-1.5 text-left text-[11px] font-medium text-slate-500 hover:text-slate-300"
        aria-expanded={open}
      >
        <span>{t("shell.workflowModeAbout")}</span>
        <ChevronDown
          className={cn("h-3.5 w-3.5 shrink-0 transition-transform", open && "rotate-180")}
        />
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <p className="rounded-lg border border-white/5 bg-slate-900/80 px-2.5 py-2 text-[11px] leading-relaxed text-slate-400">
            {t(`roundtable.modeCard.${workflowMode}.body`)}
          </p>
        </div>
      </div>
    </div>
  );
}
