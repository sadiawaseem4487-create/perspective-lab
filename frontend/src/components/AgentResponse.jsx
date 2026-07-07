import { cleanAgentText, parseAgentResponse } from "../utils/parseAgentResponse";

function ActionRow({ block }) {
  return (
    <div className="rounded-md border bg-background px-3 py-2 text-sm">
      <p><span className="font-semibold">Action:</span> {block.action}</p>
      {block.owner && <p className="mt-1"><span className="font-semibold">Owner:</span> {block.owner}</p>}
      {block.timeline && <p className="mt-1"><span className="font-semibold">Timeline:</span> {block.timeline}</p>}
      {block.measure && <p className="mt-1"><span className="font-semibold">Measure:</span> {block.measure}</p>}
    </div>
  );
}

function SectionBody({ section, textSize }) {
  return (
    <div className={`space-y-2 ${textSize} text-muted-foreground`}>
      {section.bullets.map((bullet, index) =>
        bullet.type === "action" ? (
          <ActionRow key={index} block={bullet} />
        ) : (
          <div key={index} className="flex gap-2 leading-snug">
            <span className="mt-0.5 shrink-0 text-primary">•</span>
            <span>{bullet.text}</span>
          </div>
        )
      )}
    </div>
  );
}

export function AgentResponse({ text, compact = false, collapsible = false }) {
  const { sections, fallback } = parseAgentResponse(text);
  const textSize = compact ? "text-sm" : "text-sm";

  if (sections.length === 0) {
    return (
      <div className={`whitespace-pre-wrap leading-relaxed text-muted-foreground ${textSize}`}>
        {cleanAgentText(fallback || text)}
      </div>
    );
  }

  if (!collapsible) {
    return (
      <div className="space-y-3">
        {sections.map((section) => (
          <div key={section.title} className="rounded-lg border bg-muted/30 px-3 py-2.5">
            <h4 className="font-semibold text-foreground">{section.title}</h4>
            <div className="mt-2">
              <SectionBody section={section} textSize={textSize} />
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
          className="group rounded-lg border bg-muted/20 px-3 py-2"
        >
          <summary className="cursor-pointer list-none font-semibold text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="flex items-center justify-between gap-2">
              {section.title}
              <span className="text-xs font-normal text-muted-foreground group-open:hidden">
                {section.bullets.length} items
              </span>
            </span>
          </summary>
          <div className="mt-2 border-t pt-2">
            <SectionBody section={section} textSize={textSize} />
          </div>
        </details>
      ))}
    </div>
  );
}
