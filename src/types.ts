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
  status: MarkerStatus
}

// Everything the app saves, stored as one object in localStorage.
// `version` lets us migrate old saves if the shape changes later.
export type AppData = {
  version: 2
  maps: ArkMap[]
  categories: Category[]
  markers: Marker[]
}
