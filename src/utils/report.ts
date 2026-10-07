// The data behind the CSV and PDF exports. Exports are snapshots, so timers are given as
// fixed dates and times (with the time zone spelled out), not countdowns.

import type { AppData, Marker, MarkerStatus } from '../types'
import { describeFilters, filterMarkers, type Filters } from './filters'
import { nextTimer, sortTimers, timerLabel } from './timers'

export type ReportTimer = {
  group?: string
  label: string
  readyAt: number
  status: MarkerStatus
}

export type ReportMarker = {
  marker: Marker
  mapName: string
  categoryName: string
  timers: ReportTimer[]
}

export type Report = {
  generatedAt: number
  // e.g. "GMT+2"
  offset: string
  // e.g. "Africa/Johannesburg"
  timeZone: string
  filters: string
  sections: { mapName: string; markers: ReportMarker[] }[]
}

// "GMT+2", "GMT-5", "GMT+5:30" for the device's time zone at that moment
export function gmtOffset(time: number): string {
  const minutes = -new Date(time).getTimezoneOffset()
  const sign = minutes >= 0 ? '+' : '-'
  const abs = Math.abs(minutes)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return `GMT${sign}${h}${m ? `:${String(m).padStart(2, '0')}` : ''}`
}

// "12 Oct 2026, 14:30". Day-month-year and a 24-hour clock read the same everywhere.
// If daylight saving puts this time in a different offset than the report's, it's noted.
export function formatReportTime(time: number, reportOffset: string): string {
  const d = new Date(time)
  const text = `${d.getDate()} ${d.toLocaleString('en-GB', { month: 'short' })} ${d.getFullYear()}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  const offset = gmtOffset(time)
  return offset === reportOffset ? text : `${text} (${offset})`
}

// "2026-10-12 14:30": sorts correctly and spreadsheets read it as a date
export function formatSortableTime(time: number): string {
  const d = new Date(time)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function buildReport(data: AppData, filters: Filters, now: number): Report {
  const categoryById = new Map(data.categories.map(c => [c.id, c]))
  const visible = filterMarkers(data.markers, filters)

  const toReportMarker = (marker: Marker): ReportMarker => {
    const timed = categoryById.get(marker.categoryId)?.hasTimer ?? false
    const groupName = new Map(marker.groups.map(g => [g.id, g.name]))
    // Same order as the card: each group's timers, then one-offs, soonest first within each
    const order = (groupId?: string) => {
      const i = marker.groups.findIndex(g => g.id === groupId)
      return i === -1 ? marker.groups.length : i
    }
    const timers = timed
      ? sortTimers(marker.timers.filter(t => filters.showDone || t.status === 'active'))
          .sort((a, b) => order(a.groupId) - order(b.groupId))
          .map(t => ({
            // Only named when there's something to tell apart
            group: marker.groups.length > 1 || (marker.groups.length === 1 && marker.timers.some(x => !x.groupId))
              ? (t.groupId ? groupName.get(t.groupId) : 'Other')
              : undefined,
            label: timerLabel(t),
            readyAt: t.expiresAt,
            status: t.status,
          }))
      : []
    return {
      marker,
      mapName: data.maps.find(m => m.id === marker.mapId)?.name ?? 'Unknown map',
      categoryName: categoryById.get(marker.categoryId)?.name ?? 'Unknown category',
      timers,
    }
  }

  // Within a map: markers with timers first, soonest first; then the rest alphabetically
  const sortKey = (r: ReportMarker) => (r.timers.length ? (nextTimer(r.marker)?.expiresAt ?? Infinity) : Infinity)
  const sections = data.maps
    .map(map => ({
      mapName: map.name,
      markers: visible
        .filter(m => m.mapId === map.id)
        .map(toReportMarker)
        .sort((a, b) => {
          if (!!a.timers.length !== !!b.timers.length) return a.timers.length ? -1 : 1
          return sortKey(a) - sortKey(b) || a.marker.name.localeCompare(b.marker.name)
        }),
    }))
    .filter(s => s.markers.length > 0)

  return {
    generatedAt: now,
    offset: gmtOffset(now),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    filters: describeFilters(filters, data.maps, data.categories),
    sections,
  }
}
