import { Users } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Link } from "react-router-dom";

/**
 * Visual "guest chairs" for human respondents — distinct from AI agent cards.
 */
export function GuestChairs({ humans = [], showLink = false }) {
  const { t } = useLanguage();

  if (!humans?.length) {
    return (
      <div className="rounded-2xl border border-dashed border-emerald-500/25 bg-gradient-to-b from-emerald-500/10 to-transparent px-6 py-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-950/60">
          <Users className="h-7 w-7 text-emerald-400/80" />
        </div>
        <p className="mt-4 text-base font-semibold text-emerald-100">
          {t("guests.emptyTitle")}
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-400">
          {t("guests.emptyDesc")}
        </p>
        {showLink && (
          <Link
            to="/compare"
            className="mt-4 inline-flex text-sm font-medium text-emerald-300 underline-offset-4 hover:underline"
          >
            {t("guests.goCompare")}
          </Link>
        )}
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-emerald-400" />
        <h3 className="font-display text-lg font-semibold text-white">
          {t("guests.title")}
        </h3>
        <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-200">
          {humans.length}
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {humans.map((person, index) => (
          <article
            key={`${person.name}-${index}`}
            className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.07] p-5 transition-colors hover:bg-emerald-500/10"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-emerald-400/35 bg-emerald-950/70 text-base font-semibold text-emerald-100">
                {(person.name || "?").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-white">{person.name}</p>
                <p className="truncate text-xs text-emerald-200/80">
                  {person.role || t("guests.human")}
                </p>
              </div>
            </div>
            <p className="mt-4 line-clamp-6 whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
              {person.answer}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
