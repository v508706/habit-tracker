import { useState } from 'react'
import { saveHabits, saveUserName, markSetupDone, getTimezone, saveTimezone } from '../../utils/storage'
import { requestNotificationPermission } from '../../utils/notifications'
import { cloudSaveProfile, cloudSaveHabits } from '../../utils/db'

const EMOJIS = ['🏃', '🎵', '♟️', '📚', '💪', '🧘', '💊', '💧', '🛌', '✏️', '🍎', '🎯',
  '🎨', '🏊', '🚴', '🎸', '🌱', '📝', '🧩', '🏋️', '🥗', '☕', '🧠', '🎤',
  '🦷', '🚶', '🧹', '🐾', '📷', '🎃']

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#64748b']

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const DEFAULT_HABIT = {
  emoji: '🏃', name: '',
  days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  time: '08:00', color: '#6366f1',
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2) }

function formatDays(days) {
  if (days.length === 7) return 'Every day'
  if (days.length === 5 && !days.includes('Sat') && !days.includes('Sun')) return 'Weekdays'
  return days.join(', ')
}
function fmtTime(t) {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

function HabitFormInline({ habit, onChange, onSave, onCancel }) {
  const toggleDay = d => onChange({ ...habit, days: habit.days.includes(d) ? habit.days.filter(x => x !== d) : [...habit.days, d] })
  return (
    <div className="add-habit-form">
      <div className="add-habit-form-header">
        <span className="add-habit-form-title">Add New Habit</span>
        {onCancel && <button className="modal-close" onClick={onCancel}>✕</button>}
      </div>

      <div className="form-group">
        <label className="form-label">Choose Icon</label>
        <div className="emoji-picker">
          {EMOJIS.map(e => (
            <button key={e} className={`emoji-option ${habit.emoji === e ? 'selected' : ''}`}
              onClick={() => onChange({ ...habit, emoji: e })}>{e}</button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Habit Name</label>
        <input className="form-input" placeholder="e.g. Morning Run"
          value={habit.name} maxLength={40}
          onChange={e => onChange({ ...habit, name: e.target.value })} />
      </div>

      <div className="form-group">
        <label className="form-label">Color</label>
        <div className="color-picker">
          {COLORS.map(c => (
            <button key={c} className={`color-option ${habit.color === c ? 'selected' : ''}`}
              style={{ background: c }} onClick={() => onChange({ ...habit, color: c })} />
          ))}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Repeat Days</label>
        <div className="day-selector">
          {DAYS.map(d => (
            <button key={d} className={`day-btn ${habit.days.includes(d) ? 'selected' : ''}`}
              onClick={() => toggleDay(d)}>{d[0]}</button>
          ))}
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label">Reminder Time</label>
        <input type="time" className="form-input" value={habit.time}
          onChange={e => onChange({ ...habit, time: e.target.value })} />
      </div>

      <div style={{ marginTop: 20 }}>
        <button className="btn btn-primary btn-full" onClick={onSave}
          disabled={!habit.name.trim() || habit.days.length === 0}>
          Add Habit
        </button>
      </div>
    </div>
  )
}

export default function SetupWizard({ uid: userUid, onComplete }) {
  const [step, setStep]               = useState(0)
  const [userName, setUserName]       = useState('')
  const [habits, setHabits]           = useState([])
  const [showForm, setShowForm]       = useState(false)
  const [currentHabit, setCurrentHabit] = useState({ ...DEFAULT_HABIT })
  const [notifStatus, setNotifStatus] = useState(null)
  const [saving, setSaving]           = useState(false)

  const handleAddHabit = () => {
    if (!currentHabit.name.trim() || currentHabit.days.length === 0) return
    setHabits(prev => [...prev, { ...currentHabit, id: uid() }])
    setCurrentHabit({ ...DEFAULT_HABIT })
    setShowForm(false)
  }

  const handleFinish = async () => {
    setSaving(true)
    const name = userName.trim() || 'Friend'
    const tz   = Intl.DateTimeFormat().resolvedOptions().timeZone

    // Local save
    saveUserName(name)
    saveTimezone(tz)
    saveHabits(habits)
    markSetupDone()

    // Cloud save (fire-and-forget, don't block UX)
    cloudSaveProfile(userUid, { name, setupDone: true, timezone: tz })
    cloudSaveHabits(userUid, habits)

    setSaving(false)
    onComplete()
  }

  const steps = [
    {
      content: (
        <>
          <div className="setup-emoji">👋</div>
          <h1 className="setup-title">Welcome to<br />Habit Tracker!</h1>
          <p className="setup-subtitle">Build better routines, one day at a time. Let's start with your name.</p>
          <div className="form-group">
            <label className="form-label">Your Name</label>
            <input className="form-input" placeholder="What should we call you?"
              value={userName} onChange={e => setUserName(e.target.value)} autoFocus />
          </div>
        </>
      ),
      canNext: true, nextLabel: 'Continue →',
    },
    {
      content: (
        <>
          <h1 className="setup-title">Add Your Habits</h1>
          <p className="setup-subtitle">What routines do you want to track? Add more anytime.</p>

          {habits.length > 0 && (
            <div className="habit-preview-list">
              {habits.map(h => (
                <div key={h.id} className="habit-preview-item">
                  <div className="habit-preview-emoji" style={{ background: h.color + '22' }}>{h.emoji}</div>
                  <div className="habit-preview-info">
                    <div className="habit-preview-name">{h.name}</div>
                    <div className="habit-preview-meta">{formatDays(h.days)} · {fmtTime(h.time)}</div>
                  </div>
                  <button className="habit-preview-remove" onClick={() => setHabits(p => p.filter(x => x.id !== h.id))}>✕</button>
                </div>
              ))}
            </div>
          )}

          {showForm
            ? <HabitFormInline habit={currentHabit} onChange={setCurrentHabit}
                onSave={handleAddHabit}
                onCancel={() => { setShowForm(false); setCurrentHabit({ ...DEFAULT_HABIT }) }} />
            : <button className="btn btn-secondary btn-full" onClick={() => setShowForm(true)}>+ Add a Habit</button>
          }
        </>
      ),
      canNext: habits.length > 0 && !showForm, nextLabel: 'Continue →',
    },
    {
      content: (
        <div className="notif-setup">
          <div className="notif-icon">🔔</div>
          <h1 className="setup-title">Stay on Track</h1>
          <p className="setup-subtitle">Enable notifications to get reminders at exactly the right time — even when this tab is closed.</p>
          <button className="btn btn-primary btn-lg" onClick={async () => {
            const ok = await requestNotificationPermission()
            setNotifStatus(ok ? 'granted' : 'denied')
          }}>
            Enable Notifications
          </button>
          {notifStatus && (
            <div className={`notif-status ${notifStatus}`}>
              {notifStatus === 'granted'
                ? '✅ Notifications enabled!'
                : '❌ Blocked — enable in browser settings if you change your mind.'}
            </div>
          )}
        </div>
      ),
      canNext: true, nextLabel: saving ? 'Saving…' : '🚀 Get Started!', isLast: true,
    },
  ]

  const cur = steps[step]

  return (
    <div className="setup-container">
      <div className="setup-progress">
        {steps.map((_, i) => (
          <div key={i} className={`progress-dot ${i === step ? 'active' : i < step ? 'done' : ''}`} />
        ))}
      </div>

      <div className="setup-content">{cur.content}</div>

      <div className="setup-footer">
        {step > 0 && (
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setStep(s => s - 1)}>← Back</button>
        )}
        <button className="btn btn-primary" style={{ flex: step > 0 ? 2 : 1 }}
          disabled={!cur.canNext || saving}
          onClick={cur.isLast ? handleFinish : () => setStep(s => s + 1)}>
          {cur.nextLabel}
        </button>
      </div>
    </div>
  )
}
