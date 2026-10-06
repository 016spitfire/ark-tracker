// Browser notification helpers. Permission is per browser, not part of the saved data,
// so it's always read live from the browser.

export type NotificationStatus =
  | 'unsupported' // browser has no notifications or service workers
  | 'needs-install' // iPhone/iPad: only works once added to the Home Screen
  | NotificationPermission // 'default' (not asked yet) | 'granted' | 'denied'

function isIos(): boolean {
  // iPadOS reports itself as a Mac, so also check for touch
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1)
}

function isInstalled(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // Older iOS Safari flag for home screen apps
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function getNotificationStatus(): NotificationStatus {
  // Checked first: iOS Safari tabs don't expose Notification at all
  if (isIos() && !isInstalled()) return 'needs-install'
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return 'unsupported'
  return Notification.permission
}

// Must be called from a tap or click; browsers ignore permission requests that aren't
export async function requestNotificationPermission(): Promise<NotificationStatus> {
  const status = getNotificationStatus()
  if (status !== 'default') return status
  return Notification.requestPermission()
}

// Shows a notification through the service worker, so tapping it runs the worker's
// notificationclick handler. Falls back to a page notification when no worker is running
// (e.g. `npm run dev`).
export async function showNotification(title: string, options: NotificationOptions & { data?: { url?: string } }) {
  const full: NotificationOptions = { icon: '/icon-192.png', badge: '/icon-192.png', ...options }
  const registration = await navigator.serviceWorker.getRegistration()
  if (registration) {
    await registration.showNotification(title, full)
  } else {
    new Notification(title, full)
  }
}
