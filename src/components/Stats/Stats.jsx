import { useState } from 'react'
import {
  getHabits, getCompletions, getStreak, getLongestStreak,
  getCompletionRate, getDayName, getDateString,
} from '../../utils/storage'

// ── constants ─────────────────────────────────────────────────────
const MONTH_NAMES = ['January','February','March','April','May','June',
  'July','August','September','October','November','December']
const SHORT_M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DOW_SHORT = ['Su','Mo','Tu','We','Th','Fr','Sa']
const DOW_1 = ['S','M','T','W','T','F','S']

const todayStr  = () => getDateString(new Date())
const ds = (y, m, d) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

// ── StatCard ──────────────────────────────────────────────────────
function StatCard({ value, label, icon, gradient, sub }) {
  return (
    <div className={`bg-gradient-to-br ${gradient} rounded-2xl p-4 flex flex-col`}>
      <span className="text-xl mb-1">{icon}</span>
      <span className="text-2xl font-black text-white leading-none">{value}</span>
      {sub && <span className="text-white/60 text-[10px] mt-0.5">{sub}</span>}
      <span className="text-xs font-semibold text-white/70 mt-1.5">{label}</span>
    </div>
  )
}

// ── WeekDots ──────────────────────────────────────────────────────
function WeekDots({ habitId, habit, completions }) {
  const t = todayStr()
  return (
    <div className="flex justify-between pt-2">
      {Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i))
        const dn = getDayName(d), dstr = getDateString(d)
        const sched = habit.days.includes(dn)
        const done  = completions[dstr]?.[habitId]
        const isToday = dstr === t

        let bg = 'bg-slate-50', text = '', tc = 'text-slate-300'
        if (sched) {
          if (done)         { bg = 'bg-emerald-500'; text = '✓'; tc = 'text-white' }
          else if (isToday) { bg = 'bg-indigo-100 ring-2 ring-indigo-400 ring-offset-1'; text = '·'; tc = 'text-indigo-400' }
          else              { bg = 'bg-red-100'; text = '✕'; tc = 'text-red-300' }
        }
        return (
          <div key={i} className="flex flex-col items-center gap-1">
            <span className="text-[9px] font-bold text-slate-400">{DOW_1[d.getDay()]}</span>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${bg} ${tc}`}>{text}</div>
          </div>
        )
      })}
    </div>
  )
}

// ── MonthCalendar ─────────────────────────────────────────────────
function MonthCalendar({ year, month, habit, completions, allHabits, accentColor }) {
  const firstDay  = new Date(year, month, 1)
  const numDays   = new Date(year, month + 1, 0).getDate()
  const startDow  = firstDay.getDay()
  const today     = todayStr()
  const isSingle  = !!habit

  const cells = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: numDays }, (_, i) => i + 1),
  ]

  const getInfo = (day) => {
    const date = new Date(year, month, day)
    const dstr = getDateString(date)
    const dn   = getDayName(date)
    const future = dstr > today

    if (isSingle) {
      if (!habit.days.includes(dn)) return { type: 'off' }
      if (future)                    return { type: 'future' }
      return { type: completions[dstr]?.[habit.id] ? 'done' : 'missed' }
    }
    const scheduled = allHabits.filter(h => h.days.includes(dn))
    if (scheduled.length === 0) return { type: 'off' }
    if (future)                  return { type: 'future' }
    const done = scheduled.filter(h => completions[dstr]?.[h.id]).length
    return { type: 'ratio', ratio: done / scheduled.length, done, total: scheduled.length }
  }

  return (
    <div>
      {/* Day labels */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {DOW_SHORT.map(d => (
          <div key={d} className="text-center text-[9px] font-bold text-slate-400">{d}</div>
        ))}
      </div>
      {/* Cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, idx) => {
          if (!day) return <div key={`e${idx}`} style={{ aspectRatio: '1' }} />
          const info   = getInfo(day)
          const dstr   = ds(year, month, day)
          const isToday = dstr === today
          const ring   = isToday ? ' ring-2 ring-indigo-500 ring-offset-1' : ''

          let cls  = `rounded-md flex items-center justify-center text-[9px] font-bold${ring}`
          let label = String(day)
          let style = { aspectRatio: '1' }

          switch (info.type) {
            case 'off':
            case 'future':
              cls += ' bg-slate-50 text-slate-300'; break
            case 'done':
              cls += ' text-white'
              style = { ...style, background: accentColor || '#10b981' }
              label = '✓'; break
            case 'missed':
              cls += ' bg-red-100 text-red-400'; label = '✕'; break
            case 'ratio':
              if (info.ratio === 0)        { cls += ' bg-red-100 text-red-400' }
              else if (info.ratio >= 1)    { cls += ' bg-emerald-500 text-white'; label = '✓' }
              else if (info.ratio >= 0.5)  { cls += ' bg-emerald-200 text-emerald-700'; label = `${info.done}/${info.total}` }
              else                         { cls += ' bg-amber-100 text-amber-700'; label = `${info.done}/${info.total}` }
              break
            default:
              cls += ' bg-slate-100'
          }

          return (
            <div key={day} className={cls} style={style}>{label}</div>
          )
        })}
      </div>
    </div>
  )
}

// ── YearlyView: 12 mini calendars ────────────────────────────────
function YearlyView({ year, habit, completions, allHabits, accentColor }) {
  const today = todayStr()

  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 12 }, (_, m) => {
        const firstDay = new Date(year, m, 1)
        const numDays  = new Date(year, m + 1, 0).getDate()
        const startDow = firstDay.getDay()

        // quick completion count for month summary
        let sched = 0, done = 0
        for (let d = 1; d <= numDays; d++) {
          const date = new Date(year, m, d)
          const dstr = getDateString(date)
          const dn   = getDayName(date)
          if (dstr > today) break
          if (habit) {
            if (!habit.days.includes(dn)) continue
            sched++
            if (completions[dstr]?.[habit.id]) done++
          } else {
            const habitsDay = allHabits.filter(h => h.days.includes(dn))
            if (habitsDay.length) {
              sched += habitsDay.length
              done  += habitsDay.filter(h => completions[dstr]?.[h.id]).length
            }
          }
        }
        const pct = sched === 0 ? null : Math.round((done / sched) * 100)

        return (
          <div key={m} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3">
            {/* Month header */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-slate-700">{SHORT_M[m]}</span>
              {pct !== null && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  pct === 100 ? 'bg-emerald-100 text-emerald-700'
                  : pct >= 70 ? 'bg-amber-100 text-amber-700'
                  : 'bg-red-100 text-red-500'
                }`}>{pct}%</span>
              )}
            </div>
            {/* Mini dot grid */}
            <div className="grid grid-cols-7 gap-px">
              {/* blank padding before first day */}
              {Array(startDow).fill(null).map((_, i) => <div key={`p${i}`} className="w-full" style={{ aspectRatio: '1' }} />)}
              {Array.from({ length: numDays }, (_, i) => {
                const d    = i + 1
                const date = new Date(year, m, d)
                const dstr = getDateString(date)
                const dn   = getDayName(date)
                const future = dstr > today

                let bg = 'bg-slate-100'

                if (!future) {
                  if (habit) {
                    if (!habit.days.includes(dn))        bg = 'bg-slate-100'
                    else if (completions[dstr]?.[habit.id]) bg = 'bg-emerald-500'
                    else                                  bg = 'bg-red-200'
                  } else {
                    const habitsDay = allHabits.filter(h => h.days.includes(dn))
                    if (habitsDay.length) {
                      const doneN = habitsDay.filter(h => completions[dstr]?.[h.id]).length
                      const r     = doneN / habitsDay.length
                      bg = r === 0 ? 'bg-red-200' : r >= 1 ? 'bg-emerald-500' : r >= 0.5 ? 'bg-emerald-200' : 'bg-amber-200'
                    }
                  }
                }

                const isToday = dstr === today
                return (
                  <div key={d}
                    className={`w-full rounded-sm ${bg} ${isToday ? 'ring-1 ring-indigo-400' : ''}`}
                    style={{ aspectRatio: '1' }} />
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Legend ────────────────────────────────────────────────────────
function Legend({ isSingle }) {
  const items = isSingle
    ? [['bg-emerald-500','Done'],['bg-red-200','Missed'],['bg-slate-100','Rest day']]
    : [['bg-emerald-500','All done'],['bg-emerald-200','Partial'],['bg-amber-200','< 50%'],['bg-red-200','None'],['bg-slate-100','No habits']]
  return (
    <div className="flex flex-wrap gap-3 justify-center">
      {items.map(([cls, label]) => (
        <div key={label} className="flex items-center gap-1.5">
          <div className={`w-3 h-3 rounded-sm ${cls}`} />
          <span className="text-[10px] text-slate-500 font-medium">{label}</span>
        </div>
      ))}
    </div>
  )
}

// ── HabitDetail (individual drill-down) ───────────────────────────
function HabitDetail({ habit, completions, allHabits, onBack }) {
  const now = new Date()
  const [subTab,    setSubTab]    = useState('monthly')
  const [viewYear,  setViewYear]  = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())

  const streak    = getStreak(habit.id)
  const bestStreak = getLongestStreak(habit.id)
  const rate7     = getCompletionRate(habit.id, 7)
  const rate30    = getCompletionRate(habit.id, 30)

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth()
    if (isCurrentMonth) return
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth()

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 px-6 pt-12 pb-6">
        <button onClick={onBack}
          className="flex items-center gap-2 text-indigo-200 hover:text-white transition-colors mb-4 text-sm font-semibold">
          ← Back to Stats
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
            style={{ background: habit.color + '30' }}>
            {habit.emoji}
          </div>
          <div>
            <h2 className="text-xl font-black text-white">{habit.name}</h2>
            <p className="text-indigo-200 text-xs mt-0.5">{habit.days.join(' · ')}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-5">

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard value={streak}      label="Current Streak" icon="🔥" gradient="from-orange-500 to-rose-500" sub={streak > 0 ? 'days' : 'Start today!'} />
          <StatCard value={bestStreak}  label="Best Streak"    icon="🏆" gradient="from-amber-500 to-yellow-500" sub="all time" />
          <StatCard value={`${rate7}%`} label="Last 7 Days"   icon="📈" gradient="from-indigo-500 to-violet-600" />
          <StatCard value={`${rate30}%`} label="Last 30 Days" icon="📅" gradient="from-teal-500 to-emerald-600" />
        </div>

        {/* Sub-tabs */}
        <div className="flex bg-slate-100 rounded-xl p-1">
          {['monthly','yearly'].map(t => (
            <button key={t} onClick={() => setSubTab(t)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold capitalize transition-all ${
                subTab === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
              }`}>
              {t === 'monthly' ? '📅 Monthly' : '📆 Yearly'}
            </button>
          ))}
        </div>

        {subTab === 'monthly' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevMonth}
                className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors font-bold">
                ‹
              </button>
              <span className="font-black text-slate-800 text-sm">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </span>
              <button onClick={nextMonth} disabled={isCurrentMonth}
                className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors font-bold disabled:opacity-30">
                ›
              </button>
            </div>
            <MonthCalendar
              year={viewYear} month={viewMonth}
              habit={habit} completions={completions}
              allHabits={allHabits} accentColor={habit.color}
            />
          </div>
        )}

        {subTab === 'yearly' && (
          <>
            {/* Year nav */}
            <div className="flex items-center justify-between">
              <button onClick={() => setViewYear(y => y - 1)}
                className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 font-bold">
                ‹
              </button>
              <span className="font-black text-slate-800">{viewYear}</span>
              <button onClick={() => setViewYear(y => y + 1)} disabled={viewYear >= now.getFullYear()}
                className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 font-bold disabled:opacity-30">
                ›
              </button>
            </div>
            <YearlyView
              year={viewYear} habit={habit}
              completions={completions} allHabits={allHabits}
              accentColor={habit.color}
            />
            <Legend isSingle />
          </>
        )}

        {/* Week dots */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Last 7 Days</p>
          <WeekDots habitId={habit.id} habit={habit} completions={completions} />
        </div>

      </div>
    </div>
  )
}

// ── Main Stats ────────────────────────────────────────────────────
export default function Stats() {
  const habits      = getHabits()
  const completions = getCompletions()
  const now         = new Date()

  const [tab,          setTab]          = useState('overview')      // 'overview' | 'monthly' | 'yearly'
  const [selectedHabit, setSelectedHabit] = useState(null)
  const [viewMonth,    setViewMonth]    = useState(now.getMonth())
  const [viewYear,     setViewYear]     = useState(now.getFullYear())
  const [yearlyYear,   setYearlyYear]   = useState(now.getFullYear())

  const totalDone  = Object.values(completions).reduce(
    (acc, day) => acc + Object.values(day).filter(Boolean).length, 0
  )
  const avgRate    = habits.length === 0 ? 0
    : Math.round(habits.reduce((a, h) => a + getCompletionRate(h.id), 0) / habits.length)
  const maxStreak  = habits.length === 0 ? 0
    : Math.max(...habits.map(h => getStreak(h.id)))
  const activeDays = new Set(
    Object.entries(completions)
      .filter(([, day]) => Object.values(day).some(Boolean))
      .map(([date]) => date)
  ).size

  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth()
  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) } else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (isCurrentMonth) return
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) } else setViewMonth(m => m + 1)
  }

  // ── Individual habit detail ──────────────────────────────────────
  if (selectedHabit) {
    const h = habits.find(h => h.id === selectedHabit)
    if (h) return (
      <HabitDetail
        habit={h} completions={completions} allHabits={habits}
        onBack={() => setSelectedHabit(null)}
      />
    )
  }

  const TABS = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'monthly',  label: '📅 Monthly'  },
    { id: 'yearly',   label: '📆 Yearly'   },
  ]

  return (
    <div className="animate-fade-in">
      {/* ── Header ── */}
      <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 px-6 pt-12 pb-4">
        <h1 className="text-2xl font-black text-white mb-4">Statistics</h1>

        {/* Tab bar */}
        <div className="flex bg-white/20 rounded-xl p-1 gap-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                tab === t.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-white/70 hover:text-white'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ══ OVERVIEW ════════════════════════════════════════════════ */}
      {tab === 'overview' && (
        <div className="px-4 py-5 space-y-5">

          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard value={habits.length} label="Active Habits"   icon="✨" gradient="from-indigo-500 to-violet-600" />
            <StatCard value={totalDone}     label="Total Check-ins" icon="✅" gradient="from-emerald-500 to-teal-600" />
            <StatCard value={`${avgRate}%`} label="Avg 7-Day Rate"  icon="📈" gradient="from-amber-500 to-orange-500" />
            <StatCard value={maxStreak}     label="Best Streak Now"  icon="🔥" gradient="from-rose-500 to-pink-600" sub="days" />
          </div>

          {activeDays > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center text-2xl flex-shrink-0">📅</div>
              <div>
                <p className="text-2xl font-black text-slate-800 leading-none">{activeDays}</p>
                <p className="text-sm text-slate-400 mt-0.5">active day{activeDays !== 1 ? 's' : ''} with at least one check-in</p>
              </div>
            </div>
          )}

          {/* Per-habit (tappable) */}
          {habits.length > 0 ? (
            <>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">
                Habits — tap for full detail
              </p>
              <div className="space-y-3">
                {habits.map(h => {
                  const streak = getStreak(h.id)
                  const best   = getLongestStreak(h.id)
                  const rate   = getCompletionRate(h.id)
                  return (
                    <button key={h.id} onClick={() => setSelectedHabit(h.id)}
                      className="w-full bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-4 text-left hover:shadow-md hover:border-indigo-100 transition-all active:scale-98">
                      {/* Row 1: emoji + name + chevron */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                          style={{ background: h.color + '20' }}>{h.emoji}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 text-sm truncate">{h.name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{h.days.join(' · ')}</p>
                        </div>
                        <span className="text-slate-300 text-lg">›</span>
                      </div>

                      {/* Row 2: chips */}
                      <div className="flex gap-2 mb-3">
                        <div className="flex-1 bg-orange-50 rounded-xl px-2 py-2 text-center">
                          <p className="text-base font-black text-orange-600 leading-none">{streak}</p>
                          <p className="text-[9px] text-orange-400 mt-0.5 font-semibold">Streak 🔥</p>
                        </div>
                        <div className="flex-1 bg-amber-50 rounded-xl px-2 py-2 text-center">
                          <p className="text-base font-black text-amber-600 leading-none">{best}</p>
                          <p className="text-[9px] text-amber-400 mt-0.5 font-semibold">Best 🏆</p>
                        </div>
                        <div className="flex-1 bg-indigo-50 rounded-xl px-2 py-2 text-center">
                          <p className="text-base font-black text-indigo-600 leading-none">{rate}%</p>
                          <p className="text-[9px] text-indigo-400 mt-0.5 font-semibold">7-Day</p>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${rate}%`, background: h.color }} />
                      </div>

                      {/* Week dots */}
                      <WeekDots habitId={h.id} habit={h} completions={completions} />
                    </button>
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
      )}

      {/* ══ MONTHLY ════════════════════════════════════════════════ */}
      {tab === 'monthly' && (
        <div className="px-4 py-5 space-y-4">
          {/* Month nav */}
          <div className="flex items-center justify-between">
            <button onClick={prevMonth}
              className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-50 font-bold text-lg">
              ‹
            </button>
            <span className="font-black text-slate-800">{MONTH_NAMES[viewMonth]} {viewYear}</span>
            <button onClick={nextMonth} disabled={isCurrentMonth}
              className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-50 font-bold text-lg disabled:opacity-30">
              ›
            </button>
          </div>

          {/* All-habits calendar */}
          {habits.length > 0 ? (
            <>
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">All Habits Combined</p>
                <MonthCalendar
                  year={viewYear} month={viewMonth}
                  habit={null} completions={completions} allHabits={habits}
                />
              </div>

              <Legend isSingle={false} />

              {/* Per-habit mini summary for this month */}
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1 pt-1">Per Habit This Month</p>
              <div className="space-y-3">
                {habits.map(h => {
                  // count scheduled & done in this month
                  const numDays = new Date(viewYear, viewMonth + 1, 0).getDate()
                  const today   = todayStr()
                  let sched = 0, done = 0
                  for (let d = 1; d <= numDays; d++) {
                    const date = new Date(viewYear, viewMonth, d)
                    const dstr = getDateString(date)
                    const dn   = getDayName(date)
                    if (dstr > today) break
                    if (!h.days.includes(dn)) continue
                    sched++
                    if (completions[dstr]?.[h.id]) done++
                  }
                  const pct = sched === 0 ? null : Math.round((done / sched) * 100)

                  return (
                    <button key={h.id} onClick={() => setSelectedHabit(h.id)}
                      className="w-full bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3 text-left hover:shadow-md transition-all flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                        style={{ background: h.color + '20' }}>{h.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 text-sm truncate">{h.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{done} of {sched} scheduled days done</p>
                        <div className="h-1 bg-slate-100 rounded-full overflow-hidden mt-1.5">
                          <div className="h-full rounded-full" style={{ width: `${pct || 0}%`, background: h.color }} />
                        </div>
                      </div>
                      <div className={`text-sm font-black px-2 py-1 rounded-lg flex-shrink-0 ${
                        pct === null ? 'text-slate-300'
                        : pct === 100 ? 'text-emerald-700 bg-emerald-50'
                        : pct >= 70 ? 'text-amber-700 bg-amber-50'
                        : 'text-red-500 bg-red-50'
                      }`}>
                        {pct === null ? '—' : `${pct}%`}
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center py-14 px-6 text-center">
              <span className="text-5xl mb-4">📅</span>
              <p className="font-bold text-slate-800 mb-1">No habits yet</p>
              <p className="text-slate-400 text-sm">Add habits to see your monthly calendar.</p>
            </div>
          )}
        </div>
      )}

      {/* ══ YEARLY ════════════════════════════════════════════════ */}
      {tab === 'yearly' && (
        <div className="px-4 py-5 space-y-4">
          {/* Year nav */}
          <div className="flex items-center justify-between">
            <button onClick={() => setYearlyYear(y => y - 1)}
              className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-50 font-bold text-lg">
              ‹
            </button>
            <span className="font-black text-slate-800">{yearlyYear}</span>
            <button onClick={() => setYearlyYear(y => y + 1)} disabled={yearlyYear >= now.getFullYear()}
              className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-50 font-bold text-lg disabled:opacity-30">
              ›
            </button>
          </div>

          {/* Year summary cards */}
          {habits.length > 0 && (() => {
            const today = todayStr()
            let totalSched = 0, totalDoneY = 0
            let bestStreakY = Math.max(...habits.map(h => getStreak(h.id)))
            habits.forEach(h => {
              for (let i = 0; i < 366; i++) {
                const d = new Date(yearlyYear, 0, 1 + i)
                if (d.getFullYear() !== yearlyYear) break
                const dstr = getDateString(d)
                if (dstr > today) break
                const dn = getDayName(d)
                if (!h.days.includes(dn)) continue
                totalSched++
                if (completions[dstr]?.[h.id]) totalDoneY++
              }
            })
            const yearRate = totalSched === 0 ? 0 : Math.round((totalDoneY / totalSched) * 100)
            return (
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-emerald-50 rounded-2xl p-3 text-center">
                  <p className="text-lg font-black text-emerald-600">{totalDoneY}</p>
                  <p className="text-[10px] text-emerald-500 font-semibold mt-0.5">Check-ins</p>
                </div>
                <div className="bg-indigo-50 rounded-2xl p-3 text-center">
                  <p className="text-lg font-black text-indigo-600">{yearRate}%</p>
                  <p className="text-[10px] text-indigo-500 font-semibold mt-0.5">Rate</p>
                </div>
                <div className="bg-orange-50 rounded-2xl p-3 text-center">
                  <p className="text-lg font-black text-orange-600">{bestStreakY}</p>
                  <p className="text-[10px] text-orange-500 font-semibold mt-0.5">Best Streak</p>
                </div>
              </div>
            )
          })()}

          {habits.length > 0 ? (
            <>
              <YearlyView
                year={yearlyYear} habit={null}
                completions={completions} allHabits={habits}
              />
              <Legend isSingle={false} />
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center py-14 px-6 text-center">
              <span className="text-5xl mb-4">📆</span>
              <p className="font-bold text-slate-800 mb-1">No habits yet</p>
              <p className="text-slate-400 text-sm">Add habits to see your yearly heatmap.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
