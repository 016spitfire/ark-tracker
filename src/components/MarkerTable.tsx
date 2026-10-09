import { useState } from 'react'
import type { Marker } from '../types'
import type { MarkerInfo } from '../utils/markerView'
import { formatDateTime, formatRemaining } from '../utils/time'
import { timerLabel } from '../utils/timers'

type Row = { marker: Marker; info: MarkerInfo }
type SortKey = 'name' | 'category' | 'map' | 'next' | 'timers'

type Props = {
  rows: Row[]
  showMap: boolean
  onEdit: (id: string) => void
  onToggleDone: (marker: Marker) => void
}

const compareBy: Record<SortKey, (a: Row, b: Row) => number> = {
  name: (a, b) => a.marker.name.localeCompare(b.marker.name),
  category: (a, b) => (a.info.category?.name ?? '').localeCompare(b.info.category?.name ?? ''),
  map: (a, b) => (a.info.map?.name ?? '').localeCompare(b.info.map?.name ?? ''),
  // Markers without a next timer sort last. (Infinity - Infinity is NaN, so compare, don't subtract.)
  next: (a, b) => {
    const x = a.info.next?.expiresAt ?? Infinity
    const y = b.info.next?.expiresAt ?? Infinity
    return x === y ? 0 : x < y ? -1 : 1
  },
  timers: (a, b) => a.info.shownTimers.length - b.info.shownTimers.length,
}

// Spreadsheet-style view for wide screens. Click a header to sort by it (again to reverse,
// a third time to go back to the list's order). Click a row to open the marker.
export default function MarkerTable({ rows, showMap, onEdit, onToggleDone }: Props) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 } | null>(null)

  const sorted = sort ? [...rows].sort((a, b) => compareBy[sort.key](a, b) * sort.dir) : rows

  function cycleSort(key: SortKey) {
    setSort(s => (s?.key !== key ? { key, dir: 1 } : s.dir === 1 ? { key, dir: -1 } : null))
  }

  const header = (key: SortKey, label: string, className: string) => (
    <th className={className} aria-sort={sort?.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => cycleSort(key)}>
        {label}
        {sort?.key === key ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}
      </button>
    </th>
  )

  return (
    <div className="table-wrap">
      <table className="marker-table">
        <thead>
          <tr>
            {header('name', 'Name', 'col-name')}
            {header('category', 'Category', 'col-category')}
            {showMap && header('map', 'Map', 'col-map')}
            <th className="col-coords">Lat, Lon</th>
            {header('next', 'Next timer', 'col-next')}
            <th className="col-ready">Ready at</th>
            {header('timers', 'Timers', 'col-timers')}
            <th>Description</th>
            <th className="col-actions" aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {sorted.map(({ marker, info }) => {
            const { category, map, next, remaining, ready, timed, shownTimers } = info
            return (
              <tr
                key={marker.id}
                className={`${marker.status === 'done' ? 'done' : ''}${ready ? ' ready' : ''}`}
                onClick={() => onEdit(marker.id)}
              >
                <td className="cell-name" style={{ borderLeftColor: category?.color }}>{marker.name}</td>
                <td style={{ color: category?.color }}>{category?.name ?? 'Unknown'}</td>
                {showMap && <td>{map?.name ?? 'Unknown'}</td>}
                <td className="coords">{marker.lat}, {marker.lon}</td>
                <td className="timer">
                  {next ? `${timerLabel(next)} ${ready ? 'READY' : formatRemaining(remaining!)}` : timed ? 'All done' : ''}
                </td>
                <td>{next ? formatDateTime(next.expiresAt) : ''}</td>
                <td>{shownTimers.length || ''}</td>
                <td className="cell-desc" title={marker.description}>{marker.description}</td>
                <td>
                  <button
                    type="button"
                    onClick={e => {
                      // Don't also open the marker
                      e.stopPropagation()
                      onToggleDone(marker)
                    }}
                  >
                    {marker.status === 'done' ? 'Reopen' : 'Done'}
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
