import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { fetchComparison, fetchPresentationConfig, fetchReport, fetchReports } from "@/api";
import { AgentAvatar } from "@/components/AgentAvatar";
import { PresentPlaylistBar } from "@/components/QuestionSessionBar";
import {
  buildMultiSessionPresentationSlides,
  buildPresentationSlides,
} from "@/utils/buildPresentationSlides";
import {
  getActiveSessionId,
  setActiveSessionId,
  setPresentPlaylist,
} from "@/utils/sessionWorkspace";
import {
  displayQuestion,
  resolvePreferredSessionId,
  uniqueReportsByQuestion,
} from "@/utils/uniqueReports";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAppMode } from "@/context/AppModeContext";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { parseGuestAnswerBlocks } from "@/utils/guestAnswer";

const ease = [0.22, 1, 0.36, 1];

const slideVariants = {
  enter: (dir) => ({ opacity: 0, x: dir >= 0 ? 28 : -28 }),
  center: { opacity: 1, x: 0, transition: { duration: 0.28, ease } },
  exit: (dir) => ({
    opacity: 0,
    x: dir >= 0 ? -20 : 20,
    transition: { duration: 0.2, ease },
  }),
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease } },
};

/** Resolve fixed header fields so every content slide uses the same title band. */
function slideChrome(slide) {
  if (!slide) return { eyebrow: "", title: "", kicker: "" };
  if (slide.kind === "title") {
    return { eyebrow: slide.eyebrow || "", title: slide.title || "", kicker: "" };
  }
  if (slide.kind === "agent") {
    return {
      eyebrow: slide.eyebrow || "",
      title: slide.theorist || slide.title || "",
      kicker: slide.lens || "",
    };
  }
  if (slide.kind === "guest") {
    return {
      eyebrow: slide.eyebrow || "",
      title: slide.guest?.name || slide.title || "",
      kicker: slide.guest?.role || slide.subtitle || "",
    };
  }
  return {
    eyebrow: slide.eyebrow || "",
    title: slide.title || "",
    kicker: slide.subtitle || "",
  };
}

function SlideShell({
  slide,
  index,
  total,
  brand,
  footnote,
  isTitle = false,
  accentColor,
  children,
}) {
  const chrome = slideChrome(slide);
  const tFootnote = footnote || brand;
  return (
    <div className={cn("pptx-slide", isTitle && "pptx-title-slide")}>
      <div
        className="pptx-slide-accent"
        style={accentColor ? { background: accentColor } : undefined}
      />
      <header className="pptx-header">
        {chrome.eyebrow ? (
          <p className="pptx-eyebrow">{chrome.eyebrow}</p>
        ) : (
          <p className="pptx-eyebrow" style={{ color: "transparent" }}>
            —
          </p>
        )}
        <h2 className="pptx-header-title">{chrome.title}</h2>
        {chrome.kicker ? (
          <p className="pptx-kicker">{chrome.kicker}</p>
        ) : (
          <p className="pptx-kicker-spacer" aria-hidden />
        )}
      </header>
      <div className="pptx-body">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="pptx-body-inner"
        >
          {children}
        </motion.div>
      </div>
      <footer className="pptx-footer">
        <span className="justify-self-start truncate">{brand}</span>
        <span className="pptx-footer-page justify-self-center">
          {total ? `${index + 1} / ${total}` : "—"}
        </span>
        <span className="justify-self-end truncate text-right">{tFootnote}</span>
      </footer>
    </div>
  );
}

function TitleBody({ slide }) {
  return (
    <>
      <motion.p variants={fadeUp} className="pptx-eyebrow">
        {slide.eyebrow}
      </motion.p>
      <motion.h1 variants={fadeUp} className="pptx-title-hero">
        {slide.title}
      </motion.h1>
      {slide.list?.length ? (
        <motion.ol variants={fadeUp} className="pptx-list mt-5 max-w-2xl space-y-2.5">
          {slide.list.map((item, i) => (
            <li key={item} className="pptx-list-item">
              <span className="pptx-list-num">{i + 1}.</span>
              <span className="pptx-copy">{item}</span>
            </li>
          ))}
        </motion.ol>
      ) : null}
    </>
  );
}

function FramingBody({ slide }) {
  const focusItems = slide.focus || [];
  const constraints = slide.constraints || [];
  return (
    <div className="space-y-5">
      {slide.context ? (
        <motion.p variants={fadeUp} className="pptx-copy max-w-3xl">
          {slide.context}
        </motion.p>
      ) : null}
      {constraints.length ? (
        <motion.div variants={fadeUp}>
          <p className="pptx-label">{slide.constraintsLabel}</p>
          <ul className="mt-2.5 flex flex-wrap gap-2">
            {constraints.map((item) => (
              <li key={item} className="pptx-chip">
                {item}
              </li>
            ))}
          </ul>
        </motion.div>
      ) : null}
      {focusItems.length ? (
        <motion.div variants={fadeUp}>
          <p className="pptx-label">{slide.focusLabel}</p>
          <ol className="pptx-list mt-3 space-y-2.5">
            {focusItems.map((item, i) => (
              <li key={item} className="pptx-list-item">
                <span className="pptx-list-num">{i + 1}.</span>
                <span className="pptx-copy">{item}</span>
              </li>
            ))}
          </ol>
        </motion.div>
      ) : null}
    </div>
  );
}

function AgendaBody({ slide }) {
  return (
    <motion.ul variants={fadeUp} className="pptx-agenda">
      {(slide.items || []).map((item, index) => (
        <li key={item.agentKey}>
          <span className="pptx-list-num w-7">{String(index + 1).padStart(2, "0")}</span>
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <div className="min-w-0 flex-1">
            <p className="pptx-agenda-name">{item.theorist}</p>
            <p className="pptx-agenda-lens truncate">{item.lens}</p>
          </div>
        </li>
      ))}
    </motion.ul>
  );
}

function AgentBody({ slide }) {
  return (
    <div className="flex gap-4">
      <div
        className="mt-1 hidden w-1 shrink-0 self-stretch rounded-full sm:block"
        style={{ backgroundColor: slide.color, minHeight: "5.5rem" }}
      />
      <div className="min-w-0 flex-1">
        <div className="mb-4">
          <AgentAvatar
            agentKey={slide.agentKey}
            color={slide.color}
            status="done"
            className="h-11 w-9 shrink-0"
          />
        </div>
        <motion.dl variants={fadeUp} className="space-y-4">
          {(slide.rows || []).map((row) => (
            <div key={row.key} className="pptx-row">
              <dt className="pptx-row-label">{row.label}</dt>
              <dd className="pptx-row-value">{row.text}</dd>
            </div>
          ))}
        </motion.dl>
      </div>
    </div>
  );
}

function GuestAnswerFormatted({ answer }) {
  const blocks = useMemo(() => parseGuestAnswerBlocks(answer), [answer]);
  const structured = blocks.some((b) => b.type === "heading" || b.type === "bullet");

  if (!structured) {
    return <p className="pptx-guest-text">{answer}</p>;
  }

  return (
    <div className="pptx-guest-text">
      {blocks.map((block, i) => {
        if (block.type === "gap") return <div key={`g-${i}`} className="pptx-guest-gap" />;
        if (block.type === "heading") {
          return (
            <p key={`h-${i}`} className="pptx-guest-heading">
              <span className="pptx-guest-num">{block.n}.</span>
              {block.text}
            </p>
          );
        }
        if (block.type === "bullet") {
          return (
            <p key={`b-${i}`} className="pptx-guest-bullet">
              <span className="pptx-guest-dot" aria-hidden />
              <span>{block.text}</span>
            </p>
          );
        }
        return (
          <p key={`p-${i}`} className="pptx-guest-para">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}

function GuestRosterBody({ slide }) {
  const { t } = useLanguage();
  const guests = slide.guests || [];
  const omitted = slide.omitted || 0;
  return (
    <motion.div variants={fadeUp}>
      <ul className="pptx-guest-roster">
        {guests.map((guest, index) => (
          <li key={`${guest.name}-${index}`}>
            <span className="pptx-list-num w-7">{String(index + 1).padStart(2, "0")}</span>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-950/70 text-sm font-semibold text-emerald-100">
              {(guest.name || "?").slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="pptx-agenda-name">{guest.name}</p>
              {guest.role ? <p className="pptx-agenda-lens truncate">{guest.role}</p> : null}
            </div>
          </li>
        ))}
      </ul>
      {omitted > 0 ? (
        <p className="mt-3 text-sm text-slate-400">
          {t("present.guestsMore").replace("{n}", String(omitted))}
        </p>
      ) : null}
    </motion.div>
  );
}

function GuestBody({ slide }) {
  const guest = slide.guest;
  if (!guest) return null;
  return (
    <motion.div variants={fadeUp} className="pptx-guest-card">
      <div className="pptx-guest-card-rail" />
      <div className="pptx-guest-card-body">
        <GuestAnswerFormatted answer={guest.answer} />
      </div>
    </motion.div>
  );
}

function ConclusionBody({ slide }) {
  return (
    <motion.ol variants={fadeUp} className="pptx-list space-y-4">
      {(slide.prompts || []).map((prompt, index) => (
        <li key={prompt} className="pptx-list-item">
          <span className="pptx-list-num pt-0.5">{index + 1}.</span>
          <span className="pptx-copy">{prompt}</span>
        </li>
      ))}
    </motion.ol>
  );
}

function SlideContent({ slide }) {
  if (!slide) {
    return <p className="text-sm text-slate-400">No presentation yet.</p>;
  }
  switch (slide.kind) {
    case "title":
      return <TitleBody slide={slide} />;
    case "framing":
    case "topic":
      return <FramingBody slide={slide} />;
    case "agenda":
      return <AgendaBody slide={slide} />;
    case "agent":
      return <AgentBody slide={slide} />;
    case "guest-roster":
      return <GuestRosterBody slide={slide} />;
    case "guest":
    case "guests":
      // Legacy "guests" batch slide: show first guest formatted if present
      if (slide.kind === "guests" && slide.guests?.length) {
        return (
          <GuestBody
            slide={{ guest: slide.guests[0], eyebrow: slide.eyebrow, title: slide.guests[0].name }}
          />
        );
      }
      return <GuestBody slide={slide} />;
    case "conclusion":
      return <ConclusionBody slide={slide} />;
    default:
      return <ConclusionBody slide={slide} />;
  }
}

export default function PresentPage() {
  const { t, lang } = useLanguage();
  const { isDemo } = useAppMode();
  const { user } = useAuth();
  const userId = user?.id;
  const navigate = useNavigate();
  const uiMode = isDemo ? "demo" : "live";
  const [params] = useSearchParams();
  const [reports, setReports] = useState([]);
  const [playlist, setPlaylist] = useState([]);
  const [sessionsPayload, setSessionsPayload] = useState([]);
  const [presentation, setPresentation] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [slide, setSlide] = useState(0);
  const [direction, setDirection] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const slideRef = useRef(0);

  useEffect(() => {
    fetchPresentationConfig()
      .then(setPresentation)
      .catch(() => setPresentation(null));
  }, []);

  useEffect(() => {
    const fromQuery = Number(params.get("session"));
    setLoading(true);
    fetchReports(uiMode)
      .then((list) => {
        const unique = uniqueReportsByQuestion(list);
        setReports(unique);
        const preferred =
          fromQuery ||
          resolvePreferredSessionId(list, getActiveSessionId(uiMode, userId)) ||
          unique[0]?.session_id;
        const next = preferred ? [preferred] : [];
        setPlaylist(next);
        if (next[0]) {
          setActiveSessionId(next[0], uiMode, userId);
          setPresentPlaylist(next, uiMode, userId);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params, uiMode]);

  useEffect(() => {
    if (!playlist.length) {
      setSessionsPayload([]);
      return;
    }
    setPresentPlaylist(playlist, uiMode, userId);
    let cancelled = false;

    async function loadDeck({ resetSlide = false } = {}) {
      try {
        const payload = await Promise.all(
          playlist.map(async (id) => {
            const [report, comparison] = await Promise.all([
              fetchReport(id),
              fetchComparison(id).catch(() => ({ human_answers: [] })),
            ]);
            return {
              report: { ...report, question: displayQuestion(report.question) },
              humanAnswers: comparison.human_answers || [],
            };
          })
        );
        if (cancelled) return;
        setSessionsPayload(payload);
        if (resetSlide) {
          setDirection(1);
          setSlide(0);
          slideRef.current = 0;
        }
        setError("");
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }

    loadDeck({ resetSlide: true });

    // Avoid full deck rebuild on every tab focus — Present felt slow for large reports.
    return () => {
      cancelled = true;
    };
  }, [playlist, uiMode, params]);

  const slides = useMemo(() => {
    if (!sessionsPayload.length) return [];
    if (sessionsPayload.length === 1) {
      return buildPresentationSlides(
        sessionsPayload[0].report,
        t,
        lang,
        presentation,
        sessionsPayload[0].humanAnswers
      );
    }
    return buildMultiSessionPresentationSlides(sessionsPayload, t, lang, presentation);
  }, [sessionsPayload, t, lang, presentation]);

  const current = slides[slide];
  const brand = t("present.brandLine");

  function goTo(nextIndex) {
    const clamped = Math.max(0, Math.min(nextIndex, slides.length - 1));
    if (clamped === slideRef.current) return;
    setDirection(clamped > slideRef.current ? 1 : -1);
    slideRef.current = clamped;
    setSlide(clamped);
  }

  function updatePlaylist(ids) {
    const clean = ids.length ? ids.slice(0, 1) : playlist.slice(0, 1);
    setPlaylist(clean);
    if (clean[0]) setActiveSessionId(clean[0], uiMode, userId);
  }

  useEffect(() => {
    function onKey(e) {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goTo(slideRef.current + 1);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goTo(slideRef.current - 1);
      }
      if (e.key === "Escape") {
        if (showPicker) setShowPicker(false);
        else navigate("/question");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slides.length, showPicker, navigate]);

  return (
    <div className="present-stage relative flex min-h-0 flex-1 flex-col overflow-hidden text-white">
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-4 py-3 sm:px-6">
        <div className="mb-2 flex shrink-0 items-center justify-between gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            {t("present.title")}
          </p>
          <div className="hidden flex-1 justify-center sm:flex">
            {slides.length > 0 && (
              <div className="flex w-full max-w-xs items-center gap-3">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full bg-orange-400 transition-[width] duration-300"
                    style={{
                      width: `${((slide + 1) / Math.max(slides.length, 1)) * 100}%`,
                    }}
                  />
                </div>
                <span className="shrink-0 text-[11px] tabular-nums text-slate-500">
                  {slide + 1}/{slides.length}
                </span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowPicker((v) => !v)}
            className="text-xs text-slate-400 underline-offset-2 hover:text-white hover:underline"
          >
            {t("present.playlistToggle")}
          </button>
        </div>

        {showPicker && (
          <div className="mb-2 shrink-0 rounded-xl border border-white/10 bg-slate-950/70 p-3">
            <PresentPlaylistBar
              reports={reports}
              selectedIds={playlist}
              onChange={updatePlaylist}
              label={t("present.playlistLabel")}
              hint={t("present.playlistHint")}
            />
          </div>
        )}

        {loading && <p className="mb-2 text-sm text-slate-400">{t("workspace.restoring")}</p>}
        {error && <p className="mb-2 text-sm text-red-300">{error}</p>}

        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2">
          <div className="pptx-deck relative w-full">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={current?.id || "empty"}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="absolute inset-0"
              >
                <SlideShell
                  slide={current}
                  index={slide}
                  total={slides.length}
                  brand={brand}
                  footnote={t("present.deckFootnote")}
                  isTitle={current?.kind === "title"}
                  accentColor={
                    current?.color ||
                    (current?.kind === "guest" || current?.kind === "guest-roster"
                      ? "#34d399"
                      : undefined)
                  }
                >
                  <SlideContent slide={current} />
                </SlideShell>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="grid w-full max-w-3xl shrink-0 grid-cols-2 items-center px-1">
            <button
              type="button"
              className="pptx-nav-btn justify-self-start"
              disabled={slide <= 0}
              onClick={() => goTo(slide - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" /> {t("present.prev")}
            </button>
            <button
              type="button"
              className="pptx-nav-btn justify-self-end"
              disabled={slide >= slides.length - 1}
              onClick={() => goTo(slide + 1)}
            >
              {t("present.next")} <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
