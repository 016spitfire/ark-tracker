import { useState, type FormEvent } from 'react'
import type { ArkMap, Category, Marker, MarkerStatus, Timer } from '../types'
import { durationToMs, formatRemaining, toWholeNumber } from '../utils/time'
import { sortTimers, TIMER_LABEL_SUGGESTIONS } from '../utils/timers'
import TimerDisclaimer from './TimerDisclaimer'

type Props = {
  maps: ArkMap[]
  categories: Category[]
  marker?: Marker
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

  const updateDraft = (id: string, changes: Partial<TimerDraft>) =>
    setDrafts(ds => ds.map(d => (d.id === id ? { ...d, ...changes } : d)))

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
          <button type="button" onClick={() => setDrafts(ds => [...ds, newDraft()])}>
            + Add timer
          </button>
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
