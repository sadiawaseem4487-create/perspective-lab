import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "perspective_lab_app_mode";

export const APP_MODES = {
  live: "live",
  demo: "demo",
};

const AppModeContext = createContext(null);

export function AppModeProvider({ children }) {
  const [mode, setModeState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === APP_MODES.demo ? APP_MODES.demo : APP_MODES.live;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const setMode = (next) => {
    if (next === APP_MODES.live || next === APP_MODES.demo) {
      setModeState(next);
    }
  };

  const value = useMemo(
    () => ({
      mode,
      isDemo: mode === APP_MODES.demo,
      isLive: mode === APP_MODES.live,
      setMode,
    }),
    [mode]
  );

  return <AppModeContext.Provider value={value}>{children}</AppModeContext.Provider>;
}

export function useAppMode() {
  const ctx = useContext(AppModeContext);
  if (!ctx) throw new Error("useAppMode must be used within AppModeProvider");
  return ctx;
}
