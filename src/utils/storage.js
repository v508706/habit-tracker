const KEYS = {
  HABITS: 'ht_habits',
  COMPLETIONS: 'ht_completions',
  SETUP_DONE: 'ht_setup',
  USER_NAME: 'ht_username',
  TIMEZONE: 'ht_timezone',
}

export function getTimezone() {
  return localStorage.getItem(KEYS.TIMEZONE) || Intl.DateTimeFormat().resolvedOptions().timeZone
}
export function saveTimezone(tz) {
  localStorage.setItem(KEYS.TIMEZONE, tz)
}

export function getHabits() {
  try { return JSON.parse(localStorage.getItem(KEYS.HABITS)) || [] }
  catch { return [] }
}

export function saveHabits(habits) {
  localStorage.setItem(KEYS.HABITS, JSON.stringify(habits))
}

export function getCompletions() {
  try { return JSON.parse(localStorage.getItem(KEYS.COMPLETIONS)) || {} }
  catch { return {} }
}

export function saveCompletions(c) {
  localStorage.setItem(KEYS.COMPLETIONS, JSON.stringify(c))
}

export function isSetupDone() {
  return localStorage.getItem(KEYS.SETUP_DONE) === 'true'
}

export function markSetupDone() {
  localStorage.setItem(KEYS.SETUP_DONE, 'true')
}

export function getUserName() {
  return localStorage.getItem(KEYS.USER_NAME) || 'Friend'
}

export function saveUserName(name) {
  localStorage.setItem(KEYS.USER_NAME, name)
}

export function getTodayString() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function getDayName(date = new Date()) {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]
}

export function getDateString(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function toggleCompletion(habitId, dateStr) {
  const completions = getCompletions()
  if (!completions[dateStr]) completions[dateStr] = {}
  completions[dateStr][habitId] = !completions[dateStr][habitId]
  saveCompletions(completions)
  return completions
}

export function isCompleted(habitId, dateStr) {
  const completions = getCompletions()
  return !!(completions[dateStr]?.[habitId])
}

export function getStreak(habitId) {
  const completions = getCompletions()
  const habits = getHabits()
  const habit = habits.find(h => h.id === habitId)
  if (!habit) return 0

  let streak = 0
  const today = new Date()

  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dayName = getDayName(d)

    if (!habit.days.includes(dayName)) continue

    const dateStr = getDateString(d)

    if (completions[dateStr]?.[habitId]) {
      streak++
    } else if (i === 0) {
      continue
    } else {
      break
    }
  }

  return streak
}

export function getCompletionRate(habitId, days = 7) {
  const completions = getCompletions()
  const habits = getHabits()
  const habit = habits.find(h => h.id === habitId)
  if (!habit) return 0

  let scheduled = 0
  let done = 0
  const today = new Date()

  for (let i = 0; i < days; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dayName = getDayName(d)
    if (!habit.days.includes(dayName)) continue
    scheduled++
    const dateStr = getDateString(d)
    if (completions[dateStr]?.[habitId]) done++
  }

  return scheduled === 0 ? 0 : Math.round((done / scheduled) * 100)
}
