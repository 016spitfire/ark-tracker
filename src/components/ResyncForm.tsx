import { useState, type FormEvent, type ReactNode } from 'react'
import { durationToMs, toWholeNumber } from '../utils/time'

type Props = {
  onSave: (durationMs: number) => void
  onCancel: () => void
  // Extra buttons shown after Resync and Cancel
  children?: ReactNode
}

// Inline "the game says X is left" entry on a timer card. Restarts the countdown from now.
export default function ResyncForm({ onSave, onCancel, children }: Props) {
  const [days, setDays] = useState('')
  const [hours, setHours] = useState('')
  const [minutes, setMinutes] = useState('')

  const durationMs = durationToMs(toWholeNumber(days), toWholeNumber(hours), toWholeNumber(minutes))

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (durationMs > 0) onSave(durationMs)
  }

  return (
    <form className="resync-form" onSubmit={handleSubmit}>
      <p className="hint">Enter the time the game shows now.</p>
      <div className="row">
        <label>
          Days
          <input inputMode="numeric" value={days} onChange={e => setDays(e.target.value)} placeholder="0" />
        </label>
        <label>
          Hours
          <input inputMode="numeric" value={hours} onChange={e => setHours(e.target.value)} placeholder="0" autoFocus />
        </label>
        <label>
          Minutes
          <input inputMode="numeric" value={minutes} onChange={e => setMinutes(e.target.value)} placeholder="0" />
        </label>
      </div>
      <div className="actions">
        <button type="submit" className="primary" disabled={durationMs === 0}>Resync</button>
        <button type="button" onClick={onCancel}>Cancel</button>
        {children}
      </div>
    </form>
  )
}
