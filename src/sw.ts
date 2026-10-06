/// <reference lib="webworker" />
// The service worker: a background script the browser runs separately from the page.
// It keeps the app working offline and handles notification taps (and, later, push).
// Built by vite-plugin-pwa's injectManifest strategy, which fills in __WB_MANIFEST
// with the list of files to cache.

import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare let self: ServiceWorkerGlobalScope

// Offline: cache the built app files and serve them from the cache
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// Page URLs like /settings aren't real files, so serve index.html and let the router decide
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

// Take over as soon as a new version installs, so updates apply on the next open
self.skipWaiting()
clientsClaim()

// Tapping a notification opens the app at the URL the notification carries
// (e.g. a marker's edit page), reusing an open window if there is one.
self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = new URL((event.notification.data?.url as string | undefined) ?? '/', self.location.origin)

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const existing = windows.find(w => new URL(w.url).origin === url.origin)
      if (existing) {
        await existing.focus()
        await existing.navigate(url.href)
      } else {
        await self.clients.openWindow(url.href)
      }
    })(),
  )
})
