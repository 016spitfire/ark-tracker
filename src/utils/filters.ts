import type { ArkMap, Category, Marker } from '../types'

export type Filters = {
  mapId: string // 'all' or a map id
  // Stores unchecked categories rather than checked ones, so new categories show by default
  hiddenCategoryIds: string[]
  search: string
  showDone: boolean
}

// The markers the list shows for these filters. Exports use the same rules.
export function filterMarkers(markers: Marker[], filters: Filters): Marker[] {
  const query = filters.search.trim().toLowerCase()
  const matchesSearch = (m: Marker) =>
    query === '' ||
    m.name.toLowerCase().includes(query) ||
    m.description.toLowerCase().includes(query) ||
    m.timers.some(t => t.label.toLowerCase().includes(query)) ||
    m.groups.some(g => g.name.toLowerCase().includes(query))

  return markers.filter(
    m =>
      (filters.mapId === 'all' || m.mapId === filters.mapId) &&
      !filters.hiddenCategoryIds.includes(m.categoryId) &&
      (filters.showDone || m.status === 'active') &&
      matchesSearch(m),
  )
}

// "All maps · Abandoned Base, Neglected Tame · done hidden · search "rex"", for report headers
export function describeFilters(filters: Filters, maps: ArkMap[], categories: Category[]): string {
  const map = filters.mapId === 'all' ? 'All maps' : (maps.find(m => m.id === filters.mapId)?.name ?? 'Unknown map')
  const shown = categories.filter(c => !filters.hiddenCategoryIds.includes(c.id))
  const cats =
    shown.length === categories.length ? 'All categories' : shown.length === 0 ? 'No categories' : shown.map(c => c.name).join(', ')
  const parts = [map, cats, filters.showDone ? 'done included' : 'done hidden']
  if (filters.search.trim()) parts.push(`search "${filters.search.trim()}"`)
  return parts.join(' · ')
}
