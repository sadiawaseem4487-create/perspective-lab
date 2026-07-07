import { motion } from "framer-motion";
import { Pin } from "lucide-react";

export function InsightBoard({ insights, selectedKey, onSelect, title }) {
  if (!insights?.length) return null;

  return (
    <section className="rounded-2xl border bg-muted/30 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Pin className="h-4 w-4 text-primary" />
        {title}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {insights.map((insight, index) => (
          <motion.button
            key={insight.agentKey}
            type="button"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.12 }}
            onClick={() => onSelect?.(insight.agentKey)}
            className={`rounded-xl border bg-card p-3 text-left transition-shadow hover:shadow-md ${
              selectedKey === insight.agentKey ? "ring-2 ring-primary" : ""
            }`}
            style={{ borderLeftWidth: 4, borderLeftColor: insight.color }}
          >
            <p className="text-xs font-bold text-foreground">{insight.agentLabel}</p>
            <p className="mt-1 line-clamp-2 text-sm leading-snug text-muted-foreground">{insight.headline}</p>
          </motion.button>
        ))}
      </div>
    </section>
  );
}
