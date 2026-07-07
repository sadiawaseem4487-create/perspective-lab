const CATEGORY_ORDER = [
  "quick_test",
  "problem_solving",
  "diagnosis",
  "policy",
  "pedagogy",
  "scaling",
  "stakeholders",
];

function groupByCategory(questions) {
  const grouped = {};
  for (const item of questions || []) {
    const category = item.category || "other";
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push(item);
  }
  return grouped;
}

export function DemoQuestionPicker({ questions, onSelect, t, disabled = false }) {
  const grouped = groupByCategory(questions);
  const categories = CATEGORY_ORDER.filter((key) => grouped[key]?.length);

  if (!categories.length) return null;

  return (
    <div className="space-y-4 rounded-xl border border-dashed border-stone-300 bg-stone-50 p-4">
      <p className="text-sm font-semibold text-stone-800">{t("stage3.demoQuestions")}</p>
      {categories.map((category) => (
        <div key={category}>
          <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
            {t(`stage3.demoCategories.${category}`)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {grouped[category].map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={disabled}
                onClick={() => onSelect(item.text)}
                title={item.text}
                className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-left text-sm text-stone-700 hover:border-orange-400 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
