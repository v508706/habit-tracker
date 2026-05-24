import { useState } from 'react'
import { getHabits, saveHabits } from '../../utils/storage'
import { cloudSaveHabits } from '../../utils/db'
import HabitForm from './HabitForm'

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2) }

function formatDays(days) {
  if (days.length === 7) return 'Every day'
  if (days.length === 5 && !days.includes('Sat') && !days.includes('Sun')) return 'Weekdays'
  if (days.length === 2 && days.includes('Sat') && days.includes('Sun')) return 'Weekends'
  return days.join(', ')
}
function fmtTime(t) {
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
      : [...habits, { ...data, id: uid() }]
    persist(updated)
    setShowForm(false)
    setEditingHabit(null)
  }

  const handleDelete = id => {
    if (!window.confirm('Delete this habit? Your history will be kept.')) return
    persist(habits.filter(h => h.id !== id))
  }

  return (
    <div className="habit-manager">
      <div className="habit-manager-header">
        <div className="habit-manager-title">My Habits</div>
        <button className="btn btn-primary btn-sm" onClick={() => { setEditingHabit(null); setShowForm(true) }}>
          + Add
        </button>
      </div>

      <div className="habits-list">
        {habits.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-emoji">🌱</span>
            <div className="empty-state-title">No habits yet</div>
            <div className="empty-state-text">Start building your routine by adding your first habit.</div>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Add First Habit</button>
          </div>
        ) : (
          habits.map(h => (
            <div key={h.id} className="manage-habit-item">
              <div className="habit-emoji-circle" style={{
                background: h.color + '22', width: 48, height: 48,
                borderRadius: 14, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 24, flexShrink: 0,
              }}>{h.emoji}</div>
              <div className="manage-habit-info">
                <div className="manage-habit-name">{h.name}</div>
                <div className="manage-habit-meta">{formatDays(h.days)} · {fmtTime(h.time)}</div>
              </div>
              <div className="manage-habit-actions">
                <button className="icon-btn icon-btn-edit" title="Edit"
                  onClick={() => { setEditingHabit(h); setShowForm(true) }}>✏️</button>
                <button className="icon-btn icon-btn-delete" title="Delete"
                  onClick={() => handleDelete(h.id)}>🗑️</button>
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <HabitForm initialData={editingHabit} onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingHabit(null) }} />
      )}
    </div>
  )
}
