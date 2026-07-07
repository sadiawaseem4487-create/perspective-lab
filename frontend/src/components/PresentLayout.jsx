import { Outlet } from "react-router-dom";

export default function PresentLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-amber-50 to-orange-50">
      <header className="border-b border-orange-900/10 bg-gradient-to-r from-orange-900 via-red-900 to-rose-900 text-white shadow-lg">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <p className="text-xs uppercase tracking-[0.2em] text-orange-200/90">
            Research study
          </p>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            School Dropout — Agent Comparison
          </h1>
          <p className="mt-1 text-sm text-orange-100/90">
            Four AI agents answer the same question independently
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
