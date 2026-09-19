import { useContext } from 'react'
import ThemeContext from '@/context/ThemeProvider'
import type { ThemeContextValue } from '@/types/theme'

/**
 * Typed access to the global theme context. Must be used inside `<ThemeProvider>`.
 */
export function useThemeContext(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider')
  }
  return context
}