import { useLanguage } from "../i18n/LanguageContext";

export default function LanguageSwitcher({ variant = "header" }) {
  const { lang, setLang, languages, t } = useLanguage();
  const isSidebar = variant === "sidebar";

  return (
    <div className="flex items-center gap-2">
      <span className={isSidebar ? "text-xs text-slate-500" : "text-xs text-orange-200/90"}>
        {t("app.language")}:
      </span>
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        className={
          isSidebar
            ? "w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200"
            : "rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white backdrop-blur hover:bg-white/20"
        }
      >
        {languages.map((l) => (
          <option key={l.code} value={l.code} className="text-stone-900">
            {l.flag} {l.label}
          </option>
        ))}
      </select>
    </div>
  );
}
