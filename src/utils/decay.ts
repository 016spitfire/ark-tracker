import { DECAY_MATERIALS } from '../data/decay'
import { DAY } from './time'

export type CalculatedTimer = { label: string; remainingMs: number }

export type FillResult =
  | { ok: true; timers: CalculatedTimer[]; decayed: string[] }
  | { ok: false; error: string }

// Every decay timer at a base starts together when the tribe goes offline. So one reading
// tells us how long they've been gone, and each other material has that much less than its
// full time:
//   elapsed   = full(known) - remaining(known)
//   remaining = full(other) - elapsed
export function fillFromReading(
  decayDays: Record<string, number>,
  knownId: string,
  knownRemainingMs: number,
  otherIds: string[],
): FillResult {
  const known = DECAY_MATERIALS.find(m => m.id === knownId)
  if (!known) return { ok: false, error: 'Pick the material you read.' }

  const knownFullMs = decayDays[knownId] * DAY
  if (knownRemainingMs > knownFullMs) {
    return {
      ok: false,
      error: `That's more than ${known.name}'s full decay time (${decayDays[knownId]} days). Check Settings > Decay Times.`,
    }
  }
  const elapsedMs = knownFullMs - knownRemainingMs

  const timers: CalculatedTimer[] = [{ label: known.name, remainingMs: knownRemainingMs }]
  const decayed: string[] = []
  for (const material of DECAY_MATERIALS) {
    if (material.id === knownId || !otherIds.includes(material.id)) continue
    const remainingMs = decayDays[material.id] * DAY - elapsedMs
    if (remainingMs > 0) timers.push({ label: material.name, remainingMs })
    else decayed.push(material.name)
  }
  return { ok: true, timers, decayed }
}
