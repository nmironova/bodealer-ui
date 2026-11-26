export const THEME = {
  LIGHT: "light",
  DARK: "dark",
  SYSTEM: "system",
} as const;

export type Theme = (typeof THEME)[keyof typeof THEME];
export const DEFAULT_THEME: Theme = THEME.SYSTEM;
export const THEME_STORAGE_KEY = "bodealer-theme";
export const THEME_CHANGE_EVENT = "bodealer-theme-change";
export const DARK_THEME_QUERY = "(prefers-color-scheme: dark)";

export function parseTheme(value: unknown): Theme {
  return value === THEME.LIGHT || value === THEME.DARK ? value : DEFAULT_THEME;
}

// Inline before the body to apply the saved preference before first paint.
// Only these static constants are serialized; no user data enters the script.
export const THEME_INIT_SCRIPT = `(function(config){var theme=config.themes;var t=config.defaultTheme;try{t=localStorage.getItem(config.storageKey)||config.defaultTheme}catch(e){}document.documentElement.dataset.theme=t===theme.DARK||(t!==theme.LIGHT&&matchMedia(config.darkQuery).matches)?theme.DARK:theme.LIGHT})(${JSON.stringify(
  {
    themes: THEME,
    defaultTheme: DEFAULT_THEME,
    storageKey: THEME_STORAGE_KEY,
    darkQuery: DARK_THEME_QUERY,
  },
)})`;
