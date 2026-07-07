import { NavLink, Outlet } from "react-router-dom";

const navClass = ({ isActive }) =>
  `px-3 py-2 rounded-lg text-sm font-medium transition ${
    isActive ? "bg-white/15 text-white" : "text-white/80 hover:text-white hover:bg-white/10"
  }`;

export default function Layout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-amber-50 to-orange-50">
      <header className="border-b border-orange-900/10 bg-gradient-to-r from-orange-900 via-red-900 to-rose-900 text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-orange-200/90">
              Research Application
            </p>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">
              São Paulo Dropout Agents
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-orange-100/90">
              Four theoretical AI agents for school dropout questions — built for comparison research
            </p>
          </div>
          <nav className="flex flex-wrap gap-2">
            <NavLink to="/present" className={navClass}>
              Presentation
            </NavLink>
            <NavLink to="/research" className={navClass}>
              Ask
            </NavLink>
            <NavLink to="/agents" className={navClass}>
              Agents
            </NavLink>
            <NavLink to="/history" className={navClass}>
              History
            </NavLink>
            <NavLink to="/about" className={navClass}>
              About
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-stone-200 py-6 text-center text-sm text-stone-500">
        Sanni Pöntinen, Sadia Bibi, Jari Stenvall — HAMK Research
      </footer>
    </div>
  );
}
