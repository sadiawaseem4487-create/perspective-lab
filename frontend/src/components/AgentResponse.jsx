import {
  BarChart3,
  BookOpen,
  ClipboardList,
  FlaskConical,
  Lightbulb,
  ListChecks,
  Map,
  Route,
  Scale,
  Shield,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { cleanAgentText, parseAgentResponse } from "../utils/parseAgentResponse";
import { cn } from "@/lib/utils";

const SECTION_META = {
  "Problem Diagnosis": { icon: Target, tone: "sky", hint: "What is going wrong?" },
  "Lived experience": { icon: Users, tone: "orange", hint: "Whose experience counts?" },
  "Naming the problem": { icon: BookOpen, tone: "orange", hint: "Name it in their language" },
  "Critical question": { icon: Lightbulb, tone: "violet", hint: "What power question opens praxis?" },
  "Collective action": { icon: ListChecks, tone: "orange", hint: "Act with those affected" },
  Reflection: { icon: Sparkles, tone: "amber", hint: "What changed — what remains?" },
  "Theory-Based Reasoning": { icon: BookOpen, tone: "violet", hint: "Why this lens matters" },
  "Priority Actions": { icon: ListChecks, tone: "orange", hint: "What to do first" },
  "Participatory action plan": { icon: Users, tone: "orange", hint: "Actions with people" },
  "Pilot design": { icon: FlaskConical, tone: "emerald", hint: "Small test first" },
  "Scaling roadmap": { icon: Route, tone: "emerald", hint: "How to grow it" },
  "Adoption barriers and enablers": { icon: Shield, tone: "amber", hint: "What helps or blocks change" },
  "Innovation framing": { icon: Lightbulb, tone: "violet", hint: "What is the innovation?" },
  "Adopter analysis": { icon: Users, tone: "emerald", hint: "Who adopts first?" },
  "Communication channels": { icon: Route, tone: "emerald", hint: "How does word spread?" },
  "Theory link": { icon: Lightbulb, tone: "violet", hint: "Connection to theory" },
  "Authority map": { icon: Scale, tone: "blue", hint: "Who may decide?" },
  Responsibility: { icon: ClipboardList, tone: "blue", hint: "Who is responsible?" },
  "Process design": { icon: ClipboardList, tone: "blue", hint: "Rules and flow" },
  Documentation: { icon: ClipboardList, tone: "blue", hint: "What is written down?" },
  Accountability: { icon: Scale, tone: "blue", hint: "When rules fail" },
  Legitimacy: { icon: Scale, tone: "blue", hint: "Why this order is legitimate" },
  "Administrative model": { icon: ClipboardList, tone: "blue", hint: "Rules and roles" },
  "Procedure and accountability plan": { icon: Scale, tone: "blue", hint: "Who is responsible" },
  Observation: { icon: Map, tone: "teal", hint: "Watch the learner" },
  "Prepared environment": { icon: Map, tone: "teal", hint: "Design the environment" },
  "Learner choice": { icon: Sparkles, tone: "teal", hint: "Meaningful choice" },
  "Concrete activity": { icon: Sparkles, tone: "teal", hint: "Hands-on work" },
  "Teacher as guide": { icon: Users, tone: "teal", hint: "Guide, not lecturer" },
  "Independent learning": { icon: Target, tone: "teal", hint: "Self-directed progress" },
  "Environment diagnosis": { icon: Map, tone: "teal", hint: "Learning environment" },
  "School-day learning plan": { icon: Sparkles, tone: "teal", hint: "Daily learning design" },
  "Autonomy and activity redesign": { icon: Sparkles, tone: "teal", hint: "Student autonomy" },
  "Success Indicators": { icon: BarChart3, tone: "green", hint: "How we measure success" },
  Assumptions: { icon: Shield, tone: "amber", hint: "What we are assuming" },
  Uncertainty: { icon: Shield, tone: "amber", hint: "What we do not know" },
  "Final Recommendation": { icon: Target, tone: "orange", hint: "Bottom line" },
};

const TONE_STYLES = {
  sky: "border-sky-500/30 bg-sky-500/10 text-sky-200",
  violet: "border-violet-500/30 bg-violet-500/10 text-violet-200",
  orange: "border-orange-500/30 bg-orange-500/10 text-orange-200",
  emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  amber: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  blue: "border-blue-500/30 bg-blue-500/10 text-blue-200",
  teal: "border-teal-500/30 bg-teal-500/10 text-teal-200",
  green: "border-green-500/30 bg-green-500/10 text-green-200",
  slate: "border-white/10 bg-white/5 text-slate-200",
};

function sectionMeta(title) {
  return SECTION_META[title] || { icon: ListChecks, tone: "slate", hint: "Agent insight" };
}

function ActionPlanCard({ block, dark, index }) {
  const fields = [
    { key: "owner", label: "Who", emoji: "👤" },
    { key: "timeline", label: "When", emoji: "⏱" },
    { key: "measure", label: "Success measure", emoji: "📊" },
  ];

  return (
    <article
      className={cn(
        "overflow-hidden rounded-xl border",
        dark ? "border-white/10 bg-slate-900/60" : "border bg-card"
      )}
    >
      <div className={cn("border-b px-4 py-3", dark ? "border-white/10 bg-white/5" : "bg-muted/40")}>
        <p className={cn("text-[11px] font-bold uppercase tracking-wider", dark ? "text-orange-400" : "text-primary")}>
          Step {index + 1}
        </p>
        <p className={cn("mt-1 text-sm font-semibold leading-snug", dark ? "text-white" : "text-foreground")}>
          {block.action}
        </p>
      </div>
      <div className="grid gap-px bg-white/5 sm:grid-cols-3">
        {fields.map((field) =>
          block[field.key] ? (
            <div key={field.key} className={cn("px-4 py-3", dark ? "bg-slate-950/50" : "bg-background")}>
              <p className={cn("text-[10px] font-semibold uppercase tracking-wide", dark ? "text-slate-500" : "text-muted-foreground")}>
                {field.emoji} {field.label}
              </p>
              <p className={cn("mt-1 text-sm leading-snug", dark ? "text-slate-300" : "text-muted-foreground")}>
                {block[field.key]}
              </p>
            </div>
          ) : null
        )}
      </div>
    </article>
  );
}

function BulletList({ bullets, dark }) {
  return (
    <ul className={cn("space-y-2.5", dark ? "text-slate-300" : "text-muted-foreground")}>
      {bullets.map((bullet, index) => (
        <li key={index} className="flex gap-3 leading-relaxed">
          <span
            className={cn(
              "mt-2 h-1.5 w-1.5 shrink-0 rounded-full",
              dark ? "bg-orange-400" : "bg-primary"
            )}
          />
          <span className="text-sm">{bullet.text}</span>
        </li>
      ))}
    </ul>
  );
}

function SectionCard({ section, index, dark, defaultOpen }) {
  const meta = sectionMeta(section.title);
  const Icon = meta.icon;
  const toneClass = TONE_STYLES[meta.tone] || TONE_STYLES.slate;
  const actions = section.bullets.filter((b) => b.type === "action");
  const bullets = section.bullets.filter((b) => b.type === "bullet");

  const body = (
    <div className="space-y-3 px-4 pb-4 pt-1">
      {actions.length > 0 && (
        <div className="space-y-3">
          {actions.map((block, actionIndex) => (
            <ActionPlanCard key={actionIndex} block={block} dark={dark} index={actionIndex} />
          ))}
        </div>
      )}
      {bullets.length > 0 && <BulletList bullets={bullets} dark={dark} />}
    </div>
  );

  if (defaultOpen) {
    return (
      <section
        className={cn(
          "overflow-hidden rounded-xl border",
          dark ? "border-white/10 bg-slate-900/40" : "border bg-card"
        )}
      >
        <div className="flex items-start gap-3 px-4 py-3">
          <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border", toneClass)}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className={cn("text-[10px] font-bold uppercase tracking-wider", dark ? "text-slate-500" : "text-muted-foreground")}>
              Part {index + 1} · {meta.hint}
            </p>
            <h4 className={cn("text-base font-semibold leading-snug", dark ? "text-white" : "text-foreground")}>
              {section.title}
            </h4>
          </div>
        </div>
        {body}
      </section>
    );
  }

  return (
    <details
      open={index === 0}
      className={cn(
        "group overflow-hidden rounded-xl border",
        dark ? "border-white/10 bg-slate-900/40" : "border bg-card"
      )}
    >
      <summary
        className={cn(
          "flex cursor-pointer list-none items-start gap-3 px-4 py-3 marker:content-none [&::-webkit-details-marker]:hidden",
          dark ? "hover:bg-white/5" : "hover:bg-muted/30"
        )}
      >
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border", toneClass)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn("text-[10px] font-bold uppercase tracking-wider", dark ? "text-slate-500" : "text-muted-foreground")}>
            Part {index + 1} · {meta.hint}
          </p>
          <span className={cn("text-base font-semibold leading-snug", dark ? "text-white" : "text-foreground")}>
            {section.title}
          </span>
        </div>
        <span className={cn("text-xs", dark ? "text-slate-500" : "text-muted-foreground", "group-open:hidden")}>
          {section.bullets.length} items
        </span>
      </summary>
      <div className={cn("border-t", dark ? "border-white/10" : "")}>{body}</div>
    </details>
  );
}

function FallbackBody({ text, dark }) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  return (
    <div className={cn("space-y-2 text-sm leading-relaxed", dark ? "text-slate-300" : "text-muted-foreground")}>
      {lines.map((line, index) => {
        const isHeader = /^-\s+[A-Z]/.test(line) && line.length < 80;
        const content = line.replace(/^[-•*]\s+/, "");
        if (isHeader) {
          return (
            <h4 key={index} className={cn("pt-2 text-sm font-semibold", dark ? "text-white" : "text-foreground")}>
              {content}
            </h4>
          );
        }
        return (
          <p key={index} className="flex gap-2">
            <span className="text-orange-400">•</span>
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
}) {
  const { sections, fallback } = parseAgentResponse(text);
  const usePolished = polished || dark;

  if (sections.length === 0) {
    return (
      <div
        className={cn(
          "leading-relaxed",
          compact ? "text-sm" : "text-sm",
          dark ? "text-slate-300" : "text-muted-foreground",
          usePolished && "rounded-xl border border-white/10 bg-slate-900/40 p-4"
        )}
      >
        {usePolished ? <FallbackBody text={cleanAgentText(fallback || text)} dark={dark} /> : cleanAgentText(fallback || text)}
      </div>
    );
  }

  if (usePolished) {
    return (
      <div className="space-y-3">
        {sections.map((section, index) => (
          <SectionCard
            key={`${section.title}-${index}`}
            section={section}
            index={index}
            dark={dark}
            defaultOpen={!collapsible}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sections.map((section, index) => (
        <SectionCard
          key={`${section.title}-${index}`}
          section={section}
          index={index}
          dark={dark}
          defaultOpen={!collapsible}
        />
      ))}
    </div>
  );
}

export function ResponseSummary({ sections, dark = true }) {
  if (!sections?.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {sections.map((section, index) => {
        const meta = sectionMeta(section.title);
        const Icon = meta.icon;
        const toneClass = TONE_STYLES[meta.tone] || TONE_STYLES.slate;
        return (
          <span
            key={section.title}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
              toneClass
            )}
          >
            <Icon className="h-3 w-3" />
            {index + 1}. {section.title}
          </span>
        );
      })}
    </div>
  );
}
