"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "paper";
const ThemeCtx = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "dark",
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const saved = (localStorage.getItem("synapse-theme") as Theme) || "dark";
    setTheme(saved);
  }, []);

  const apply = (t: Theme) => {
    const root = document.documentElement;
    root.classList.remove("theme-dark", "theme-paper");
    root.classList.add(`theme-${t}`);
    localStorage.setItem("synapse-theme", t);
    setTheme(t);
  };

  return (
    <ThemeCtx.Provider value={{ theme, toggle: () => apply(theme === "dark" ? "paper" : "dark") }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);
