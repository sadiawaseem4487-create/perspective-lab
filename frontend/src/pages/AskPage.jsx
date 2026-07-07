import { useEffect, useState } from "react";
import { askQuestion, checkHealth } from "../api";

const EXAMPLE = "How do we solve school dropout in São Paulo?";

function AgentCard({ agent }) {
  const label = agent.agent_label || `Agent ${agent.agent_number || "?"}`;

  return (
    <article
      className="rounded-2xl border bg-white p-5 shadow-sm"
      style={{ borderColor: `${agent.color}33` }}
    >
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: agent.color }}>
          {label}
        </p>
      </div>
      {agent.error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{agent.error}</p>
      ) : (
        <div className="prose prose-stone max-w-none whitespace-pre-wrap text-sm leading-relaxed text-stone-700">
          {agent.response}
        </div>
      )}
    </article>
  );
}

export default function AskPage() {
  const [question, setQuestion] = useState(EXAMPLE);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [apiReady, setApiReady] = useState(null);
  const [systemInfo, setSystemInfo] = useState(null);

  useEffect(() => {
    checkHealth()
      .then((data) => {
        setApiReady(data.llm_configured ?? data.openai_configured);
        setSystemInfo(data);
      })
      .catch(() => setApiReady(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await askQuestion(question.trim());
      setResult(data);
    } catch (err) {
      setError(err.message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {systemInfo && (
        <div className="flex flex-wrap gap-3 text-xs text-stone-500">
          <span>v{systemInfo.version}</span>
          <span>{systemInfo.environment}</span>
          <span>{systemInfo.database_ok ? "Database OK" : "Database issue"}</span>
        </div>
      )}

      {apiReady === false && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          API key not configured. Add your OpenRouter or OpenAI key to <code>backend/.env</code>
        </div>
      )}

      <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="font-display text-2xl font-bold text-stone-900">Ask a question</h2>
        <p className="mt-2 text-stone-600">
          All four agents answer the same question from different theoretical perspectives.
          Responses are saved for comparison research.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-stone-300 px-4 py-3 text-stone-900 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
            placeholder="Write a question about school dropout..."
            required
          />
          <button
            type="submit"
            disabled={loading || question.trim().length < 5}
            className="rounded-xl bg-gradient-to-r from-orange-700 to-red-800 px-6 py-3 font-semibold text-white shadow-md transition hover:from-orange-800 hover:to-red-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Agents are answering..." : "Send to all 4 agents"}
          </button>
        </form>
        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      </section>

      {result && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-bold text-stone-900">Answers</h2>
              <p className="text-sm text-stone-500">Session #{result.session_id}</p>
            </div>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            {result.responses.map((agent) => (
              <AgentCard key={agent.agent_key} agent={agent} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
