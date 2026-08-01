import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";

const ease = [0.22, 1, 0.36, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

const LENSES = [
  { key: "freire", color: "#ea580c", x: 50, y: 12 },
  { key: "weber", color: "#38bdf8", x: 90, y: 50 },
  { key: "montessori", color: "#34d399", x: 50, y: 88 },
  { key: "rogers", color: "#f59e0b", x: 10, y: 50 },
];

const FLOW = ["ask", "compare", "invite", "brief", "present"];

/** Lab stage: perspective floor + four labeled converging lenses. */
function HeroVisual({ t, reduceMotion }) {
  return (
    <div className="landing-hero-stage" aria-hidden>
      <div className="landing-hero-grid" />
      <div className="landing-hero-visual">
        <svg className="landing-hero-svg" viewBox="0 0 720 720" fill="none">
          <defs>
            <radialGradient id="lgCore" cx="50%" cy="50%" r="48%">
              <stop offset="0%" stopColor="#ea580c" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#020617" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="360" cy="360" r="290" fill="url(#lgCore)" />
          <motion.g
            animate={reduceMotion ? undefined : { scale: [1, 1.015, 1] }}
            transition={reduceMotion ? undefined : { duration: 7, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: "360px 360px" }}
          >
            <motion.circle
              cx="360"
              cy="292"
              r="188"
              stroke="#ea580c"
              strokeWidth="15"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.1, ease }}
            />
            <motion.circle
              cx="428"
              cy="360"
              r="188"
              stroke="#f59e0b"
              strokeWidth="15"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.92 }}
              transition={{ duration: 1.1, delay: 0.1, ease }}
            />
            <motion.circle
              cx="360"
              cy="428"
              r="188"
              stroke="#64748b"
              strokeWidth="15"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.78 }}
              transition={{ duration: 1.1, delay: 0.2, ease }}
            />
            <motion.circle
              cx="292"
              cy="360"
              r="188"
              stroke="#22d3ee"
              strokeWidth="15"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.95 }}
              transition={{ duration: 1.1, delay: 0.28, ease }}
            />
            <motion.circle
              cx="360"
              cy="360"
              r="10"
              fill="#f8fafc"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.35, ease }}
            />
          </motion.g>
        </svg>

        {LENSES.map((lens, i) => (
          <span
            key={lens.key}
            className="landing-lens-tag"
            style={{
              left: `${lens.x}%`,
              top: `${lens.y}%`,
              color: lens.color,
              borderColor: `${lens.color}55`,
            }}
          >
            <motion.span
              className="landing-lens-tag-inner"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.95 + i * 0.08, duration: 0.4, ease }}
            >
              {t(`landing.lens.${lens.key}.short`)}
            </motion.span>
          </span>
        ))}
      </div>
    </div>
  );
}

function Reveal({ children, className = "" }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      variants={fadeUp}
    >
      {children}
    </motion.div>
  );
}

export default function LandingPage() {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const reduceMotion = useReducedMotion();

  return (
    <div className="landing-page">
      <header className="landing-top">
        <Link to="/" className="landing-top-brand" aria-label="PerspectiveLab">
          <BrandLogo className="h-7 w-7" />
          <span>PerspectiveLab</span>
        </Link>
        <div className="landing-top-actions">
          <LanguageSwitcher />
          {isAuthenticated ? (
            <Link to="/question" className="landing-btn-ghost">
              {t("landing.openApp")}
            </Link>
          ) : (
            <>
              <Link to="/login" className="landing-btn-ghost">
                Sign in
              </Link>
              <Link to="/register" className="landing-btn-ghost">
                Create account
              </Link>
              <Link to="/login" className="landing-btn-ghost">
                {t("landing.openApp")}
              </Link>
            </>
          )}
        </div>
      </header>

      <section className="landing-hero">
        <motion.div
          className="landing-hero-copy"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          <motion.h1 variants={fadeUp} className="landing-brand">
            PerspectiveLab
          </motion.h1>
          <motion.p variants={fadeUp} className="landing-headline">
            {t("landing.headline")}
          </motion.p>
          <motion.p variants={fadeUp} className="landing-lede">
            {t("landing.lede")}
          </motion.p>
          <motion.aside variants={fadeUp} className="landing-sample">
            <p className="landing-sample-label">{t("landing.sampleLabel")}</p>
            <p className="landing-sample-text">{t("landing.sampleText")}</p>
          </motion.aside>
          <motion.div variants={fadeUp} className="landing-cta-row">
            {isAuthenticated ? (
              <Link to="/question" className="landing-btn-primary">
                {t("landing.openApp")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link to="/register" className="landing-btn-primary">
                  Create account
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/login" className="landing-btn-secondary">
                  Sign in
                </Link>
              </>
            )}
            <a href="#how" className="landing-btn-secondary">
              {t("landing.ctaSecondary")}
            </a>
          </motion.div>
          <motion.p variants={fadeUp} className="landing-lede" style={{ marginTop: "0.5rem", fontSize: "0.95rem" }}>
            Each person uses their own API key. Your sessions stay private to your account.
          </motion.p>
        </motion.div>
        <HeroVisual t={t} reduceMotion={reduceMotion} />
      </section>

      <section className="landing-section landing-challenge">
        <Reveal className="landing-section-intro landing-section-intro-center">
          <p className="landing-kicker">{t("landing.problemKicker")}</p>
          <h2 className="landing-section-title landing-section-title-lg">
            {t("landing.problemTitle")}
          </h2>
          <p className="landing-section-body landing-challenge-body">
            {t("landing.problemBody")}
          </p>
        </Reveal>
      </section>

      <section id="how" className="landing-section landing-system">
        <Reveal className="landing-section-intro">
          <p className="landing-kicker">{t("landing.howKicker")}</p>
          <h2 className="landing-section-title">{t("landing.howTitle")}</h2>
          <p className="landing-section-body">{t("landing.howBody")}</p>
        </Reveal>
        <motion.ol
          className="landing-flow-path"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.25 }}
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.08 } },
          }}
        >
          {FLOW.map((step, i) => (
            <motion.li
              key={step}
              className="landing-flow-step"
              variants={{
                hidden: { opacity: 0, y: 14 },
                show: { opacity: 1, y: 0, transition: { duration: 0.4, ease } },
              }}
            >
              <span className="landing-flow-num">{String(i + 1).padStart(2, "0")}</span>
              <h3>{t(`landing.flow.${step}.title`)}</h3>
              <p>{t(`landing.flow.${step}.body`)}</p>
            </motion.li>
          ))}
        </motion.ol>
      </section>

      <section className="landing-section landing-agents">
        <Reveal className="landing-section-intro">
          <p className="landing-kicker">{t("landing.lensesKicker")}</p>
          <h2 className="landing-section-title">{t("landing.lensesTitle")}</h2>
          <p className="landing-section-body">{t("landing.lensesBody")}</p>
        </Reveal>
        <ul className="landing-agent-board">
          {LENSES.map((lens) => (
            <li key={lens.key} className="landing-agent-cell">
              <span className="landing-agent-bar" style={{ backgroundColor: lens.color }} />
              <h3>{t(`landing.lens.${lens.key}.name`)}</h3>
              <p>{t(`landing.lens.${lens.key}.lens`)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="landing-section landing-who-section">
        <Reveal className="landing-section-intro">
          <p className="landing-kicker">{t("landing.whoKicker")}</p>
          <h2 className="landing-section-title">{t("landing.whoTitle")}</h2>
          <ul className="landing-who">
            <li>{t("landing.who1")}</li>
            <li>{t("landing.who2")}</li>
            <li>{t("landing.who3")}</li>
          </ul>
        </Reveal>
      </section>

      <section className="landing-close">
        <Reveal>
          <p className="landing-close-prompt">{t("landing.closePrompt")}</p>
          <h2 className="landing-close-title">{t("landing.closeTitle")}</h2>
          <p className="landing-close-body">{t("landing.closeBody")}</p>
          <Link to="/register" className="landing-btn-primary">
            Create account
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Reveal>
      </section>

      <footer className="landing-footer">
        <p>{t("app.footer")}</p>
        <p className="landing-footer-meta">{t("landing.footerMeta")}</p>
      </footer>
    </div>
  );
}
