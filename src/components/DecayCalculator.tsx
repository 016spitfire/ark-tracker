import { useState } from 'react'
import { DECAY_MATERIALS } from '../data/decay'
import { durationToMs, toWholeNumber } from '../utils/time'
import { fillFromReading, type CalculatedTimer } from '../utils/decay'

type Props = {
  decayDays: Record<string, number>
  onAdd: (timers: CalculatedTimer[]) => void
}

// "I read Stone at 9d 4h, the base also has Metal and a Generator" -> a timer for each
export default function DecayCalculator({ decayDays, onAdd }: Props) {
  const [open, setOpen] = useState(false)
  const [knownId, setKnownId] = useState('stone')
  const [days, setDays] = useState('')
  const [hours, setHours] = useState('')
  const [minutes, setMinutes] = useState('')
  const [checked, setChecked] = useState<string[]>([])
  const [message, setMessage] = useState('')
  // Shown under the closed panel after adding, e.g. which materials were skipped
  const [note, setNote] = useState('')

  if (!open) {
    return (
      <div>
        <button type="button" onClick={() => { setOpen(true); setNote('') }}>
          Fill from decay times
        </button>
        {note && <p className="hint decay-note">{note}</p>}
      </div>
    )
  }

  function add() {
    const remainingMs = durationToMs(toWholeNumber(days), toWholeNumber(hours), toWholeNumber(minutes))
    if (remainingMs === 0) return setMessage('Enter the time the game shows for the material you read.')

    const result = fillFromReading(decayDays, knownId, remainingMs, checked)
    if (!result.ok) return setMessage(result.error)

    onAdd(result.timers)
    setOpen(false)
    setDays('')
    setHours('')
    setMinutes('')
    setChecked([])
    setMessage('')
    setNote(
      result.decayed.length > 0
        ? `Skipped, would already have decayed: ${result.decayed.join(', ')}.`
        : '',
    )
  }

  return (
    <div className="decay-calculator">
      <p className="hint">
        Read one material's timer in game. The others are calculated from Settings &gt; Decay
        Times. Existing timers with the same name are updated instead of duplicated.
      </p>

      <label>
        Material you read
        <select value={knownId} onChange={e => setKnownId(e.target.value)}>
          {DECAY_MATERIALS.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </label>

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

      <p className="hint">Also at this base:</p>
      <div className="material-checks">
        {DECAY_MATERIALS.filter(m => m.id !== knownId).map(m => (
          <label key={m.id} className="checkbox">
            <input
              type="checkbox"
              checked={checked.includes(m.id)}
              onChange={e =>
                setChecked(c => (e.target.checked ? [...c, m.id] : c.filter(id => id !== m.id)))
              }
            />
            {m.name}
          </label>
        ))}
      </div>
      <p className="hint">
        Tames don't always line up with the buildings, so double-check their timers in game.
      </p>

      {message && <p className="error">{message}</p>}

      <div className="actions">
        <button type="button" className="primary" onClick={add}>Add timers</button>
        <button type="button" onClick={() => { setOpen(false); setMessage('') }}>Cancel</button>
      </div>
    </div>
  )
}
