const CACHE_NAME = 'cashbook-v7'
const APP_SHELL = ['/', '/index.html', '/manifest.json']

let reminderState = {
  enabled: false,
  time: '19:00',
  lastSentDate: '',
}

async function saveReminderState(state) {
  try {
    const cache = await caches.open('arthaledger-config')
    await cache.put('/reminder-config', new Response(JSON.stringify(state)))
  } catch (e) {
    console.error('Failed to save reminder state:', e)
  }
}

async function loadReminderState() {
  try {
    const cache = await caches.open('arthaledger-config')
    const response = await cache.match('/reminder-config')
    if (response) {
      const data = await response.json()
      reminderState = { ...reminderState, ...data }
    }
  } catch (e) {
    console.error('Failed to load reminder state:', e)
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== 'arthaledger-config').map((k) => caches.delete(k)))),
      loadReminderState(),
    ])
  )
  self.clients.claim()
})

// ── Message Listener from Client App ──────────────────────────────────────
self.addEventListener('message', (event) => {
  if (!event.data) return

  if (event.data.type === 'SET_DAILY_REMINDER') {
    reminderState.enabled = Boolean(event.data.enabled)
    if (event.data.time) reminderState.time = event.data.time
    saveReminderState(reminderState)
    checkBackgroundDailyReminder()
  } else if (event.data.type === 'CHECK_REMINDER') {
    loadReminderState().then(() => checkBackgroundDailyReminder())
  } else if (event.data.type === 'TEST_NOTIFICATION') {
    self.registration.showNotification('✍️ ArthaLedger Test Notification', {
      body: 'Mobile notifications are working! Your daily expense reminder is active.',
      icon: '/icon-192.svg',
      badge: '/icon-192.svg',
      vibrate: [100, 50, 100],
      tag: 'test-notification',
      data: { url: '/dashboard' },
    })
  }
})

// ── Background Periodic Check inside Service Worker ───────────────────────
function checkBackgroundDailyReminder() {
  if (!reminderState.enabled) return

  const now = new Date()
  const [targetHour, targetMinute] = reminderState.time.split(':').map(Number)
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()

  const isTime = currentHour > targetHour || (currentHour === targetHour && currentMinute >= targetMinute)
  if (!isTime) return

  const todayStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`
  if (reminderState.lastSentDate === todayStr) return

  reminderState.lastSentDate = todayStr
  saveReminderState(reminderState)

  self.registration.showNotification('✍️ Daily Expense Reminder', {
    body: "It's time to enter your today's expenses in ArthaLedger.",
    icon: '/L.png',
    badge: '/L.png',
    vibrate: [200, 100, 200],
    tag: 'daily-expense-reminder',
    data: { url: '/dashboard' },
  })
}

// Check every 15 seconds in worker
setInterval(checkBackgroundDailyReminder, 15000)

// ── Notification Click Handler ─────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
    })
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)

  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return
  if (!url.protocol.startsWith('http')) return

  if (
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebaseapp.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com')
  ) return

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          return response
        })
        .catch(() => caches.match('/index.html')),
    )
    return
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached
        return fetch(event.request).then((response) => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          return response
        })
      }),
    )
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        return response
      })
      .catch(() => caches.match(event.request)),
  )
})
