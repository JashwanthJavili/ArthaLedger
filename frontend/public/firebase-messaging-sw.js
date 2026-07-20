// Firebase Cloud Messaging Background ServiceWorker
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

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

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || '✍️ ArthaLedger Daily Reminder'
  const options = {
    body: payload.notification?.body || "It's time for your evening check-in! Log today's expenses in ArthaLedger.",
    icon: payload.notification?.icon || '/icon-192.svg',
    badge: '/icon-192.svg',
    vibrate: [200, 100, 200],
    data: payload.data || { url: '/dashboard' },
  }

  self.registration.showNotification(title, options)
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
