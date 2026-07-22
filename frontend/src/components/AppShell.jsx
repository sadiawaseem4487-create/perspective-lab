import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Cpu,
  Download,
  FileText,
  GitCompare,
  LayoutDashboard,
  MessageSquare,
  Presentation,
  Table2,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { fetchAgentsCatalog } from "@/api";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ModeToggle from "@/components/ModeToggle";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
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
  const location = useLocation();
  const isWorkspace = location.pathname === "/question";
  const [caseInfo, setCaseInfo] = useState(null);

  useEffect(() => {
    fetchAgentsCatalog()
      .then((data) => setCaseInfo(data.case || null))
      .catch(() => {});
  }, []);

  const nav = {
    research: [
      { to: "/question", icon: MessageSquare, label: t("shell.workspace"), end: true },
      { to: "/report", icon: FileText, label: t("nav.report") },
      { to: "/compare", icon: GitCompare, label: t("nav.compare") },
      { to: "/matrix", icon: Table2, label: t("shell.matrix") },
      { to: "/present", icon: Presentation, label: t("nav.present") },
      { to: "/export", icon: Download, label: t("nav.export") },
    ],
    configure: [
      { to: "/agents", icon: Users, label: t("nav.agents") },
      { to: "/models", icon: Cpu, label: t("nav.models") },
    ],
  };

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-950 text-slate-200">
        <div className="border-b border-slate-800 p-5">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-orange-500" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {t("shell.product")}
              </p>
              <h1 className="font-display text-lg font-bold leading-tight text-white">
                {t("shell.productName")}
              </h1>
            </div>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">{t("shell.tagline")}</p>
        </div>

        <ModeToggle />

        <ScrollArea className="flex-1 px-3 py-2">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            {t("shell.research")}
          </p>
          <nav className="space-y-1">
            {nav.research.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </nav>

          <Separator className="my-4 bg-slate-800" />

          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            {t("shell.setup")}
          </p>
          <nav className="space-y-1">
            {nav.configure.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </nav>
        </ScrollArea>

        <div className="border-t border-slate-800 p-4">
          <LanguageSwitcher variant="sidebar" />
          <p className="mt-4 text-[11px] leading-relaxed text-slate-500">{t("app.footer")}</p>
        </div>
      </aside>

      <div className="app-canvas flex min-w-0 flex-1 flex-col">
        {!isWorkspace && (
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
              <p className="mt-1 text-xs text-slate-400">{t("shell.flowHint")}</p>
            </div>
          </header>
        )}

        <main
          className={cn(
            "flex-1 text-white",
            isWorkspace ? "min-h-screen" : "px-6 py-8"
          )}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
