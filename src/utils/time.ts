export const MINUTE = 60_000
export const HOUR = 60 * MINUTE
export const DAY = 24 * HOUR

// Blank or junk input counts as 0, so users can leave duration fields empty
export function toWholeNumber(value: string): number {
  return Math.max(0, parseInt(value, 10) || 0)
}

export function durationToMs(days: number, hours: number, minutes: number): number {
  return days * DAY + hours * HOUR + minutes * MINUTE
}

// Rounds up to the minute so a timer never reads "0m" before it's actually ready
export function splitDuration(ms: number): { days: number; hours: number; minutes: number } {
  const totalMinutes = Math.ceil(ms / MINUTE)
  return {
    days: Math.floor(totalMinutes / (24 * 60)),
    hours: Math.floor((totalMinutes % (24 * 60)) / 60),
    minutes: totalMinutes % 60,
  }
}

// "2d 4h 13m"
export function formatRemaining(ms: number): string {
  const { days, hours, minutes } = splitDuration(ms)

  const parts: string[] = []
  if (days) parts.push(`${days}d`)
  if (hours) parts.push(`${hours}h`)
  if (minutes || parts.length === 0) parts.push(`${minutes}m`)
  return parts.join(' ')
}

export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
