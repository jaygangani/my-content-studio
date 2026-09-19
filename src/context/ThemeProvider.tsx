import { createContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import { useTheme } from '@/hooks/useTheme'
import type { ThemeContextValue } from '@/types/theme'

const ThemeContext = createContext<ThemeContextValue | null>(null)

interface ThemeProviderProps {
  children: ReactNode
}

/**
 * Global theme provider exposing theme state and toggles to the tree.
 * Consume via `useThemeContext()`.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const { theme, setTheme, toggleTheme } = useTheme()

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

/** Typed context consumer. Returns theme + toggle helpers. */
export default ThemeContext