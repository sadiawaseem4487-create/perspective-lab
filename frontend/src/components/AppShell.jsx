import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Cpu,
  FileText,
  GitCompare,
  LayoutDashboard,
  MessageSquare,
  Table2,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { fetchAgentsCatalog } from "@/api";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Badge } from "@/components/ui/badge";
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
            ? "bg-sidebar-accent font-semibold text-white shadow-sm"
            : "text-sidebar-foreground hover:bg-white/10"
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0 opacity-90" />
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
      { to: "/question", icon: MessageSquare, label: t("shell.workspace") },
      { to: "/report", icon: FileText, label: t("nav.report") },
      { to: "/compare", icon: GitCompare, label: t("nav.compare") },
      { to: "/matrix", icon: Table2, label: t("shell.matrix") },
    ],
    configure: [
      { to: "/agents", icon: Users, label: t("nav.agents") },
      { to: "/models", icon: Cpu, label: t("nav.models") },
    ],
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
        <div className="border-b border-white/10 p-5">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-sidebar-accent" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-sidebar-muted">
                {t("shell.product")}
              </p>
              <h1 className="font-display text-lg font-bold leading-tight text-sidebar-foreground">
                {t("shell.productName")}
              </h1>
            </div>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-sidebar-muted">{t("shell.tagline")}</p>
        </div>

        <ScrollArea className="flex-1 px-3 py-4">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-sidebar-muted">
            {t("shell.research")}
          </p>
          <nav className="space-y-1">
            {nav.research.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </nav>

          <Separator className="my-4 bg-white/10" />

          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-sidebar-muted">
            {t("shell.configure")}
          </p>
          <nav className="space-y-1">
            {nav.configure.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </nav>
        </ScrollArea>

        <div className="border-t border-white/10 p-4">
          <LanguageSwitcher variant="sidebar" />
          <p className="mt-4 text-[11px] leading-relaxed text-sidebar-muted">{t("app.footer")}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {!isWorkspace && (
          <header className="border-b bg-card px-6 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                {caseInfo && (
                  <Badge variant="secondary" className="mb-2 font-normal">
                    {t("shell.case")}: {caseInfo.title || caseInfo.id}
                  </Badge>
                )}
                <p className="text-sm text-muted-foreground">{t("app.workflow")}</p>
              </div>
              {caseInfo?.id && (
                <code className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                  cases/{caseInfo.id}
                </code>
              )}
            </div>
          </header>
        )}

        <main className={isWorkspace ? "flex-1 bg-muted/20" : "flex-1 px-6 py-8"}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
