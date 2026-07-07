import { motion } from "framer-motion";
import { AgentResponse } from "@/components/AgentResponse";
import { getAgentLens, getAgentTheorist } from "@/lib/agentIcons";
import { Button } from "@/components/ui/button";

export function AgentDetailPanel({ agentKey, title, color, lang, response, takeaway, onClose, t }) {
  if (!response) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border bg-card shadow-sm"
      style={{ borderTopWidth: 4, borderTopColor: color || "#78716c" }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("roundtable.fullAnswer")}
          </p>
          <h3 className="mt-1 text-lg font-bold text-foreground">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {getAgentTheorist(agentKey)} · {getAgentLens(agentKey, lang)}
          </p>
          {takeaway && (
            <p className="mt-3 rounded-lg bg-muted/50 px-3 py-2 text-sm leading-snug text-foreground">
              <span className="font-semibold">{t("roundtable.keyTakeaway")}: </span>
              {takeaway}
            </p>
          )}
        </div>
        {onClose && (
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            {t("roundtable.close")}
          </Button>
        )}
      </div>
      <div className="max-h-[480px] overflow-y-auto px-5 py-4">
        <AgentResponse text={response} compact collapsible />
      </div>
    </motion.section>
  );
}
