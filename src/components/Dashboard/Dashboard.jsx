import { useState, useEffect } from 'react'
import {
  getHabits, getCompletions, toggleCompletion,
  getTodayString, getDayName, getUserName,
} from '../../utils/storage'
import { cloudToggleCompletion } from '../../utils/db'

function ProgressRing({ percent, size = 80, stroke = 8 }) {
  const r    = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  return (
    <div className="progress-ring-wrap" style={{ width: size, height: size }}>
      <svg className="progress-ring-svg" width={size} height={size}>
        <circle className="progress-ring-bg"   r={r} cx={size/2} cy={size/2} strokeWidth={stroke} />
        <circle className="progress-ring-fill" r={r} cx={size/2} cy={size/2}
          strokeWidth={stroke} strokeDasharray={circ}
          strokeDashoffset={circ - (percent / 100) * circ} />
      </svg>
      <div className="progress-ring-text">{percent}%</div>
    </div>
  )
}

function getMessage(pct, first) {
  if (pct === 100) return `🎉 All done, ${first}! You crushed it today!`
  if (pct >= 75)   return `🔥 Almost there, ${first}! Keep going!`
  if (pct >= 50)   return `💪 Halfway there, ${first}! Great momentum!`
  if (pct > 0)     return `⚡ Good start, ${first}! Keep the streak alive!`
  return `✨ Ready to build great habits today, ${first}?`
}

function fmtTime(t) {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

export default function Dashboard({ uid }) {
  const today     = getTodayString()
  const dayName   = getDayName()
  const firstName = getUserName().split(' ')[0]

  const [habits,      setHabits]      = useState(getHabits)
  const [completions, setCompletions] = useState(getCompletions)
  const [justDone,    setJustDone]    = useState(null)

  useEffect(() => {
    setHabits(getHabits())
    setCompletions(getCompletions())
  }, [])

  const todayHabits = habits
    .filter(h => h.days.includes(dayName))
    .sort((a, b) => a.time.localeCompare(b.time))

  const doneCount = todayHabits.filter(h => completions[today]?.[h.id]).length
  const pct       = todayHabits.length === 0 ? 0 : Math.round((doneCount / todayHabits.length) * 100)

  const handleToggle = (habitId) => {
    // Instant local update
    const updated = toggleCompletion(habitId, today)
    setCompletions({ ...updated })

    const newVal = !!updated[today]?.[habitId]
    if (newVal) { setJustDone(habitId); setTimeout(() => setJustDone(null), 400) }

    // Background cloud sync
    if (uid) cloudToggleCompletion(uid, habitId, today, newVal)
  }

  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  return (
    <div className="dashboard">
      <div className="page-header">
        <div className="header-greeting">Hello, {firstName}!</div>
        <div className="header-title">{dateStr}</div>
        <div className="header-subtitle">{dayName} · {todayHabits.length} habit{todayHabits.length !== 1 ? 's' : ''} scheduled</div>
      </div>

      <div className="progress-section">
        <div className="progress-ring-container">
          <ProgressRing percent={pct} />
          <div className="progress-info">
            <div className="progress-count">{doneCount} <span>/ {todayHabits.length}</span></div>
            <div className="progress-label">habits completed</div>
          </div>
        </div>
        <div className="progress-message">{getMessage(pct, firstName)}</div>
      </div>

      <div className="habits-section">
        <div className="section-title">Today's Schedule</div>

        {todayHabits.length === 0 ? (
          <div className="no-habits-today">
            <span className="big-emoji">🌟</span>
            <p>No habits scheduled for {dayName}.<br />Enjoy your free day!</p>
          </div>
        ) : (
          todayHabits.map(h => {
            const done = !!(completions[today]?.[h.id])
            return (
              <div key={h.id}
                className={`habit-item ${done ? 'completed' : ''} ${justDone === h.id ? 'just-completed' : ''}`}
                onClick={() => handleToggle(h.id)}>
                <div className="habit-emoji-circle" style={{ background: h.color + '22' }}>{h.emoji}</div>
                <div className="habit-info">
                  <div className="habit-name">{h.name}</div>
                  <div className="habit-time">🕐 {fmtTime(h.time)}</div>
                </div>
                <div className="habit-check">✓</div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
