import { cn } from "@/lib/utils";

export function PageHero({ badge, title, description, children, className, size = "default" }) {
  const compact = size === "sm";
  return (
    <section className={cn("page-panel", compact && "py-4", className)}>
      {badge && <p className="type-kicker">{badge}</p>}
      <h2 className={cn("type-page-title", compact ? "mt-1 type-page-title-sm" : "mt-1.5")}>
        {title}
      </h2>
      {description && (
        <div className={cn("type-body mt-2", compact && "mt-1.5 type-sm")}>{description}</div>
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
    <p className={cn("rounded-lg border px-4 py-3 type-sm", styles[variant] || styles.error)}>
      {children}
    </p>
  );
}

/** Shared research-question strip used on Compare / Matrix / Invite / Report */
export function ResearchQuestionBlock({ label, question, meta }) {
  return (
    <section className="border-b border-white/10 pb-3">
      {label ? <p className="type-micro">{label}</p> : null}
      <p className={cn("type-question", label && "mt-1.5")}>{question}</p>
      {meta ? <p className="type-meta mt-1.5">{meta}</p> : null}
    </section>
  );
}
