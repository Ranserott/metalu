"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { DEFAULT_THEME, getTheme, Theme, ThemeId } from "./themes";

const STORAGE_KEY = "metalu-theme";

type ThemeContextValue = {
  theme: Theme;
  setThemeId: (id: ThemeId) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyThemeToDocument(theme: Theme) {
  const root = document.documentElement;
  root.style.setProperty("--theme-primary", theme.primary);
  root.style.setProperty("--theme-dark", theme.dark);
  root.style.setProperty("--theme-darker", theme.darker);
  root.style.setProperty("--theme-light", theme.light);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>(DEFAULT_THEME);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY) as ThemeId | null;
      if (stored && stored !== themeId) {
        setThemeIdState(stored);
        applyThemeToDocument(getTheme(stored));
      } else {
        applyThemeToDocument(getTheme(themeId));
      }
    } catch {
      applyThemeToDocument(getTheme(themeId));
    }
    setMounted(true);
  }, []);

  function setThemeId(id: ThemeId) {
    setThemeIdState(id);
    const theme = getTheme(id);
    applyThemeToDocument(theme);
    try {
      sessionStorage.setItem(STORAGE_KEY, id);
    } catch {}
  }

  return (
    <ThemeContext.Provider value={{ theme: getTheme(themeId), setThemeId }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return { theme: getTheme(DEFAULT_THEME), setThemeId: () => {} };
  }
  return ctx;
}
