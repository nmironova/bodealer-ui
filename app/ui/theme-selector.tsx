"use client";

import { useEffect, useSyncExternalStore } from "react";

type Theme = "light" | "dark" | "system";
let fallback: Theme = "system";

function preference(): Theme {
  try {
    const value = localStorage.getItem("bodealer-theme");
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return fallback;
  }
}

function apply(theme: Theme) {
  document.documentElement.dataset.theme =
    theme === "system"
      ? matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
}

function subscribe(update: () => void) {
  const media = matchMedia("(prefers-color-scheme: dark)");
  const refresh = () => {
    apply(preference());
    update();
  };
  window.addEventListener("storage", refresh);
  window.addEventListener("bodealer-theme-change", refresh);
  media.addEventListener("change", refresh);
  return () => {
    window.removeEventListener("storage", refresh);
    window.removeEventListener("bodealer-theme-change", refresh);
    media.removeEventListener("change", refresh);
  };
}

export function ThemeSync() {
  const theme = useSyncExternalStore(
    subscribe,
    preference,
    () => "system" as Theme,
  );
  useEffect(() => apply(preference()), [theme]);
  return null;
}

export default function ThemeSelector() {
  const theme = useSyncExternalStore(
    subscribe,
    preference,
    () => "system" as Theme,
  );
  return (
    <label className="theme-selector">
      <span>Theme</span>
      <select
        aria-label="Color theme"
        value={theme}
        onChange={(event) => {
          const value = event.target.value as Theme;
          fallback = value;
          try {
            localStorage.setItem("bodealer-theme", value);
          } catch {
            /* Keep the preference for this page when storage is unavailable. */
          }
          apply(value);
          window.dispatchEvent(new Event("bodealer-theme-change"));
        }}
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </select>
    </label>
  );
}
