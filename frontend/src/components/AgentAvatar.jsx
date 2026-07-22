import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const VARIANTS = {
  freire: { ear: "round", accessory: "hand" },
  weber: { ear: "square", accessory: "badge" },
  montessori: { ear: "round", accessory: "leaf" },
  rogers: { ear: "antenna", accessory: "wing" },
};

function hexToRgb(hex) {
  const normalized = (hex || "#78716c").replace("#", "");
  const bigint = parseInt(normalized, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function Accessory({ type, color }) {
  if (type === "hand") {
    return (
      <g>
        <rect x="50" y="46" width="8" height="14" rx="3" fill="#94a3b8" />
        <circle cx="54" cy="42" r="4" fill="#cbd5e1" />
      </g>
    );
  }
  if (type === "badge") {
    return <rect x="28" y="58" width="8" height="8" rx="1.5" fill={color} opacity="0.9" />;
  }
  if (type === "leaf") {
    return (
      <path
        d="M12 50 Q8 44 12 40 Q16 44 12 50"
        fill={color}
        opacity="0.75"
      />
    );
  }
  if (type === "wing") {
    return (
      <path
        d="M52 52 L60 46 L58 58 Z"
        fill={color}
        opacity="0.55"
      />
    );
  }
  return null;
}

export function AgentAvatar({ agentKey, color = "#78716c", status = "idle", className }) {
  const key = (agentKey || "").toLowerCase();
  const variant = VARIANTS[key] || VARIANTS.freire;
  const rgb = hexToRgb(color);
  const glow = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.55)`;
  const thinking = status === "thinking";
  const done = status === "done";
  const error = status === "error";

  return (
    <div className={cn("relative", className)}>
      <motion.div
        className="absolute -inset-2 rounded-full blur-xl"
        animate={
          thinking
            ? { opacity: [0.35, 0.7, 0.35], scale: [0.95, 1.05, 0.95] }
            : done
              ? { opacity: 0.45, scale: 1 }
              : { opacity: 0.2, scale: 0.95 }
        }
        transition={{ duration: thinking ? 1.4 : 0.3, repeat: thinking ? Infinity : 0 }}
        style={{ backgroundColor: glow }}
      />

      <svg viewBox="0 0 64 80" className="relative h-full w-full drop-shadow-lg" aria-hidden>
        <defs>
          <linearGradient id={`skin-${key}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>
          <linearGradient id={`body-${key}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
        </defs>

        {variant.ear === "antenna" && (
          <>
            <line x1="32" y1="6" x2="32" y2="14" stroke={color} strokeWidth="2" strokeLinecap="round" />
            <circle cx="32" cy="5" r="2.5" fill={color}>
              {thinking && (
                <animate attributeName="opacity" values="1;0.4;1" dur="1s" repeatCount="indefinite" />
              )}
            </circle>
          </>
        )}

        <rect x="18" y="14" width="28" height="30" rx={variant.ear === "square" ? 6 : 14} fill={`url(#skin-${key})`} />
        <rect x="14" y="22" width="6" height="10" rx="3" fill="#cbd5e1" />
        <rect x="44" y="22" width="6" height="10" rx="3" fill="#cbd5e1" />

        <motion.circle
          cx="26"
          cy="26"
          r="3"
          fill={thinking ? color : done ? "#4ade80" : error ? "#f87171" : "#1e293b"}
          animate={thinking ? { opacity: [1, 0.35, 1] } : {}}
          transition={{ duration: 0.8, repeat: thinking ? Infinity : 0 }}
        />
        <motion.circle
          cx="38"
          cy="26"
          r="3"
          fill={thinking ? color : done ? "#4ade80" : error ? "#f87171" : "#1e293b"}
          animate={thinking ? { opacity: [1, 0.35, 1] } : {}}
          transition={{ duration: 0.8, repeat: thinking ? Infinity : 0, delay: 0.15 }}
        />

        <rect x="27" y="34" width="10" height="3" rx="1.5" fill="#64748b" opacity="0.8" />

        <path d="M24 44 L32 48 L40 44 L40 52 L24 52 Z" fill="#94a3b8" />
        <path d="M16 52 L48 52 L44 72 L20 72 Z" fill={`url(#body-${key})`} />

        <rect x="26" y="56" width="12" height="10" rx="3" fill={color} opacity="0.85">
          {thinking && (
            <animate attributeName="opacity" values="0.85;0.45;0.85" dur="1.2s" repeatCount="indefinite" />
          )}
        </rect>

        <Accessory type={variant.accessory} color={color} />
      </svg>

      {thinking && (
        <motion.span
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-slate-950/90 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-300"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        >
          ···
        </motion.span>
      )}
    </div>
  );
}
