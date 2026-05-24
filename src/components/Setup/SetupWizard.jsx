import { useState } from 'react'
import { saveHabits, saveUserName, markSetupDone, saveTimezone } from '../../utils/storage'
import { requestNotificationPermission } from '../../utils/notifications'
import { cloudSaveProfile, cloudSaveHabits } from '../../utils/db'

const EMOJIS = ['🏃','🎵','♟️','📚','💪','🧘','💊','💧','🛌','✏️','🍎','🎯',
  '🎨','🏊','🚴','🎸','🌱','📝','🧩','🏋️','🥗','☕','🧠','🎤','🦷','🚶','🐾','📷']

const COLORS = [
  '#ef4444','#f97316','#eab308','#22c55e','#14b8a6',
  '#3b82f6','#6366f1','#a855f7','#ec4899','#64748b',
]
const DAYS   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const DEF    = { emoji:'🏃', name:'', days:['Mon','Tue','Wed','Thu','Fri'], time:'08:00', color:'#6366f1' }
const uid    = () => Date.now().toString(36) + Math.random().toString(36).slice(2)
const fmtT   = t => { const [h,m]=t.split(':').map(Number); return `${h%12||12}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}` }
const fmtD   = d => d.length===7?'Every day':d.length===5&&!d.includes('Sat')&&!d.includes('Sun')?'Weekdays':d.join(', ')

/* ── Inline habit form ─────────────────────────────────────────── */
function HabitFormInline({ habit, onChange, onSave, onCancel }) {
  const tog = d => onChange({ ...habit, days: habit.days.includes(d) ? habit.days.filter(x=>x!==d) : [...habit.days,d] })
  return (
    <div className="bg-white rounded-2xl border-2 border-indigo-100 p-5 shadow-sm animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <span className="font-bold text-slate-800">New Habit</span>
        {onCancel && <button onClick={onCancel} className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 text-sm transition-colors">✕</button>}
      </div>

      {/* Emoji */}
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Icon</p>
      <div className="grid grid-cols-7 gap-1.5 bg-slate-50 rounded-xl p-2.5 mb-4">
        {EMOJIS.map(e => (
          <button key={e} onClick={() => onChange({...habit,emoji:e})}
            className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${habit.emoji===e?'bg-white shadow-sm ring-2 ring-indigo-400 scale-110':'hover:bg-white hover:scale-105'}`}>
            {e}
          </button>
        ))}
      </div>

      {/* Name */}
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Name</p>
      <input className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-base outline-none focus:border-indigo-500 transition-colors mb-4"
        placeholder="e.g. Morning Run" value={habit.name} maxLength={40}
        onChange={e => onChange({...habit,name:e.target.value})} />

      {/* Color */}
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Color</p>
      <div className="flex gap-2.5 mb-4">
        {COLORS.map(c => (
          <button key={c} onClick={() => onChange({...habit,color:c})}
            className={`w-8 h-8 rounded-full transition-all ${habit.color===c?'scale-125 ring-2 ring-offset-2 ring-slate-400':'hover:scale-110'}`}
            style={{background:c}} />
        ))}
      </div>

      {/* Days */}
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Repeat</p>
      <div className="flex gap-2 mb-4">
        {DAYS.map(d => (
          <button key={d} onClick={() => tog(d)}
            className={`w-9 h-9 rounded-full text-xs font-bold transition-all ${habit.days.includes(d)?'bg-indigo-600 text-white shadow-md shadow-indigo-200':'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
            {d[0]}
          </button>
        ))}
      </div>

      {/* Time */}
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Reminder Time</p>
      <input type="time" value={habit.time} onChange={e => onChange({...habit,time:e.target.value})}
        className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-base outline-none focus:border-indigo-500 transition-colors mb-5" />

      <button onClick={onSave} disabled={!habit.name.trim()||habit.days.length===0}
        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-indigo-200">
        Add Habit
      </button>
    </div>
  )
}

/* ── Main wizard ───────────────────────────────────────────────── */
export default function SetupWizard({ uid: userUid, onComplete }) {
  const [step,  setStep]  = useState(0)
  const [name,  setName]  = useState('')
  const [habits, setHabits] = useState([])
  const [showForm,  setShowForm]  = useState(false)
  const [curHabit,  setCurHabit]  = useState({...DEF})
  const [notifStatus, setNotifStatus] = useState(null)
  const [saving, setSaving] = useState(false)

  const addHabit = () => {
    if (!curHabit.name.trim()||curHabit.days.length===0) return
    setHabits(p => [...p,{...curHabit,id:uid()}])
    setCurHabit({...DEF}); setShowForm(false)
  }

  const finish = async () => {
    setSaving(true)
    const n  = name.trim()||'Friend'
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    saveUserName(n); saveTimezone(tz); saveHabits(habits); markSetupDone()
    cloudSaveProfile(userUid,{name:n,setupDone:true,timezone:tz})
    cloudSaveHabits(userUid,habits)
    onComplete()
  }

  const steps = [
    /* Step 0 – Name */
    {
      content: (
        <div className="animate-fade-in">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-4xl shadow-lg shadow-indigo-200 mx-auto mb-6">👋</div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Welcome!</h1>
          <p className="text-slate-500 text-sm leading-relaxed mb-7">Build better habits, one day at a time. Let's start by setting up your profile.</p>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Your Name</label>
          <input className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-base outline-none focus:border-indigo-500 transition-colors"
            placeholder="What should we call you?" value={name} autoFocus
            onChange={e => setName(e.target.value)} />
        </div>
      ),
      canNext: true, label: 'Continue →',
    },
    /* Step 1 – Habits */
    {
      content: (
        <div className="animate-fade-in">
          <h1 className="text-2xl font-black text-slate-900 mb-1">Your Habits</h1>
          <p className="text-slate-500 text-sm mb-5">Add the routines you want to track. You can always edit later.</p>

          {habits.length > 0 && (
            <div className="space-y-2 mb-4">
              {habits.map(h => (
                <div key={h.id} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm border border-slate-100">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{background:h.color+'22'}}>{h.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{h.name}</p>
                    <p className="text-xs text-slate-400">{fmtD(h.days)} · {fmtT(h.time)}</p>
                  </div>
                  <button onClick={() => setHabits(p=>p.filter(x=>x.id!==h.id))}
                    className="w-7 h-7 rounded-full bg-red-50 text-red-400 hover:bg-red-100 flex items-center justify-center text-sm transition-colors flex-shrink-0">✕</button>
                </div>
              ))}
            </div>
          )}

          {showForm
            ? <HabitFormInline habit={curHabit} onChange={setCurHabit} onSave={addHabit}
                onCancel={() => { setShowForm(false); setCurHabit({...DEF}) }} />
            : <button onClick={() => setShowForm(true)}
                className="w-full py-3 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 font-semibold hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all text-sm">
                + Add a Habit
              </button>
          }
        </div>
      ),
      canNext: habits.length > 0 && !showForm, label: 'Continue →',
    },
    /* Step 2 – Notifications */
    {
      content: (
        <div className="text-center animate-fade-in">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-5xl shadow-lg shadow-orange-200 mx-auto mb-6">🔔</div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Stay on Track</h1>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">Get notified at exactly the right time — even when this tab is closed.</p>
          <button onClick={async () => { const ok = await requestNotificationPermission(); setNotifStatus(ok?'granted':'denied') }}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold px-8 py-3.5 rounded-xl shadow-lg shadow-orange-200 transition-all active:scale-95">
            🔔 Enable Notifications
          </button>
          {notifStatus && (
            <div className={`mt-4 px-4 py-3 rounded-xl text-sm font-medium animate-fade-in ${notifStatus==='granted'?'bg-emerald-50 text-emerald-700':'bg-red-50 text-red-600'}`}>
              {notifStatus==='granted'?'✅ Notifications enabled! You\'ll be reminded on time.':'❌ Blocked — you can enable in browser settings later.'}
            </div>
          )}
        </div>
      ),
      canNext: true, label: saving ? 'Saving…' : '🚀 Get Started!', isLast: true,
    },
  ]

  const cur = steps[step]

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-sm mx-auto">
      {/* Progress bar */}
      <div className="flex items-center gap-2 px-6 pt-8 pb-4">
        {steps.map((_,i) => (
          <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i===step?'bg-indigo-600 flex-[2]':i<step?'bg-indigo-300 flex-1':'bg-slate-200 flex-1'}`} />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-2">
        {cur.content}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-100 bg-white flex gap-3">
        {step > 0 && (
          <button onClick={() => setStep(s=>s-1)}
            className="flex-1 py-3 rounded-xl text-slate-500 font-semibold hover:bg-slate-100 transition-colors text-sm">
            ← Back
          </button>
        )}
        <button disabled={!cur.canNext||saving}
          onClick={cur.isLast ? finish : () => setStep(s=>s+1)}
          className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-indigo-100">
          {cur.label}
        </button>
      </div>
    </div>
  )
}
