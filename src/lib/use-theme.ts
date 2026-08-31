"use client";

import { useCallback, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "theme";
// Evento propio para que ThemeToggle y Logo se enteren de un cambio
// hecho en la misma pestaña — "storage" solo dispara en otras pestañas.
const THEME_CHANGE_EVENT = "themechange";

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getStoredTheme(): Theme {
  try {
    const t = localStorage.getItem(STORAGE_KEY);
    if (t === "light" || t === "dark" || t === "system") return t;
  } catch {}
  return "system";
}

function resolveTheme(theme: Theme): ResolvedTheme {
  return theme === "system" ? getSystemTheme() : theme;
}

// Reemplaza a next-themes: mismo storageKey ("theme") y atributo
// (data-theme en <html>), pero sin el <script> que next-themes renderiza
// desde un Client Component — eso dispara el warning de React 19 de
// "Encountered a script tag while rendering React component" (el script
// que evita el flash de tema vive directo en layout.tsx, ver RootLayout).
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

  useEffect(() => {
    const sync = () => {
      const t = getStoredTheme();
      setThemeState(t);
      setResolvedTheme(resolveTheme(t));
    };
    sync();

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", sync);
    window.addEventListener("storage", sync);
    window.addEventListener(THEME_CHANGE_EVENT, sync);
    return () => {
      media.removeEventListener("change", sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener(THEME_CHANGE_EVENT, sync);
    };
  }, []);

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
    if (next === "system") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", next);
    }
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }, []);

  return { theme, resolvedTheme, setTheme };
}
