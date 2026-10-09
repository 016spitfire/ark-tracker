import type { Marker } from '../types'
import type { MarkerInfo } from '../utils/markerView'
import { formatDateTime, formatRemaining } from '../utils/time'
import { timerLabel } from '../utils/timers'
import TimerRows, { TimerPanel, type TimerActions } from './TimerRows'

type Props = {
  marker: Marker
  info: MarkerInfo
  now: number
  showMap: boolean
  expanded: boolean
  onToggleExpanded: () => void
  onEdit: (id: string) => void
  onToggleDone: (marker: Marker) => void
  actions: TimerActions
}

// Compact list row: one line on wide screens, two on phones. Several timers collapse into a
// summary ("Stone 6d 2h · 5 timers") that expands to the full grouped rows.
export default function MarkerRow({
  marker,
  info,
  now,
  showMap,
  expanded,
  onToggleExpanded,
  onEdit,
  onToggleDone,
  actions,
}: Props) {
  const { category, map, timed, next, remaining, ready, editable, resyncable, showTimerRows, shownTimers } = info
  const { openTimerId, setOpenTimerId } = actions
  const openTimer = marker.timers.find(t => t.id === openTimerId)
  const hasDetails = showTimerRows || !!marker.description

  let summary = ''
  if (timed) {
    if (!next) summary = 'All timers done'
    else {
      const time = ready ? 'READY' : formatRemaining(remaining!)
      summary = shownTimers.length > 1 ? `${timerLabel(next)} ${time}` : time
    }
  }

  return (
    <li
      className={`marker-row${marker.status === 'done' ? ' done' : ''}${ready ? ' ready' : ''}`}
      style={{ borderLeftColor: category?.color }}
    >
      <div className="row-line">
        <button type="button" className="row-name" onClick={() => onEdit(marker.id)}>
          {marker.name}
        </button>
        <div className="row-meta">
          <span style={{ color: category?.color }}>{category?.name ?? 'Unknown category'}</span>
          {showMap && <span>{map?.name ?? 'Unknown map'}</span>}
          <span className="coords">{marker.lat}, {marker.lon}</span>
        </div>
        <div className="row-desc" title={marker.description}>{marker.description}</div>
        <div className="row-timer" title={next ? `${ready ? 'Ready since' : 'Ready at'} ${formatDateTime(next.expiresAt)}` : undefined}>
          {summary && <span className="timer">{summary}</span>}
          {shownTimers.length > 1 && <span className="row-count">{shownTimers.length} timers</span>}
        </div>
        <div className="row-actions">
          {hasDetails && (
            <button type="button" onClick={onToggleExpanded} aria-expanded={expanded}>
              {expanded ? 'Less' : 'More'}
            </button>
          )}
          {resyncable && !showTimerRows && next && openTimerId !== next.id && (
            <button type="button" onClick={() => setOpenTimerId(next.id)}>Resync</button>
          )}
          <button type="button" onClick={() => onToggleDone(marker)}>
            {marker.status === 'done' ? 'Reopen' : 'Done'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="row-details">
          {marker.description && <p className="description">{marker.description}</p>}
          {showTimerRows && <TimerRows marker={marker} info={info} now={now} actions={actions} />}
        </div>
      )}

      {editable && !showTimerRows && openTimer && (
        <TimerPanel marker={marker} timer={openTimer} withDoneToggle={false} actions={actions} />
      )}
    </li>
  )
}
