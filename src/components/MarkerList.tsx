import { useState } from 'react'
import type { ArkMap, Category, Marker } from '../types'
import { formatDateTime, formatRemaining } from '../utils/time'
import ResyncForm from './ResyncForm'
import TimerDisclaimer from './TimerDisclaimer'

export type Filters = {
  mapId: string // 'all' or a map id
  // Stores unchecked categories rather than checked ones, so new categories show by default
  hiddenCategoryIds: string[]
  search: string
  showDone: boolean
}

type Props = {
  markers: Marker[]
  maps: ArkMap[]
  categories: Category[]
  filters: Filters
  onFiltersChange: (filters: Filters) => void
  now: number
  onEdit: (id: string) => void
  onToggleDone: (marker: Marker) => void
  onResync: (id: string, durationMs: number) => void
}

export default function MarkerList({
  markers,
  maps,
  categories,
  filters,
  onFiltersChange,
  now,
  onEdit,
  onToggleDone,
  onResync,
}: Props) {
  // Only one card shows the resync row at a time
  const [resyncingId, setResyncingId] = useState<string | null>(null)

  const categoryById = new Map(categories.map(c => [c.id, c]))
  const mapById = new Map(maps.map(m => [m.id, m]))

  const query = filters.search.trim().toLowerCase()
  const matchesSearch = (m: Marker) =>
    query === '' ||
    m.name.toLowerCase().includes(query) ||
    m.description.toLowerCase().includes(query)

  const visible = markers.filter(
    m =>
      (filters.mapId === 'all' || m.mapId === filters.mapId) &&
      !filters.hiddenCategoryIds.includes(m.categoryId) &&
      (filters.showDone || m.status === 'active') &&
      matchesSearch(m),
  )

  function toggleCategory(id: string, checked: boolean) {
    const hiddenCategoryIds = checked
      ? filters.hiddenCategoryIds.filter(c => c !== id)
      : [...filters.hiddenCategoryIds, id]
    onFiltersChange({ ...filters, hiddenCategoryIds })
  }

  const isTimed = (m: Marker) =>
    m.expiresAt !== undefined && (categoryById.get(m.categoryId)?.hasTimer ?? false)

  // Timers: soonest first, so ready ones float to the top. Points of interest: alphabetical.
  const timed = visible.filter(isTimed).sort((a, b) => a.expiresAt! - b.expiresAt!)
  const pois = visible.filter(m => !isTimed(m)).sort((a, b) => a.name.localeCompare(b.name))

  function renderCard(marker: Marker) {
    const category = categoryById.get(marker.categoryId)
    const map = mapById.get(marker.mapId)
    const remaining = marker.expiresAt !== undefined ? marker.expiresAt - now : null
    const ready = remaining !== null && remaining <= 0
    const canResync = isTimed(marker) && marker.status === 'active'

    return (
      <li
        key={marker.id}
        className={`marker-card${marker.status === 'done' ? ' done' : ''}${ready ? ' ready' : ''}`}
        style={{ borderLeftColor: category?.color }}
      >
        <div className="card-row">
          <div className="card-main" onClick={() => onEdit(marker.id)}>
            <div className="name">{marker.name}</div>
            <div className="card-meta">
              <span style={{ color: category?.color }}>{category?.name ?? 'Unknown category'}</span>
              {filters.mapId === 'all' && <span>{map?.name ?? 'Unknown map'}</span>}
              <span className="coords">{marker.lat}, {marker.lon}</span>
            </div>
            {isTimed(marker) && marker.expiresAt !== undefined && (
              <div className="card-meta">
                {ready ? 'Ready since' : 'Ready at'} {formatDateTime(marker.expiresAt)}
              </div>
            )}
            {marker.description && <p className="description">{marker.description}</p>}
          </div>
          {/* Timer pinned top, buttons pinned bottom, beside the content instead of below it */}
          <div className="card-side">
            {isTimed(marker) && remaining !== null && (
              <span className="timer">{ready ? 'READY' : formatRemaining(remaining)}</span>
            )}
            {/* Done stays rightmost so it's in the same spot on every card */}
            <div className="card-actions">
              {canResync && resyncingId !== marker.id && (
                <button onClick={() => setResyncingId(marker.id)}>Resync</button>
              )}
              <button onClick={() => onToggleDone(marker)}>
                {marker.status === 'done' ? 'Reopen' : 'Done'}
              </button>
            </div>
          </div>
        </div>
        {canResync && resyncingId === marker.id && (
          <ResyncForm
            onSave={durationMs => {
              onResync(marker.id, durationMs)
              setResyncingId(null)
            }}
            onCancel={() => setResyncingId(null)}
          />
        )}
      </li>
    )
  }

  return (
    <div className="marker-list">
      <TimerDisclaimer />

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

      {timed.length > 0 && (
        <section>
          <h2>Timers</h2>
          <ul>{timed.map(renderCard)}</ul>
        </section>
      )}

      {pois.length > 0 && (
        <section>
          <h2>Points of Interest</h2>
          <ul>{pois.map(renderCard)}</ul>
        </section>
      )}
    </div>
  )
}
