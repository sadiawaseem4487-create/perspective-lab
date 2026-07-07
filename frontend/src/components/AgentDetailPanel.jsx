import { motion } from "framer-motion";
import { X } from "lucide-react";
import { AgentResponse } from "@/components/AgentResponse";
import { getAgentLens, getAgentTheorist } from "@/lib/agentIcons";
import { Button } from "@/components/ui/button";

export function AgentDetailPanel({ agentKey, title, color, lang, response, takeaway, onClose, t }) {
  if (!response) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/90 shadow-2xl backdrop-blur-xl"
      style={{ boxShadow: `0 0 40px ${color}22` }}
    >
      <div
        className="h-1 w-full"
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
      />
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            {getAgentTheorist(agentKey)}
          </p>
          <h3 className="mt-1 text-xl font-semibold text-white">{title}</h3>
          <p className="mt-1 text-sm text-slate-400">{getAgentLens(agentKey, lang)}</p>
          {takeaway && <p className="mt-3 text-sm leading-relaxed text-slate-200">{takeaway}</p>}
        </div>
        {onClose && (
          <Button type="button" variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="max-h-[460px] overflow-y-auto border-t border-white/10 px-5 py-4">
        <AgentResponse text={response} compact collapsible dark />
      </div>
    </motion.section>
  );
}
