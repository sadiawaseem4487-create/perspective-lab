import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Check, Copy } from "lucide-react";
import {
  closeInvite,
  createInvite,
  fetchComparison,
  fetchReports,
  listInvites,
} from "@/api";
import { PageAlert, PageHero, PagePanel, ResearchQuestionBlock } from "@/components/PageChrome";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAppMode } from "@/context/AppModeContext";
import { useAuth } from "@/context/AuthContext";
import { getActiveSessionId, setActiveSessionId } from "@/utils/sessionWorkspace";
import {
  displayQuestion,
  resolvePreferredSessionId,
  uniqueReportsByQuestion,
} from "@/utils/uniqueReports";

const DEFAULT_MAX = 100;

/**
 * Invite: create/copy one link for the active Workspace session.
 * Guest answers are read on Compare → Guests.
 */
export default function ShareInvitePage() {
  const { t } = useLanguage();
  const { isDemo } = useAppMode();
  const { user } = useAuth();
  const userId = user?.id;
  const uiMode = isDemo ? "demo" : "live";
  const [params] = useSearchParams();
  const [sessionId, setSessionId] = useState(null);
  const [question, setQuestion] = useState("");
  const [guestCount, setGuestCount] = useState(0);
  const [inviteUrl, setInviteUrl] = useState("");
  const [activeToken, setActiveToken] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadSession(id) {
    setSessionId(id);
    setActiveSessionId(id, uiMode, userId);
    setInviteUrl("");
    setActiveToken("");
    const [comparison, inviteData] = await Promise.all([
      fetchComparison(id),
      listInvites(id).catch(() => ({ invites: [] })),
    ]);
    setQuestion(displayQuestion(comparison.question));
    setGuestCount((comparison.human_answers || []).length);
    const openInvite = (inviteData.invites || []).find((i) => i.active !== false);
    if (openInvite?.token) {
      setActiveToken(openInvite.token);
      setInviteUrl(`${window.location.origin}/invite/${openInvite.token}`);
    }
  }

  useEffect(() => {
    const fromQuery = Number(params.get("session"));

    async function hydrate() {
      setLoading(true);
      try {
        const list = await fetchReports(uiMode);
        const unique = uniqueReportsByQuestion(list);
        const id =
          fromQuery ||
          resolvePreferredSessionId(list, getActiveSessionId(uiMode, userId)) ||
          unique[0]?.session_id;
        if (!id) {
          setSessionId(null);
          setQuestion("");
          setGuestCount(0);
          return;
        }
        await loadSession(id);
        setError("");
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    hydrate();

    function onFocus() {
      hydrate();
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, uiMode]);

  async function handleCreate() {
    if (!sessionId) return;
    setCreating(true);
    setError("");
    try {
      const created = await createInvite(sessionId, {
        label: "",
        days_valid: 14,
        max_responses: DEFAULT_MAX,
      });
      const url = `${window.location.origin}/invite/${created.token}`;
      setInviteUrl(url);
      setActiveToken(created.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleCopy() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t("share.copyFailed"));
    }
  }

  async function handleClose() {
    if (!activeToken) return;
    try {
      await closeInvite(activeToken);
      setInviteUrl("");
      setActiveToken("");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <PageHero
        badge={t("share.badge")}
        title={t("share.title")}
        size="sm"
        description={<p className="text-slate-400">{t("share.desc")}</p>}
      />

      {error && <PageAlert>{error}</PageAlert>}

      {loading && (
        <PagePanel>
          <p className="text-sm text-slate-400">{t("common.loading") || "Loading…"}</p>
        </PagePanel>
      )}

      {!loading && !sessionId && (
        <PagePanel>
          <p className="text-sm text-slate-300">{t("share.needQuestion")}</p>
          <Link to="/question" className="page-btn-primary mt-4 inline-flex px-4 py-2 text-sm">
            {t("share.goAsk")}
          </Link>
        </PagePanel>
      )}

      {!loading && sessionId && (
        <>
          <ResearchQuestionBlock
            label={t("share.researchQuestion")}
            question={question}
            meta={`${guestCount} ${t("share.answersSoFar")}`}
          />

          <PagePanel>
            {!inviteUrl ? (
              <div className="space-y-4">
                <p className="type-sm">{t("share.createBody")}</p>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={creating}
                  className="page-btn-primary w-full px-4 py-2.5 text-sm"
                >
                  {creating ? t("share.creatingLink") : t("share.createLink")}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-400/90">
                  {t("share.linkReady")}
                </p>
                <input
                  type="text"
                  readOnly
                  value={inviteUrl}
                  onFocus={(e) => e.target.select()}
                  onClick={(e) => e.target.select()}
                  className="page-input w-full cursor-text font-mono text-xs text-slate-200"
                  aria-label={t("share.copyLink")}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="page-btn-primary inline-flex flex-1 items-center justify-center gap-2 px-4 py-2.5 text-sm"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? t("share.copied") : t("share.copyLink")}
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="page-btn-secondary px-4 py-2 text-xs text-slate-400"
                  >
                    {t("share.closeInvite")}
                  </button>
                </div>
              </div>
            )}
          </PagePanel>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
            <Link to="/question" className="page-btn-secondary px-4 py-2 text-xs">
              {t("share.backWorkspace")}
            </Link>
            <div className="flex flex-wrap gap-2">
              <Link to="/report" className="page-btn-secondary px-4 py-2 text-xs">
                {t("nav.report")}
              </Link>
              <Link
                to={`/compare?session=${sessionId}&tab=guests`}
                className="page-btn-primary px-4 py-2 text-xs"
              >
                {t("share.viewGuests")}
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
