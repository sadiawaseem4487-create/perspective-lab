import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Search, Users } from "lucide-react";
import { PagePanel } from "@/components/PageChrome";
import { useLanguage } from "@/i18n/LanguageContext";
import { cn } from "@/lib/utils";
import {
  isLongGuestAnswer,
  normalizeGuestAnswer,
  parseGuestAnswerBlocks,
} from "@/utils/guestAnswer";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

/** Soft emerald/teal tints so neighboring cards feel distinct, not identical. */
const TINTS = [
  "from-emerald-400/70 to-emerald-700/10",
  "from-teal-400/70 to-teal-800/10",
  "from-green-400/65 to-emerald-900/10",
  "from-cyan-400/55 to-teal-900/10",
];

function GuestAnswerBody({ text, compact, clamped }) {
  const blocks = useMemo(() => parseGuestAnswerBlocks(text), [text]);
  const structured = blocks.some((b) => b.type === "heading" || b.type === "bullet");

  if (!structured) {
    return (
      <p
        className={cn(
          "guest-answer-body",
          compact && "guest-answer-body-sm",
          clamped && "guest-answer-clamped"
        )}
      >
        {normalizeGuestAnswer(text)}
      </p>
    );
  }

  return (
    <div
      className={cn(
        "guest-answer-body",
        compact && "guest-answer-body-sm",
        clamped && "guest-answer-clamped"
      )}
    >
      {blocks.map((block, i) => {
        if (block.type === "gap") return <div key={`g-${i}`} className="guest-answer-gap" />;
        if (block.type === "heading") {
          return (
            <p key={`h-${i}`} className="guest-answer-heading">
              <span className="guest-answer-num">{block.n}.</span>
              {block.text}
            </p>
          );
        }
        if (block.type === "bullet") {
          return (
            <p key={`b-${i}`} className="guest-answer-bullet">
              <span className="guest-answer-dot" aria-hidden />
              <span>{block.text}</span>
            </p>
          );
        }
        return (
          <p key={`p-${i}`} className="guest-answer-para">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}

/**
 * Searchable gallery of guest answers — editorial quote cards, answer-first.
 * Full answers are shown by default; very long ones can collapse.
 */
export function GuestResponsesPanel({
  sessionId,
  humans = [],
  capacity = 100,
  compact = false,
  inviteHref,
  onRefresh,
}) {
  const { t, lang } = useLanguage();
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState(() => new Set());

  const count = humans.length;
  const remaining = Math.max(0, capacity - count);
  const fillPct = Math.min(100, Math.round((count / Math.max(1, capacity)) * 100));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return humans;
    return humans.filter((person) => {
      const hay = [
        person.name,
        person.role,
        person.organization,
        person.email,
        person.answer,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [humans, query]);

  function downloadCsv() {
    if (!sessionId) return;
    const url = `${API_BASE}/api/comparison/${sessionId}/guests.csv`;
    const link = document.createElement("a");
    link.href = url;
    link.download = `session-${sessionId}-guests.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function toggleCollapse(key) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <PagePanel>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h3 className={cn("font-display font-semibold text-white", compact ? "text-base" : "text-xl")}>
              {t("guests.listTitle")}
            </h3>
            <p className={cn("mt-1 text-slate-400", compact ? "text-xs" : "text-sm")}>
              {compact ? t("guests.listDescCompact") : t("guests.listDesc")}
            </p>
            {!compact && (
              <>
                <p className="mt-2 text-xs font-medium text-slate-300">
                  {count} / {capacity} {t("guests.slotsUsed")}
                  {remaining >= 0 ? ` · ${remaining} ${t("guests.remaining")}` : ""}
                </p>
                <div className="guest-capacity-track" aria-hidden>
                  <div className="guest-capacity-fill" style={{ width: `${fillPct}%` }} />
                </div>
              </>
            )}
            {compact && count > 0 && (
              <p className="mt-2 text-xs font-medium text-slate-400">
                {count} {t("guests.slotsUsed")}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {onRefresh && (
            <button type="button" onClick={onRefresh} className="page-btn-secondary px-3 py-2 text-sm">
              {t("guests.refresh")}
            </button>
          )}
          {!compact && (
            <button
              type="button"
              onClick={downloadCsv}
              disabled={!count}
              className="page-btn-secondary inline-flex items-center gap-2 px-3 py-2 text-sm disabled:opacity-40"
            >
              <Download className="h-4 w-4" />
              {t("guests.exportCsv")}
            </button>
          )}
        </div>
      </div>

      {count > 0 && (
        <div className="relative mt-5">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("guests.searchPh")}
            className="page-input w-full pl-9"
          />
        </div>
      )}

      {!count ? (
        <div className="mt-4 rounded-xl border border-dashed border-emerald-500/25 px-4 py-8 text-center">
          <p className="text-sm text-slate-400">{t("guests.emptyList")}</p>
          {inviteHref && (
            <Link to={inviteHref} className="page-btn-secondary mt-4 inline-flex px-4 py-2 text-sm">
              {t("guests.goShare")}
            </Link>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <p className="mt-6 py-8 text-center text-sm text-slate-500">{t("guests.noMatch")}</p>
      ) : (
        <ul className="mt-6 grid max-h-[48rem] gap-5 overflow-y-auto pr-1 sm:grid-cols-2">
          {filtered.map((person, index) => {
            const key = person.response_id || `${person.name}-${index}`;
            const answer = normalizeGuestAnswer(person.answer);
            const long = isLongGuestAnswer(answer);
            const isCollapsed = collapsed.has(key);
            const meta = [person.role, person.organization].filter(Boolean).join(" · ");
            const rail = TINTS[index % TINTS.length];
            const delay = `${Math.min(index, 8) * 55}ms`;

            return (
              <li
                key={key}
                className="guest-quote-in"
                style={{ animationDelay: delay }}
              >
                <article className="guest-quote-card group">
                  <div
                    className={cn(
                      "pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b",
                      rail
                    )}
                  />
                  <span className="guest-quote-mark" aria-hidden>
                    “
                  </span>

                  <div className="relative flex flex-1 flex-col px-6 pb-5 pt-6">
                    <GuestAnswerBody
                      text={answer}
                      compact={compact}
                      clamped={long && isCollapsed}
                    />

                    {long && (
                      <button
                        type="button"
                        onClick={() => toggleCollapse(key)}
                        className="relative z-[1] mt-3 self-start text-xs font-semibold tracking-wide text-emerald-300 transition hover:text-emerald-100"
                      >
                        {isCollapsed ? t("guests.readMore") : t("guests.showLess")}
                      </button>
                    )}

                    <footer className="relative z-[1] mt-auto flex items-center gap-3 border-t border-white/10 pt-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-emerald-300/35 bg-emerald-950/80 text-sm font-semibold text-emerald-50 ring-2 ring-emerald-500/10">
                        {(person.name || "?").slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-white">
                            {person.name || t("guests.human")}
                          </p>
                          {person.source === "invite" && (
                            <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-emerald-200/90">
                              {t("guests.viaInvite")}
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs text-emerald-200/70">
                          {meta || t("guests.human")}
                          <span className="text-slate-500"> · #{index + 1}</span>
                        </p>
                        {person.submitted_at && (
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            {t("guests.submittedAt")}:{" "}
                            {(() => {
                              const d = new Date(person.submitted_at);
                              return Number.isNaN(d.getTime())
                                ? person.submitted_at
                                : d.toLocaleString(lang === "pt" ? "pt-BR" : lang === "fi" ? "fi-FI" : "en-GB", {
                                    dateStyle: "medium",
                                    timeStyle: "short",
                                  });
                            })()}
                          </p>
                        )}
                      </div>
                    </footer>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </PagePanel>
  );
}
