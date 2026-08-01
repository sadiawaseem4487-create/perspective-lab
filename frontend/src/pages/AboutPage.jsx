export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <section className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <h2 className="font-display text-3xl font-bold text-stone-900">Research goal</h2>
        <p className="mt-4 leading-relaxed text-stone-700">
          This study asks: <strong>can we be better problem solvers with agentic AI?</strong>
          PerspectiveLab compares answers from four theoretical AI agents on{" "}
          <strong>any problem framing</strong> you provide—education, policy, organisations, or
          other domains. Later, the same questions can be asked to people to evaluate which
          approach solves problems better.
        </p>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <h3 className="text-xl font-bold text-stone-900">How it works</h3>
        <p className="mt-3 leading-relaxed text-stone-700">
          Frame a problem once. Freire, Weber, Montessori, and Rogers each answer from their
          theory. You compare, invite guests, export a brief, and present—without collapsing
          everything into a single generic AI reply.
        </p>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <h3 className="text-xl font-bold text-stone-900">Researchers</h3>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-stone-700">
          <li>Sanni Pöntinen</li>
          <li>Sadia Bibi</li>
          <li>Jari Stenvall</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-orange-200 bg-orange-50 p-8">
        <h3 className="text-xl font-bold text-stone-900">Presentation guide</h3>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-stone-700">
          <li>
            Open the <strong>Presentation</strong> page for the audience.
          </li>
          <li>Ask the research question to the class.</li>
          <li>Compare human ideas with the four theory agents.</li>
        </ol>
      </section>
    </div>
  );
}
