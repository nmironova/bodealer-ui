"use client";

import { useEffect, useSyncExternalStore } from "react";

import {
  THEME,
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  THEME_CHANGE_EVENT,
  DARK_THEME_QUERY,
  parseTheme,
  type Theme,
} from "../lib/theme";
let fallback: Theme = DEFAULT_THEME;

function preference(): Theme {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return parseTheme(value);
  } catch {
    return fallback;
  }
}

function apply(theme: Theme) {
  document.documentElement.dataset.theme =
    theme === THEME.SYSTEM
      ? matchMedia(DARK_THEME_QUERY).matches
        ? THEME.DARK
        : THEME.LIGHT
      : theme;
}

function subscribe(update: () => void) {
  const media = matchMedia(DARK_THEME_QUERY);
  const refresh = () => {
    apply(preference());
    update();
  };
  window.addEventListener("storage", refresh);
  window.addEventListener(THEME_CHANGE_EVENT, refresh);
  media.addEventListener("change", refresh);
  return () => {
    window.removeEventListener("storage", refresh);
    window.removeEventListener(THEME_CHANGE_EVENT, refresh);
    media.removeEventListener("change", refresh);
  };
}

export function ThemeSync() {
  const theme = useSyncExternalStore(
    subscribe,
    preference,
    () => DEFAULT_THEME,
  );
  useEffect(() => apply(preference()), [theme]);
  return null;
}

export default function ThemeSelector() {
  const theme = useSyncExternalStore(
    subscribe,
    preference,
    () => DEFAULT_THEME,
  );
  return (
    <label className="theme-selector">
      <span>Theme</span>
      <select
        aria-label="Color theme"
        value={theme}
        onChange={(event) => {
          const value = parseTheme(event.target.value);
          fallback = value;
          try {
            localStorage.setItem(THEME_STORAGE_KEY, value);
          } catch {
            /* Keep the preference for this page when storage is unavailable. */
          }
          apply(value);
          window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
        }}
      >
        <option value={THEME.LIGHT}>Light</option>
        <option value={THEME.DARK}>Dark</option>
        <option value={THEME.SYSTEM}>System</option>
      </select>
    </label>
  );
}
