const KEYS = {
  HABITS: 'ht_habits',
  COMPLETIONS: 'ht_completions',
  SETUP_DONE: 'ht_setup',
  USER_NAME: 'ht_username',
  TIMEZONE: 'ht_timezone',
  COMPLETION_DETAILS: 'ht_completion_details',
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

/* All-time best streak (looks back up to 3 years) */
export function getLongestStreak(habitId) {
  const completions = getCompletions()
  const habits = getHabits()
  const habit = habits.find(h => h.id === habitId)
  if (!habit) return 0

  const today = new Date()
  let max = 0
  let cur = 0

  // walk from 3 years ago → today (oldest first = forward order)
  for (let i = 1095; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dayName = getDayName(d)
    if (!habit.days.includes(dayName)) continue

    const dateStr = getDateString(d)
    const isToday = i === 0

    if (completions[dateStr]?.[habitId]) {
      cur++
      if (cur > max) max = cur
    } else if (isToday) {
      // today not done yet — don't break current streak
    } else {
      cur = 0
    }
  }
  return max
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

// ── Completion Details (time + metric) — separate storage key ─────
// Stored as: { [dateStr]: { [habitId]: { timeSpent: {h,m}|null, metricValue: number|null } } }
// Kept separate from completions so boolean check logic is never broken.

export function getCompletionDetails() {
  try { return JSON.parse(localStorage.getItem(KEYS.COMPLETION_DETAILS)) || {} }
  catch { return {} }
}

export function saveCompletionDetail(habitId, dateStr, patch) {
  const details = getCompletionDetails()
  if (!details[dateStr]) details[dateStr] = {}
  details[dateStr][habitId] = { ...(details[dateStr][habitId] || {}), ...patch }
  localStorage.setItem(KEYS.COMPLETION_DETAILS, JSON.stringify(details))
  return details
}

export function getEntryDetail(habitId, dateStr) {
  return getCompletionDetails()[dateStr]?.[habitId] || null
}

// ── Time helpers ──────────────────────────────────────────────────
const _toMins = ts => ts ? (ts.h || 0) * 60 + (ts.m || 0) : 0

export function formatMins(totalMins) {
  if (!totalMins || totalMins === 0) return null
  if (totalMins < 60) return `${totalMins}m`
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

/** Total minutes logged for a habit over last numDays days */
export function getTimeSpentInRange(habitId, numDays) {
  const completions = getCompletions()
  const details     = getCompletionDetails()
  let total = 0
  const today = new Date()
  for (let i = 0; i < numDays; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i)
    const ds = getDateString(d)
    if (completions[ds]?.[habitId] && details[ds]?.[habitId]?.timeSpent)
      total += _toMins(details[ds][habitId].timeSpent)
  }
  return total
}

/** Per-day time (in minutes) for last numDays days — for bar charts */
export function getTimeSpentByDay(habitId, numDays) {
  const completions = getCompletions()
  const details     = getCompletionDetails()
  const today       = new Date()
  return Array.from({ length: numDays }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() - (numDays - 1 - i))
    const ds = getDateString(d)
    const mins = (completions[ds]?.[habitId] && details[ds]?.[habitId]?.timeSpent)
      ? _toMins(details[ds][habitId].timeSpent) : 0
    return { date: ds, mins, label: `${d.getDate()}/${d.getMonth() + 1}` }
  })
}

/** Total minutes logged for a habit in a specific calendar month */
export function getTimeSpentForMonth(habitId, year, month) {
  const completions = getCompletions()
  const details     = getCompletionDetails()
  const numDays     = new Date(year, month + 1, 0).getDate()
  let total = 0
  for (let d = 1; d <= numDays; d++) {
    const date = new Date(year, month, d)
    const ds   = getDateString(date)
    if (completions[ds]?.[habitId] && details[ds]?.[habitId]?.timeSpent)
      total += _toMins(details[ds][habitId].timeSpent)
  }
  return total
}

/** Total minutes logged for a habit in a specific year */
export function getTimeSpentForYear(habitId, year) {
  const completions = getCompletions()
  const details     = getCompletionDetails()
  let total = 0
  for (let m = 0; m < 12; m++) total += getTimeSpentForMonth(habitId, year, m)
  return total
}

// ── Metric helpers ────────────────────────────────────────────────
/** Per-day metric values for last numDays days — null when no entry */
export function getMetricByDay(habitId, numDays) {
  const completions = getCompletions()
  const details     = getCompletionDetails()
  const today       = new Date()
  return Array.from({ length: numDays }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() - (numDays - 1 - i))
    const ds  = getDateString(d)
    const val = (completions[ds]?.[habitId] && details[ds]?.[habitId]?.metricValue != null)
      ? details[ds][habitId].metricValue : null
    return { date: ds, value: val, label: `${d.getDate()}/${d.getMonth() + 1}` }
  })
}

/** Per-day metric values for a specific calendar month */
export function getMetricForMonth(habitId, year, month) {
  const completions = getCompletions()
  const details     = getCompletionDetails()
  const numDays     = new Date(year, month + 1, 0).getDate()
  const result = []
  for (let d = 1; d <= numDays; d++) {
    const date = new Date(year, month, d)
    const ds   = getDateString(date)
    const val  = (completions[ds]?.[habitId] && details[ds]?.[habitId]?.metricValue != null)
      ? details[ds][habitId].metricValue : null
    if (val !== null) result.push({ date: ds, value: val, label: String(d) })
  }
  return result
}

/** Metric sum for a range */
export function getMetricTotalInRange(habitId, numDays) {
  return getMetricByDay(habitId, numDays)
    .reduce((acc, d) => acc + (d.value || 0), 0)
}

/** Metric sum for a specific month */
export function getMetricTotalForMonth(habitId, year, month) {
  return getMetricForMonth(habitId, year, month)
    .reduce((acc, d) => acc + d.value, 0)
}
