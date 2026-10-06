// Decides which notifications to show and when to check next. Pure functions with no
// browser APIs, so the rules can be tested with fake data and a fake clock.
// The useNotificationScheduler hook does the showing, saving, and waiting.

import type { AppData, Marker, Timer } from '../types'
import { formatRemaining, HOUR, MINUTE } from './time'
import { timerLabel } from './timers'

// Remembered per device (not in AppData), so a reload doesn't repeat notifications
export type NotifyState = {
  // When each timer countdown was first seen, by timer id + expiresAt. Alerts scheduled
  // before that are skipped, so a new or resynced timer only alerts going forward.
  seen: Record<string, number>
  // Alerts already shown (or skipped as superseded)
  sent: string[]
  // Local date ("YYYY-MM-DD") of the last daily summary. "" = none yet.
  // Missing = fresh state (notifications just turned on).
  lastDaily?: string
}

export const EMPTY_STATE: NotifyState = { seen: {}, sent: [] }

export type PendingNotification = {
  title: string
  body: string
  // Same tag replaces the earlier notification instead of stacking
  tag: string
  url: string
}

type Alert = {
  key: string
  timerKey: string
  fireAt: number
  marker: Marker
  timer: Timer
}

// Alerts older than this when we get to them were missed (app closed or asleep), and are
// combined into one "while you were away" notification instead of shown one by one
const MISSED_AFTER = 2 * MINUTE

// Even with nothing due, check again at least this often. Covers sleep and clock changes.
const MAX_WAIT = 6 * HOUR

const timerKey = (timer: Timer) => `${timer.id}:${timer.expiresAt}`

// Every alert for every active timer on an active timer-category marker
function collectAlerts(data: AppData): Alert[] {
  const timedCategories = new Set(data.categories.filter(c => c.hasTimer).map(c => c.id))
  const alerts: Alert[] = []
  for (const marker of data.markers) {
    if (marker.status !== 'active' || !timedCategories.has(marker.categoryId)) continue
    for (const timer of marker.timers) {
      if (timer.status !== 'active') continue
      for (const lead of data.settings.notifyLeadMinutes) {
        alerts.push({
          key: `${timerKey(timer)}:${lead}`,
          timerKey: timerKey(timer),
          fireAt: timer.expiresAt - lead * MINUTE,
          marker,
          timer,
        })
      }
    }
  }
  return alerts
}

function describe(alert: Alert, now: number): string {
  const remaining = alert.timer.expiresAt - now
  const label = timerLabel(alert.timer)
  return remaining > 0 ? `${label} ready in ${formatRemaining(remaining)}` : `${label} is ready`
}

function localDate(time: number): string {
  const d = new Date(time)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Today's (or the given day's) summary time as a timestamp, in local time
function summaryTimeOn(day: number, hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(day)
  d.setHours(h || 0, m || 0, 0, 0)
  return d.getTime()
}

function dailySummary(data: AppData, now: number): PendingNotification | null {
  const upcoming = collectAlerts({ ...data, settings: { ...data.settings, notifyLeadMinutes: [0] } })
    .filter(a => a.fireAt > now && a.fireAt <= now + 24 * HOUR)
    .sort((a, b) => a.fireAt - b.fireAt)
  // Nothing due is nothing to say
  if (upcoming.length === 0) return null

  const names = upcoming.slice(0, 3).map(a => `${a.marker.name} (${describe(a, now)})`)
  const more = upcoming.length > 3 ? `, +${upcoming.length - 3} more` : ''
  return {
    title: `${upcoming.length} timer${upcoming.length === 1 ? '' : 's'} ready in the next 24 hours`,
    body: names.join(', ') + more,
    tag: 'daily-summary',
    url: '/',
  }
}

export function checkNotifications(
  data: AppData,
  previous: NotifyState,
  now: number,
): { notifications: PendingNotification[]; state: NotifyState; nextCheckAt: number } {
  const alerts = collectAlerts(data)
  const sent = new Set(previous.sent)
  const notifications: PendingNotification[] = []

  // Remember when each countdown was first seen; forget timers that are gone
  const seen: Record<string, number> = {}
  for (const alert of alerts) seen[alert.timerKey] = previous.seen[alert.timerKey] ?? now

  // Due now and not yet handled. Skips alerts from before the countdown was seen.
  const due = alerts.filter(a => a.fireAt <= now && !sent.has(a.key) && a.fireAt >= seen[a.timerKey])
  for (const alert of due) sent.add(alert.key)

  // Per timer, only the latest due alert matters ("15 min" supersedes "1 hour")
  const latestPerTimer = new Map<string, Alert>()
  for (const alert of due) {
    const current = latestPerTimer.get(alert.timerKey)
    if (!current || alert.fireAt > current.fireAt) latestPerTimer.set(alert.timerKey, alert)
  }
  const fresh = [...latestPerTimer.values()].filter(a => now - a.fireAt <= MISSED_AFTER)
  const missed = [...latestPerTimer.values()].filter(a => now - a.fireAt > MISSED_AFTER)

  for (const alert of fresh) {
    notifications.push({
      title: alert.marker.name,
      body: describe(alert, now),
      tag: alert.timerKey,
      url: `/markers/${alert.marker.id}/edit`,
    })
  }
  if (missed.length > 0) {
    notifications.push({
      title: `While you were away: ${missed.length} timer alert${missed.length === 1 ? '' : 's'}`,
      body: missed
        .sort((a, b) => a.timer.expiresAt - b.timer.expiresAt)
        .map(a => `${a.marker.name}: ${describe(a, now)}`)
        .join('\n'),
      tag: 'missed',
      url: '/',
    })
  }

  // Daily summary: once per local day, at or after the chosen time
  const { dailySummaryEnabled, dailySummaryTime } = data.settings
  const todaySummaryAt = summaryTimeOn(now, dailySummaryTime)
  let lastDaily = previous.lastDaily
  // Fresh state: if today's time already passed, count today as done, so turning
  // notifications on in the evening doesn't send this morning's summary
  if (lastDaily === undefined) lastDaily = now >= todaySummaryAt ? localDate(now) : ''
  if (dailySummaryEnabled && now >= todaySummaryAt && lastDaily !== localDate(now)) {
    const summary = dailySummary(data, now)
    if (summary) notifications.push(summary)
    lastDaily = localDate(now)
  }

  // Next wake-up: the soonest unsent future alert, the next daily summary, or MAX_WAIT
  const candidates = [now + MAX_WAIT]
  for (const alert of alerts) {
    if (alert.fireAt > now && !sent.has(alert.key)) candidates.push(alert.fireAt)
  }
  if (dailySummaryEnabled) {
    const nextSummaryAt = lastDaily === localDate(now) ? summaryTimeOn(now + 24 * HOUR, dailySummaryTime) : todaySummaryAt
    if (nextSummaryAt > now) candidates.push(nextSummaryAt)
  }

  // Keep only sent keys for timers that still exist, so the record doesn't grow forever
  const liveKeys = new Set(alerts.map(a => a.key))

  return {
    notifications,
    state: { seen, sent: [...sent].filter(k => liveKeys.has(k)), lastDaily },
    nextCheckAt: Math.min(...candidates),
  }
}
