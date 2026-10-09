import { useState } from 'react'
import type { Layout } from '../hooks/useViewPrefs'
import type { ArkMap, Category, Marker, MarkerStatus } from '../types'
import { filterMarkers, type Filters } from '../utils/filters'
import { getMarkerInfo } from '../utils/markerView'
import { nextTimer } from '../utils/timers'
import MarkerCard from './MarkerCard'
import MarkerRow from './MarkerRow'
import MarkerTable from './MarkerTable'
import TimerDisclaimer from './TimerDisclaimer'
import type { TimerActions } from './TimerRows'

type Props = {
  markers: Marker[]
  maps: ArkMap[]
  categories: Category[]
  filters: Filters
  onFiltersChange: (filters: Filters) => void
  now: number
  compact: boolean
  // Tablet or desktop: compact mode can pick a layout. Phones always get the list.
  wide: boolean
  layout: Layout
  onLayoutChange: (layout: Layout) => void
  onEdit: (id: string) => void
  onToggleDone: (marker: Marker) => void
  onResyncTimer: (markerId: string, timerId: string, durationMs: number) => void
  onSetTimerStatus: (markerId: string, timerId: string, status: MarkerStatus) => void
}

const LAYOUTS: { value: Layout; label: string }[] = [
  { value: 'list', label: 'List' },
  { value: 'cards', label: 'Cards' },
  { value: 'table', label: 'Table' },
]

export default function MarkerList({
  markers,
  maps,
  categories,
  filters,
  onFiltersChange,
  now,
  compact,
  wide,
  layout,
  onLayoutChange,
  onEdit,
  onToggleDone,
  onResyncTimer,
  onSetTimerStatus,
}: Props) {
  // The timer whose resync panel is open. Only one at a time across the whole list.
  const [openTimerId, setOpenTimerId] = useState<string | null>(null)
  // List rows showing their details
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const categoryById = new Map(categories.map(c => [c.id, c]))
  const mapById = new Map(maps.map(m => [m.id, m]))
  const showMap = filters.mapId === 'all'
  const actions: TimerActions = { openTimerId, setOpenTimerId, onResyncTimer, onSetTimerStatus }

  // Normal mode is always cards. Compact mode is the chosen layout, or the list on phones.
  const effectiveLayout: Layout = !compact ? 'cards' : wide ? layout : 'list'

  const visible = filterMarkers(markers, filters)

  function toggleCategory(id: string, checked: boolean) {
    const hiddenCategoryIds = checked
      ? filters.hiddenCategoryIds.filter(c => c !== id)
      : [...filters.hiddenCategoryIds, id]
    onFiltersChange({ ...filters, hiddenCategoryIds })
  }

  function toggleExpanded(id: string) {
    setExpandedIds(ids => {
      const next = new Set(ids)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const isTimed = (m: Marker) =>
    m.timers.length > 0 && (categoryById.get(m.categoryId)?.hasTimer ?? false)

  // Sorts by the marker's nearest active timer. Markers with every timer done go last.
  const sortKey = (m: Marker) => nextTimer(m)?.expiresAt ?? Infinity

  // Timers: soonest first, so ready ones float to the top. Points of interest: alphabetical.
  const timed = visible.filter(isTimed).sort((a, b) => sortKey(a) - sortKey(b))
  const pois = visible.filter(m => !isTimed(m)).sort((a, b) => a.name.localeCompare(b.name))

  function renderSection(title: string, sectionMarkers: Marker[]) {
    if (sectionMarkers.length === 0) return null
    const rows = sectionMarkers.map(marker => ({
      marker,
      info: getMarkerInfo(marker, categoryById, mapById, filters.showDone, now),
    }))
    return (
      <section>
        <h2>{title}</h2>
        {effectiveLayout === 'table' && (
          <MarkerTable rows={rows} showMap={showMap} onEdit={onEdit} onToggleDone={onToggleDone} />
        )}
        {effectiveLayout === 'list' && (
          <ul className="marker-rows">
            {rows.map(({ marker, info }) => (
              <MarkerRow
                key={marker.id}
                marker={marker}
                info={info}
                now={now}
                showMap={showMap}
                expanded={expandedIds.has(marker.id)}
                onToggleExpanded={() => toggleExpanded(marker.id)}
                onEdit={onEdit}
                onToggleDone={onToggleDone}
                actions={actions}
              />
            ))}
          </ul>
        )}
        {effectiveLayout === 'cards' && (
          <ul className="marker-grid">
            {rows.map(({ marker, info }) => (
              <MarkerCard
                key={marker.id}
                marker={marker}
                info={info}
                now={now}
                showMap={showMap}
                onEdit={onEdit}
                onToggleDone={onToggleDone}
                actions={actions}
              />
            ))}
          </ul>
        )}
      </section>
    )
  }

  return (
    <div className={`marker-list layout-${effectiveLayout}${compact ? ' compact' : ''}`}>
      <TimerDisclaimer dismissible />

      <div className="filters">
        <input
          type="search"
          className="search"
          value={filters.search}
          onChange={e => onFiltersChange({ ...filters, search: e.target.value })}
          placeholder="Search names and descriptions"
        />
        <select
          value={filters.mapId}
          onChange={e => onFiltersChange({ ...filters, mapId: e.target.value })}
        >
          <option value="all">All maps</option>
          {maps.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={filters.showDone}
            onChange={e => onFiltersChange({ ...filters, showDone: e.target.checked })}
          />
          Show done
        </label>
        {compact && wide && (
          <div className="layout-switch" role="group" aria-label="Layout">
            {LAYOUTS.map(l => (
              <button
                key={l.value}
                type="button"
                aria-pressed={layout === l.value}
                onClick={() => onLayoutChange(l.value)}
              >
                {l.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="category-filters">
        {categories.map(c => (
          <label key={c.id} className="category-chip" style={{ borderColor: c.color }}>
            <input
              type="checkbox"
              checked={!filters.hiddenCategoryIds.includes(c.id)}
              onChange={e => toggleCategory(c.id, e.target.checked)}
            />
            {c.name}
          </label>
        ))}
        <button onClick={() => onFiltersChange({ ...filters, hiddenCategoryIds: [] })}>All</button>
        <button
          onClick={() => onFiltersChange({ ...filters, hiddenCategoryIds: categories.map(c => c.id) })}
        >
          None
        </button>
      </div>

      {visible.length === 0 && (
        <p className="empty">
          {markers.length === 0 ? 'No markers yet. Tap + Add to create one.' : 'Nothing matches these filters.'}
        </p>
      )}

      {renderSection('Timers', timed)}
      {renderSection('Points of Interest', pois)}
    </div>
  )
}
