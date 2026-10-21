/* ArthaLedger service worker — one worker for offline caching AND push.
 *
 * Push messages are sent by the backend as FCM *data-only* web pushes, so this
 * worker is woken by the browser even when the app is closed / swiped away
 * from recents, and it shows the notification itself.
 */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

// __BUILD_ID__ is replaced at build time, so every deploy ships a changed
// worker: the browser installs it and old caches are dropped.
const CACHE_NAME = 'arthaledger-__BUILD_ID__'
const APP_SHELL = ['/', '/index.html', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png']

firebase.initializeApp({
  apiKey: 'AIzaSyCMig9-P-BCxmSx5atatrvDOQLKxniRHqQ',
  authDomain: 'cashbook-7087b.firebaseapp.com',
  databaseURL: 'https://cashbook-7087b-default-rtdb.firebaseio.com',
  projectId: 'cashbook-7087b',
  storageBucket: 'cashbook-7087b.firebasestorage.app',
  messagingSenderId: '920317817844',
  appId: '1:920317817844:web:e82fbac1961961f9d0bfa1',
})

const messaging = firebase.messaging()

function showAppNotification(title, { body, url = '/dashboard', tag, renotify = true } = {}) {
  return self.registration.showNotification(title || 'ArthaLedger', {
    body: body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-96.png',
    vibrate: [200, 100, 200],
    tag: tag || undefined,
    renotify: Boolean(tag) && renotify,
    data: { url },
  })
}

// Background pushes (app closed, in background, or not in recents)
messaging.onBackgroundMessage((payload) => {
  // If the message carries a `notification` block the FCM SDK already shows it;
  // showing it again would duplicate. Our backend sends data-only messages.
  if (payload.notification) return
  const d = payload.data || {}
  return showAppNotification(d.title, { body: d.body, url: d.url, tag: d.tag })
})

// ── Lifecycle ───────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL).catch(() => cache.addAll(['/', '/index.html'])))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

// Local test notification (used when the server can't be reached)
self.addEventListener('message', (event) => {
  if (event.data?.type === 'TEST_NOTIFICATION') {
    event.waitUntil(showAppNotification('ArthaLedger', {
      body: 'Notifications are working on this device.',
      tag: 'test-notification',
    }))
  }
})

// ── Notification tap → focus the app (or open it) on the right page ────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = new URL(event.notification.data?.url || '/dashboard', self.location.origin).href

  event.waitUntil((async () => {
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of clientList) {
      if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
        await client.focus()
        if ('navigate' in client && client.url !== targetUrl) {
          try { await client.navigate(targetUrl) } catch { /* cross-origin or not controlled */ }
        }
        return
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(targetUrl)
  })())
})

// ── Offline caching ─────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (!url.protocol.startsWith('http')) return
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return
  // Only handle our own origin; Firebase, APIs and fonts go straight to the network
  if (url.origin !== self.location.origin) return
  if (url.pathname === '/version.json') return

  // Pages: network first, fall back to the cached app shell (works offline)
  if (request.mode === 'navigate') {
    event.respondWith(
      // no-store: always get the newest index.html (and so the newest build)
      fetch(request.url, { cache: 'no-store', credentials: 'same-origin' })
        .then((response) => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', clone))
          return response
        })
        .catch(() => caches.match('/index.html').then((r) => r || caches.match('/'))),
    )
    return
  }

  // Hashed build assets never change: cache first
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      })),
    )
    return
  }

  // Everything else on our origin: stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      }).catch(() => cached)
      return cached || network
    }),
  )
})
