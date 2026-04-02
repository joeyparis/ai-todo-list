'use client'

import { useEffect } from 'react'

function getInitialTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'light'
  try {
    const stored = localStorage.getItem('theme')
    if (stored === 'dark' || stored === 'light') return stored
  } catch {}
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeScript() {
  useEffect(() => {
    const theme = getInitialTheme()
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [])
  return null
}

export function useTheme() {
  const toggle = () => {
    const isDark = document.documentElement.classList.toggle('dark')
    try {
      localStorage.setItem('theme', isDark ? 'dark' : 'light')
    } catch {}
  }

  return { toggle }
}
