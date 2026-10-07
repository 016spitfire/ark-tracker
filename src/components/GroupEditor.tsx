import { DECAY_MATERIALS } from '../data/decay'
import { readingMs, resolveGroup, type GroupDraft } from '../utils/decay'
import { formatRemaining } from '../utils/time'

type Props = {
  draft: GroupDraft
  decayDays: Record<string, number>
  onChange: (draft: GroupDraft) => void
  onRemove: () => void
}

// One base's decay timers on the marker form: a reading, the materials at the base,
// and a live preview of every resulting timer
export default function GroupEditor({ draft, decayDays, onChange, onRemove }: Props) {
  const now = Date.now()
  const result = resolveGroup(draft, decayDays, now)
  const hasReading = readingMs(draft) > 0
  const isExisting = draft.existing.length > 0
  const update = (changes: Partial<GroupDraft>) => onChange({ ...draft, ...changes })

  return (
    <div className="group-editor">
      <div className="add-row">
        <input
          className="group-name"
          value={draft.name}
          onChange={e => update({ name: e.target.value })}
          placeholder="Group name"
          aria-label="Group name"
        />
        <button type="button" className="danger" onClick={onRemove}>
          Remove group
        </button>
      </div>

      <p className="hint">
        {isExisting
          ? 'Enter a new reading to recalculate the whole group, or leave it blank to keep the current times.'
          : 'Read one timer in game. The rest are calculated from Settings > Decay Times.'}
      </p>

      <label>
        Material you read
        <select value={draft.readMaterialId} onChange={e => update({ readMaterialId: e.target.value })}>
          {DECAY_MATERIALS.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </label>

      <div className="row">
        <label>
          Days
          <input inputMode="numeric" value={draft.days} onChange={e => update({ days: e.target.value })} placeholder="0" />
        </label>
        <label>
          Hours
          <input inputMode="numeric" value={draft.hours} onChange={e => update({ hours: e.target.value })} placeholder="0" />
        </label>
        <label>
          Minutes
          <input inputMode="numeric" value={draft.minutes} onChange={e => update({ minutes: e.target.value })} placeholder="0" />
        </label>
      </div>

      <p className="hint">At this base:</p>
      <div className="material-checks">
        {DECAY_MATERIALS.map(m => {
          // The material you read is always part of the group
          const forced = hasReading && m.id === draft.readMaterialId
          return (
            <label key={m.id} className="checkbox">
              <input
                type="checkbox"
                checked={forced || draft.materialIds.includes(m.id)}
                disabled={forced}
                onChange={e =>
                  update({
                    materialIds: e.target.checked
                      ? [...draft.materialIds, m.id]
                      : draft.materialIds.filter(id => id !== m.id),
                  })
                }
              />
              {m.name}
            </label>
          )
        })}
      </div>

      {!result.ok && <p className="error">{result.error}</p>}
      {result.ok && result.members.length > 0 && (
        <ul className="group-preview">
          {result.members.map(member => {
            const remaining = member.expiresAt - now
            return (
              <li key={member.materialId} className={member.status === 'done' ? 'done' : undefined}>
                <span>{member.label}</span>
                <span className="timer">{remaining > 0 ? formatRemaining(remaining) : 'READY'}</span>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={member.status === 'done'}
                    onChange={e =>
                      update({
                        statuses: { ...draft.statuses, [member.materialId]: e.target.checked ? 'done' : 'active' },
                      })
                    }
                  />
                  Done
                </label>
              </li>
            )
          })}
        </ul>
      )}
      {result.ok && result.decayed.length > 0 && (
        <p className="hint">Skipped, would already have decayed: {result.decayed.join(', ')}.</p>
      )}
    </div>
  )
}
