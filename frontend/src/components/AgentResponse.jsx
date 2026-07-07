import { cleanAgentText, parseAgentResponse } from "../utils/parseAgentResponse";

function ActionRow({ block }) {
  return (
    <div className="rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700">
      <p><span className="font-semibold text-stone-900">Action:</span> {block.action}</p>
      <p className="mt-1"><span className="font-semibold text-stone-900">Owner:</span> {block.owner}</p>
      <p className="mt-1"><span className="font-semibold text-stone-900">Timeline:</span> {block.timeline}</p>
      <p className="mt-1"><span className="font-semibold text-stone-900">Measure:</span> {block.measure}</p>
    </div>
  );
}

export function AgentResponse({ text, compact = false }) {
  const { sections, fallback } = parseAgentResponse(text);
  const textSize = compact ? "text-sm" : "text-sm";

  if (sections.length === 0) {
    return (
      <div className={`whitespace-pre-wrap leading-relaxed text-stone-700 ${textSize}`}>
        {cleanAgentText(fallback || text)}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sections.map((section) => (
        <div
          key={section.title}
          className="rounded-lg border border-stone-100 bg-stone-50/80 px-3 py-2.5"
        >
          <h4 className="font-bold text-stone-900">{section.title}</h4>
          <div className={`mt-2 space-y-2 ${textSize} text-stone-700`}>
            {section.bullets.map((bullet, index) =>
              bullet.type === "action" ? (
                <ActionRow key={index} block={bullet} />
              ) : (
                <div key={index} className="flex gap-2 leading-snug">
                  <span className="mt-0.5 shrink-0 text-orange-700">•</span>
                  <span>{bullet.text}</span>
                </div>
              )
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
