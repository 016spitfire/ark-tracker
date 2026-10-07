export type ArkMap = {
  id: string
  name: string
}

export type Category = {
  id: string
  name: string
  color: string
  hasTimer: boolean
}

export type MarkerStatus = 'active' | 'done'

// One countdown on a marker: a tame group, a building material, a generator, etc.
export type Timer = {
  id: string
  label: string
  // Absolute timestamp, so the countdown stays correct while the app is closed
  expiresAt: number
  status: MarkerStatus
  // Set for timers in a decay group. Ungrouped timers are one-offs.
  groupId?: string
  // Decay material (see src/data/decay.ts). Set for grouped timers.
  materialId?: string
}

// One base's decay timers. They all started when its tribe went offline, so resyncing
// any one of them shifts the whole group.
export type TimerGroup = {
  id: string
  name: string
}

export type Marker = {
  id: string
  mapId: string
  categoryId: string
  name: string
  description: string
  lat: number
  lon: number
  createdAt: number
  // Empty for categories without timers
  timers: Timer[]
  groups: TimerGroup[]
  status: MarkerStatus
}

export type AppSettings = {
  // How close (in map coordinate units) an existing marker must be to count as a possible duplicate
  duplicateRadius: number
  // Full decay time in days per material id (see src/data/decay.ts). Defaults to official.
  decayDays: Record<string, number>
  // The user's choice. Notifications also need browser permission, which is per device.
  notificationsEnabled: boolean
  // When to notify, in minutes before a timer is ready. 0 = when it's ready.
  notifyLeadMinutes: number[]
  // A once-a-day count of timers ready in the next 24 hours, at a local time ("HH:MM")
  dailySummaryEnabled: boolean
  dailySummaryTime: string
}

// Everything the app saves, stored as one object in localStorage.
// `version` lets us migrate old saves if the shape changes later.
export type AppData = {
  version: 3
  maps: ArkMap[]
  categories: Category[]
  markers: Marker[]
  settings: AppSettings
}
