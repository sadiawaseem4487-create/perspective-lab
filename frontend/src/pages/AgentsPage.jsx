import { useEffect, useState } from "react";
import { fetchAgents } from "../api";

export default function AgentsPage() {
  const [agents, setAgents] = useState([]);

  useEffect(() => {
    fetchAgents().then(setAgents).catch(console.error);
  }, []);

  const details = {
    freire: {
      asks: "Whose experience, voice, and agency is missing?",
      produces: "Critical awareness and participatory action",
      format: "experience → naming → critical question → collective action → reflection",
    },
    weber: {
      asks: "What is the rule, authority, and procedure?",
      produces: "Administrative clarity and legitimacy",
      format: "rule → authority → process → documentation → responsibility",
    },
    montessori: {
      asks: "What environment enables independent insight?",
      produces: "Self-directed learning and trial-and-error",
      format: "observation → trial → insight → gentle correction → next step",
    },
    rogers: {
      asks: "Why would this innovation be adopted or rejected?",
      produces: "Diffusion analysis and adoption pathway",
      format: "innovation → adopters → barriers → communication → trial → scaling",
    },
  };

  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-display text-3xl font-bold text-stone-900">Four agents</h2>
        <p className="mt-2 max-w-3xl text-stone-600">
          Each agent represents a different theoretical tradition and answers school dropout
          questions with its own logic. (Research view — audience sees Agent 1–4 only.)
        </p>
      </section>
      <div className="grid gap-5 lg:grid-cols-2">
        {agents.map((agent) => (
          <article
            key={agent.key}
            className="rounded-2xl border bg-white p-6 shadow-sm"
            style={{ borderTopWidth: 4, borderTopColor: agent.color }}
          >
            <p className="text-sm font-semibold" style={{ color: agent.color }}>
              {agent.name}
            </p>
            <h3 className="mt-1 text-xl font-bold text-stone-900">{agent.title}</h3>
            <p className="mt-2 text-sm text-stone-500">{agent.theory}</p>
            <dl className="mt-4 space-y-2 text-sm">
              <div>
                <dt className="font-semibold text-stone-700">Primarily asks</dt>
                <dd className="text-stone-600">{details[agent.key]?.asks}</dd>
              </div>
              <div>
                <dt className="font-semibold text-stone-700">Produces</dt>
                <dd className="text-stone-600">{details[agent.key]?.produces}</dd>
              </div>
              <div>
                <dt className="font-semibold text-stone-700">Response format</dt>
                <dd className="text-stone-600">{details[agent.key]?.format}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
}
