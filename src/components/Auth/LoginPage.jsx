import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

function friendlyError(code) {
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':  return 'Sign-in window was closed. Please try again.'
    case 'auth/popup-blocked':            return 'Pop-up blocked — allow pop-ups for this site and retry.'
    case 'auth/network-request-failed':   return 'Network error. Check your connection and try again.'
    case 'auth/unauthorized-domain':      return 'Domain not authorised. Add it in Firebase → Auth → Authorized domains.'
    case 'auth/configuration-not-found':  return 'Firebase config missing. Check VITE_FIREBASE_* environment variables.'
    default: return `Sign-in failed (${code ?? 'unknown'}). Check browser console for details.`
  }
}

const FEATURES = [
  ['📅', 'Daily check-ins'],
  ['🔔', 'Smart reminders'],
  ['📊', 'Streak tracking'],
  ['☁️', 'Syncs everywhere'],
]

export default function LoginPage() {
  const { signInWithGoogle } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const handleGoogle = async () => {
    setLoading(true); setError('')
    try {
      await signInWithGoogle()
    } catch (e) {
      setError(friendlyError(e.code))
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700">
      {/* Background blobs */}
      <div className="absolute top-16 -left-16 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-16 -right-16 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm animate-fade-in">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Top gradient strip */}
          <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />

          <div className="px-8 pt-8 pb-8">
            {/* Logo */}
            <div className="flex justify-center mb-5">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                <span className="text-4xl">✨</span>
              </div>
            </div>

            <h1 className="text-2xl font-black text-slate-900 text-center mb-1">Habit Tracker</h1>
            <p className="text-slate-500 text-center text-sm leading-relaxed mb-6">
              Build powerful daily routines.<br />Track, improve, stay consistent.
            </p>

            {/* Features */}
            <div className="grid grid-cols-2 gap-2 mb-6">
              {FEATURES.map(([icon, text]) => (
                <div key={text} className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2.5">
                  <span className="text-base">{icon}</span>
                  <span className="text-xs font-semibold text-slate-600">{text}</span>
                </div>
              ))}
            </div>

            {/* Google button */}
            <button
              onClick={handleGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl border-2 border-slate-200 bg-white text-slate-700 font-semibold text-sm hover:bg-slate-50 hover:border-slate-300 hover:shadow-md active:scale-95 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 rounded-full border-2 border-slate-300 border-t-indigo-600 animate-spin-fast" />
              ) : (
                <svg width="20" height="20" viewBox="0 0 48 48">
                  <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
                  <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
                  <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
                  <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
                </svg>
              )}
              {loading ? 'Signing in…' : 'Continue with Google'}
            </button>

            {/* Error */}
            {error && (
              <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl px-3 py-2.5 animate-fade-in">
                <span className="text-base leading-none flex-shrink-0">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <p className="text-center text-xs text-slate-400 mt-5">
              Your data is stored securely and never shared.
            </p>
          </div>
        </div>

        {/* Version badge */}
        <p className="text-center text-white/50 text-xs mt-4 font-medium">Habit Tracker v1.0</p>
      </div>
    </div>
  )
}
