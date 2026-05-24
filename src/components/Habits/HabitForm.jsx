import { useState } from 'react'

const EMOJIS = ['🏃', '🎵', '♟️', '📚', '💪', '🧘', '💊', '💧', '🛌', '✏️', '🍎', '🎯',
  '🎨', '🏊', '🚴', '🎸', '🌱', '📝', '🧩', '🏋️', '🥗', '☕', '🧠', '🎤',
  '🦷', '🚶', '🧹', '🐾', '📷', '🎃']

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#64748b']

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const DEFAULT = {
  emoji: '🏃', name: '',
  days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  time: '08:00', color: '#6366f1',
}

export default function HabitForm({ initialData, onSave, onClose }) {
  const [form, setForm] = useState(initialData ? { ...initialData } : { ...DEFAULT })

  const toggleDay = (d) => setForm(f => ({
    ...f,
    days: f.days.includes(d) ? f.days.filter(x => x !== d) : [...f.days, d]
  }))

  const handleSave = () => {
    if (!form.name.trim() || form.days.length === 0) return
    onSave({ ...form, name: form.name.trim() })
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{initialData ? 'Edit Habit' : 'New Habit'}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Choose Icon</label>
            <div className="emoji-picker">
              {EMOJIS.map(e => (
                <button key={e} className={`emoji-option ${form.emoji === e ? 'selected' : ''}`}
                  onClick={() => setForm(f => ({ ...f, emoji: e }))}>
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Habit Name</label>
            <input className="form-input" placeholder="e.g. Morning Run"
              value={form.name} maxLength={40} autoFocus
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>

          <div className="form-group">
            <label className="form-label">Color</label>
            <div className="color-picker">
              {COLORS.map(c => (
                <button key={c} className={`color-option ${form.color === c ? 'selected' : ''}`}
                  style={{ background: c }} onClick={() => setForm(f => ({ ...f, color: c }))} />
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Repeat Days</label>
            <div className="day-selector">
              {DAYS.map(d => (
                <button key={d} className={`day-btn ${form.days.includes(d) ? 'selected' : ''}`}
                  onClick={() => toggleDay(d)}>
                  {d[0]}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Reminder Time</label>
            <input type="time" className="form-input" value={form.time}
              onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave}
            disabled={!form.name.trim() || form.days.length === 0}>
            {initialData ? 'Save Changes' : 'Add Habit'}
          </button>
        </div>
      </div>
    </div>
  )
}
