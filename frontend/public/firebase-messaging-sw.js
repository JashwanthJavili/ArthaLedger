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

function displayNotification(title, body, url = '/dashboard') {
  return self.registration.showNotification(title, {
    body,
    icon: '/L.png',
    badge: '/L.png',
    vibrate: [200, 100, 200],
    data: { url },
  })
}

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || payload.data?.title || '✍️ ArthaLedger Daily Reminder'
  const body = payload.notification?.body || payload.data?.body || "It's time to enter your today's expenses in ArthaLedger."
  const url = payload.data?.url || '/dashboard'
  displayNotification(title, body, url)
})

self.addEventListener('push', (event) => {
  if (!event.data) return
  let payload = {}
  try {
    payload = event.data.json()
  } catch (e) {
    payload = { notification: { title: '✍️ ArthaLedger Reminder', body: event.data.text() } }
  }

  const title = payload.notification?.title || payload.title || payload.data?.title || '✍️ ArthaLedger Daily Reminder'
  const body = payload.notification?.body || payload.body || payload.data?.body || "It's time for your evening check-in!"
  const url = payload.data?.url || '/dashboard'

  event.waitUntil(displayNotification(title, body, url))
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
