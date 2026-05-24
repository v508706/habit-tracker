import { getToken, onMessage } from 'firebase/messaging'
import { messaging } from '../firebase'

// ─── Permission ───────────────────────────────────────────────────────────────

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  return (await Notification.requestPermission()) === 'granted'
}

// ─── FCM token (for push when browser is closed) ─────────────────────────────

export async function registerFCMToken() {
  if (!messaging) return null
  try {
    const granted = await requestNotificationPermission()
    if (!granted) return null

    await navigator.serviceWorker.register('/firebase-messaging-sw.js')
    const swReg = await navigator.serviceWorker.ready

    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: swReg,
    })
    return token
  } catch (e) {
    console.warn('[notifications] FCM token registration failed:', e.message)
    return null
  }
}

export function listenFCMForeground(callback) {
  if (!messaging) return () => {}
  return onMessage(messaging, payload => {
    const { title = 'Habit Reminder', body = '' } = payload.notification || {}
    callback(title, body)
  })
}

// ─── Local in-tab notifications (polling fallback) ────────────────────────────

export function showNotification(title, body) {
  if (Notification.permission !== 'granted') return
  try {
    new Notification(title, { body, tag: `habit-${title}`, requireInteraction: false })
  } catch (e) { console.warn('[notifications] show failed:', e) }
}

const notifiedMap = {}

export function checkAndNotify(habits, completions, today, dayName) {
  const now  = new Date()
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  if (notifiedMap._date !== today) {
    Object.keys(notifiedMap).forEach(k => delete notifiedMap[k])
    notifiedMap._date = today
  }

  habits.forEach(h => {
    if (!h.days.includes(dayName)) return
    if (h.time !== time) return
    if (notifiedMap[h.id]) return
    if (completions[today]?.[h.id]) return
    notifiedMap[h.id] = true
    showNotification(`Time for ${h.emoji} ${h.name}!`, `Scheduled for ${h.time} — keep that streak alive!`)
  })
}
