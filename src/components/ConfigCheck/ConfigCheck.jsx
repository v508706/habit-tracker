import { useState, useEffect } from 'react'

// ─── Client-side validators ───────────────────────────────────────────────────
const CLIENT_CHECKS = [
  {
    key: 'VITE_FIREBASE_API_KEY',
    label: 'Firebase API Key',
    validate: v => {
      if (!v) return 'Not set'
      if (!v.startsWith('AIzaSy')) return 'Should start with "AIzaSy"'
      if (v.length < 30) return 'Looks too short'
      return null
    },
  },
  {
    key: 'VITE_FIREBASE_AUTH_DOMAIN',
    label: 'Auth Domain',
    validate: v => {
      if (!v) return 'Not set'
      if (!v.endsWith('.firebaseapp.com')) return 'Should end with .firebaseapp.com'
      return null
    },
  },
  {
    key: 'VITE_FIREBASE_PROJECT_ID',
    label: 'Project ID',
    validate: v => (!v ? 'Not set' : null),
  },
  {
    key: 'VITE_FIREBASE_STORAGE_BUCKET',
    label: 'Storage Bucket',
    validate: v => {
      if (!v) return 'Not set'
      if (!v.includes('.')) return 'Should look like project-id.appspot.com or project-id.firebasestorage.app'
      return null
    },
  },
  {
    key: 'VITE_FIREBASE_MESSAGING_SENDER_ID',
    label: 'Messaging Sender ID',
    validate: v => {
      if (!v) return 'Not set'
      if (!/^\d+$/.test(v)) return 'Should be a numeric string (e.g. 123456789012)'
      return null
    },
  },
  {
    key: 'VITE_FIREBASE_APP_ID',
    label: 'App ID',
    validate: v => {
      if (!v) return 'Not set'
      if (!v.includes(':web:')) return 'Should contain ":web:" (e.g. 1:123:web:abc)'
      return null
    },
  },
  {
    key: 'VITE_FIREBASE_VAPID_KEY',
    label: 'VAPID Key (Push)',
    validate: v => {
      if (!v) return 'Not set — get from Firebase Console → Cloud Messaging → Web Push certificates'
      if (v.length < 50) return 'Looks too short — copy the full key'
      return null
    },
  },
]

function getClientChecks() {
  return CLIENT_CHECKS.map(({ key, label, validate }) => {
    const value = import.meta.env[key] || ''
    const error = validate(value)
    return { name: label, key, ok: !error, value: value || null, error }
  })
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function Badge({ ok, loading }) {
  if (loading) return <span className="cfg-badge cfg-loading">…</span>
  return <span className={`cfg-badge ${ok ? 'cfg-ok' : 'cfg-fail'}`}>{ok ? '✓ OK' : '✗ Fail'}</span>
}

// ─── Single check row ─────────────────────────────────────────────────────────
function CheckRow({ check, loading }) {
  return (
    <div className={`cfg-row ${check.ok ? 'cfg-row-ok' : 'cfg-row-fail'}`}>
      <div className="cfg-row-left">
        <Badge ok={check.ok} loading={loading} />
        <div>
          <div className="cfg-row-name">{check.name}</div>
          {check.value && <div className="cfg-row-value">{check.value}</div>}
          {check.error && <div className="cfg-row-error">⚠ {check.error}</div>}
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ConfigCheck({ onDismiss }) {
  const [clientChecks]  = useState(getClientChecks)
  const [serverChecks,  setServerChecks]  = useState([])
  const [serverLoading, setServerLoading] = useState(true)
  const [serverError,   setServerError]   = useState(null)

  const clientOk = clientChecks.every(c => c.ok)

  useEffect(() => {
    fetch('/api/check-config')
      .then(r => r.json())
      .then(data => {
        setServerChecks(data.checks || [])
        setServerLoading(false)
      })
      .catch(e => {
        setServerError(
          e.message.includes('Failed to fetch')
            ? 'Could not reach /api/check-config — make sure you are running via "vercel dev" or deployed to Vercel'
            : e.message
        )
        setServerLoading(false)
      })
  }, [])

  const serverOk  = !serverError && serverChecks.every(c => c.ok)
  const allOk     = clientOk && serverOk && !serverLoading

  const recheck = () => {
    setServerLoading(true)
    setServerError(null)
    fetch('/api/check-config')
      .then(r => r.json())
      .then(data => { setServerChecks(data.checks || []); setServerLoading(false) })
      .catch(e => { setServerError(e.message); setServerLoading(false) })
  }

  return (
    <div className="cfg-overlay">
      <div className="cfg-modal">

        {/* Header */}
        <div className="cfg-header">
          <div>
            <div className="cfg-title">🔧 Configuration Check</div>
            <div className="cfg-subtitle">Validates your Firebase environment variables</div>
          </div>
          {onDismiss && (
            <button className="modal-close" onClick={onDismiss}>✕</button>
          )}
        </div>

        {/* Summary banner */}
        <div className={`cfg-summary ${allOk ? 'cfg-summary-ok' : 'cfg-summary-fail'}`}>
          {allOk
            ? '✅ All checks passed — your Firebase config is ready!'
            : '❌ Some checks failed — fix the issues below then click Re-check'}
        </div>

        {/* ── Client-side checks ── */}
        <div className="cfg-section">
          <div className="cfg-section-title">
            Browser Config <span className="cfg-tag">VITE_* in .env.local</span>
          </div>
          {clientChecks.map(c => <CheckRow key={c.key} check={c} loading={false} />)}
        </div>

        {/* ── Server-side checks ── */}
        <div className="cfg-section">
          <div className="cfg-section-title">
            Server Config <span className="cfg-tag">Vercel env vars / Admin SDK</span>
          </div>

          {serverError ? (
            <div className="cfg-server-error">
              <strong>Could not reach server:</strong><br />{serverError}
            </div>
          ) : serverLoading ? (
            <div className="cfg-loading-msg"><span className="spinner" /> Calling /api/check-config…</div>
          ) : (
            serverChecks.map((c, i) => <CheckRow key={i} check={c} loading={false} />)
          )}
        </div>

        {/* Private key hint */}
        {!serverLoading && serverChecks.find(c => c.name === 'FIREBASE_ADMIN_PRIVATE_KEY' && !c.ok) && (
          <div className="cfg-hint">
            <strong>🔑 Private Key format tip:</strong><br />
            In your <code>.env.local</code> the key must be on <strong>one line</strong> with <code>\n</code> for newlines:<br />
            <code className="cfg-code">FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"</code><br />
            <br />
            In <strong>Vercel dashboard</strong> paste the raw key with <em>real</em> line breaks (Vercel handles it correctly).
          </div>
        )}

        {/* Actions */}
        <div className="cfg-actions">
          <button className="btn btn-secondary" onClick={recheck}>↺ Re-check</button>
          {onDismiss && (
            <button className="btn btn-primary" onClick={onDismiss}>
              {allOk ? '✓ Continue to App' : 'Dismiss'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
