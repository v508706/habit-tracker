import { getHabits, getCompletions, getStreak, getCompletionRate, getDayName, getDateString } from '../../utils/storage'

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function WeekDots({ habitId, habit }) {
  const completions = getCompletions()
  const today = new Date()
  const dots = []

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dayName = getDayName(d)
    const dateStr = getDateString(d)
    const scheduled = habit.days.includes(dayName)
    const done = completions[dateStr]?.[habitId]
    const isToday = i === 0

    let cls = 'week-dot-circle'
    let label = ''

    if (!scheduled) {
      cls += ' skipped'
    } else if (done) {
      cls += ' done'
      label = '✓'
    } else if (isToday) {
      cls += ' today-pending'
    } else {
      cls += ' missed'
      label = '✕'
    }

    dots.push(
      <div key={i} className="week-dot">
        <span className="week-dot-day">{DAY_LABELS[d.getDay()]}</span>
        <div className={cls}>{label}</div>
      </div>
    )
  }

  return <div className="week-dots">{dots}</div>
}

export default function Stats() {
  const habits = getHabits()
  const completions = getCompletions()

  const totalDone = Object.values(completions).reduce((acc, day) =>
    acc + Object.values(day).filter(Boolean).length, 0)

  const avgRate = habits.length === 0 ? 0
    : Math.round(habits.reduce((a, h) => a + getCompletionRate(h.id), 0) / habits.length)

  const maxStreak = habits.length === 0 ? 0
    : Math.max(...habits.map(h => getStreak(h.id)))

  const activeDays = new Set(
    Object.entries(completions)
      .filter(([, day]) => Object.values(day).some(Boolean))
      .map(([date]) => date)
  ).size

  return (
    <div className="stats-page">
      <div className="stats-header">
        <div className="stats-header-title">Statistics</div>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-card-value">{habits.length}</div>
          <div className="summary-card-label">Active Habits</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-value">{totalDone}</div>
          <div className="summary-card-label">Total Check-ins</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-value">{avgRate}%</div>
          <div className="summary-card-label">7-Day Rate</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-value">{maxStreak}</div>
          <div className="summary-card-label">Best Streak</div>
        </div>
      </div>

      {habits.length > 0 ? (
        <div className="habit-stats-section">
          <div className="section-title" style={{ padding: '4px 0 12px' }}>Per Habit</div>
          {habits.map(h => {
            const streak = getStreak(h.id)
            const rate = getCompletionRate(h.id)
            return (
              <div key={h.id} className="habit-stat-item">
                <div className="habit-stat-header">
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: h.color + '22', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: 20
                  }}>
                    {h.emoji}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="habit-stat-name">{h.name}</div>
                  </div>
                </div>

                <div className="habit-stat-chips">
                  <div className="stat-chip">
                    <div className="stat-chip-value">{streak}</div>
                    <div className="stat-chip-label">Day Streak 🔥</div>
                  </div>
                  <div className="stat-chip">
                    <div className="stat-chip-value">{rate}%</div>
                    <div className="stat-chip-label">7-Day Rate</div>
                  </div>
                </div>

                <div className="stat-bar-container">
                  <div className="stat-bar-fill" style={{ width: `${rate}%`, background: h.color }} />
                </div>

                <WeekDots habitId={h.id} habit={h} />
              </div>
            )
          })}
        </div>
      ) : (
        <div className="empty-state">
          <span className="empty-state-emoji">📊</span>
          <div className="empty-state-title">No stats yet</div>
          <div className="empty-state-text">Add habits and start tracking to see your statistics here.</div>
        </div>
      )}
    </div>
  )
}
