// Firebase Messaging Service Worker — AUTO-GENERATED, do not edit directly.
// Edit firebase-messaging-sw.template.js instead.
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey:            '%VITE_FIREBASE_API_KEY%',
  authDomain:        '%VITE_FIREBASE_AUTH_DOMAIN%',
  projectId:         '%VITE_FIREBASE_PROJECT_ID%',
  storageBucket:     '%VITE_FIREBASE_STORAGE_BUCKET%',
  messagingSenderId: '%VITE_FIREBASE_MESSAGING_SENDER_ID%',
  appId:             '%VITE_FIREBASE_APP_ID%',
})

const messaging = firebase.messaging()

// Handle background push messages
messaging.onBackgroundMessage(payload => {
  const { title = 'Habit Reminder', body = '' } = payload.notification || {}
  self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: payload.data?.habitId || 'habit',
    requireInteraction: false,
    actions: [{ action: 'open', title: 'Mark Done' }],
  })
})

// Open app when notification is clicked
self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      const existing = clientList.find(c => c.url.includes(self.location.origin))
      if (existing) return existing.focus()
      return clients.openWindow('/')
    })
  )
})
