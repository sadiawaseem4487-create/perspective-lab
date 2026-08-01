import { Users } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Link } from "react-router-dom";

/**
 * Guest strip — full chairs when guests exist; compact invite line when empty.
 */
export function GuestChairs({
  humans = [],
  showLink = false,
  sessionId = null,
  compactEmpty = false,
}) {
  const { t } = useLanguage();
  const shareTo = sessionId ? `/share?session=${sessionId}` : "/share";

  if (!humans?.length) {
    if (!showLink) return null;
    if (compactEmpty) {
      return (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3">
          <p className="text-sm text-slate-300">{t("guests.compactInvite")}</p>
          <Link
            to={shareTo}
            className="inline-flex rounded-lg bg-emerald-600/90 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
          >
            {t("guests.goShare")}
          </Link>
        </div>
      );
    }
    return (
      <div className="rounded-2xl border border-dashed border-emerald-500/25 bg-gradient-to-b from-emerald-500/10 to-transparent px-6 py-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-950/60">
          <Users className="h-7 w-7 text-emerald-400/80" />
        </div>
        <p className="mt-4 text-base font-semibold text-emerald-100">{t("guests.emptyTitle")}</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-400">
          {t("guests.emptyDesc")}
        </p>
        <Link
          to={shareTo}
          className="mt-4 inline-flex rounded-lg bg-emerald-600/90 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          {t("guests.goShare")}
        </Link>
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-emerald-400" />
        <h3 className="font-display text-lg font-semibold text-white">{t("guests.title")}</h3>
        <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-200">
          {humans.length}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {humans.map((person, index) => (
          <article
            key={`${person.name}-${index}`}
            className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.07] p-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-400/35 bg-emerald-950/70 text-sm font-semibold text-emerald-100">
                {(person.name || "?").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-white">{person.name}</p>
                <p className="truncate text-xs text-emerald-200/80">
                  {[person.role, person.organization].filter(Boolean).join(" · ") ||
                    t("guests.human")}
                </p>
              </div>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm font-normal leading-relaxed tracking-wide text-slate-300 [font-family:'Source_Sans_3',ui-sans-serif,sans-serif]">
              {person.answer}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
