import { cn } from "@/lib/utils";

export function PageHero({ badge, title, description, children, className, size = "default" }) {
  const compact = size === "sm";
  return (
    <section className={cn("page-panel", compact && "py-4", className)}>
      {badge && (
        <p
          className={cn(
            "font-semibold uppercase tracking-wide text-orange-400",
            compact ? "text-xs" : "text-sm"
          )}
        >
          {badge}
        </p>
      )}
      <h2
        className={cn(
          "font-display font-bold text-white",
          compact ? "mt-1 text-xl sm:text-2xl" : "text-3xl"
        )}
      >
        {title}
      </h2>
      {description && (
        <div className={cn("mt-1.5 text-slate-400", compact ? "text-sm" : "mt-2")}>{description}</div>
      )}
      {children}
    </section>
  );
}

export function PagePanel({ children, className, ...props }) {
  return (
    <section className={cn("page-panel", className)} {...props}>
      {children}
    </section>
  );
}

export function PageAlert({ variant = "error", children }) {
  const styles = {
    error: "border-red-500/30 bg-red-500/10 text-red-300",
    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    info: "border-blue-500/30 bg-blue-500/10 text-blue-200",
  };
  return (
    <p className={cn("rounded-lg border px-4 py-3 text-sm", styles[variant] || styles.error)}>
      {children}
    </p>
  );
}
