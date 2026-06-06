import { useState } from 'react'

const EMOJIS = [
  // Fitness & Movement
  '🏃','🏃‍♂️','🚶','🧘','🏋️','🏊','🚴','💪',
  // Chess
  '♟️','♜','🏰',
  // Music & Keyboard
  '🎵','🎸','🎹','⌨️','🎤',
  // Study & Books
  '📚','📖','📗','📕','✏️','📝','🧠','🔢','📰',
  // Language & Tuition
  '🗣️','🎓','🏫','🇮🇳',
  // Health & Wellness
  '💊','💧','🛌','🦷','🍎','🥗','☕',
  // Arts & Creativity
  '🎨','🖍️','✍️','📷',
  // Tech & Learning
  '🤖','🧮','🧩','🌱',
  // Spirituality & Other
  '🛕','🌠','🎯','🐾','🧹','🎃',
]

const COLORS = [
  '#ef4444','#f97316','#eab308','#22c55e','#14b8a6',
  '#3b82f6','#6366f1','#a855f7','#ec4899','#64748b',
]

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

// Preset metric suggestions per emoji (just UX hints, fully editable)
const METRIC_HINTS = {
  '🏃': { name: 'Distance run', unit: 'km' },
  '🏃‍♂️': { name: 'Distance run', unit: 'km' },
  '🚶': { name: 'Distance walked', unit: 'km' },
  '🏊': { name: 'Laps swum', unit: 'laps' },
  '🚴': { name: 'Distance cycled', unit: 'km' },
  '🏋️': { name: 'Weight lifted', unit: 'kg' },
  '💪': { name: 'Calories burnt', unit: 'cal' },
  '📚': { name: 'Pages read', unit: 'pages' },
  '📖': { name: 'Pages read', unit: 'pages' },
  '📗': { name: 'Pages studied', unit: 'pages' },
  '📕': { name: 'Pages read', unit: 'pages' },
  '🧘': { name: 'Calories burnt', unit: 'cal' },
  '♟️': { name: 'Puzzles solved', unit: 'puzzles' },
  '🎹': { name: 'Practice time', unit: 'min' },
  '⌨️': { name: 'Words typed', unit: 'words' },
  '🎨': { name: 'Sketches done', unit: 'sketches' },
  '🖍️': { name: 'Drawings done', unit: 'drawings' },
  '✍️': { name: 'Lines written', unit: 'lines' },
  '🧮': { name: 'Problems solved', unit: 'problems' },
  '🔢': { name: 'Tables practised', unit: 'tables' },
}

const DEFAULT = {
  emoji: '🏃', name: '',
  days: ['Mon','Tue','Wed','Thu','Fri'],
  time: '08:00', color: '#6366f1',
  metric: null,
}

export default function HabitForm({ initialData, onSave, onClose }) {
  const [form, setForm] = useState(initialData ? { ...initialData } : { ...DEFAULT })
  const [metricEnabled, setMetricEnabled] = useState(!!(initialData?.metric))
  const [metricName, setMetricName] = useState(initialData?.metric?.name || '')
  const [metricUnit, setMetricUnit] = useState(initialData?.metric?.unit || '')

  const toggleDay = d => setForm(f => ({
    ...f,
    days: f.days.includes(d) ? f.days.filter(x => x !== d) : [...f.days, d],
  }))

  const handleEmojiChange = (e) => {
    setForm(f => ({ ...f, emoji: e }))
    // auto-fill metric hint if not yet customised
    if (!metricEnabled && METRIC_HINTS[e]) {
      setMetricName(METRIC_HINTS[e].name)
      setMetricUnit(METRIC_HINTS[e].unit)
    }
  }

  const handleSave = () => {
    if (!form.name.trim() || form.days.length === 0) return
    const metric = metricEnabled && metricName.trim()
      ? { name: metricName.trim(), unit: metricUnit.trim() || '' }
      : null
    onSave({ ...form, name: form.name.trim(), metric })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={e => e.target === e.currentTarget && onClose()}>

      <div className="w-full max-w-sm bg-white rounded-t-3xl shadow-2xl animate-slide-up overflow-hidden">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        {/* Title row */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100">
          <h2 className="font-black text-slate-900 text-lg">{initialData ? 'Edit Habit' : 'New Habit'}</h2>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors text-sm">
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto scrollbar-hide px-6 py-5 space-y-5" style={{ maxHeight: '70vh' }}>

          {/* Emoji */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Icon</p>
            <div className="grid grid-cols-6 gap-1.5 bg-slate-50 rounded-2xl p-3">
              {EMOJIS.map(e => (
                <button key={e} onClick={() => handleEmojiChange(e)}
                  className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                    form.emoji === e ? 'bg-white shadow ring-2 ring-indigo-400 scale-110' : 'hover:bg-white hover:scale-105'
                  }`}>
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Habit Name</p>
            <input
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-base outline-none focus:border-indigo-500 transition-colors"
              placeholder="e.g. Morning Run"
              value={form.name} maxLength={40} autoFocus
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>

          {/* Color */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Color</p>
            <div className="flex gap-2.5 flex-wrap">
              {COLORS.map(c => (
                <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                  className={`w-9 h-9 rounded-full transition-all ${
                    form.color === c ? 'scale-125 ring-2 ring-offset-2 ring-slate-400' : 'hover:scale-110'
                  }`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>

          {/* Days */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Repeat</p>
            <div className="flex gap-2">
              {DAYS.map(d => (
                <button key={d} onClick={() => toggleDay(d)}
                  className={`w-10 h-10 rounded-full text-xs font-bold transition-all flex-1 ${
                    form.days.includes(d)
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}>
                  {d[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Time */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Reminder Time</p>
            <input type="time" value={form.time}
              onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-base outline-none focus:border-indigo-500 transition-colors" />
          </div>

          {/* ── Track Progress (optional) ─────────────────────────────── */}
          <div className="bg-slate-50 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-700">Track Progress</p>
                <p className="text-xs text-slate-400 mt-0.5">Log a measurement each time you complete this habit</p>
              </div>
              {/* Toggle */}
              <button
                onClick={() => {
                  const next = !metricEnabled
                  setMetricEnabled(next)
                  if (next && !metricName && METRIC_HINTS[form.emoji]) {
                    setMetricName(METRIC_HINTS[form.emoji].name)
                    setMetricUnit(METRIC_HINTS[form.emoji].unit)
                  }
                }}
                className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                  metricEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                }`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                  metricEnabled ? 'left-6' : 'left-0.5'
                }`} />
              </button>
            </div>

            {metricEnabled && (
              <div className="mt-4 space-y-3 animate-fade-in">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">What do you measure?</p>
                  <input
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm outline-none focus:border-indigo-500 transition-colors"
                    placeholder="e.g. KMs run, Pages read, Calories burnt"
                    value={metricName} maxLength={40}
                    onChange={e => setMetricName(e.target.value)}
                  />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Unit</p>
                  <input
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm outline-none focus:border-indigo-500 transition-colors"
                    placeholder="e.g. km, pages, cal, laps"
                    value={metricUnit} maxLength={20}
                    onChange={e => setMetricUnit(e.target.value)}
                  />
                </div>
                <p className="text-[11px] text-indigo-500 font-medium">
                  📍 You'll be prompted to log "{metricName || 'your metric'}" each time you complete this habit.
                </p>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100 bg-white">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl text-slate-500 font-semibold hover:bg-slate-100 transition-colors text-sm">
            Cancel
          </button>
          <button onClick={handleSave}
            disabled={!form.name.trim() || form.days.length === 0}
            className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-200 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-sm">
            {initialData ? 'Save Changes' : 'Add Habit'}
          </button>
        </div>
      </div>
    </div>
  )
}
