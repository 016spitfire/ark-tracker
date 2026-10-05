import { useState, type FormEvent } from 'react'
import type { ArkMap, Category, Marker, MarkerStatus, Timer } from '../types'
import type { CalculatedTimer } from '../utils/decay'
import { durationToMs, formatRemaining, splitDuration, toWholeNumber } from '../utils/time'
import { sortTimers, TIMER_LABEL_SUGGESTIONS } from '../utils/timers'
import DecayCalculator from './DecayCalculator'
import TimerDisclaimer from './TimerDisclaimer'

type Props = {
  maps: ArkMap[]
  categories: Category[]
  marker?: Marker
  // Every marker, for the duplicate check on new markers
  markers: Marker[]
  duplicateRadius: number
  decayDays: Record<string, number>
  onOpenMarker: (id: string) => void
  defaultMapId?: string
  onSave: (marker: Marker) => void
  onDelete?: (id: string) => void
  onCancel: () => void
}

// A timer as it's being edited. Duration fields are strings straight from the inputs.
type TimerDraft = {
  id: string
  label: string
  days: string
  hours: string
  minutes: string
  // Set for timers that already exist. Blank duration fields keep this.
  expiresAt?: number
  status: MarkerStatus
}

function newDraft(): TimerDraft {
  return { id: crypto.randomUUID(), label: '', days: '', hours: '', minutes: '', status: 'active' }
}

function toDraft(timer: Timer): TimerDraft {
  return { ...timer, days: '', hours: '', minutes: '' }
}

function draftDurationMs(draft: TimerDraft): number {
  return durationToMs(toWholeNumber(draft.days), toWholeNumber(draft.hours), toWholeNumber(draft.minutes))
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
  markers,
  duplicateRadius,
  decayDays,
  onOpenMarker,
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
  // Existing timers, soonest first. A new marker starts with one blank timer to fill in.
  const [drafts, setDrafts] = useState<TimerDraft[]>(() =>
    marker?.timers.length ? sortTimers(marker.timers).map(toDraft) : [newDraft()],
  )
  const [error, setError] = useState('')

  const category = categories.find(c => c.id === categoryId)
  const hasTimer = category?.hasTimer ?? false

  // New markers only: existing markers on the same map near the entered coordinates
  const latNum = parseCoord(lat)
  const lonNum = parseCoord(lon)
  const nearby =
    marker || latNum === null || lonNum === null
      ? []
      : markers
          .filter(m => m.mapId === mapId)
          .map(m => ({ marker: m, distance: Math.hypot(m.lat - latNum, m.lon - lonNum) }))
          .filter(n => n.distance <= duplicateRadius)
          .sort((a, b) => a.distance - b.distance)

  const updateDraft = (id: string, changes: Partial<TimerDraft>) =>
    setDrafts(ds => ds.map(d => (d.id === id ? { ...d, ...changes } : d)))

  // Calculated timers update a same-named timer if there is one, otherwise get added.
  // Untouched blank rows are dropped so they don't sit above the new ones.
  function addCalculated(timers: CalculatedTimer[]) {
    setDrafts(ds => {
      let next = ds.filter(d => d.label.trim() || d.expiresAt !== undefined || draftDurationMs(d) > 0)
      for (const { label, remainingMs } of timers) {
        const { days, hours, minutes } = splitDuration(remainingMs)
        const fields = { days: String(days), hours: String(hours), minutes: String(minutes) }
        const match = next.find(d => d.label.trim().toLowerCase() === label.toLowerCase())
        next = match
          ? next.map(d => (d === match ? { ...d, ...fields } : d))
          : [...next, { ...newDraft(), label, ...fields }]
      }
      return next
    })
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()

    if (!name.trim()) return setError('Give it a name.')
    if (!mapId || !categoryId) return setError('Pick a map and a category.')

    if (latNum === null || lonNum === null) {
      return setError('Lat and lon must be numbers from 0 to 100.')
    }

    const now = Date.now()

    // Switching to a category without timers keeps the old ones (hidden), so switching
    // back by mistake doesn't lose them.
    let timers = marker?.timers ?? []
    if (hasTimer) {
      timers = []
      for (const draft of drafts) {
        const durationMs = draftDurationMs(draft)
        const label = draft.label.trim()
        // A new duration restarts the timer from now. Blank keeps an existing timer.
        let expiresAt: number
        if (durationMs > 0) expiresAt = now + durationMs
        else if (draft.expiresAt !== undefined) expiresAt = draft.expiresAt
        else if (!label) continue // untouched blank row, skip it
        else return setError(`Set a time for "${label}".`)
        timers.push({ id: draft.id, label, expiresAt, status: draft.status })
      }
      if (timers.length === 0) return setError('Add at least one timer.')
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
      timers,
      status: marker?.status ?? 'active',
    })
  }

  return (
    <form className="marker-form" onSubmit={handleSubmit}>
      <h2>{marker ? 'Edit Marker' : 'New Marker'}</h2>
      {hasTimer && <TimerDisclaimer />}

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

      {nearby.length > 0 && (
        <div className="duplicate-warning">
          <p>Already tracked nearby. Open one to resync it or add timers, or save anyway.</p>
          <ul>
            {nearby.map(({ marker: m, distance }) => (
              <li key={m.id}>
                <span>
                  <strong>{m.name}</strong>
                  {m.status === 'done' && ' (done)'}{' '}
                  <span className="hint">
                    {m.lat}, {m.lon} · {distance.toFixed(1)} away
                    {m.timers.length > 0 && ` · ${m.timers.length} timer${m.timers.length === 1 ? '' : 's'}`}
                  </span>
                </span>
                <button type="button" onClick={() => onOpenMarker(m.id)}>Open it</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasTimer && (
        <fieldset>
          <legend>Timers</legend>
          <p className="hint">
            Enter the time the game shows. On existing timers, leave the time blank to keep it, or
            enter a new one to restart from now.
          </p>
          <datalist id="timer-labels">
            {TIMER_LABEL_SUGGESTIONS.map(label => (
              <option key={label} value={label} />
            ))}
          </datalist>
          <ul className="timer-drafts">
            {drafts.map(draft => (
              <li key={draft.id}>
                <div className="add-row">
                  <input
                    value={draft.label}
                    onChange={e => updateDraft(draft.id, { label: e.target.value })}
                    list="timer-labels"
                    placeholder="Label, e.g. Tames, Metal"
                  />
                  <button
                    type="button"
                    className="danger"
                    onClick={() => setDrafts(ds => ds.filter(d => d.id !== draft.id))}
                  >
                    Remove
                  </button>
                </div>
                {draft.expiresAt !== undefined && (
                  <div className="draft-status">
                    <span className="hint">
                      {draft.expiresAt > Date.now()
                        ? `Ready in ${formatRemaining(draft.expiresAt - Date.now())}`
                        : 'Ready'}
                    </span>
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={draft.status === 'done'}
                        onChange={e => updateDraft(draft.id, { status: e.target.checked ? 'done' : 'active' })}
                      />
                      Done
                    </label>
                  </div>
                )}
                <div className="row">
                  <label>
                    Days
                    <input inputMode="numeric" value={draft.days} onChange={e => updateDraft(draft.id, { days: e.target.value })} placeholder="0" />
                  </label>
                  <label>
                    Hours
                    <input inputMode="numeric" value={draft.hours} onChange={e => updateDraft(draft.id, { hours: e.target.value })} placeholder="0" />
                  </label>
                  <label>
                    Minutes
                    <input inputMode="numeric" value={draft.minutes} onChange={e => updateDraft(draft.id, { minutes: e.target.value })} placeholder="0" />
                  </label>
                </div>
              </li>
            ))}
          </ul>
          <div className="timer-buttons">
            <button type="button" onClick={() => setDrafts(ds => [...ds, newDraft()])}>
              + Add timer
            </button>
            <DecayCalculator decayDays={decayDays} onAdd={addCalculated} />
          </div>
        </fieldset>
      )}

      <label>
        Description
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
      </label>

      {error && <p className="error">{error}</p>}

      <div className="actions">
        <button type="submit" className="primary">{nearby.length > 0 ? 'Save anyway' : 'Save'}</button>
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
