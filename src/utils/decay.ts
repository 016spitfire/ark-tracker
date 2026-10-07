import { DECAY_MATERIALS } from '../data/decay'
import type { MarkerStatus, Timer } from '../types'
import { groupOfflineAt } from './groups'
import { DAY, durationToMs, toWholeNumber } from './time'

// A decay group as it's being edited on the marker form
export type GroupDraft = {
  id: string
  name: string
  // The material whose timer was read in game, and the time it showed
  readMaterialId: string
  days: string
  hours: string
  minutes: string
  // Checked materials
  materialIds: string[]
  // Members already saved (empty for a new group)
  existing: Timer[]
  // Done/active per material, as toggled in the form
  statuses: Record<string, MarkerStatus>
}

export type ResolvedMember = {
  materialId: string
  label: string
  expiresAt: number
  status: MarkerStatus
  // Existing timers keep their id
  timerId?: string
}

export type GroupResult =
  | { ok: true; members: ResolvedMember[]; decayed: string[] }
  | { ok: false; error: string }

export function readingMs(draft: GroupDraft): number {
  return durationToMs(toWholeNumber(draft.days), toWholeNumber(draft.hours), toWholeNumber(draft.minutes))
}

// Works out every member's time. Every decay timer at a base starts when the tribe goes
// offline, so one reading gives that moment and each material's full time does the rest:
//   offline   = now + time left (material read) - full time (material read)
//   expiresAt = offline + full time (each material)
// With no new reading, existing members keep their times and newly checked materials are
// calculated from the group's current offline moment.
export function resolveGroup(draft: GroupDraft, decayDays: Record<string, number>, now: number): GroupResult {
  const reading = readingMs(draft)
  const checked = new Set(draft.materialIds)
  if (reading > 0) checked.add(draft.readMaterialId)
  const existingByMaterial = new Map(draft.existing.map(t => [t.materialId, t]))

  let start: number | undefined
  if (reading > 0) {
    const material = DECAY_MATERIALS.find(m => m.id === draft.readMaterialId)
    const fullMs = decayDays[draft.readMaterialId] * DAY
    if (!material) return { ok: false, error: 'Pick the material you read.' }
    if (reading > fullMs) {
      return {
        ok: false,
        error: `That's more than ${material.name}'s full decay time (${decayDays[draft.readMaterialId]} days). Check Settings > Decay Times.`,
      }
    }
    start = now + reading - fullMs
  } else if (draft.existing.length > 0) {
    start = groupOfflineAt(draft.existing, decayDays)
  } else if (checked.size > 0) {
    return { ok: false, error: `Enter the time the game shows for the material you read in ${draft.name || 'this group'}.` }
  } else {
    return { ok: true, members: [], decayed: [] }
  }

  const members: ResolvedMember[] = []
  const decayed: string[] = []
  for (const material of DECAY_MATERIALS) {
    if (!checked.has(material.id)) continue
    const existing = existingByMaterial.get(material.id)
    const keepTime = existing && reading === 0
    const expiresAt = keepTime ? existing.expiresAt : start! + decayDays[material.id] * DAY
    // A newly calculated time that's already passed means that material is gone
    if (!keepTime && expiresAt <= now) {
      decayed.push(material.name)
      continue
    }
    members.push({
      materialId: material.id,
      label: existing?.label ?? material.name,
      expiresAt,
      status: draft.statuses[material.id] ?? existing?.status ?? 'active',
      timerId: existing?.id,
    })
  }
  return { ok: true, members, decayed }
}
