import { NavLink, Outlet } from "react-router-dom";
import LanguageSwitcher from "./LanguageSwitcher";
import { useLanguage } from "../i18n/LanguageContext";

export default function StageLayout() {
  const { t } = useLanguage();

  const STAGES = [
    { step: 1, to: "/agents", label: t("nav.agents") },
    { step: 2, to: "/models", label: t("nav.models") },
    { step: 3, to: "/question", label: t("nav.question") },
    { step: 4, to: "/report", label: t("nav.report") },
    { step: 5, to: "/compare", label: t("nav.compare") },
  ];

  const navClass = ({ isActive }) =>
    `flex flex-col items-center rounded-xl px-4 py-3 text-center transition min-w-[120px] ${
      isActive ? "bg-white text-orange-900 shadow-md" : "bg-white/10 text-white hover:bg-white/20"
    }`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-amber-50 to-orange-50">
      <header className="border-b border-orange-900/10 bg-gradient-to-r from-orange-900 via-red-900 to-rose-900 text-white shadow-lg">
        <div className="mx-auto max-w-7xl px-4 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-orange-200/90">{t("app.subtitle")}</p>
              <h1 className="font-display text-2xl font-bold sm:text-3xl">{t("app.title")}</h1>
              <p className="mt-1 text-sm text-orange-100/90">{t("app.workflow")}</p>
            </div>
            <LanguageSwitcher />
          </div>
          <nav className="mt-5 flex flex-wrap gap-3">
            {STAGES.map((stage) => (
              <NavLink key={stage.to} to={stage.to} className={navClass}>
                <span className="text-xs font-bold uppercase tracking-wide opacity-70">
                  {t("app.stage")} {stage.step}
                </span>
                <span className="mt-1 text-sm font-semibold">{stage.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-stone-200 py-6 text-center text-sm text-stone-500">
        {t("app.footer")}
      </footer>
    </div>
  );
}
