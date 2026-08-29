// StudyFlow service worker.
//
// Two jobs:
//  1. Offline support — precaches the app shell, serves cached navigations
//     when the network is down, and runtime-caches hashed assets + fonts.
//  2. Web Push — receives review reminders and shows notifications.
//
// Never caches Supabase API traffic: all app data is user-scoped and must
// stay live; offline the app simply shows its cached shell.

const VERSION = 'v1'
const SHELL_CACHE = `studyflow-shell-${VERSION}`
const RUNTIME_CACHE = `studyflow-runtime-${VERSION}`
const FONT_CACHE = `studyflow-fonts-${VERSION}`

// The bare minimum needed to render the app offline. Hashed JS/CSS bundles
// under /assets/ are picked up at runtime (stale-while-revalidate) the first
// time the user loads the app online.
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/favicon.svg',
  '/pwa-192.png',
  '/pwa-512.png',
  '/pwa-maskable-192.png',
  '/pwa-maskable-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('studyflow-') && !key.endsWith(VERSION))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Supabase (and any other API): always go to the network, never cache.
  if (url.hostname.endsWith('.supabase.co')) return

  // SPA navigations: network first so logins and deploys land immediately,
  // but fall back to the cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(SHELL_CACHE).then((cache) => cache.put('/', copy))
          return response
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || caches.match('/'))
        )
    )
    return
  }

  // Google Fonts: the CSS from googleapis is stale-while-revalidate, the
  // font files from gstatic are effectively immutable — cache-first.
  if (url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(request, FONT_CACHE))
    return
  }
  if (url.hostname === 'fonts.googleapis.com') {
    event.respondWith(staleWhileRevalidate(request, FONT_CACHE))
    return
  }

  // Same-origin assets: hashed filenames mean a new deploy produces new
  // URLs, so stale-while-revalidate is safe and keeps loads instant.
  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE))
  }
})

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) {
    const cache = await caches.open(cacheName)
    cache.put(request, response.clone())
  }
  return response
}

async function staleWhileRevalidate(request, cacheName) {
  const cached = await caches.match(request)
  const network = fetch(request)
    .then((response) => {
      if (response.ok) {
        // Clone synchronously, in this same tick — the response body can
        // only be read once, and caches.open() resolving on a later tick
        // gives whoever else is reading this response (e.g. a worker
        // script fetch) a chance to consume it first, which throws.
        const copy = response.clone()
        caches.open(cacheName).then((c) => c.put(request, copy))
      }
      return response
    })
    .catch(() => undefined)
  return cached || (await network) || Response.error()
}

// ---------------------------------------------------------------------------
// Web Push
// ---------------------------------------------------------------------------

self.addEventListener('push', (event) => {
  let data = { title: 'StudyFlow', body: 'You have something to review.', url: '/' }
  try {
    if (event.data) data = { ...data, ...event.data.json() }
  } catch {
    // Non-JSON payload — fall back to the defaults above rather than crash.
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/pwa-192.png',
      badge: '/pwa-maskable-192.png',
      data: { url: data.url },
    })
  )
})

// Clicking the notification focuses an existing StudyFlow tab if one's
// open, navigating it to the target URL, or opens a new one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      return self.clients.openWindow(targetUrl)
    })
  )
})
