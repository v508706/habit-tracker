import { useState, useEffect } from 'react'
import {
  getHabits, getCompletions, toggleCompletion,
  getTodayString, getDayName, getUserName,
} from '../../utils/storage'
import { cloudToggleCompletion } from '../../utils/db'

/* ── Progress ring ─────────────────────────────────────────────── */
function ProgressRing({ percent, size = 96, stroke = 9 }) {
  const r    = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (percent / 100) * circ

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle className="ring-track" r={r} cx={size / 2} cy={size / 2} strokeWidth={stroke} />
        <circle className="ring-fill" r={r} cx={size / 2} cy={size / 2}
          strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={offset}
          stroke={percent === 100 ? '#10b981' : '#6366f1'} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-black text-slate-800">{percent}%</span>
      </div>
    </div>
  )
}

function getMessage(pct, first) {
  if (pct === 100) return `🎉 All done, ${first}! You crushed it!`
  if (pct >= 75)   return `🔥 Almost there, ${first}! Keep going!`
  if (pct >= 50)   return `💪 Halfway there! Great momentum!`
  if (pct > 0)     return `⚡ Good start, ${first}! Keep it up!`
  return `✨ Ready to build great habits today?`
}

const fmtTime = t => {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

/* ── Dashboard ─────────────────────────────────────────────────── */
export default function Dashboard({ uid }) {
  const today     = getTodayString()
  const dayName   = getDayName()
  const firstName = getUserName().split(' ')[0] || 'Friend'

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
    const updated = toggleCompletion(habitId, today)
    setCompletions({ ...updated })
    const newVal = !!updated[today]?.[habitId]
    if (newVal) { setJustDone(habitId); setTimeout(() => setJustDone(null), 400) }
    if (uid) cloudToggleCompletion(uid, habitId, today, newVal)
  }

  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  return (
    <div className="animate-fade-in">
      {/* ── Header ── */}
      <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 px-6 pt-12 pb-8">
        <p className="text-indigo-200 text-sm font-medium mb-0.5">{dateStr}</p>
        <h1 className="text-2xl font-black text-white mb-1">Hello, {firstName}! 👋</h1>
        <p className="text-indigo-200 text-sm">
          {todayHabits.length === 0
            ? 'No habits scheduled today'
            : `${todayHabits.length} habit${todayHabits.length !== 1 ? 's' : ''} scheduled`}
        </p>

        {/* Progress card */}
        <div className="mt-5 bg-white/15 backdrop-blur rounded-2xl p-4 flex items-center gap-4">
          <ProgressRing percent={pct} />
          <div className="flex-1 min-w-0">
            <p className="text-white font-black text-2xl leading-none mb-0.5">
              {doneCount}<span className="text-indigo-200 text-lg font-semibold"> / {todayHabits.length}</span>
            </p>
            <p className="text-indigo-100 text-sm font-medium">completed today</p>
            <p className="text-white/80 text-xs mt-1.5 leading-snug">{getMessage(pct, firstName)}</p>
          </div>
        </div>
      </div>

      {/* ── Habit list ── */}
      <div className="px-4 py-5">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">Today's Schedule</p>

        {todayHabits.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center py-12 px-6 text-center">
            <span className="text-5xl mb-4">🌟</span>
            <p className="font-bold text-slate-700 mb-1">Free day!</p>
            <p className="text-slate-400 text-sm">No habits scheduled for {dayName}.<br />Enjoy your well-earned rest.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {todayHabits.map(h => {
              const done = !!(completions[today]?.[h.id])
              const popping = justDone === h.id
              return (
                <button key={h.id} onClick={() => handleToggle(h.id)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl border transition-all duration-200 text-left active:scale-98 ${
                    done
                      ? 'bg-emerald-50 border-emerald-100 shadow-sm'
                      : 'bg-white border-slate-100 shadow-sm hover:border-indigo-100 hover:shadow-md'
                  } ${popping ? 'animate-check-pop' : ''}`}>

                  {/* Emoji circle */}
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 transition-all"
                    style={{ background: done ? h.color + '33' : h.color + '18' }}>
                    {h.emoji}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm leading-snug truncate ${done ? 'text-emerald-700 line-through decoration-emerald-400' : 'text-slate-800'}`}>
                      {h.name}
                    </p>
                    <p className={`text-xs mt-0.5 ${done ? 'text-emerald-500' : 'text-slate-400'}`}>
                      🕐 {fmtTime(h.time)}
                    </p>
                  </div>

                  {/* Check circle */}
                  <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    done
                      ? 'bg-emerald-500 border-emerald-500 scale-110'
                      : 'border-slate-200 bg-white'
                  }`}>
                    {done && <span className="text-white text-xs font-bold">✓</span>}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* All done banner */}
        {pct === 100 && todayHabits.length > 0 && (
          <div className="mt-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-4 flex items-center gap-3 animate-fade-in">
            <span className="text-3xl">🏆</span>
            <div>
              <p className="text-white font-bold text-sm">Perfect day!</p>
              <p className="text-emerald-100 text-xs">You completed all your habits. Amazing!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
