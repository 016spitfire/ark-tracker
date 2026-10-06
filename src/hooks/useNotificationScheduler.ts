import { useEffect, useState } from 'react'
import type { AppData } from '../types'
import { checkNotifications, EMPTY_STATE, type NotifyState } from '../utils/notificationSchedule'
import { getNotificationStatus, showNotification } from '../utils/notifications'

// Per device, separate from AppData: what this device has already notified about
const STATE_KEY = 'ark-tracker:notify-state'

function loadState(): NotifyState {
  try {
    const raw = localStorage.getItem(STATE_KEY)
    if (raw) return JSON.parse(raw) as NotifyState
  } catch {
    // Corrupt record: start fresh, which at worst skips alerts that were already due
  }
  return EMPTY_STATE
}

// Runs while the app is open: checks for due notifications whenever the data changes,
// at the next due time, and when the app comes back to the foreground.
export function useNotificationScheduler(data: AppData) {
  // Bumped to trigger a re-check
  const [wakeCount, setWakeCount] = useState(0)

  useEffect(() => {
    const active = data.settings.notificationsEnabled && getNotificationStatus() === 'granted'
    if (!active) {
      // Turning notifications back on later starts fresh instead of replaying the gap
      localStorage.removeItem(STATE_KEY)
      return
    }

    const result = checkNotifications(data, loadState(), Date.now())
    localStorage.setItem(STATE_KEY, JSON.stringify(result.state))
    for (const n of result.notifications) {
      // renotify: a replaced notification (same tag) still alerts instead of updating silently
      void showNotification(n.title, { body: n.body, tag: n.tag, data: { url: n.url }, renotify: true } as NotificationOptions)
    }

    // At least a second, so a just-due alert can't loop. The scheduler caps the wait at a
    // few hours, well under setTimeout's ~24.8 day limit.
    const delay = Math.max(result.nextCheckAt - Date.now(), 1000)
    const id = setTimeout(() => setWakeCount(c => c + 1), delay)
    return () => clearTimeout(id)
  }, [data, wakeCount])

  // Timers in background tabs can be delayed or frozen, so re-check on return
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') setWakeCount(c => c + 1)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])
}
