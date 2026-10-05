import { useEffect, useState } from 'react'
import { DEFAULT_DATA } from '../data/defaults'
import type { AppData, ArkMap, Category, Marker, MarkerStatus } from '../types'

const STORAGE_KEY = 'ark-tracker:data'

export function isAppData(value: unknown): value is AppData {
  if (typeof value !== 'object' || value === null) return false
  const data = value as Record<string, unknown>
  return Array.isArray(data.maps) && Array.isArray(data.categories) && Array.isArray(data.markers)
}

function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (isAppData(parsed)) return parsed
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
    setMarkerExpiresAt: (id: string, expiresAt: number) =>
      setData(d => ({
        ...d,
        markers: d.markers.map(m => (m.id === id ? { ...m, expiresAt } : m)),
      })),

    saveMap: (map: ArkMap) =>
      setData(d => ({ ...d, maps: upsert(d.maps, map) })),
    deleteMap: (id: string) =>
      setData(d => ({ ...d, maps: d.maps.filter(m => m.id !== id) })),

    saveCategory: (category: Category) =>
      setData(d => ({ ...d, categories: upsert(d.categories, category) })),
    deleteCategory: (id: string) =>
      setData(d => ({ ...d, categories: d.categories.filter(c => c.id !== id) })),

    replaceAll: (next: AppData) => setData(next),
  }
}
