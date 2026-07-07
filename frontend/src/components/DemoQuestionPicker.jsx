const CATEGORY_ORDER = [
  "quick_test",
  "problem_solving",
  "diagnosis",
  "policy",
  "pedagogy",
  "scaling",
  "stakeholders",
];

export function DemoQuestionPicker({ questions, onSelect, t, disabled = false }) {
  if (!questions?.length) return null;

  const sorted = [...questions].sort(
    (a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)
  );

  return (
    <select
      disabled={disabled}
      defaultValue=""
      onChange={(e) => {
        if (e.target.value) onSelect(e.target.value);
        e.target.value = "";
      }}
      className="h-9 max-w-[220px] rounded-md border border-input bg-background px-2 text-sm text-foreground"
    >
      <option value="">{t("roundtable.demoPrompt")}</option>
      {sorted.map((item) => (
        <option key={item.id} value={item.text}>
          {item.label}
        </option>
      ))}
    </select>
  );
}
