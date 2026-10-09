import { useEffect, useState } from 'react'

// How the list looks on this device. Kept out of AppData on purpose: a phone and a desktop
// sharing the same exported data should each keep their own layout.
export type Layout = 'list' | 'cards' | 'table'
export type ViewPrefs = { compact: boolean; layout: Layout }

const STORAGE_KEY = 'ark-tracker:view'

// Tablet and desktop. Below this, compact mode is always the list.
export const WIDE_QUERY = '(min-width: 700px)'

function load(): ViewPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as ViewPrefs
  } catch {
    // Corrupt value: fall through to defaults
  }
  // First visit: compact on wider screens, where the extra room makes it worthwhile
  return { compact: window.matchMedia(WIDE_QUERY).matches, layout: 'list' }
}

export function useViewPrefs() {
  const [prefs, setPrefs] = useState<ViewPrefs>(load)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  }, [prefs])

  return [prefs, setPrefs] as const
}

// Tracks a CSS media query, e.g. to know when the window is resized across a breakpoint
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const list = window.matchMedia(query)
    const onChange = () => setMatches(list.matches)
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }, [query])

  return matches
}
