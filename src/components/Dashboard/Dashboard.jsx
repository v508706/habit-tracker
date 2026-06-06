import { useState, useEffect, useCallback } from 'react'
import {
  getHabits, getCompletions, toggleCompletion,
  getTodayString, getDayName, getUserName, getStreak,
  getCompletionDetails, saveCompletionDetail, getEntryDetail, formatMins,
} from '../../utils/storage'
import { cloudToggleCompletion, cloudSaveCompletionDetail } from '../../utils/db'

/* ── Progress ring ─────────────────────────────────────────────── */
function ProgressRing({ percent, size = 96, stroke = 9 }) {
  const r    = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle className="ring-track" r={r} cx={size / 2} cy={size / 2} strokeWidth={stroke} />
        <circle className="ring-fill" r={r} cx={size / 2} cy={size / 2}
          strokeWidth={stroke} strokeDasharray={circ}
          strokeDashoffset={circ - (percent / 100) * circ}
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

/* ── Log Sheet ─────────────────────────────────────────────────── */
function LogSheet({ habit, existingDetail, onSave, onClose }) {
  const [hours,  setHours]  = useState(String(existingDetail?.timeSpent?.h || ''))
  const [mins,   setMins]   = useState(String(existingDetail?.timeSpent?.m || ''))
  const [metric, setMetric] = useState(
    existingDetail?.metricValue != null ? String(existingDetail.metricValue) : ''
  )

  const handleSave = () => {
    const h = parseInt(hours) || 0
    const m = parseInt(mins)  || 0
    const timeSpent    = (h || m) ? { h, m } : null
    const metricValue  = metric !== '' ? parseFloat(metric) : null
    onSave({ timeSpent, metricValue })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={e => e.target === e.currentTarget && onClose()}>

      <div className="w-full max-w-sm bg-white rounded-t-3xl shadow-2xl animate-slide-up pb-safe">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl"
              style={{ background: habit.color + '20' }}>{habit.emoji}</div>
            <div>
              <p className="font-black text-slate-900 text-sm">{habit.name}</p>
              <p className="text-xs text-slate-400">Log today's progress</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors text-sm">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 overflow-y-auto scrollbar-hide" style={{ maxHeight: '55vh' }}>
          {/* Time spent */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">⏱ Time Spent <span className="text-slate-300 normal-case font-normal">(optional)</span></p>
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <input type="number" min="0" max="23" placeholder="0"
                  value={hours} onChange={e => setHours(e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-xl px-3 py-3 text-center text-slate-900 text-xl font-black outline-none focus:border-indigo-500 transition-colors" />
                <p className="text-center text-xs text-slate-400 mt-1.5 font-semibold">hours</p>
              </div>
              <span className="text-slate-300 font-black text-2xl mt-3">:</span>
              <div className="flex-1">
                <input type="number" min="0" max="59" placeholder="0"
                  value={mins} onChange={e => setMins(e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-xl px-3 py-3 text-center text-slate-900 text-xl font-black outline-none focus:border-indigo-500 transition-colors" />
                <p className="text-center text-xs text-slate-400 mt-1.5 font-semibold">minutes</p>
              </div>
            </div>
          </div>

          {/* Metric — only if habit has a metric defined */}
          {habit.metric && (
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                📍 {habit.metric.name} <span className="text-slate-300 normal-case font-normal">(optional)</span>
              </p>
              <div className="flex gap-2 items-center">
                <input type="number" min="0" step="0.01" placeholder="0"
                  value={metric} onChange={e => setMetric(e.target.value)}
                  className="flex-1 border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-lg font-bold outline-none focus:border-indigo-500 transition-colors" />
                {habit.metric.unit && (
                  <span className="text-sm font-bold text-slate-500 bg-slate-100 px-4 py-3 rounded-xl flex-shrink-0">
                    {habit.metric.unit}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100 bg-white">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl text-slate-500 font-semibold hover:bg-slate-100 transition-colors text-sm">
            Skip
          </button>
          <button onClick={handleSave}
            className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-200 transition-all active:scale-95 text-sm">
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Streak Monitor ────────────────────────────────────────────── */
function StreakMonitor({ todayHabits, completions, today, onJumpToHabit }) {
  const [dismissed, setDismissed] = useState(new Set())

  const atRisk = todayHabits.filter(h =>
    !completions[today]?.[h.id] &&
    getStreak(h.id) > 0 &&
    !dismissed.has(h.id)
  )

  if (atRisk.length === 0) return null

  const urgency = (streak) =>
    streak >= 30 ? { bg: 'from-red-500 to-rose-600',    badge: 'bg-red-100 text-red-700' }
    : streak >= 7 ? { bg: 'from-orange-500 to-amber-500', badge: 'bg-orange-100 text-orange-700' }
    :               { bg: 'from-amber-400 to-yellow-500', badge: 'bg-amber-100 text-amber-700' }

  return (
    <div className="px-4 pt-4">
      <p className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
        <span className="animate-pulse">⚠️</span> Streaks at risk today
      </p>
      <div className="space-y-2">
        {atRisk.map(h => {
          const streak = getStreak(h.id)
          const { bg, badge } = urgency(streak)
          return (
            <div key={h.id}
              className={`bg-gradient-to-r ${bg} rounded-2xl p-3.5 flex items-center gap-3 shadow-md animate-fade-in`}>
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl flex-shrink-0">{h.emoji}</div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm truncate">{h.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${badge}`}>🔥 {streak} day streak</span>
                  <span className="text-white/70 text-[10px]">don't break it!</span>
                </div>
              </div>
              <div className="flex flex-col gap-1 flex-shrink-0">
                <button onClick={() => onJumpToHabit(h.id)}
                  className="px-3 py-1.5 bg-white text-slate-700 font-bold text-xs rounded-lg shadow-sm hover:bg-slate-50 transition-colors active:scale-95">
                  Do it ✓
                </button>
                <button onClick={() => setDismissed(s => new Set([...s, h.id]))}
                  className="px-3 py-1 bg-white/20 text-white/80 font-semibold text-[10px] rounded-lg hover:bg-white/30 transition-colors">
                  Dismiss
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Dashboard ─────────────────────────────────────────────────── */
export default function Dashboard({ uid }) {
  const today     = getTodayString()
  const dayName   = getDayName()
  const firstName = getUserName().split(' ')[0] || 'Friend'

  const [habits,      setHabits]      = useState(getHabits)
  const [completions, setCompletions] = useState(getCompletions)
  const [details,     setDetails]     = useState(getCompletionDetails)
  const [justDone,    setJustDone]    = useState(null)
  const [highlightId, setHighlightId] = useState(null)
  const [logHabit,    setLogHabit]    = useState(null)   // habit being logged

  useEffect(() => {
    setHabits(getHabits())
    setCompletions(getCompletions())
    setDetails(getCompletionDetails())
  }, [])

  const todayHabits = habits
    .filter(h => h.days.includes(dayName))
    .sort((a, b) => a.time.localeCompare(b.time))

  const doneCount = todayHabits.filter(h => completions[today]?.[h.id]).length
  const pct       = todayHabits.length === 0 ? 0 : Math.round((doneCount / todayHabits.length) * 100)

  const handleToggle = useCallback((habitId) => {
    const updated = toggleCompletion(habitId, today)
    setCompletions({ ...updated })
    const newVal = !!updated[today]?.[habitId]
    if (newVal) {
      setJustDone(habitId)
      setTimeout(() => setJustDone(null), 400)
      // open log sheet automatically when marking done (if habit has metric or we always want time)
      const h = habits.find(x => x.id === habitId)
      if (h) setTimeout(() => setLogHabit(h), 350) // slight delay for check-pop animation
    }
    if (uid) cloudToggleCompletion(uid, habitId, today, newVal)
  }, [today, uid, habits])

  const handleJumpToHabit = useCallback((habitId) => {
    handleToggle(habitId)
    setHighlightId(habitId)
    setTimeout(() => setHighlightId(null), 1500)
    setTimeout(() => {
      document.getElementById(`habit-card-${habitId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 80)
  }, [handleToggle])

  const handleSaveDetail = useCallback((habit, detail) => {
    const updated = saveCompletionDetail(habit.id, today, detail)
    setDetails({ ...updated })
    if (uid) cloudSaveCompletionDetail(uid, habit.id, today, detail)
  }, [today, uid])

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

      {/* ── Streak Monitor ── */}
      <StreakMonitor
        todayHabits={todayHabits}
        completions={completions}
        today={today}
        onJumpToHabit={handleJumpToHabit}
      />

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
              const done      = !!(completions[today]?.[h.id])
              const popping   = justDone === h.id
              const highlight = highlightId === h.id
              const detail    = details[today]?.[h.id] || null
              const timeFmt   = detail?.timeSpent ? formatMins((detail.timeSpent.h||0)*60 + (detail.timeSpent.m||0)) : null
              const streak    = getStreak(h.id)

              return (
                <div key={h.id} id={`habit-card-${h.id}`}>
                  {/* ── Main card row (tap = toggle) ── */}
                  <button
                    onClick={() => handleToggle(h.id)}
                    className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl border transition-all duration-200 text-left active:scale-98 ${
                      highlight
                        ? 'bg-emerald-50 border-emerald-300 shadow-md scale-[1.02]'
                        : done
                        ? 'bg-emerald-50 border-emerald-100 shadow-sm rounded-b-none border-b-0'
                        : 'bg-white border-slate-100 shadow-sm hover:border-indigo-100 hover:shadow-md'
                    } ${popping ? 'animate-check-pop' : ''}`}>

                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ background: done ? h.color + '33' : h.color + '18' }}>
                      {h.emoji}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm leading-snug truncate ${done ? 'text-emerald-700 line-through decoration-emerald-400' : 'text-slate-800'}`}>
                        {h.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <p className={`text-xs ${done ? 'text-emerald-500' : 'text-slate-400'}`}>
                          🕐 {fmtTime(h.time)}
                        </p>
                        {streak > 0 && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            done ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-50 text-orange-500'
                          }`}>🔥 {streak}</span>
                        )}
                        {/* Time logged today */}
                        {done && timeFmt && (
                          <span className="text-[10px] font-semibold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded-full">⏱ {timeFmt}</span>
                        )}
                        {/* Metric logged today */}
                        {done && detail?.metricValue != null && h.metric && (
                          <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-full">
                            📍 {detail.metricValue} {h.metric.unit}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      done ? 'bg-emerald-500 border-emerald-500 scale-110' : 'border-slate-200 bg-white'
                    }`}>
                      {done && <span className="text-white text-xs font-bold">✓</span>}
                    </div>
                  </button>

                  {/* ── Log strip (only when done) ── */}
                  {done && (
                    <button
                      onClick={() => setLogHabit(h)}
                      className="w-full flex items-center justify-between px-4 py-2 bg-emerald-50 border border-emerald-100 border-t-0 rounded-b-2xl text-left hover:bg-emerald-100 transition-colors">
                      <span className="text-[11px] font-semibold text-emerald-600">
                        {timeFmt || (detail?.metricValue != null)
                          ? `📝 Edit log${timeFmt ? ` · ⏱ ${timeFmt}` : ''}${detail?.metricValue != null && h.metric ? ` · 📍 ${detail.metricValue} ${h.metric.unit}` : ''}`
                          : '📝 Log time & progress (optional)'}
                      </span>
                      <span className="text-emerald-400 text-xs">›</span>
                    </button>
                  )}
                </div>
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

      {/* ── Log Sheet modal ── */}
      {logHabit && (
        <LogSheet
          habit={logHabit}
          existingDetail={details[today]?.[logHabit.id] || null}
          onSave={(detail) => handleSaveDetail(logHabit, detail)}
          onClose={() => setLogHabit(null)}
        />
      )}
    </div>
  )
}
