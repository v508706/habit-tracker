/**
 * Vercel Serverless Function — sends FCM push notifications.
 * Called every minute by an external cron (cron-job.org or similar).
 *
 * Required env vars (set in Vercel dashboard):
 *   FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL,
 *   FIREBASE_ADMIN_PRIVATE_KEY, CRON_SECRET
 */
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore }  from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'

function adminApp() {
  if (getApps().length) return getApps()[0]
  return initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey:  (process.env.FIREBASE_ADMIN_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  })
}

export default async function handler(req, res) {
  // Verify caller secret
  const secret = req.query.secret ?? req.headers['x-cron-secret']
  if (!secret || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const app       = adminApp()
  const db        = getFirestore(app)
  const messaging = getMessaging(app)
  const now       = new Date()
  const results   = { sent: 0, skipped: 0, errors: 0 }

  try {
    const usersSnap = await db.collection('users').get()

    await Promise.all(usersSnap.docs.map(async userDoc => {
      const u = userDoc.data()
      if (!u.fcmToken) { results.skipped++; return }

      // Compute current time in user's timezone
      const tz      = u.timezone || 'UTC'
      const userNow = new Date(now.toLocaleString('en-US', { timeZone: tz }))
      const hh      = String(userNow.getHours()).padStart(2, '0')
      const mm      = String(userNow.getMinutes()).padStart(2, '0')
      const curTime = `${hh}:${mm}`
      const dayName = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][userNow.getDay()]
      const dateStr = `${userNow.getFullYear()}-${String(userNow.getMonth()+1).padStart(2,'0')}-${String(userNow.getDate()).padStart(2,'0')}`

      const habitsSnap = await db.collection('users').doc(userDoc.id).collection('habits').get()

      for (const habitDoc of habitsSnap.docs) {
        const h = habitDoc.data()
        if (!h.days?.includes(dayName)) continue
        if (h.time !== curTime) continue

        // Skip if already completed today
        const compSnap = await db.collection('users').doc(userDoc.id)
          .collection('completions').doc(dateStr).get()
        if (compSnap.exists() && compSnap.data()?.[habitDoc.id]) continue

        try {
          await messaging.send({
            token: u.fcmToken,
            notification: {
              title: `Time for ${h.emoji} ${h.name}!`,
              body:  `Habit scheduled at ${h.time} — keep your streak alive! 🔥`,
            },
            webpush: { fcmOptions: { link: '/' } },
            data: { habitId: habitDoc.id },
          })
          results.sent++
        } catch (e) {
          results.errors++
          // Clear invalid tokens automatically
          if (['messaging/invalid-registration-token',
               'messaging/registration-token-not-registered'].includes(e.code)) {
            await db.collection('users').doc(userDoc.id).update({ fcmToken: null })
          }
        }
      }
    }))

    res.status(200).json({ ok: true, timestamp: now.toISOString(), ...results })
  } catch (e) {
    console.error('[notify] job error:', e)
    res.status(500).json({ error: e.message })
  }
}
