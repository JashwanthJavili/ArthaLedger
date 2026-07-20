const CACHE_NAME = 'cashbook-v7'
const APP_SHELL = ['/', '/index.html', '/manifest.json']

let reminderState = {
  enabled: false,
  time: '19:00',
  lastSentDate: '',
}

let reminderTimer = null

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
      scheduleExactReminderTimer()
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
    scheduleExactReminderTimer()
    checkBackgroundDailyReminder()
  } else if (event.data.type === 'CHECK_REMINDER') {
    loadReminderState().then(() => {
      scheduleExactReminderTimer()
      checkBackgroundDailyReminder()
    })
  } else if (event.data.type === 'TEST_NOTIFICATION') {
    self.registration.showNotification('✍️ ArthaLedger Test Notification', {
      body: "Mobile notifications are working! It's time to enter your today's expenses in ArthaLedger.",
      icon: '/L.png',
      badge: '/L.png',
      vibrate: [100, 50, 100],
      tag: 'test-notification',
      data: { url: '/dashboard' },
    })
  }
})

// ── Schedule Millisecond Precision Alarm for Target Time ──────────────────
function scheduleExactReminderTimer() {
  if (reminderTimer) clearTimeout(reminderTimer)
  if (!reminderState.enabled || !reminderState.time) return

  const now = new Date()
  const [h, m] = reminderState.time.split(':').map(Number)
  let target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0)

  if (target <= now) {
    target.setDate(target.getDate() + 1)
  }

  const msUntilTarget = target.getTime() - now.getTime()
  reminderTimer = setTimeout(() => {
    triggerDailyNotification()
    scheduleExactReminderTimer()
  }, msUntilTarget)
}

function triggerDailyNotification() {
  if (!reminderState.enabled) return

  const now = new Date()
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

// ── Strict Time-Window Check (Strictly within 2 minutes of target time) ───
function checkBackgroundDailyReminder() {
  if (!reminderState.enabled || !reminderState.time) return

  const now = new Date()
  const [targetHour, targetMinute] = reminderState.time.split(':').map(Number)
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()

  const diffMinutes = (currentHour * 60 + currentMinute) - (targetHour * 60 + targetMinute)
  if (diffMinutes < 0 || diffMinutes > 2) return

  const todayStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`
  if (reminderState.lastSentDate === todayStr) return

  triggerDailyNotification()
}

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
