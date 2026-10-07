import { DECAY_MATERIALS } from '../data/decay'
import type { Marker, Timer, TimerGroup } from '../types'
import { DAY, HOUR } from './time'

// Two timers count as starting together if their offline moments are within this.
// Readings from the game drift by minutes, while genuinely separate countdowns
// (different tame groups, different bases) differ by days.
export const SAME_START_TOLERANCE = HOUR

// G1, G2, ... using the lowest number not already taken
export function defaultGroupName(groups: TimerGroup[]): string {
  const taken = new Set(groups.map(g => g.name))
  let n = 1
  while (taken.has(`G${n}`)) n++
  return `G${n}`
}

// When this timer's tribe went offline, according to the material's full decay time
export function offlineAt(timer: Timer, decayDays: Record<string, number>): number | undefined {
  const days = timer.materialId ? decayDays[timer.materialId] : undefined
  return days === undefined ? undefined : timer.expiresAt - days * DAY
}

// A group's offline moment: the middle value across its members, so one odd member
// (say, resynced on its own before groups existed) doesn't skew it
export function groupOfflineAt(timers: Timer[], decayDays: Record<string, number>): number | undefined {
  const moments = timers
    .map(t => offlineAt(t, decayDays))
    .filter((m): m is number => m !== undefined)
    .sort((a, b) => a - b)
  return moments.length ? moments[Math.floor(moments.length / 2)] : undefined
}

function materialForLabel(label: string): string | undefined {
  const lower = label.trim().toLowerCase()
  // "Tames (set 2)" still counts as tames
  if (lower.startsWith('tames')) return 'tames'
  return DECAY_MATERIALS.find(m => m.name.toLowerCase() === lower)?.id
}

// Data v2 -> v3: before groups existed, a marker was one base. Its building-material
// timers become group G1 with their times unchanged. A tame timer joins G1 only if its
// countdown lines up with the same offline moment; otherwise it stays a one-off.
// Anything else (unlabeled or custom labels) stays a one-off.
export function groupExistingTimers(
  marker: Omit<Marker, 'groups'>,
  decayDays: Record<string, number>,
): Pick<Marker, 'timers' | 'groups'> {
  const group: TimerGroup = { id: crypto.randomUUID(), name: 'G1' }
  const tagged = marker.timers.map(t => ({ ...t, materialId: materialForLabel(t.label) }))

  const structures = tagged.filter(t => t.materialId && t.materialId !== 'tames')
  if (structures.length === 0) return { timers: marker.timers, groups: [] }

  const groupStart = groupOfflineAt(structures, decayDays)!
  let tamesJoined = false
  const timers = tagged.map(t => {
    if (!t.materialId) return stripMaterial(t)
    if (t.materialId !== 'tames') return { ...t, groupId: group.id }
    // One tames timer per group at most; it has to line up with the base
    const start = offlineAt(t, decayDays)
    if (!tamesJoined && start !== undefined && Math.abs(start - groupStart) <= SAME_START_TOLERANCE) {
      tamesJoined = true
      return { ...t, groupId: group.id }
    }
    return stripMaterial(t)
  })
  return { timers, groups: [group] }
}

// One-off timers don't carry a material tag
function stripMaterial(timer: Timer): Timer {
  const { materialId: _materialId, ...rest } = timer
  return rest
}

// Moves every timer in a group by the same amount, since they share one offline moment.
// Used when the game shows a group member at a different time than the app expected.
export function shiftGroup(timers: Timer[], groupId: string, deltaMs: number): Timer[] {
  return timers.map(t => (t.groupId === groupId ? { ...t, expiresAt: t.expiresAt + deltaMs } : t))
}
