import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage    from './components/Auth/LoginPage'
import SetupWizard  from './components/Setup/SetupWizard'
import Dashboard    from './components/Dashboard/Dashboard'
import HabitManager from './components/Habits/HabitManager'
import Stats        from './components/Stats/Stats'
import {
  isSetupDone, getHabits, getCompletions,
  getTodayString, getDayName,
} from './utils/storage'
import { initUserData, cloudSaveFcmToken } from './utils/db'
import {
  checkAndNotify, registerFCMToken,
  listenFCMForeground, showNotification,
} from './utils/notifications'

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-indigo-600 animate-spin-fast" />
    </div>
  )
}

const TABS = [
  { id: 'today',  icon: '📅', label: 'Today'  },
  { id: 'habits', icon: '✨', label: 'Habits'  },
  { id: 'stats',  icon: '📊', label: 'Stats'   },
]

function MainApp({ uid }) {
  const { signOut } = useAuth()
  const [setupDone,   setSetupDone]   = useState(false)
  const [syncLoading, setSyncLoading] = useState(true)
  const [activeTab,   setActiveTab]   = useState('today')

  useEffect(() => {
    initUserData(uid).then(r => {
      setSetupDone(r ? r.setupDone : isSetupDone())
      setSyncLoading(false)
    })
  }, [uid])

  useEffect(() => {
    if (!setupDone) return
    registerFCMToken().then(t => t && cloudSaveFcmToken(uid, t))
    const unsub    = listenFCMForeground((t, b) => showNotification(t, b))
    const interval = setInterval(() =>
      checkAndNotify(getHabits(), getCompletions(), getTodayString(), getDayName()), 60000)
    return () => { unsub(); clearInterval(interval) }
  }, [uid, setupDone])

  if (syncLoading) return <Spinner />
  if (!setupDone)  return <SetupWizard uid={uid} onComplete={() => setSetupDone(true)} />

  return (
    <div className="max-w-sm mx-auto min-h-screen bg-slate-50 relative">
      {/* Page content */}
      <div className="pb-24">
        {activeTab === 'today'  && <Dashboard    uid={uid} />}
        {activeTab === 'habits' && <HabitManager uid={uid} />}
        {activeTab === 'stats'  && <Stats />}
      </div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm bg-white/90 backdrop-blur border-t border-slate-100 flex items-stretch pb-safe z-50 shadow-[0_-1px_20px_rgba(0,0,0,0.06)]">
        {TABS.map(tab => (
          <button key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-all ${
              activeTab === tab.id
                ? 'text-indigo-600'
                : 'text-slate-400 hover:text-slate-600'
            }`}>
            <span className={`text-xl leading-none transition-transform duration-200 ${activeTab === tab.id ? 'scale-110' : ''}`}>
              {tab.icon}
            </span>
            <span className="text-[10px] font-semibold tracking-wide">{tab.label}</span>
            {activeTab === tab.id && (
              <span className="absolute bottom-1.5 w-1 h-1 rounded-full bg-indigo-600" />
            )}
          </button>
        ))}
        <button onClick={signOut}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-slate-400 hover:text-red-400 transition-colors">
          <span className="text-xl leading-none">🚪</span>
          <span className="text-[10px] font-semibold tracking-wide">Logout</span>
        </button>
      </nav>
    </div>
  )
}

function AppInner() {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user)   return <LoginPage />
  return <MainApp uid={user.uid} />
}

export default function App() {
  return <AuthProvider><AppInner /></AuthProvider>
}
