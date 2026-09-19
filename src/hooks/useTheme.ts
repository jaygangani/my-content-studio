import { useCallback, useEffect, useState } from 'react'
import type { ThemeMode } from '@/types/theme'

const STORAGE_KEY = 'mycontentstudio:theme'

/**
 * React hook managing light/dark theme state.
 * Persists the choice to localStorage and mirrors it onto `<html class="dark">`.
 */
export function useTheme(initialMode: ThemeMode = 'light') {
  const [theme, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return initialMode
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored === 'dark' || stored === 'light' ? stored : initialMode
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    window.localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeMode(mode)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeMode((current) => (current === 'dark' ? 'light' : 'dark'))
  }, [])

  return { theme, setTheme, toggleTheme } as const
}