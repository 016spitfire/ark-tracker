import { DECAY_MATERIALS } from '../data/decay'
import type { Marker, Timer } from '../types'

// Offered as you type a timer label. Free text is still allowed.
export const TIMER_LABEL_SUGGESTIONS = DECAY_MATERIALS.map(m => m.name)

// A marker reported as already demolishable has one timer with this label, ready from the
// moment it was reported. Reusing a timer means cards, sorting, and exports handle it as is.
export const DEMOLISHABLE_LABEL = 'Demolishable'

export function demolishableTimer(marker: Marker | undefined): Timer | undefined {
  if (!marker || marker.timers.length !== 1) return undefined
  const [timer] = marker.timers
  return timer.label === DEMOLISHABLE_LABEL && !timer.groupId ? timer : undefined
}

// Timers carried over from before labels existed have an empty label
export function timerLabel(timer: Timer): string {
  return timer.label || 'Timer'
}

// Soonest first
export function sortTimers(timers: Timer[]): Timer[] {
  return [...timers].sort((a, b) => a.expiresAt - b.expiresAt)
}

// The active timer that runs out first, or undefined if every timer is done
export function nextTimer(marker: Marker): Timer | undefined {
  return sortTimers(marker.timers.filter(t => t.status === 'active'))[0]
}
