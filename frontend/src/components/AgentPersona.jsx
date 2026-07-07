import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { getAgentIcon, getAgentLens } from "@/lib/agentIcons";
import { cn } from "@/lib/utils";

const STATUS_STYLES = {
  idle: "border-border bg-card opacity-70",
  thinking: "border-primary/40 bg-primary/5 shadow-md ring-2 ring-primary/20",
  done: "border-border bg-card shadow-sm",
  error: "border-destructive/40 bg-destructive/5",
};

export function AgentPersona({
  agentKey,
  label,
  theory,
  color = "#78716c",
  status = "idle",
  selected = false,
  lang = "en",
  onClick,
}) {
  const Icon = getAgentIcon(agentKey);
  const lens = getAgentLens(agentKey, lang);

  return (
    <motion.button
      type="button"
      onClick={onClick}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative flex w-full flex-col items-center rounded-2xl border p-4 text-center transition-all",
        STATUS_STYLES[status],
        selected && "ring-2 ring-primary",
        onClick && "cursor-pointer hover:shadow-md"
      )}
    >
      {status === "thinking" && (
        <motion.div
          className="absolute -top-3 left-1/2 -translate-x-1/2"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 18 }}
        >
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full shadow-lg"
            style={{ backgroundColor: color }}
          >
            <Icon className="h-4 w-4 text-white" />
          </span>
        </motion.div>
      )}

      <div
        className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-inner"
        style={{ backgroundColor: color }}
      >
        {status === "thinking" ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <Icon className="h-6 w-6" />
        )}
      </div>

      <p className="mt-3 text-sm font-bold text-foreground">{label}</p>
      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{theory || lens}</p>

      {status === "done" && (
        <span className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-primary">Ready</span>
      )}
      {status === "thinking" && (
        <span className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-primary">Thinking…</span>
      )}
      {status === "error" && (
        <span className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-destructive">Failed</span>
      )}
    </motion.button>
  );
}
