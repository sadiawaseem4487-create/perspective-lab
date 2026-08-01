import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  ClipboardList,
  FileText,
  GitCompare,
  History,
  KeyRound,
  Link2,
  LogIn,
  LogOut,
  MessageSquare,
  Presentation,
  Table2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { checkHealth, fetchAgentsCatalog } from "@/api";
import BrandLogo from "@/components/BrandLogo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ModeToggle from "@/components/ModeToggle";
import SidebarWorkflowMode from "@/components/SidebarWorkflowMode";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";

function NavItem({ to, icon: Icon, label, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          isActive
            ? "bg-orange-700 font-semibold text-white shadow-sm"
            : "text-slate-300 hover:bg-slate-800 hover:text-white"
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </NavLink>
  );
}

export default function AppShell() {
  const { t } = useLanguage();
  const { user, isAuthenticated, logout, isAdmin } = useAuth();
  const location = useLocation();
  const isWorkspace = location.pathname === "/question";
  const isPresent = location.pathname === "/present";
  const fillCanvas = isWorkspace || isPresent;
  const [caseInfo, setCaseInfo] = useState(null);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    fetchAgentsCatalog()
      .then((data) => setCaseInfo(data.case || null))
      .catch(() => {});
  }, []);

  // Banner only — do not force-redirect (that trapped users on Settings after save).
  useEffect(() => {
    checkHealth()
      .then((h) => {
        const missing = !h.llm_configured && h.setup_allowed !== false;
        setNeedsSetup(missing);
      })
      .catch(() => {});
  }, [location.pathname]);

  // Research flow: ask → analyze → invite → report → present → guide
  const nav = {
    research: [
      { to: "/question", icon: MessageSquare, label: t("shell.workspace"), end: true },
      { to: "/history", icon: History, label: t("nav.history") },
      { to: "/compare", icon: GitCompare, label: t("nav.compare") },
      { to: "/matrix", icon: Table2, label: t("shell.matrix") },
      { to: "/share", icon: Link2, label: t("nav.share") },
      { to: "/report", icon: FileText, label: t("nav.report") },
      { to: "/present", icon: Presentation, label: t("nav.present") },
      { to: "/guide", icon: ClipboardList, label: t("nav.guide") },
    ],
    configure: [{ to: "/settings", icon: KeyRound, label: t("nav.settings") }],
  };

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-950 text-slate-200">
        <div className="border-b border-slate-800 p-5">
          <Link to="/" className="flex items-center gap-3 rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-orange-500/50">
            <BrandLogo className="h-9 w-9 shrink-0" />
            <div>
              <p className="type-micro text-slate-500">{t("shell.product")}</p>
              <h1 className="type-section leading-tight">{t("shell.productName")}</h1>
            </div>
          </Link>
          <p className="type-meta mt-2">{t("shell.tagline")}</p>
        </div>

        <ModeToggle />
        <SidebarWorkflowMode />

        <ScrollArea className="flex-1 px-3 py-2">
          <p className="type-micro px-3 pb-2">{t("shell.research")}</p>
          <nav className="space-y-1">
            {nav.research.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </nav>

          <Separator className="my-4 bg-slate-800" />

          <p className="type-micro px-3 pb-2">{t("shell.settings")}</p>
          <nav className="space-y-1">
            {nav.configure.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </nav>
        </ScrollArea>

        <div className="border-t border-slate-800 p-4">
          {isAuthenticated ? (
            <div className="mb-3 space-y-2">
              <p className="truncate px-1 text-[11px] text-slate-400" title={user?.email}>
                {user?.email}
                {isAdmin ? " · admin" : ""}
              </p>
              <button
                type="button"
                onClick={() => logout()}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <LogIn className="h-4 w-4" />
              Sign in
            </Link>
          )}
          <LanguageSwitcher variant="sidebar" />
          <p className="mt-4 text-[11px] leading-relaxed text-slate-500">{t("app.footer")}</p>
        </div>
      </aside>

      <div className="app-canvas flex min-h-0 min-w-0 flex-1 flex-col">
        {!fillCanvas && (
          <header className="shrink-0 border-b border-white/10 px-6 py-4">
            <div className="min-w-0">
              {caseInfo && (
                <p className="text-sm leading-snug">
                  <span className="font-semibold uppercase tracking-wide text-orange-400">
                    {t("shell.case")}
                  </span>
                  <span className="text-orange-400"> · </span>
                  <span className="font-semibold text-white">
                    {caseInfo.title || caseInfo.id}
                  </span>
                </p>
              )}
              {needsSetup && (
                <p className="mt-1 text-xs text-amber-300">
                  {t("setup.banner")}{" "}
                  <Link to="/settings?tab=api" className="underline hover:text-amber-200">
                    {t("nav.settings")}
                  </Link>
                </p>
              )}
              <p className="mt-1 text-xs text-slate-400">{t("shell.flowHint")}</p>
            </div>
          </header>
        )}

        <main
          className={cn(
            "min-h-0 flex-1 text-white",
            fillCanvas ? "flex flex-col" : "px-6 py-8"
          )}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
