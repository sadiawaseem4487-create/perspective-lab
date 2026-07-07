import { motion } from "framer-motion";
import { ChevronRight, Loader2 } from "lucide-react";
import { getAgentIcon, getAgentLens, getAgentTheorist } from "@/lib/agentIcons";
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
}) {
  const Icon = getAgentIcon(agentKey);
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
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={canOpen ? { y: -2 } : undefined}
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

      <div className="relative flex h-full flex-col rounded-[15px] bg-slate-950/85 p-4 backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div className="relative">
            <div
              className="absolute -inset-1 rounded-full opacity-60 blur-md"
              style={{ backgroundColor: color }}
            />
            <div
              className="relative flex h-12 w-12 items-center justify-center rounded-full border border-white/20 text-white shadow-lg"
              style={{ background: `linear-gradient(135deg, ${color}, rgba(${rgb.r},${rgb.g},${rgb.b},0.5))` }}
            >
              {status === "thinking" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Icon className="h-5 w-5" />
              )}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight text-white">{label}</p>
            <p className="mt-0.5 text-[11px] font-medium" style={{ color }}>
              {theorist}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">{lens}</p>
          </div>
          {canOpen && <ChevronRight className="mt-1 h-4 w-4 text-slate-500 group-hover:text-white" />}
        </div>

        {status === "done" && takeaway && (
          <p className="mt-3 border-t border-white/10 pt-3 text-sm leading-snug text-slate-200">{takeaway}</p>
        )}

        {status === "thinking" && (
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: color }}
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            />
          </div>
        )}
      </div>
    </motion.button>
  );
}
