import { motion } from "framer-motion";
import { ChevronRight, Loader2 } from "lucide-react";
import { getAgentIcon, getAgentLens, getAgentTheorist } from "@/lib/agentIcons";
import { cn } from "@/lib/utils";

const STATUS_STYLES = {
  idle: "border-border bg-card",
  thinking: "border-primary/50 bg-primary/5 ring-2 ring-primary/25",
  done: "border-border bg-card shadow-sm",
  error: "border-destructive/40 bg-destructive/5",
};

export function AgentPersona({
  agentKey,
  label,
  color = "#78716c",
  status = "idle",
  selected = false,
  lang = "en",
  takeaway = "",
  onClick,
  t,
}) {
  const Icon = getAgentIcon(agentKey);
  const lens = getAgentLens(agentKey, lang);
  const theorist = getAgentTheorist(agentKey);
  const canOpen = status === "done" && onClick;

  return (
    <motion.button
      type="button"
      onClick={canOpen ? onClick : undefined}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative flex w-full flex-col rounded-2xl border p-4 text-left transition-all",
        STATUS_STYLES[status],
        selected && "ring-2 ring-primary",
        canOpen && "cursor-pointer hover:shadow-md",
        !canOpen && "cursor-default"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: color }}
        >
          {status === "thinking" ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Icon className="h-5 w-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-tight text-foreground">{label}</p>
          <p className="mt-0.5 text-xs font-medium text-primary">{theorist}</p>
          <p className="mt-1 text-xs text-muted-foreground">{lens}</p>
        </div>
        {canOpen && <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />}
      </div>

      {status === "idle" && (
        <p className="mt-3 text-xs text-muted-foreground">{t?.("roundtable.waiting") || "Waiting"}</p>
      )}
      {status === "thinking" && (
        <p className="mt-3 text-xs font-medium text-primary">{t?.("roundtable.thinking") || "Thinking…"}</p>
      )}
      {status === "done" && takeaway && (
        <p className="mt-3 border-t pt-3 text-sm leading-snug text-foreground">{takeaway}</p>
      )}
      {status === "done" && !takeaway && (
        <p className="mt-3 text-xs font-medium text-primary">{t?.("roundtable.tapToRead") || "Tap to read"}</p>
      )}
      {status === "error" && (
        <p className="mt-3 text-xs font-medium text-destructive">{t?.("roundtable.failed") || "Failed"}</p>
      )}
    </motion.button>
  );
}
