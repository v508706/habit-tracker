import {
  getHabits, getCompletions, getStreak,
  getCompletionRate, getDayName, getDateString,
} from '../../utils/storage'

const DAY_LABELS = ['S','M','T','W','T','F','S']

/* ── Week dots ─────────────────────────────────────────────────── */
function WeekDots({ habitId, habit }) {
  const completions = getCompletions()
  const today = new Date()
  const dots = []

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dayName   = getDayName(d)
    const dateStr   = getDateString(d)
    const scheduled = habit.days.includes(dayName)
    const done      = completions[dateStr]?.[habitId]
    const isToday   = i === 0

    let bg = 'bg-slate-100'
    let text = ''
    let textColor = 'text-slate-300'

    if (!scheduled) {
      bg = 'bg-slate-50'
    } else if (done) {
      bg = 'bg-emerald-500'
      text = '✓'
      textColor = 'text-white'
    } else if (isToday) {
      bg = 'bg-indigo-100 ring-2 ring-indigo-400 ring-offset-1'
      text = '·'
      textColor = 'text-indigo-400'
    } else {
      bg = 'bg-red-50'
      text = '✕'
      textColor = 'text-red-300'
    }

    dots.push(
      <div key={i} className="flex flex-col items-center gap-1">
        <span className="text-[9px] font-bold text-slate-400">{DAY_LABELS[d.getDay()]}</span>
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${bg} ${textColor}`}>
          {text}
        </div>
      </div>
    )
  }

  return <div className="flex justify-between pt-2">{dots}</div>
}

/* ── Stat card ─────────────────────────────────────────────────── */
function StatCard({ value, label, icon, gradient }) {
  return (
    <div className={`bg-gradient-to-br ${gradient} rounded-2xl p-4 flex flex-col`}>
      <span className="text-2xl mb-1">{icon}</span>
      <span className="text-2xl font-black text-white leading-none">{value}</span>
      <span className="text-xs font-semibold text-white/70 mt-1">{label}</span>
    </div>
  )
}

/* ── Stats page ────────────────────────────────────────────────── */
export default function Stats() {
  const habits      = getHabits()
  const completions = getCompletions()

  const totalDone = Object.values(completions).reduce(
    (acc, day) => acc + Object.values(day).filter(Boolean).length, 0
  )

  const avgRate = habits.length === 0
    ? 0
    : Math.round(habits.reduce((a, h) => a + getCompletionRate(h.id), 0) / habits.length)

  const maxStreak = habits.length === 0
    ? 0
    : Math.max(...habits.map(h => getStreak(h.id)))

  const activeDays = new Set(
    Object.entries(completions)
      .filter(([, day]) => Object.values(day).some(Boolean))
      .map(([date]) => date)
  ).size

  return (
    <div className="animate-fade-in">
      {/* ── Header ── */}
      <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 px-6 pt-12 pb-6">
        <h1 className="text-2xl font-black text-white mb-0.5">Statistics</h1>
        <p className="text-indigo-200 text-sm">Your progress at a glance</p>
      </div>

      <div className="px-4 py-5 space-y-5">

        {/* ── Summary grid ── */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard value={habits.length} label="Active Habits"  icon="✨" gradient="from-indigo-500 to-violet-600" />
          <StatCard value={totalDone}     label="Total Check-ins" icon="✅" gradient="from-emerald-500 to-teal-600" />
          <StatCard value={`${avgRate}%`} label="7-Day Rate"     icon="📈" gradient="from-amber-500 to-orange-500" />
          <StatCard value={maxStreak}     label="Best Streak"    icon="🔥" gradient="from-rose-500 to-pink-600" />
        </div>

        {/* ── Active days ── */}
        {activeDays > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center text-2xl flex-shrink-0">📅</div>
            <div>
              <p className="text-2xl font-black text-slate-800 leading-none">{activeDays}</p>
              <p className="text-sm text-slate-400 mt-0.5">active day{activeDays !== 1 ? 's' : ''} with at least one check-in</p>
            </div>
          </div>
        )}

        {/* ── Per-habit ── */}
        {habits.length > 0 ? (
          <>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Per Habit</p>

            <div className="space-y-3">
              {habits.map(h => {
                const streak = getStreak(h.id)
                const rate   = getCompletionRate(h.id)
                return (
                  <div key={h.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-4">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                        style={{ background: h.color + '20' }}>
                        {h.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 text-sm truncate">{h.name}</p>
                      </div>
                    </div>

                    {/* Chips */}
                    <div className="flex gap-2.5 mb-3">
                      <div className="flex-1 bg-slate-50 rounded-xl px-3 py-2.5 text-center">
                        <p className="text-lg font-black text-slate-800 leading-none">{streak}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">Streak 🔥</p>
                      </div>
                      <div className="flex-1 bg-slate-50 rounded-xl px-3 py-2.5 text-center">
                        <p className="text-lg font-black text-slate-800 leading-none">{rate}%</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">7-Day Rate</p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${rate}%`, background: h.color }} />
                    </div>

                    {/* Week dots */}
                    <WeekDots habitId={h.id} habit={h} />
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center py-14 px-6 text-center">
            <span className="text-5xl mb-4">📊</span>
            <p className="font-bold text-slate-800 mb-1">No stats yet</p>
            <p className="text-slate-400 text-sm leading-relaxed">Add habits and start tracking to see your progress here.</p>
          </div>
        )}
      </div>
    </div>
  )
}
