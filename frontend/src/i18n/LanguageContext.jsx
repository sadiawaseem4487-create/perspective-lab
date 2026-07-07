import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getTranslation, LANGUAGES, RESPONSE_LANGUAGE } from "./translations";

const STORAGE_KEY = "app_language";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || "en";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang === "pt" ? "pt-BR" : lang;
  }, [lang]);

  const setLang = (code) => {
    if (LANGUAGES.some((l) => l.code === code)) {
      setLangState(code);
    }
  };

  const t = (key) => getTranslation(lang, key);

  const value = useMemo(
    () => ({
      lang,
      setLang,
      t,
      languages: LANGUAGES,
      responseLanguage: RESPONSE_LANGUAGE[lang] || "English",
    }),
    [lang]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
