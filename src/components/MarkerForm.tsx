import { useState, type FormEvent } from 'react'
import type { ArkMap, Category, Marker } from '../types'
import { durationToMs, formatRemaining } from '../utils/time'

type Props = {
  maps: ArkMap[]
  categories: Category[]
  marker?: Marker
  defaultMapId?: string
  onSave: (marker: Marker) => void
  onDelete?: (id: string) => void
  onCancel: () => void
}

function toWholeNumber(value: string): number {
  return Math.max(0, parseInt(value, 10) || 0)
}

// ARK coordinates run 0-100. Returns null for anything outside that.
function parseCoord(value: string): number | null {
  if (value.trim() === '') return null
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null
}

export default function MarkerForm({
  maps,
  categories,
  marker,
  defaultMapId,
  onSave,
  onDelete,
  onCancel,
}: Props) {
  const [mapId, setMapId] = useState(marker?.mapId ?? defaultMapId ?? maps[0]?.id ?? '')
  const [categoryId, setCategoryId] = useState(marker?.categoryId ?? categories[0]?.id ?? '')
  const [name, setName] = useState(marker?.name ?? '')
  const [description, setDescription] = useState(marker?.description ?? '')
  const [lat, setLat] = useState(marker ? String(marker.lat) : '')
  const [lon, setLon] = useState(marker ? String(marker.lon) : '')
  const [days, setDays] = useState('')
  const [hours, setHours] = useState('')
  const [minutes, setMinutes] = useState('')
  const [error, setError] = useState('')

  const category = categories.find(c => c.id === categoryId)
  const hasTimer = category?.hasTimer ?? false
  const existingExpiresAt = marker?.expiresAt

  function handleSubmit(e: FormEvent) {
    e.preventDefault()

    if (!name.trim()) return setError('Give it a name.')
    if (!mapId || !categoryId) return setError('Pick a map and a category.')

    const latNum = parseCoord(lat)
    const lonNum = parseCoord(lon)
    if (latNum === null || lonNum === null) {
      return setError('Lat and lon must be numbers from 0 to 100.')
    }

    const now = Date.now()
    const durationMs = durationToMs(toWholeNumber(days), toWholeNumber(hours), toWholeNumber(minutes))

    // Timer starts now. When editing, blank duration fields keep the existing timer.
    let expiresAt: number | undefined
    if (hasTimer) {
      if (durationMs > 0) expiresAt = now + durationMs
      else if (existingExpiresAt !== undefined) expiresAt = existingExpiresAt
      else return setError('Set a timer (days, hours, or minutes).')
    }

    onSave({
      id: marker?.id ?? crypto.randomUUID(),
      mapId,
      categoryId,
      name: name.trim(),
      description: description.trim(),
      lat: latNum,
      lon: lonNum,
      createdAt: marker?.createdAt ?? now,
      expiresAt,
      status: marker?.status ?? 'active',
    })
  }

  return (
    <form className="marker-form" onSubmit={handleSubmit}>
      <h2>{marker ? 'Edit Marker' : 'New Marker'}</h2>

      <label>
        Map
        <select value={mapId} onChange={e => setMapId(e.target.value)}>
          {maps.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </label>

      <label>
        Category
        <select value={categoryId} onChange={e => setCategoryId(e.target.value)}>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>

      <label>
        Name
        <input value={name} onChange={e => setName(e.target.value)} autoFocus={!marker} />
      </label>

      <div className="row">
        <label>
          Lat
          <input inputMode="decimal" value={lat} onChange={e => setLat(e.target.value)} placeholder="0-100" />
        </label>
        <label>
          Lon
          <input inputMode="decimal" value={lon} onChange={e => setLon(e.target.value)} placeholder="0-100" />
        </label>
      </div>

      {hasTimer && (
        <fieldset>
          <legend>Timer</legend>
          {existingExpiresAt !== undefined && (
            <p className="hint">
              {existingExpiresAt > Date.now()
                ? `Currently ready in ${formatRemaining(existingExpiresAt - Date.now())}.`
                : 'Currently ready.'}{' '}
              Leave blank to keep it, or enter a new time to restart from now.
            </p>
          )}
          <div className="row">
            <label>
              Days
              <input inputMode="numeric" value={days} onChange={e => setDays(e.target.value)} placeholder="0" />
            </label>
            <label>
              Hours
              <input inputMode="numeric" value={hours} onChange={e => setHours(e.target.value)} placeholder="0" />
            </label>
            <label>
              Minutes
              <input inputMode="numeric" value={minutes} onChange={e => setMinutes(e.target.value)} placeholder="0" />
            </label>
          </div>
        </fieldset>
      )}

      <label>
        Description
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
      </label>

      {error && <p className="error">{error}</p>}

      <div className="actions">
        <button type="submit" className="primary">Save</button>
        <button type="button" onClick={onCancel}>Cancel</button>
        {marker && onDelete && (
          <button
            type="button"
            className="danger"
            onClick={() => {
              if (confirm(`Delete "${marker.name}"?`)) onDelete(marker.id)
            }}
          >
            Delete
          </button>
        )}
      </div>
    </form>
  )
}
