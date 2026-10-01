import type { ArkMap, Category, Marker } from '../types'
import { formatDateTime, formatRemaining } from '../utils/time'

export type Filters = {
  mapId: string // 'all' or a map id
  categoryId: string // 'all' or a category id
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
}: Props) {
  const categoryById = new Map(categories.map(c => [c.id, c]))
  const mapById = new Map(maps.map(m => [m.id, m]))

  const visible = markers.filter(
    m =>
      (filters.mapId === 'all' || m.mapId === filters.mapId) &&
      (filters.categoryId === 'all' || m.categoryId === filters.categoryId) &&
      (filters.showDone || m.status === 'active'),
  )

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

    return (
      <li
        key={marker.id}
        className={`marker-card${marker.status === 'done' ? ' done' : ''}${ready ? ' ready' : ''}`}
        style={{ borderLeftColor: category?.color }}
      >
        <div className="card-main" onClick={() => onEdit(marker.id)}>
          <div className="card-title">
            <span className="name">{marker.name}</span>
            {isTimed(marker) && remaining !== null && (
              <span className="timer">{ready ? 'READY' : formatRemaining(remaining)}</span>
            )}
          </div>
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
        <button className="done-toggle" onClick={() => onToggleDone(marker)}>
          {marker.status === 'done' ? 'Reopen' : 'Done'}
        </button>
      </li>
    )
  }

  return (
    <div className="marker-list">
      <div className="filters">
        <select
          value={filters.mapId}
          onChange={e => onFiltersChange({ ...filters, mapId: e.target.value })}
        >
          <option value="all">All maps</option>
          {maps.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        <select
          value={filters.categoryId}
          onChange={e => onFiltersChange({ ...filters, categoryId: e.target.value })}
        >
          <option value="all">All categories</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
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

      {visible.length === 0 && <p className="empty">No markers yet. Tap + Add to create one.</p>}

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
