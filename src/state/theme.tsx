import { useCallback, useEffect, useState } from "react";

export type Theme = "dark" | "light";
const KEY = "du-noc-theme";

function current(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

/** Theme lives on <html data-theme>. Components read colours from CSS variables, so a switch is instant. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(current);
  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(current()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);
  const toggle = useCallback(() => {
    const next: Theme = current() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* storage unavailable */
    }
  }, []);
  return { theme, toggle };
}

/** Read a colour token as a CSS colour string, for SVG and charts. */
export const token = (name: string, alpha = 1) => `rgb(var(--${name}) / ${alpha})`;
