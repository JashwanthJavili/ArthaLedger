// Firebase Cloud Messaging Background ServiceWorker
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

// Handle push events sent from Firebase Cloud Messaging / VAPID Push Server
self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch (e) {
    payload = { notification: { title: '✍️ ArthaLedger Reminder', body: event.data ? event.data.text() : '' } }
  }

  const title = payload.notification?.title || payload.title || '✍️ ArthaLedger Daily Reminder'
  const options = {
    body: payload.notification?.body || payload.body || "It's time for your evening check-in! Log today's expenses in ArthaLedger.",
    icon: payload.notification?.icon || '/icon-192.svg',
    badge: '/icon-192.svg',
    vibrate: [200, 100, 200],
    data: payload.data || { url: '/dashboard' },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

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
