import type { Marker, MarkerStatus, Timer } from '../types'
import type { MarkerInfo } from '../utils/markerView'
import { formatRemaining } from '../utils/time'
import { timerLabel } from '../utils/timers'
import ResyncForm from './ResyncForm'

// Timer actions shared by every layout. Only one timer's resync panel is open at a time
// across the whole list, so the open id lives in MarkerList.
export type TimerActions = {
  openTimerId: string | null
  setOpenTimerId: (id: string | null) => void
  onResyncTimer: (markerId: string, timerId: string, durationMs: number) => void
  onSetTimerStatus: (markerId: string, timerId: string, status: MarkerStatus) => void
}

// Resync panel for one timer, with a done/reopen toggle when the marker has several timers
export function TimerPanel({
  marker,
  timer,
  withDoneToggle,
  actions,
}: {
  marker: Marker
  timer: Timer
  withDoneToggle: boolean
  actions: TimerActions
}) {
  const group = marker.groups.find(g => g.id === timer.groupId)
  return (
    <ResyncForm
      note={group ? `Enter the time the game shows now. Every timer in ${group.name} moves with it.` : undefined}
      onSave={durationMs => {
        actions.onResyncTimer(marker.id, timer.id, durationMs)
        actions.setOpenTimerId(null)
      }}
      onCancel={() => actions.setOpenTimerId(null)}
    >
      {withDoneToggle && (
        <button
          type="button"
          onClick={() => {
            actions.onSetTimerStatus(marker.id, timer.id, timer.status === 'done' ? 'active' : 'done')
            actions.setOpenTimerId(null)
          }}
        >
          {timer.status === 'done' ? 'Reopen timer' : 'Mark timer done'}
        </button>
      )}
    </ResyncForm>
  )
}

// One row per timer, under group headings when there's more than one section.
// Tapping a row opens its resync panel.
export default function TimerRows({
  marker,
  info,
  now,
  actions,
}: {
  marker: Marker
  info: MarkerInfo
  now: number
  actions: TimerActions
}) {
  const { openTimerId, setOpenTimerId } = actions
  return (
    <div className="timer-rows">
      {info.timerSections.map(section => (
        <div key={section.key}>
          {info.timerSections.length > 1 && <div className="timer-section-name">{section.name}</div>}
          <ul>
            {section.timers.map(timer => {
              const remaining = timer.expiresAt - now
              const ready = timer.status === 'active' && remaining <= 0
              return (
                <li key={timer.id}>
                  <button
                    className={`timer-row${timer.status === 'done' ? ' done' : ''}${ready ? ' ready' : ''}`}
                    disabled={!info.editable}
                    onClick={() => setOpenTimerId(openTimerId === timer.id ? null : timer.id)}
                  >
                    <span>{timerLabel(timer)}</span>
                    <span className="timer">
                      {timer.status === 'done' ? 'done' : ready ? 'READY' : formatRemaining(remaining)}
                    </span>
                  </button>
                  {info.editable && openTimerId === timer.id && (
                    <TimerPanel marker={marker} timer={timer} withDoneToggle actions={actions} />
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}
