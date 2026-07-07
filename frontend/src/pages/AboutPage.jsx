export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <section className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <h2 className="font-display text-3xl font-bold text-stone-900">Research goal</h2>
        <p className="mt-4 leading-relaxed text-stone-700">
          This study asks: <strong>can we be better problem solvers with agentic AI?</strong>
          This application compares answers from four theoretical AI agents on school dropout
          questions. Later, the same questions will be asked to people to evaluate which
          approach solves problems better.
        </p>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <h3 className="text-xl font-bold text-stone-900">Case: São Paulo</h3>
        <p className="mt-3 leading-relaxed text-stone-700">
          In São Paulo&apos;s municipal school network, official dropout has fallen to about 0.6%
          (2024), but the broader Brazilian problem remains large. According to IBGE, 8.7 million
          youth aged 14–29 did not complete upper secondary education in 2024.
        </p>
        <p className="mt-3 leading-relaxed text-stone-700">
          The city has linked dropout prevention to active search work, the Mães Guardiãs and
          Estudante Presente programmes, among others.
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
          <li>Open the <strong>Presentation</strong> page for the audience (Agent 1–4 only).</li>
          <li>Ask the research question to the class.</li>
          <li>Compare the four answers side by side.</li>
          <li>Use <strong>Agents</strong> (researcher view) to explain theoretical differences.</li>
          <li>Export responses from <strong>History</strong> for later analysis.</li>
        </ol>
      </section>
    </div>
  );
}
