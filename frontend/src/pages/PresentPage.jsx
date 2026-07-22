import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ExternalLink, Presentation, X } from "lucide-react";
import { fetchPresentationConfig, fetchReport, fetchReports } from "@/api";
import { AgentAvatar } from "@/components/AgentAvatar";
import { buildPresentationSlides } from "@/utils/buildPresentationSlides";
import {
  displayQuestion,
  resolvePreferredSessionId,
  uniqueReportsByQuestion,
} from "@/utils/uniqueReports";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1];

const slideVariants = {
  enter: (dir) => ({
    opacity: 0,
    x: dir >= 0 ? 56 : -56,
    scale: 0.985,
  }),
  center: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: 0.45, ease },
  },
  exit: (dir) => ({
    opacity: 0,
    x: dir >= 0 ? -40 : 40,
    scale: 0.99,
    transition: { duration: 0.28, ease },
  }),
};

const stagger = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.12 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease },
  },
};

function SlideFrame({ children, align = "start", className }) {
  return (
    <div
      className={cn(
        "mx-auto flex h-full w-full max-w-4xl flex-col justify-center",
        align === "center" && "items-center text-center",
        align === "start" && "items-stretch text-left",
        className
      )}
    >
      {children}
    </div>
  );
}

function Eyebrow({ children, className }) {
  return (
    <motion.p
      variants={fadeUp}
      className={cn(
        "text-[11px] font-bold uppercase tracking-[0.22em] text-orange-400",
        className
      )}
    >
      {children}
    </motion.p>
  );
}

function BulletList({ items, numbered = true }) {
  return (
    <ul className="mt-6 space-y-2.5 text-left">
      {(items || []).map((item, index) => (
        <motion.li
          key={`${index}-${String(item).slice(0, 24)}`}
          variants={fadeUp}
          className="flex items-start gap-3 rounded-xl border border-white/10 bg-slate-950/45 px-4 py-3"
        >
          {numbered ? (
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500/20 text-[11px] font-bold text-orange-300">
              {index + 1}
            </span>
          ) : (
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
          )}
          <p className="min-w-0 flex-1 text-pretty text-base leading-relaxed text-slate-200">{item}</p>
        </motion.li>
      ))}
    </ul>
  );
}

function TopicSlide({ slide }) {
  return (
    <SlideFrame align="center">
      <motion.div variants={stagger} initial="hidden" animate="show" className="w-full max-w-3xl">
        <Eyebrow>{slide.eyebrow}</Eyebrow>
        {slide.caseTitle && (
          <motion.p variants={fadeUp} className="mt-4 text-sm font-medium uppercase tracking-wider text-slate-400">
            {slide.caseTitle}
          </motion.p>
        )}
        <motion.h1
          variants={fadeUp}
          className="font-display mt-4 text-balance text-3xl font-bold leading-[1.15] text-white sm:text-5xl"
        >
          {slide.title}
        </motion.h1>
        {slide.subtitle && (
          <motion.p
            variants={fadeUp}
            className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-slate-400 sm:text-lg"
          >
            {slide.subtitle}
          </motion.p>
        )}
        {slide.question && (
          <motion.blockquote
            variants={fadeUp}
            className="mx-auto mt-8 max-w-2xl rounded-2xl border border-orange-500/25 bg-orange-500/10 px-5 py-4 text-left"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-300/90">
              {slide.questionLabel || "Research question"}
            </p>
            <p className="mt-2 text-pretty text-lg leading-snug text-white sm:text-xl">{slide.question}</p>
          </motion.blockquote>
        )}
        <motion.div
          variants={fadeUp}
          className="mx-auto mt-10 h-px w-24 bg-gradient-to-r from-transparent via-orange-400/70 to-transparent"
        />
      </motion.div>
    </SlideFrame>
  );
}

function IntroductionSlide({ slide }) {
  return (
    <SlideFrame>
      <motion.div variants={stagger} initial="hidden" animate="show" className="w-full">
        <Eyebrow>{slide.eyebrow}</Eyebrow>
        <motion.h2
          variants={fadeUp}
          className="font-display mt-3 text-balance text-3xl font-bold text-white sm:text-4xl"
        >
          {slide.title}
        </motion.h2>
        <BulletList items={slide.bullets} />
      </motion.div>
    </SlideFrame>
  );
}

function AgendaSlide({ slide }) {
  return (
    <SlideFrame>
      <motion.div variants={stagger} initial="hidden" animate="show" className="w-full">
        <Eyebrow>{slide.eyebrow}</Eyebrow>
        <motion.h2
          variants={fadeUp}
          className="font-display mt-3 text-balance text-3xl font-bold text-white sm:text-4xl"
        >
          {slide.title}
        </motion.h2>
        <motion.div variants={fadeUp} className="mt-8 grid gap-3 sm:grid-cols-2">
          {slide.items.map((item, index) => (
            <motion.div
              key={item.agentKey}
              variants={fadeUp}
              whileHover={{ y: -2, transition: { duration: 0.2 } }}
              className="flex min-h-[92px] items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 backdrop-blur-sm"
              style={{ borderTopWidth: 3, borderTopColor: item.color }}
            >
              <span className="w-7 shrink-0 font-mono text-xs text-slate-500">
                {String(index + 1).padStart(2, "0")}
              </span>
              <AgentAvatar
                agentKey={item.agentKey}
                color={item.color}
                status="done"
                className="h-14 w-12 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-white">{item.theorist}</p>
                <p className="mt-0.5 truncate text-sm text-slate-400">{item.lens}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </SlideFrame>
  );
}

function AgentSlide({ slide, keyPointsLabel }) {
  return (
    <SlideFrame>
      <motion.div variants={stagger} initial="hidden" animate="show" className="w-full">
        <motion.div variants={fadeUp} className="grid gap-5 sm:grid-cols-[auto_1fr] sm:items-start">
          <AgentAvatar
            agentKey={slide.agentKey}
            color={slide.color}
            status="done"
            className="h-28 w-24 justify-self-start"
          />
          <div className="min-w-0">
            <Eyebrow>{slide.eyebrow}</Eyebrow>
            <h2 className="font-display mt-2 text-balance text-3xl font-bold text-white sm:text-4xl">
              {slide.theorist}
            </h2>
            {slide.lens && <p className="mt-1 text-sm text-slate-400">{slide.lens}</p>}
            {slide.takeaway && (
              <p className="mt-4 text-pretty text-lg leading-relaxed text-slate-100 sm:text-xl">
                {slide.takeaway}
              </p>
            )}
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="mt-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {keyPointsLabel}
          </p>
          <ul className="mt-4 space-y-2.5">
            {(slide.points || []).map((point, index) => (
              <motion.li
                key={`${index}-${point.slice(0, 24)}`}
                variants={fadeUp}
                className="flex items-start gap-3 rounded-xl border border-white/10 bg-slate-950/45 px-4 py-3"
              >
                <span
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                  style={{ backgroundColor: slide.color || "#c2410c" }}
                >
                  {index + 1}
                </span>
                <p className="min-w-0 flex-1 text-pretty text-base leading-relaxed text-slate-200 sm:text-[17px]">
                  {point}
                </p>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </motion.div>
    </SlideFrame>
  );
}

function CaseStudySlide({ slide }) {
  return (
    <SlideFrame>
      <motion.div variants={stagger} initial="hidden" animate="show" className="w-full">
        <Eyebrow>{slide.eyebrow}</Eyebrow>
        <motion.h2
          variants={fadeUp}
          className="font-display mt-3 text-balance text-3xl font-bold text-white sm:text-4xl"
        >
          {slide.title}
        </motion.h2>
        <div className="mt-6 space-y-4">
          {(slide.paragraphs || []).map((p) => (
            <motion.p
              key={p.slice(0, 40)}
              variants={fadeUp}
              className="text-pretty text-base leading-relaxed text-slate-300 sm:text-lg"
            >
              {p}
            </motion.p>
          ))}
        </div>
        {slide.question && (
          <motion.p
            variants={fadeUp}
            className="mt-6 rounded-xl border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-sm leading-relaxed text-sky-100"
          >
            <span className="font-semibold text-sky-300">Q: </span>
            {slide.question}
          </motion.p>
        )}
        {(slide.bullets || []).length > 0 && <BulletList items={slide.bullets} numbered={false} />}
      </motion.div>
    </SlideFrame>
  );
}

function SynthesisSlide({ slide }) {
  return (
    <SlideFrame>
      <motion.div variants={stagger} initial="hidden" animate="show" className="w-full">
        <Eyebrow>{slide.eyebrow}</Eyebrow>
        <motion.h2
          variants={fadeUp}
          className="font-display mt-3 text-balance text-3xl font-bold text-white sm:text-4xl"
        >
          {slide.title}
        </motion.h2>
        <motion.div variants={fadeUp} className="mt-8 grid gap-3 sm:grid-cols-2">
          {slide.cards.map((card) => (
            <motion.article
              key={card.agentKey}
              variants={fadeUp}
              whileHover={{ y: -2 }}
              className="flex min-h-[140px] flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              style={{ boxShadow: `inset 3px 0 0 ${card.color}` }}
            >
              <div className="flex items-center gap-3">
                <AgentAvatar
                  agentKey={card.agentKey}
                  color={card.color}
                  status="done"
                  className="h-12 w-10 shrink-0"
                />
                <p className="truncate font-semibold text-white">{card.theorist}</p>
              </div>
              <p className="mt-3 flex-1 text-pretty text-sm leading-relaxed text-slate-300">
                {card.takeaway}
              </p>
            </motion.article>
          ))}
        </motion.div>
      </motion.div>
    </SlideFrame>
  );
}

function ConclusionSlide({ slide }) {
  return (
    <SlideFrame align="center">
      <motion.div variants={stagger} initial="hidden" animate="show" className="w-full max-w-2xl">
        <Eyebrow>{slide.eyebrow}</Eyebrow>
        <motion.h2
          variants={fadeUp}
          className="font-display mt-5 text-balance text-3xl font-bold leading-tight text-white sm:text-5xl"
        >
          {slide.title}
        </motion.h2>
        <motion.ul variants={fadeUp} className="mt-10 space-y-3 text-left">
          {(slide.prompts || []).map((prompt, index) => (
            <motion.li
              key={prompt}
              variants={fadeUp}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5"
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500/20 text-[11px] font-bold text-orange-300">
                {index + 1}
              </span>
              <span className="text-pretty text-base leading-relaxed text-slate-200">{prompt}</span>
            </motion.li>
          ))}
        </motion.ul>
      </motion.div>
    </SlideFrame>
  );
}

function SourcesSlide({ slide }) {
  return (
    <SlideFrame>
      <motion.div variants={stagger} initial="hidden" animate="show" className="w-full">
        <Eyebrow>{slide.eyebrow}</Eyebrow>
        <motion.h2
          variants={fadeUp}
          className="font-display mt-3 text-balance text-3xl font-bold text-white sm:text-4xl"
        >
          {slide.title}
        </motion.h2>
        <motion.ul variants={fadeUp} className="mt-8 space-y-3">
          {(slide.sources || []).map((source) => (
            <motion.li key={source.url} variants={fadeUp}>
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="group flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5 transition-colors hover:border-orange-500/40 hover:bg-orange-500/5"
              >
                <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
                <div className="min-w-0">
                  <p className="font-semibold text-white group-hover:text-orange-100">{source.label}</p>
                  {source.note && <p className="mt-1 text-sm text-slate-400">{source.note}</p>}
                  <p className="mt-1 truncate text-xs text-slate-500">{source.url}</p>
                </div>
              </a>
            </motion.li>
          ))}
        </motion.ul>
      </motion.div>
    </SlideFrame>
  );
}

function renderSlide(current, t) {
  if (!current) {
    return (
      <SlideFrame align="center">
        <p className="text-slate-400">{t("stage4.noReports")}</p>
      </SlideFrame>
    );
  }
  switch (current.kind) {
    case "topic":
      return <TopicSlide slide={current} />;
    case "introduction":
      return <IntroductionSlide slide={current} />;
    case "agenda":
      return <AgendaSlide slide={current} />;
    case "agent":
      return <AgentSlide slide={current} keyPointsLabel={t("present.keyPoints")} />;
    case "case_study":
      return <CaseStudySlide slide={current} />;
    case "synthesis":
      return <SynthesisSlide slide={current} />;
    case "conclusion":
      return <ConclusionSlide slide={current} />;
    case "sources":
      return <SourcesSlide slide={current} />;
    default:
      return <ConclusionSlide slide={current} />;
  }
}

export default function PresentPage() {
  const { t, lang } = useLanguage();
  const [params] = useSearchParams();
  const [reports, setReports] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [report, setReport] = useState(null);
  const [presentation, setPresentation] = useState(null);
  const [slide, setSlide] = useState(0);
  const [direction, setDirection] = useState(1);
  const [error, setError] = useState("");
  const slideRef = useRef(0);

  useEffect(() => {
    fetchPresentationConfig()
      .then(setPresentation)
      .catch(() => setPresentation(null));
  }, []);

  useEffect(() => {
    const fromQuery = Number(params.get("session"));
    const lastId = sessionStorage.getItem("last_session_id");
    fetchReports()
      .then((list) => {
        const unique = uniqueReportsByQuestion(list);
        setReports(unique);
        if (fromQuery) {
          const match = unique.find((r) => r.session_id === fromQuery);
          setSessionId(match?.session_id || resolvePreferredSessionId(list, fromQuery));
        } else {
          setSessionId(resolvePreferredSessionId(list, lastId));
        }
      })
      .catch((err) => setError(err.message));
  }, [params]);

  useEffect(() => {
    if (!sessionId) return;
    fetchReport(sessionId)
      .then((data) => {
        setReport({ ...data, question: displayQuestion(data.question) });
        setDirection(1);
        setSlide(0);
        slideRef.current = 0;
        setError("");
      })
      .catch((err) => setError(err.message));
  }, [sessionId]);

  const slides = useMemo(
    () => buildPresentationSlides(report, t, lang, presentation),
    [report, t, lang, presentation]
  );
  const current = slides[slide];
  const progress = slides.length ? ((slide + 1) / slides.length) * 100 : 0;

  function goTo(nextIndex) {
    const clamped = Math.max(0, Math.min(nextIndex, slides.length - 1));
    if (clamped === slideRef.current) return;
    setDirection(clamped > slideRef.current ? 1 : -1);
    slideRef.current = clamped;
    setSlide(clamped);
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
        window.history.back();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slides.length]);

  return (
    <div className="present-stage relative min-h-screen overflow-hidden text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,rgba(194,65,12,0.18),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_90%_80%,rgba(14,116,144,0.12),transparent_50%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col px-5 py-4 sm:px-8 sm:py-5">
        <header className="grid grid-cols-[1fr_auto] items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Presentation className="h-4 w-4 shrink-0 text-orange-400" />
            <span className="truncate">{t("present.title")}</span>
            {sessionId ? (
              <span className="hidden font-mono text-slate-500 sm:inline">· #{sessionId}</span>
            ) : null}
          </div>

          <div className="hidden justify-center sm:flex">
            {slides.length > 0 && (
              <div className="flex items-center gap-1.5">
                {slides.map((s, index) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-label={`Go to slide ${index + 1}`}
                    onClick={() => goTo(index)}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      index === slide
                        ? "w-7 bg-orange-400"
                        : "w-1.5 bg-white/20 hover:bg-white/45"
                    )}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2">
            <select
              className="page-select h-9 max-w-[11rem] sm:max-w-[14rem]"
              value={sessionId || ""}
              onChange={(e) => setSessionId(Number(e.target.value))}
              aria-label={t("stage5.pickSession")}
            >
              {reports.map((r) => (
                <option key={r.session_id} value={r.session_id}>
                  #{r.session_id}
                  {r.question ? ` — ${r.question.slice(0, 28)}${r.question.length > 28 ? "…" : ""}` : ""}
                </option>
              ))}
            </select>
            <Button asChild variant="outline" size="sm" className="border-white/20 bg-transparent text-white">
              <Link to="/question">
                <X className="mr-1 h-4 w-4" />
                {t("present.exit")}
              </Link>
            </Button>
          </div>
        </header>

        <div className="mt-4 h-[2px] overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full origin-left rounded-full bg-gradient-to-r from-orange-500 to-amber-300"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.35, ease }}
          />
        </div>

        {error && <p className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

        <main className="relative flex min-h-0 flex-1 items-center py-6 sm:py-8">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={current?.id || "empty"}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="absolute inset-x-0 top-0 bottom-0 flex items-center"
            >
              {renderSlide(current, t)}
            </motion.div>
          </AnimatePresence>
        </main>

        <footer className="grid grid-cols-3 items-center border-t border-white/10 pt-4">
          <button
            type="button"
            className="inline-flex items-center gap-1 justify-self-start text-sm text-slate-400 transition-colors hover:text-white disabled:opacity-30"
            disabled={slide <= 0}
            onClick={() => goTo(slide - 1)}
          >
            <ChevronLeft className="h-4 w-4" /> {t("present.prev")}
          </button>
          <p className="justify-self-center text-center text-xs tabular-nums text-slate-500">
            {slides.length ? `${slide + 1} / ${slides.length}` : "0 / 0"}
            <span className="hidden sm:inline"> · ← → Space · Esc</span>
          </p>
          <button
            type="button"
            className="inline-flex items-center gap-1 justify-self-end text-sm text-slate-400 transition-colors hover:text-white disabled:opacity-30"
            disabled={slide >= slides.length - 1}
            onClick={() => goTo(slide + 1)}
          >
            {t("present.next")} <ChevronRight className="h-4 w-4" />
          </button>
        </footer>
      </div>
    </div>
  );
}
