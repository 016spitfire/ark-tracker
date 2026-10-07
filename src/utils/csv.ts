import { formatSortableTime, type Report } from './report'

const HEADERS = [
  'Map',
  'Category',
  'Marker',
  'Marker status',
  'Group',
  'Timer',
  'Timer status',
  'Ready at',
  'Time zone',
  'Lat',
  'Lon',
  'Description',
]

// Wraps a value in quotes when it contains a comma, quote, or line break (doubling any quotes)
function cell(value: string | number): string {
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

// One row per timer, plus one row for each marker without timers
export function reportToCsv(report: Report): string {
  const rows: (string | number)[][] = [HEADERS]
  for (const section of report.sections) {
    for (const { marker, mapName, categoryName, timers } of section.markers) {
      const base = [mapName, categoryName, marker.name, marker.status]
      const tail = [marker.lat, marker.lon, marker.description]
      if (timers.length === 0) {
        rows.push([...base, '', '', '', '', '', ...tail])
        continue
      }
      for (const t of timers) {
        const status = t.status === 'done' ? 'done' : t.readyAt <= report.generatedAt ? 'ready' : 'active'
        rows.push([...base, t.group ?? '', t.label, status, formatSortableTime(t.readyAt), report.offset, ...tail])
      }
    }
  }
  // Byte order mark first, so Excel opens it as UTF-8 instead of mangling accented names
  return '﻿' + rows.map(r => r.map(cell).join(',')).join('\r\n')
}
