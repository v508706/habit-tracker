import { useState } from 'react'
import { getHabits, saveHabits } from '../../utils/storage'
import { cloudSaveHabits } from '../../utils/db'
import HabitForm from './HabitForm'

const uidGen = () => Date.now().toString(36) + Math.random().toString(36).slice(2)

const fmtDays = d =>
  d.length === 7 ? 'Every day'
  : d.length === 5 && !d.includes('Sat') && !d.includes('Sun') ? 'Weekdays'
  : d.length === 2 && d.includes('Sat') && d.includes('Sun') ? 'Weekends'
  : d.join(', ')

const fmtTime = t => {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

export default function HabitManager({ uid: userUid }) {
  const [habits,       setHabits]       = useState(getHabits)
  const [showForm,     setShowForm]     = useState(false)
  const [editingHabit, setEditingHabit] = useState(null)

  const persist = updated => {
    saveHabits(updated)
    setHabits(updated)
    if (userUid) cloudSaveHabits(userUid, updated)
  }

  const handleSave = data => {
    const updated = editingHabit
      ? habits.map(h => h.id === editingHabit.id ? { ...data, id: editingHabit.id } : h)
      : [...habits, { ...data, id: uidGen() }]
    persist(updated)
    setShowForm(false)
    setEditingHabit(null)
  }

  const handleDelete = id => {
    if (!window.confirm('Delete this habit? Your history will be kept.')) return
    persist(habits.filter(h => h.id !== id))
  }

  const openAdd = () => { setEditingHabit(null); setShowForm(true) }
  const openEdit = h => { setEditingHabit(h); setShowForm(true) }

  return (
    <div className="animate-fade-in">
      {/* ── Header ── */}
      <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 px-6 pt-12 pb-6">
        <h1 className="text-2xl font-black text-white mb-0.5">My Habits</h1>
        <p className="text-indigo-200 text-sm">{habits.length} habit{habits.length !== 1 ? 's' : ''} configured</p>
      </div>

      {/* ── Content ── */}
      <div className="px-4 py-5">
        {habits.length === 0 ? (
          /* Empty state */
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center py-14 px-6 text-center">
            <div className="w-20 h-20 rounded-2xl bg-indigo-50 flex items-center justify-center text-4xl mb-5">🌱</div>
            <p className="font-bold text-slate-800 text-lg mb-1">No habits yet</p>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">Start building your routine by adding your first habit.</p>
            <button onClick={openAdd}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-200 transition-all active:scale-95 text-sm">
              + Add First Habit
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-2.5 mb-4">
              {habits.map(h => (
                <div key={h.id}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3.5 px-4 py-3.5">
                  {/* Emoji */}
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ background: h.color + '20' }}>
                    {h.emoji}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{h.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{fmtDays(h.days)} · {fmtTime(h.time)}</p>
                  </div>

                  {/* Color dot */}
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: h.color }} />

                  {/* Actions */}
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={() => openEdit(h)}
                      className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-500 hover:bg-indigo-100 flex items-center justify-center text-sm transition-colors"
                      title="Edit">
                      ✏️
                    </button>
                    <button onClick={() => handleDelete(h.id)}
                      className="w-8 h-8 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 flex items-center justify-center text-sm transition-colors"
                      title="Delete">
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add button */}
            <button onClick={openAdd}
              className="w-full py-3.5 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 font-semibold hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all text-sm">
              + Add Another Habit
            </button>
          </>
        )}
      </div>

      {/* ── Modal ── */}
      {showForm && (
        <HabitForm
          initialData={editingHabit}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingHabit(null) }}
        />
      )}
    </div>
  )
}
