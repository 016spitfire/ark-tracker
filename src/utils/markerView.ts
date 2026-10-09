// What a marker shows, worked out once and shared by every layout (cards, list rows, table)

import type { ArkMap, Category, Marker, Timer } from '../types'
import { demolishableTimer, nextTimer, sortTimers } from './timers'

export type TimerSection = { key: string; name: string; timers: Timer[] }

export type MarkerInfo = {
  category?: Category
  map?: ArkMap
  // Has timers and is in a timer category
  timed: boolean
  // The soonest active timer
  next?: Timer
  remaining: number | null
  ready: boolean
  // Timers can be resynced or marked done (active marker in a timer category)
  editable: boolean
  // Editable, and not a demolishable report (nothing to resync)
  resyncable: boolean
  // Timers to display: done ones only when "Show done" is on
  shownTimers: Timer[]
  // A single active timer keeps the simple view. Anything more gets a row per timer.
  showTimerRows: boolean
  // Each group's timers, then one-offs under "Other"
  timerSections: TimerSection[]
}

export function getMarkerInfo(
  marker: Marker,
  categoryById: Map<string, Category>,
  mapById: Map<string, ArkMap>,
  showDone: boolean,
  now: number,
): MarkerInfo {
  const category = categoryById.get(marker.categoryId)
  const timed = marker.timers.length > 0 && (category?.hasTimer ?? false)
  const next = timed ? nextTimer(marker) : undefined
  const remaining = next ? next.expiresAt - now : null
  const shownTimers = sortTimers(marker.timers.filter(t => showDone || t.status === 'active'))
  const groupIds = new Set(marker.groups.map(g => g.id))

  return {
    category,
    map: mapById.get(marker.mapId),
    timed,
    next,
    remaining,
    ready: remaining !== null && remaining <= 0,
    editable: timed && marker.status === 'active',
    resyncable: timed && marker.status === 'active' && !demolishableTimer(marker),
    shownTimers,
    showTimerRows: timed && (shownTimers.length > 1 || shownTimers.some(t => t.status === 'done')),
    timerSections: [
      ...marker.groups.map(g => ({
        key: g.id,
        name: g.name,
        timers: shownTimers.filter(t => t.groupId === g.id),
      })),
      {
        key: 'other',
        name: 'Other',
        timers: shownTimers.filter(t => !t.groupId || !groupIds.has(t.groupId)),
      },
    ].filter(section => section.timers.length > 0),
  }
}
