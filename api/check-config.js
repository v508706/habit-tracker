/**
 * GET /api/check-config
 * Validates all server-side Firebase Admin SDK environment variables.
 * Safe to call in dev — returns status without exposing secret values.
 */
import { initializeApp, getApps, deleteApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

function validatePrivateKey(raw) {
  if (!raw) return { ok: false, error: 'FIREBASE_ADMIN_PRIVATE_KEY is not set' }

  // Accept both literal \n and real newlines
  const key = raw.replace(/\\n/g, '\n').trim()

  if (!key.startsWith('-----BEGIN PRIVATE KEY-----'))
    return { ok: false, error: 'Must start with: -----BEGIN PRIVATE KEY-----' }

  if (!key.endsWith('-----END PRIVATE KEY-----'))
    return { ok: false, error: 'Must end with: -----END PRIVATE KEY-----  (check for trailing spaces or missing newline)' }

  const body = key
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '')

  if (body.length < 200)
    return { ok: false, error: 'Key body is too short — looks truncated' }

  if (!/^[A-Za-z0-9+/=]+$/.test(body))
    return { ok: false, error: 'Key body contains invalid characters — should be base64 only' }

  return { ok: true, length: body.length }
}

export default async function handler(req, res) {
  const checks = []

  // ── 1. FIREBASE_ADMIN_PROJECT_ID ─────────────────────────────────────────
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID
  checks.push({
    name: 'FIREBASE_ADMIN_PROJECT_ID',
    ok: !!projectId,
    value: projectId ? `"${projectId}"` : null,
    error: projectId ? null : 'Not set',
  })

  // ── 2. FIREBASE_ADMIN_CLIENT_EMAIL ───────────────────────────────────────
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  const emailOk = !!clientEmail && clientEmail.includes('@') && clientEmail.endsWith('.iam.gserviceaccount.com')
  checks.push({
    name: 'FIREBASE_ADMIN_CLIENT_EMAIL',
    ok: emailOk,
    value: clientEmail ? `"${clientEmail}"` : null,
    error: !clientEmail ? 'Not set'
      : !clientEmail.endsWith('.iam.gserviceaccount.com') ? 'Should end with .iam.gserviceaccount.com'
      : null,
  })

  // ── 3. FIREBASE_ADMIN_PRIVATE_KEY (format) ───────────────────────────────
  const keyResult = validatePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY)
  checks.push({
    name: 'FIREBASE_ADMIN_PRIVATE_KEY',
    ok: keyResult.ok,
    value: keyResult.ok ? `Valid RSA key (${keyResult.length} base64 chars)` : null,
    error: keyResult.error ?? null,
  })

  // ── 4. CRON_SECRET ───────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET
  const cronOk = !!cronSecret && cronSecret !== 'your-random-secret-string' && cronSecret.length >= 8
  checks.push({
    name: 'CRON_SECRET',
    ok: cronOk,
    value: cronOk ? `Set (${cronSecret.length} chars)` : null,
    error: !cronSecret ? 'Not set'
      : cronSecret === 'your-random-secret-string' ? 'Still using placeholder — change to a real secret'
      : cronSecret.length < 8 ? 'Too short — use at least 8 characters'
      : null,
  })

  // ── 5. Live Firebase Admin connection test ───────────────────────────────
  let connectionCheck = { name: 'Firebase Admin SDK connection', ok: false, error: 'Skipped (config errors above)' }

  if (checks.every(c => c.ok)) {
    // Clean up any existing test app
    const existingTest = getApps().find(a => a.name === '__config_test__')
    if (existingTest) await deleteApp(existingTest)

    try {
      const testApp = initializeApp({
        credential: cert({
          projectId:   process.env.FIREBASE_ADMIN_PROJECT_ID,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey:  (process.env.FIREBASE_ADMIN_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        }),
      }, '__config_test__')

      const db = getFirestore(testApp)
      // Lightweight ping — just list collections root
      await db.listCollections()
      await deleteApp(testApp)

      connectionCheck = { name: 'Firebase Admin SDK connection', ok: true, value: 'Connected to Firestore ✓' }
    } catch (e) {
      connectionCheck = { name: 'Firebase Admin SDK connection', ok: false, error: e.message }
    }
  }

  checks.push(connectionCheck)

  const allOk = checks.every(c => c.ok)
  res.status(allOk ? 200 : 422).json({ ok: allOk, checks })
}
