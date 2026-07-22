import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { AgentAvatar } from "@/components/AgentAvatar";
import { getAgentLens, getAgentTheorist } from "@/lib/agentIcons";
import { cn } from "@/lib/utils";

function hexToRgb(hex) {
  const normalized = hex.replace("#", "");
  const bigint = parseInt(normalized, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

export function AgentPersona({
  agentKey,
  label,
  color = "#78716c",
  status = "idle",
  selected = false,
  lang = "en",
  takeaway = "",
  onClick,
  index = 0,
  readLabel = "Read answer",
}) {
  const lens = getAgentLens(agentKey, lang);
  const theorist = getAgentTheorist(agentKey);
  const canOpen = status === "done" && onClick;
  const rgb = hexToRgb(color);
  const glow = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.45)`;

  return (
    <motion.button
      type="button"
      onClick={canOpen ? onClick : undefined}
      layout
      initial={{ opacity: 0, y: 28, scale: 0.88 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.18, type: "spring", stiffness: 260, damping: 22 }}
      whileHover={canOpen ? { y: -4 } : undefined}
      className={cn(
        "group relative w-full overflow-hidden rounded-2xl p-[1px] text-left transition-all",
        canOpen ? "cursor-pointer" : "cursor-default",
        selected && "ring-2 ring-white/60 ring-offset-2 ring-offset-slate-950"
      )}
      style={{
        background: `linear-gradient(145deg, ${color}, rgba(${rgb.r},${rgb.g},${rgb.b},0.15) 55%, rgba(255,255,255,0.08))`,
        boxShadow: status === "thinking" ? `0 0 28px ${glow}` : selected ? `0 0 20px ${glow}` : undefined,
      }}
    >
      {status === "thinking" && (
        <motion.span
          className="pointer-events-none absolute inset-0 opacity-40"
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          style={{ background: `radial-gradient(circle at 50% 0%, ${glow}, transparent 70%)` }}
        />
      )}

      <div className="relative flex h-full flex-col items-center rounded-[15px] bg-slate-950/90 px-4 pb-4 pt-5 text-center backdrop-blur-md">
        <AgentAvatar agentKey={agentKey} color={color} status={status} className="h-20 w-16" />

        <div className="mt-3 w-full min-w-0">
          <p className="text-sm font-semibold leading-tight text-white">{label}</p>
          <p className="mt-1 text-xs font-medium text-slate-200">{theorist}</p>
          <p className="mt-1 text-[11px] leading-snug text-slate-400">{lens}</p>
        </div>

        {status === "done" && takeaway && (
          <p className="mt-3 w-full border-t border-white/10 pt-3 text-left text-sm leading-snug text-slate-200">
            {takeaway}
          </p>
        )}

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

        {canOpen && (
          <span className="mt-2 inline-flex items-center gap-1 text-[11px] text-slate-500 group-hover:text-white">
            {readLabel}
            <ChevronRight className="h-3 w-3" />
          </span>
        )}
      </div>
    </motion.button>
  );
}
