import type { Marker } from '../types'
import type { MarkerInfo } from '../utils/markerView'
import { formatDateTime, formatRemaining } from '../utils/time'
import TimerRows, { TimerPanel, type TimerActions } from './TimerRows'

type Props = {
  marker: Marker
  info: MarkerInfo
  now: number
  // Hidden when the list is already filtered to one map
  showMap: boolean
  onEdit: (id: string) => void
  onToggleDone: (marker: Marker) => void
  actions: TimerActions
}

export default function MarkerCard({ marker, info, now, showMap, onEdit, onToggleDone, actions }: Props) {
  const { category, map, timed, next, remaining, ready, editable, resyncable, showTimerRows } = info
  const { openTimerId, setOpenTimerId } = actions
  const openTimer = marker.timers.find(t => t.id === openTimerId)

  return (
    <li
      className={`marker-card${marker.status === 'done' ? ' done' : ''}${ready ? ' ready' : ''}`}
      style={{ borderLeftColor: category?.color }}
    >
      <div className="card-row">
        <div className="card-main" onClick={() => onEdit(marker.id)}>
          <div className="name">{marker.name}</div>
          <div className="card-meta">
            <span style={{ color: category?.color }}>{category?.name ?? 'Unknown category'}</span>
            {showMap && <span>{map?.name ?? 'Unknown map'}</span>}
            <span className="coords">{marker.lat}, {marker.lon}</span>
          </div>
          {timed && (
            <div className="card-meta">
              {next ? `${ready ? 'Ready since' : 'Ready at'} ${formatDateTime(next.expiresAt)}` : 'All timers done'}
            </div>
          )}
          {marker.description && <p className="description">{marker.description}</p>}
        </div>
        {/* Timer pinned top, buttons pinned bottom, beside the content instead of below it */}
        <div className="card-side">
          {remaining !== null && <span className="timer">{ready ? 'READY' : formatRemaining(remaining)}</span>}
          {/* Done stays rightmost so it's in the same spot on every card */}
          <div className="card-actions">
            {resyncable && !showTimerRows && next && openTimerId !== next.id && (
              <button onClick={() => setOpenTimerId(next.id)}>Resync</button>
            )}
            <button onClick={() => onToggleDone(marker)}>{marker.status === 'done' ? 'Reopen' : 'Done'}</button>
          </div>
        </div>
      </div>

      {showTimerRows && <TimerRows marker={marker} info={info} now={now} actions={actions} />}

      {editable && !showTimerRows && openTimer && (
        <TimerPanel marker={marker} timer={openTimer} withDoneToggle={false} actions={actions} />
      )}
    </li>
  )
}
