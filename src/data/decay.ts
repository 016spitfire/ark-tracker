// Official-server decay times for ARK: Survival Evolved, from https://ark.wiki.gg/wiki/Building.
// Private servers often scale these, so users can change them in Settings > Decay Times.
// Every timer at an abandoned base starts when its tribe goes offline, which is what lets
// one reading fill in the rest.

export type DecayMaterial = {
  id: string
  // Also used as the timer label
  name: string
  officialDays: number
  // Servers scale structures and tames with separate multipliers
  kind: 'structure' | 'tame'
}

export const DECAY_MATERIALS: DecayMaterial[] = [
  { id: 'thatch', name: 'Thatch', officialDays: 4, kind: 'structure' },
  { id: 'wood', name: 'Wood', officialDays: 8, kind: 'structure' },
  { id: 'adobe', name: 'Adobe', officialDays: 8, kind: 'structure' },
  { id: 'stone', name: 'Stone', officialDays: 12, kind: 'structure' },
  { id: 'greenhouse', name: 'Greenhouse', officialDays: 15, kind: 'structure' },
  { id: 'metal', name: 'Metal', officialDays: 16, kind: 'structure' },
  { id: 'vault', name: 'Vault', officialDays: 16, kind: 'structure' },
  { id: 'tek', name: 'Tek', officialDays: 20, kind: 'structure' },
  { id: 'tek-generator', name: 'Tek Generator', officialDays: 40, kind: 'structure' },
  { id: 'tek-transmitter', name: 'Tek Transmitter', officialDays: 40, kind: 'structure' },
  { id: 'tek-teleporter', name: 'Tek Teleporter', officialDays: 40, kind: 'structure' },
  { id: 'cryofridge', name: 'Cryofridge', officialDays: 40, kind: 'structure' },
  { id: 'dedi-storage', name: 'Dedi Storage', officialDays: 80, kind: 'structure' },
  { id: 'tek-trough', name: 'Tek Trough', officialDays: 80, kind: 'structure' },
  { id: 'tames', name: 'Tames', officialDays: 8, kind: 'tame' },
]

export const OFFICIAL_DECAY_DAYS: Record<string, number> = Object.fromEntries(
  DECAY_MATERIALS.map(m => [m.id, m.officialDays]),
)
