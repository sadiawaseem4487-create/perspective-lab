import { useEffect, useState } from "react";
import { ExportButtons } from "../components/ExportButtons";
import { fetchSession, fetchSessions } from "../api";

export default function HistoryPage() {
  const [sessions, setSessions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSessions()
      .then(setSessions)
      .catch((err) => setError(err.message));
  }, []);

  async function openSession(id) {
    try {
      const data = await fetchSession(id);
      setSelected(data);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-bold text-stone-900">Response history</h2>
          <p className="mt-2 text-stone-600">
            All previous questions and agent answers — for comparison with human responses.
          </p>
        </div>
        <ExportButtons />
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <h3 className="font-semibold text-stone-800">Sessions</h3>
          <ul className="mt-3 max-h-[520px] space-y-2 overflow-y-auto">
            {sessions.length === 0 && (
              <li className="text-sm text-stone-500">No saved sessions yet.</li>
            )}
            {sessions.map((session) => (
              <li key={session.id}>
                <button
                  onClick={() => openSession(session.id)}
                  className={`w-full rounded-xl border px-3 py-3 text-left text-sm transition ${
                    selected?.id === session.id
                      ? "border-orange-300 bg-orange-50"
                      : "border-stone-200 hover:bg-stone-50"
                  }`}
                >
                  <p className="font-medium text-stone-900">#{session.id}</p>
                  <p className="mt-1 line-clamp-2 text-stone-600">{session.question}</p>
                  <p className="mt-1 text-xs text-stone-400">
                    {new Date(session.created_at).toLocaleString("en-GB")}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          {!selected ? (
            <p className="text-stone-500">Select a session on the left to view answers.</p>
          ) : (
            <div className="space-y-5">
              <div>
                <p className="text-sm text-stone-500">Session #{selected.id}</p>
                <h3 className="mt-1 text-xl font-semibold text-stone-900">{selected.question}</h3>
              </div>
              <div className="space-y-4">
                {selected.responses.map((response) => (
                  <article key={response.agent_key} className="rounded-xl border border-stone-200 p-4">
                    <h4 className="font-semibold text-stone-900">
                      {response.agent_label || `Agent ${response.agent_number}`}
                    </h4>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-stone-700">
                      {response.response}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
