import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './components/Auth/LoginPage'
import SetupWizard from './components/Setup/SetupWizard'
import Dashboard from './components/Dashboard/Dashboard'
import HabitManager from './components/Habits/HabitManager'
import Stats from './components/Stats/Stats'
import ConfigCheck from './components/ConfigCheck/ConfigCheck'
import {
  isSetupDone, getHabits, getCompletions,
  getTodayString, getDayName, getUserName,
} from './utils/storage'
import { initUserData } from './utils/db'
import {
  checkAndNotify, registerFCMToken, listenFCMForeground, showNotification,
} from './utils/notifications'
import { cloudSaveFcmToken } from './utils/db'

function Spinner() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div className="app-spinner" />
    </div>
  )
}

function MainApp({ uid }) {
  const { signOut } = useAuth()
  const [setupDone,   setSetupDone]   = useState(false)
  const [syncLoading, setSyncLoading] = useState(true)
  const [activeTab,   setActiveTab]   = useState('today')
  const [showConfig,  setShowConfig]  = useState(false)

  // On mount: pull Firestore → localStorage, then determine if setup is done
  useEffect(() => {
    initUserData(uid).then(result => {
      // result is null if offline — fall back to localStorage
      setSetupDone(result ? result.setupDone : isSetupDone())
      setSyncLoading(false)
    })
  }, [uid])

  // Polling notifications (when tab is open) + FCM token registration
  useEffect(() => {
    if (!setupDone) return

    // Register FCM for push notifications when browser is closed
    registerFCMToken().then(token => {
      if (token) cloudSaveFcmToken(uid, token)
    })

    // Handle FCM foreground messages
    const unsub = listenFCMForeground((title, body) => showNotification(title, body))

    // Poll every minute for in-tab reminders
    const interval = setInterval(() => {
      checkAndNotify(getHabits(), getCompletions(), getTodayString(), getDayName())
    }, 60000)

    return () => { unsub(); clearInterval(interval) }
  }, [uid, setupDone])

  if (syncLoading) return <Spinner />

  if (!setupDone) {
    return <SetupWizard uid={uid} onComplete={() => setSetupDone(true)} />
  }

  const tabs = [
    { id: 'today',  icon: '📅', label: 'Today' },
    { id: 'habits', icon: '✨', label: 'Habits' },
    { id: 'stats',  icon: '📊', label: 'Stats' },
  ]

  return (
    <div className="app">
      <div className="content">
        {activeTab === 'today'  && <Dashboard key="today" uid={uid} />}
        {activeTab === 'habits' && <HabitManager uid={uid} />}
        {activeTab === 'stats'  && <Stats />}
      </div>

      <nav className="bottom-nav">
        {tabs.map(tab => (
          <button key={tab.id}
            className={`nav-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}>
            <span className="nav-icon">{tab.icon}</span>
            <span className="nav-label">{tab.label}</span>
          </button>
        ))}
        <button className="nav-btn" onClick={() => setShowConfig(true)} title="Check config">
          <span className="nav-icon">🔧</span>
          <span className="nav-label">Config</span>
        </button>
        <button className="nav-btn" onClick={signOut} title="Sign out">
          <span className="nav-icon">🚪</span>
          <span className="nav-label">Logout</span>
        </button>
      </nav>

      {showConfig && <ConfigCheck onDismiss={() => setShowConfig(false)} />}
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
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}
