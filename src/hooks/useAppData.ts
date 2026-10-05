import { useEffect, useState } from 'react'
import { DEFAULT_DATA, DEFAULT_SETTINGS } from '../data/defaults'
import type { AppData, AppSettings, ArkMap, Category, Marker, MarkerStatus, Timer } from '../types'

const STORAGE_KEY = 'ark-tracker:data'

// Version 1 markers had a single optional timer
type MarkerV1 = Omit<Marker, 'timers'> & { expiresAt?: number }

// Upgrades a save (or an imported export) from any older version to the current shape.
// Each step handles one version bump, so a v1 save runs every step in order.
// Returns null if the value isn't ARK Tracker data at all.
export function migrate(value: unknown): AppData | null {
  if (typeof value !== 'object' || value === null) return null
  const data = value as Record<string, unknown>
  if (!Array.isArray(data.maps) || !Array.isArray(data.categories) || !Array.isArray(data.markers)) {
    return null
  }

  let version = typeof data.version === 'number' ? data.version : 1
  let markers = data.markers

  // v1 -> v2: single expiresAt becomes a list of labeled timers
  if (version === 1) {
    markers = (markers as MarkerV1[]).map(({ expiresAt, ...marker }) => ({
      ...marker,
      timers:
        expiresAt === undefined
          ? []
          : [{ id: crypto.randomUUID(), label: '', expiresAt, status: 'active' }],
    }))
    version = 2
  }

  // New settings get their defaults without a version bump, since nothing old changes shape
  const settings = { ...DEFAULT_SETTINGS, ...(data.settings as Partial<AppSettings> | undefined) }

  return { ...(data as AppData), version: 2, markers: markers as Marker[], settings }
}

function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const migrated = migrate(JSON.parse(raw))
      if (migrated) return migrated
    }
  } catch {
    // Corrupt save: fall through to defaults rather than crash
  }
  return DEFAULT_DATA
}

// Replaces the item with a matching id, or appends it if it's new
function upsert<T extends { id: string }>(items: T[], item: T): T[] {
  return items.some(i => i.id === item.id)
    ? items.map(i => (i.id === item.id ? item : i))
    : [...items, item]
}

export function useAppData() {
  const [data, setData] = useState<AppData>(load)

  // Save on every change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data])

  return {
    data,

    saveMarker: (marker: Marker) =>
      setData(d => ({ ...d, markers: upsert(d.markers, marker) })),
    deleteMarker: (id: string) =>
      setData(d => ({ ...d, markers: d.markers.filter(m => m.id !== id) })),
    setMarkerStatus: (id: string, status: MarkerStatus) =>
      setData(d => ({
        ...d,
        markers: d.markers.map(m => (m.id === id ? { ...m, status } : m)),
      })),
    updateTimer: (markerId: string, timerId: string, changes: Partial<Timer>) =>
      setData(d => ({
        ...d,
        markers: d.markers.map(m =>
          m.id === markerId
            ? { ...m, timers: m.timers.map(t => (t.id === timerId ? { ...t, ...changes } : t)) }
            : m,
        ),
      })),

    saveMap: (map: ArkMap) =>
      setData(d => ({ ...d, maps: upsert(d.maps, map) })),
    deleteMap: (id: string) =>
      setData(d => ({ ...d, maps: d.maps.filter(m => m.id !== id) })),

    saveCategory: (category: Category) =>
      setData(d => ({ ...d, categories: upsert(d.categories, category) })),
    deleteCategory: (id: string) =>
      setData(d => ({ ...d, categories: d.categories.filter(c => c.id !== id) })),

    saveSettings: (changes: Partial<AppSettings>) =>
      setData(d => ({ ...d, settings: { ...d.settings, ...changes } })),

    replaceAll: (next: AppData) => setData(next),
  }
}
