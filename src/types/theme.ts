export type ThemeMode = 'light' | 'dark'

export interface ThemeContextValue {
  /** Current active theme mode. */
  theme: ThemeMode
  /** Toggle between light and dark mode. */
  toggleTheme: () => void
  /** Persist a specific theme mode. */
  setTheme: (mode: ThemeMode) => void
}