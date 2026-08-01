import { cleanAgentText, parseAgentResponse } from "../utils/parseAgentResponse";
import { buildReadableAnalysis } from "../utils/buildReadableAnalysis";
import { cn } from "@/lib/utils";

function ActionPlanCard({ block, dark, index, compact }) {
  const fields = [
    { key: "owner", label: "Who" },
    { key: "timeline", label: "When" },
    { key: "measure", label: "Success" },
  ];

  return (
    <article
      className={cn(
        "rounded-lg border",
        compact ? "px-2.5 py-2" : "px-3 py-2.5",
        dark ? "border-white/10 bg-slate-950/50" : "border bg-card"
      )}
    >
      <p
        className={cn(
          "font-medium leading-snug",
          compact ? "text-xs" : "text-sm",
          dark ? "text-white" : "text-foreground"
        )}
      >
        <span
          className={cn(
            "mr-1.5 font-semibold",
            compact ? "text-[10px]" : "text-xs",
            dark ? "text-slate-500" : "text-muted-foreground"
          )}
        >
          {index + 1}.
        </span>
        {block.action}
      </p>
      <div className={cn("mt-1.5 flex flex-wrap gap-x-3 gap-y-1", compact ? "text-[11px]" : "text-xs")}>
        {fields.map((field) =>
          block[field.key] ? (
            <p key={field.key} className={dark ? "text-slate-400" : "text-muted-foreground"}>
              <span className="font-medium">{field.label}: </span>
              {block[field.key]}
            </p>
          ) : null
        )}
      </div>
    </article>
  );
}

function BulletList({ bullets, dark, compact }) {
  return (
    <ul
      className={cn(
        compact ? "space-y-1.5" : "space-y-2",
        dark ? "text-slate-300" : "text-muted-foreground"
      )}
    >
      {bullets.map((bullet, index) => (
        <li
          key={index}
          className={cn(
            "flex gap-2 leading-snug",
            compact ? "text-xs" : "text-sm leading-relaxed"
          )}
        >
          <span
            className={cn(
              "shrink-0 rounded-full",
              compact ? "mt-1.5 h-1 w-1" : "mt-2 h-1 w-1",
              dark ? "bg-slate-500" : "bg-muted-foreground"
            )}
          />
          <span>{bullet.text}</span>
        </li>
      ))}
    </ul>
  );
}

function SectionBody({ section, dark, compact }) {
  const actions = section.bullets.filter((b) => b.type === "action");
  const bullets = section.bullets.filter((b) => b.type === "bullet");

  return (
    <div className={cn(compact ? "space-y-2" : "space-y-2.5")}>
      {actions.length > 0 && (
        <div className="space-y-2">
          {actions.map((block, actionIndex) => (
            <ActionPlanCard
              key={actionIndex}
              block={block}
              dark={dark}
              index={actionIndex}
              compact={compact}
            />
          ))}
        </div>
      )}
      {bullets.length > 0 && <BulletList bullets={bullets} dark={dark} compact={compact} />}
    </div>
  );
}

/**
 * Title-only sections.
 * collapsible → accordion; openIndex controls which starts open (default 0).
 */
function AccordionSection({ section, index, dark, expanded, openIndex = 0, compact }) {
  const count = section.bullets?.length || 0;
  const body = <SectionBody section={section} dark={dark} compact={compact} />;
  const padY = compact ? "py-2" : "py-3";
  const titleSize = compact ? "text-xs" : "text-sm";

  if (expanded) {
    return (
      <section className={cn("border-b last:border-0", padY, dark ? "border-white/10" : "border-border")}>
        <h4 className={cn("mb-1.5 font-semibold", titleSize, dark ? "text-white" : "text-foreground")}>
          {section.title}
        </h4>
        {body}
      </section>
    );
  }

  return (
    <details
      open={index === openIndex}
      className={cn("group border-b last:border-0", dark ? "border-white/10" : "border-border")}
    >
      <summary
        className={cn(
          "flex cursor-pointer list-none items-center justify-between gap-3 marker:content-none [&::-webkit-details-marker]:hidden",
          padY,
          dark ? "text-white hover:text-orange-200/90" : "text-foreground"
        )}
      >
        <span className={cn("font-semibold leading-snug", titleSize)}>{section.title}</span>
        <span
          className={cn(
            "shrink-0 tabular-nums group-open:hidden",
            compact ? "text-[10px]" : "text-[11px]",
            dark ? "text-slate-500" : "text-muted-foreground"
          )}
        >
          {count}
        </span>
      </summary>
      <div className={compact ? "pb-2" : "pb-3"}>{body}</div>
    </details>
  );
}

function FallbackBody({ text, dark, compact }) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  return (
    <div
      className={cn(
        "space-y-1.5 leading-snug",
        compact ? "text-xs" : "space-y-2 text-sm leading-relaxed",
        dark ? "text-slate-300" : "text-muted-foreground"
      )}
    >
      {lines.map((line, index) => {
        const isHeader = /^-\s+[A-Z]/.test(line) && line.length < 80;
        const content = line.replace(/^[-•*]\s+/, "");
        if (isHeader) {
          return (
            <h4
              key={index}
              className={cn(
                "pt-1.5 font-semibold",
                compact ? "text-xs" : "text-sm",
                dark ? "text-white" : "text-foreground"
              )}
            >
              {content}
            </h4>
          );
        }
        return (
          <p key={index} className="flex gap-2">
            <span className={dark ? "text-slate-500" : "text-muted-foreground"}>•</span>
            <span>{content}</span>
          </p>
        );
      })}
    </div>
  );
}

export function AgentResponse({
  text,
  compact = false,
  collapsible = false,
  dark = false,
  polished = false,
  /** "theory" = native section titles; "readable" = What's going on / What to do / Why / Limits */
  layout = "theory",
  readableLabels = null,
}) {
  const parsed =
    layout === "readable"
      ? buildReadableAnalysis(text, readableLabels || undefined)
      : parseAgentResponse(text);
  const { sections, fallback } = parsed;
  const usePolished = polished || dark;

  const actionsTitle = readableLabels?.actions || "What to do";
  const openIndex =
    layout === "readable"
      ? Math.max(
          0,
          sections.findIndex((s) => s.title === actionsTitle)
        )
      : 0;

  if (sections.length === 0) {
    return (
      <div
        className={cn(
          "leading-snug",
          compact ? "text-xs" : "text-sm leading-relaxed",
          dark ? "text-slate-300" : "text-muted-foreground"
        )}
      >
        {usePolished ? (
          <FallbackBody text={cleanAgentText(fallback || text)} dark={dark} compact={compact} />
        ) : (
          cleanAgentText(fallback || text)
        )}
      </div>
    );
  }

  return (
    <div>
      {sections.map((section, index) => (
        <AccordionSection
          key={`${section.title}-${index}`}
          section={section}
          index={index}
          dark={dark || usePolished}
          expanded={!collapsible}
          openIndex={openIndex === -1 ? 0 : openIndex}
          compact={compact}
        />
      ))}
    </div>
  );
}

/** @deprecated Pill TOC removed — no-op for older imports. */
export function ResponseSummary() {
  return null;
}
