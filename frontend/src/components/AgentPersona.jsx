import { motion } from "framer-motion";
import { AgentAvatar } from "@/components/AgentAvatar";
import { getAgentLens, getAgentTheorist } from "@/lib/agentIcons";
import { cn } from "@/lib/utils";

function hexToRgb(hex) {
  const normalized = (hex || "#78716c").replace("#", "");
  const bigint = parseInt(normalized.length === 3 ? normalized.repeat(2) : normalized, 16);
  if (Number.isNaN(bigint)) return { r: 120, g: 113, b: 108 };
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

/**
 * Compact roundtable tile — theorist name + short lens words only.
 */
export function AgentPersona({
  agentKey,
  label,
  color = "#78716c",
  status = "idle",
  selected = false,
  lang = "en",
  onClick,
  index = 0,
}) {
  const lens = getAgentLens(agentKey, lang);
  const theorist = getAgentTheorist(agentKey);
  const canOpen = (status === "done" || status === "error") && onClick;
  const rgb = hexToRgb(color);
  const glow = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35)`;

  return (
    <motion.button
      type="button"
      onClick={canOpen ? onClick : undefined}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "group relative flex w-full flex-col rounded-2xl border px-3 py-3 text-left transition-all",
        canOpen ? "cursor-pointer hover:border-white/25" : "cursor-default",
        selected
          ? "border-orange-400/50 bg-orange-500/10 shadow-[0_0_24px_-8px_rgba(251,146,60,0.45)]"
          : "border-white/10 bg-slate-950/55 hover:bg-slate-900/70",
        status === "thinking" && "border-white/20"
      )}
      style={
        status === "thinking"
          ? { boxShadow: `0 0 20px -6px ${glow}` }
          : selected
            ? { boxShadow: `inset 3px 0 0 ${color}` }
            : undefined
      }
    >
      <div className="flex items-center gap-3">
        <AgentAvatar
          agentKey={agentKey}
          color={color}
          status={status}
          className="h-12 w-10 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{theorist || label}</p>
          <p className="truncate text-[11px] text-slate-400">{lens}</p>
        </div>
      </div>

      {status === "thinking" && (
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          />
        </div>
      )}
    </motion.button>
  );
}
