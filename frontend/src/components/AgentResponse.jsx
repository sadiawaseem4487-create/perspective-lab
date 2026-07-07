import { cleanAgentText, parseAgentResponse } from "../utils/parseAgentResponse";
import { cn } from "@/lib/utils";

function ActionRow({ block, dark }) {
  return (
    <div
      className={cn(
        "rounded-md border px-3 py-2 text-sm",
        dark ? "border-white/10 bg-white/5 text-slate-300" : "border bg-background"
      )}
    >
      <p>
        <span className={cn("font-semibold", dark ? "text-white" : "")}>Action:</span> {block.action}
      </p>
      {block.owner && (
        <p className="mt-1">
          <span className={cn("font-semibold", dark ? "text-white" : "")}>Owner:</span> {block.owner}
        </p>
      )}
      {block.timeline && (
        <p className="mt-1">
          <span className={cn("font-semibold", dark ? "text-white" : "")}>Timeline:</span> {block.timeline}
        </p>
      )}
      {block.measure && (
        <p className="mt-1">
          <span className={cn("font-semibold", dark ? "text-white" : "")}>Measure:</span> {block.measure}
        </p>
      )}
    </div>
  );
}

function SectionBody({ section, textSize, dark }) {
  return (
    <div className={cn("space-y-2", textSize, dark ? "text-slate-300" : "text-muted-foreground")}>
      {section.bullets.map((bullet, index) =>
        bullet.type === "action" ? (
          <ActionRow key={index} block={bullet} dark={dark} />
        ) : (
          <div key={index} className="flex gap-2 leading-snug">
            <span className={cn("mt-0.5 shrink-0", dark ? "text-slate-500" : "text-primary")}>•</span>
            <span>{bullet.text}</span>
          </div>
        )
      )}
    </div>
  );
}

export function AgentResponse({ text, compact = false, collapsible = false, dark = false }) {
  const { sections, fallback } = parseAgentResponse(text);
  const textSize = compact ? "text-sm" : "text-sm";

  if (sections.length === 0) {
    return (
      <div className={cn("whitespace-pre-wrap leading-relaxed", textSize, dark ? "text-slate-300" : "text-muted-foreground")}>
        {cleanAgentText(fallback || text)}
      </div>
    );
  }

  if (!collapsible) {
    return (
      <div className="space-y-3">
        {sections.map((section) => (
          <div
            key={section.title}
            className={cn("rounded-lg border px-3 py-2.5", dark ? "border-white/10 bg-white/5" : "bg-muted/30")}
          >
            <h4 className={cn("font-semibold", dark ? "text-white" : "text-foreground")}>{section.title}</h4>
            <div className="mt-2">
              <SectionBody section={section} textSize={textSize} dark={dark} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sections.map((section, index) => (
        <details
          key={`${section.title}-${index}`}
          open={index === 0}
          className={cn("group rounded-lg border px-3 py-2", dark ? "border-white/10 bg-white/5" : "bg-muted/20")}
        >
          <summary
            className={cn(
              "cursor-pointer list-none font-semibold marker:content-none [&::-webkit-details-marker]:hidden",
              dark ? "text-white" : "text-foreground"
            )}
          >
            <span className="flex items-center justify-between gap-2">
              {section.title}
              <span className={cn("text-xs font-normal", dark ? "text-slate-500" : "text-muted-foreground", "group-open:hidden")}>
                {section.bullets.length} items
              </span>
            </span>
          </summary>
          <div className={cn("mt-2 border-t pt-2", dark ? "border-white/10" : "")}>
            <SectionBody section={section} textSize={textSize} dark={dark} />
          </div>
        </details>
      ))}
    </div>
  );
}
