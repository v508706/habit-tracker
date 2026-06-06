# Android Habit Tracker — Full Development Prompt

> Paste this entire document into any AI coding assistant (Claude, Gemini, Copilot, etc.) to build the Android equivalent of this web app.

---

## PROJECT OVERVIEW

Build a production-ready **Android habit tracking app** in **Kotlin with Jetpack Compose**. The app lets users define daily habits, check them off each day, log time spent and progress metrics per session, receive push notifications as reminders, and view detailed statistics including streaks, monthly calendars, and yearly heatmaps. Data syncs to the cloud via Firebase so it works across multiple devices.

---

## TECH STACK

| Layer | Technology |
|---|---|
| Language | Kotlin |
| UI | Jetpack Compose (Material 3) |
| Navigation | Navigation Compose |
| Local storage | Room Database + DataStore Preferences |
| Remote storage | Firebase Firestore |
| Authentication | Firebase Auth (Google Sign-In) |
| Push notifications | Firebase Cloud Messaging (FCM) |
| Background tasks | WorkManager + AlarmManager |
| DI | Hilt |
| Architecture | MVVM + Repository pattern |
| Build | Gradle (Kotlin DSL) |
| Min SDK | 26 (Android 8.0) |
| Target SDK | 34 |

---

## FIREBASE SETUP (required before coding)

1. Create a Firebase project at console.firebase.google.com
2. Add an Android app, download `google-services.json`, place in `/app`
3. Enable **Google Sign-In** under Authentication → Sign-in methods
4. Create a **Firestore** database (start in test mode, then add rules)
5. Enable **Cloud Messaging** for push notifications
6. Add SHA-1 and SHA-256 fingerprints of your debug keystore to Firebase

**Firestore security rules:**
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

**Firestore data structure:**
```
users/
  {uid}/
    profile           (document)
      name: String
      setupDone: Boolean
      timezone: String
      fcmToken: String
    habits/           (subcollection)
      {habitId}
        id: String
        name: String
        emoji: String
        color: String          (hex e.g. "#6366f1")
        days: List<String>     (["Mon","Tue","Wed","Thu","Fri"])
        time: String           ("HH:mm" 24-hour)
        metric: Map? {         (null if not tracking)
          name: String         (e.g. "KMs run")
          unit: String         (e.g. "km")
        }
        createdAt: Timestamp
    completions/      (subcollection)
      {dateString}             (e.g. "2025-05-28")
        {habitId}: Boolean
    completion_details/  (subcollection)
      {dateString}
        {habitId}: Map {
          timeSpent: Map? { h: Int, m: Int }   (null if not logged)
          metricValue: Double?                  (null if not logged)
        }
```

---

## DATA MODELS

```kotlin
data class Habit(
    val id: String,
    val name: String,
    val emoji: String,
    val color: String,        // hex color string
    val days: List<String>,   // ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]
    val time: String,         // "HH:mm" 24h format
    val metric: HabitMetric? = null,
    val createdAt: Long = System.currentTimeMillis()
)

data class HabitMetric(
    val name: String,   // e.g. "KMs run", "Pages read"
    val unit: String    // e.g. "km", "pages", "cal"
)

data class CompletionDetail(
    val habitId: String,
    val date: String,               // "YYYY-MM-DD"
    val timeSpent: TimeSpent? = null,
    val metricValue: Double? = null
)

data class TimeSpent(val h: Int, val m: Int) {
    val totalMinutes get() = h * 60 + m
    fun format(): String = when {
        h == 0 -> "${m}m"
        m == 0 -> "${h}h"
        else   -> "${h}h ${m}m"
    }
}

data class UserProfile(
    val name: String,
    val setupDone: Boolean,
    val timezone: String,
    val fcmToken: String? = null
)
```

**Day names** must always be from this exact list in order:
`["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]`

---

## APP FLOW

```
App Launch
  ↓
Firebase Auth check
  ├─ Not signed in → Login Screen
  └─ Signed in → Firestore sync (pull all data)
                   ├─ setupDone == false → Setup Wizard (3 steps)
                   └─ setupDone == true  → Main App (Bottom Nav)
```

---

## SCREEN 1: LOGIN SCREEN

**Design:**
- Full screen gradient background: `#4F46E5` → `#7C3AED` → `#6D28D9` (indigo→violet→purple)
- Two decorative blurred white circles (top-left, bottom-right)
- White rounded card (max width 360dp, rounded corners 24dp)
- Thin gradient top strip on the card (indigo→violet→purple, height 6dp)
- App logo: rounded square (80×80dp) with indigo→violet gradient, ✨ emoji
- App name: "Habit Tracker", bold 24sp
- Subtitle: "Build powerful daily routines. Track, improve, stay consistent."
- Feature grid 2×2: Daily check-ins 📅, Smart reminders 🔔, Streak tracking 📊, Syncs everywhere ☁️
- Google Sign-In button: white background, Google SVG logo, "Continue with Google" text
- Loading spinner while authenticating
- Error message area below button (friendly text, not raw error codes)
- Privacy note: "Your data is stored securely and never shared."

**Friendly error mapping:**
```kotlin
fun friendlyError(exception: Exception): String = when {
    exception.message?.contains("POPUP_CLOSED") == true -> "Sign-in cancelled. Please try again."
    exception.message?.contains("NETWORK") == true -> "Network error. Check your connection."
    else -> "Sign-in failed. Please try again."
}
```

---

## SCREEN 2: SETUP WIZARD

Three-step wizard with animated pill progress bar at the top.

### Step 1 — Name
- Large 👋 icon in indigo gradient rounded square
- Title: "Welcome!", subtitle about building habits
- TextField: "What should we call you?" (max 40 chars)
- Continue button (always enabled — name is optional, defaults to "Friend")

### Step 2 — Add Habits
- Title: "Your Habits"
- Scrollable list of added habits (emoji, name, days summary, time, ✕ delete)
- "+ Add a Habit" dashed button → expands **inline form**:
  - **Emoji picker**: 6-column grid of 46 emojis (see list below)
  - **Name**: text field, max 40 chars
  - **Color picker**: 10 colored circles
  - **Repeat days**: M T W T F S S toggle buttons
  - **Reminder time**: time picker
  - **Track Progress toggle** (optional):
    - When enabled: "What do you measure?" text field + "Unit" text field
    - e.g. name="KMs run", unit="km"
  - **Add Habit** button (disabled if name empty or no days selected)
  - **✕ Cancel** button
- Continue → enabled only when ≥1 habit added and form is closed

### Step 3 — Notifications
- Large 🔔 in amber/orange gradient
- Title: "Stay on Track"
- "Enable Notifications" button → requests POST_NOTIFICATIONS permission
- Success/blocked status message
- "🚀 Get Started!" button → saves all data, navigates to Main App

**On wizard completion:**
- Save profile to Firestore (name, setupDone:true, timezone)
- Save all habits to Firestore
- Register FCM token

---

## EMOJI LIST (46 emojis)

```
Fitness:  🏃 🏃‍♂️ 🚶 🧘 🏋️ 🏊 🚴 💪
Chess:    ♟️ ♜ 🏰
Music:    🎵 🎸 🎹 ⌨️ 🎤
Study:    📚 📖 📗 📕 ✏️ 📝 🧠 🔢 📰
Language: 🗣️ 🎓 🏫 🇮🇳
Health:   💊 💧 🛌 🦷 🍎 🥗 ☕
Arts:     🎨 🖍️ ✍️ 📷
Tech:     🤖 🧮 🧩 🌱
Other:    🛕 🌠 🎯 🐾 🧹 🎃
```

**Auto-suggest metric hints per emoji (pre-fill when user enables tracking):**
```kotlin
val METRIC_HINTS = mapOf(
    "🏃" to HabitMetric("Distance run", "km"),
    "🏃‍♂️" to HabitMetric("Distance run", "km"),
    "🚶" to HabitMetric("Distance walked", "km"),
    "🏊" to HabitMetric("Laps swum", "laps"),
    "🚴" to HabitMetric("Distance cycled", "km"),
    "🏋️" to HabitMetric("Weight lifted", "kg"),
    "💪" to HabitMetric("Calories burnt", "cal"),
    "📚" to HabitMetric("Pages read", "pages"),
    "📖" to HabitMetric("Pages read", "pages"),
    "🧘" to HabitMetric("Calories burnt", "cal"),
    "♟️" to HabitMetric("Puzzles solved", "puzzles"),
    "🎹" to HabitMetric("Practice time", "min"),
    "⌨️" to HabitMetric("Words typed", "words"),
    "🎨" to HabitMetric("Sketches done", "sketches"),
    "🧮" to HabitMetric("Problems solved", "problems"),
    "🔢" to HabitMetric("Tables practised", "tables"),
)
```

---

## COLOR LIST (10 colors)

```kotlin
val HABIT_COLORS = listOf(
    Color(0xFFEF4444), // red
    Color(0xFFF97316), // orange
    Color(0xFFEAB308), // yellow
    Color(0xFF22C55E), // green
    Color(0xFF14B8A6), // teal
    Color(0xFF3B82F6), // blue
    Color(0xFF6366F1), // indigo (default)
    Color(0xFFA855F7), // purple
    Color(0xFFEC4899), // pink
    Color(0xFF64748B)  // slate
)
```

---

## MAIN APP — BOTTOM NAVIGATION

4 tabs:
1. **Today** 📅 — Dashboard (default tab)
2. **Habits** ✨ — Habit Manager
3. **Stats** 📊 — Statistics
4. **Logout** 🚪 — Firebase signOut → back to Login

Bottom nav: white bg, subtle top shadow, active tab indigo with small dot indicator below icon.

---

## SCREEN 3: DASHBOARD (Today)

### Header (gradient)
- Date: "Wednesday, May 28"
- Greeting: "Hello, {firstName}! 👋"
- "{N} habits scheduled" subtitle
- **Progress card** (semi-transparent white, rounded 20dp):
  - Canvas-drawn SVG progress ring (stroke cap: round, -90° start, indigo fill, emerald at 100%)
  - "{done}/{total} completed today"
  - Motivational message (see table below)

| % | Message |
|---|---|
| 100 | 🎉 All done! You crushed it! |
| ≥75 | 🔥 Almost there! Keep going! |
| ≥50 | 💪 Halfway there! Great momentum! |
| >0  | ⚡ Good start! Keep it up! |
| 0   | ✨ Ready to build great habits today? |

### Streak Monitor
Shown when a habit is: scheduled today + streak > 0 + NOT yet completed.

- Gradient card (amber ≥1, orange ≥7 days, red ≥30 days)
- Habit emoji + name + "🔥 {N} day streak — don't break it!"
- **"Do it ✓"** button → marks done, scrolls to the habit card, shows brief highlight
- **"Dismiss"** button → hides nudge for the session (in-memory ViewModel state)

### Habit List
Sorted by reminder time (ascending). Each item:

**Not done card:**
- Emoji circle (color background at 18% opacity), habit name, reminder time
- Streak badge 🔥{N} if streak > 0
- Empty checkbox circle on right
- Tap anywhere → marks done + opens LogSheet automatically (after 350ms delay for animation)

**Done card:**
- Green tint background, strikethrough name, filled emerald checkbox
- Streak badge (green tint), time badge ⏱ {time} (if logged), metric badge 📍 {value} {unit} (if logged)
- Bottom strip: "📝 Log time & progress (optional)" or "📝 Edit log · ⏱ {time} · 📍 {metric}" if already logged
- Tap the **strip** → opens LogSheet (not the main card tap which would un-mark)
- Tap the **main card** → un-marks completion

### LogSheet (Modal Bottom Sheet)
Opens automatically after marking done (can also open via the log strip).

**Contents:**
- Handle bar + habit emoji + name header
- **⏱ Time Spent** (optional): hours input + minutes input side by side
- **📍 {metric.name}** (optional, only if habit.metric is set): number input + unit badge
- **Skip** button → closes without saving
- **Save** button → saves detail, closes sheet

Time and metric values are stored in `completion_details` and displayed as badges on the done card.

### All Done Banner
When 100% complete: emerald gradient card with 🏆 "Perfect day! You completed all your habits."

---

## SCREEN 4: HABIT MANAGER

### Header (gradient)
"My Habits" + "{N} habits configured"

### Habit List
Each row:
- Emoji circle (habit color background), habit name, days summary + time
- If habit has metric: small purple "📍 {metric.name}" badge
- Color dot
- ✏️ edit button → opens Edit bottom sheet
- 🗑️ delete button → confirm dialog "Delete this habit? Your completion history will be kept."

Days summary logic:
- All 7 → "Every day"
- Mon–Fri → "Weekdays"
- Sat+Sun → "Weekends"
- Otherwise → "Mon, Wed, Fri" (join with ", ")

### Empty State
🌱 icon, "No habits yet", subtitle, "+ Add First Habit" button

### Add/Edit Bottom Sheet
Same fields as Step 2 form (emoji, name, color, days, time, metric toggle).
Save → update Room + Firestore in background.

---

## SCREEN 5: STATISTICS

Header with 3-tab selector: **Overview | Monthly | Yearly**

### Overview Tab

**Summary cards (2×2 grid):**
- Active Habits ✨ (indigo→violet)
- Total Check-ins ✅ (emerald→teal)
- Avg 7-Day Rate 📈 (amber→orange)
- Best Streak Now 🔥 (rose→pink)

**Active days card** — "{N} active days with at least one check-in"

**Per-habit list (tap → Individual Habit Detail):**
Each card shows:
- Emoji, name, schedule
- Chips: Current Streak 🔥 (orange), Best Streak 🏆 (amber), 7-Day % (indigo)
- Thin colored progress bar (7-day rate width)
- Last 7 days dots (see WeekDots spec below)
- "›" chevron

### Monthly Tab

**Month navigation:** `‹ {Month} {Year} ›` (can't go past current month)

**All-habits combined calendar grid:**
- Standard Sunday-first columns (Su Mo Tu We Th Fr Sa)
- Cell colors:
  - Future / no habits: light grey
  - 0% done: light red background, shows day number
  - 1–49%: amber, shows "done/total"
  - 50–99%: light green, shows "done/total"
  - 100%: emerald, shows ✓
  - Today: indigo ring border

**Per-habit rows below:** emoji, name, "X of Y scheduled days done", colored bar, % badge. Tap → drill down.

### Yearly Tab

**Year navigation:** `‹ {Year} ›` (can't go past current year)

**Year summary chips (3 across):** Total Check-ins, Completion Rate %, Best Streak

**12 mini-month grids (2-column):**
- Month label + % badge (green/amber/red)
- Compact dot grid: done=emerald, missed=red, rest=grey, future=light grey, today=indigo ring

---

## INDIVIDUAL HABIT DETAIL SCREEN

Navigate from Overview or Monthly tab by tapping a habit card.

### Header (gradient)
"← Back to Stats" + habit emoji + name + schedule days

### Quick Stats (2×2 cards)
- Current Streak 🔥 (orange→rose) with "days" sub-label
- Best Streak Ever 🏆 (amber→yellow) with "all time" sub-label
- Last 7 Days % 📈 (indigo→violet)
- Last 30 Days % 📅 (teal→emerald)

### Time & Progress Section
**Only shown if any time or metric data has been logged.**

**⏱ Time Spent sub-section:**
- 4 totals: Today | Week | Month | Year (teal background chips)
- 7-day bar chart (teal bars, relative height, labels below)

**📍 {metric.name} sub-section (if habit has metric):**
- Period toggle: [7d] [30d]
- Summary chips: Total ({period}), Best ({period}), This month
- Bar chart with habit color bars

### Sub-tabs: Monthly | Yearly
Monthly: navigable calendar for this habit only
- Done → filled with habit color, ✓
- Missed → light red, ✕
- Not scheduled → grey
- Today → indigo ring

Yearly: 12 mini-month grids for this habit only

### Last 7 Days Dots
See WeekDots spec below.

---

## WEEKDOTS SPEC

7 circles in a row (older→today, left→right). Above each: day letter (S M T W T F S).

| State | Appearance |
|---|---|
| Scheduled + done | Filled emerald + ✓ |
| Scheduled + not done + today | Light indigo bg + indigo ring + · |
| Scheduled + not done + past | Light red bg + ✕ |
| Not scheduled | Very light grey, empty |

---

## STREAK CALCULATION LOGIC

**Current streak (look backwards from today):**
```kotlin
fun getCurrentStreak(habitId: String): Int {
    var streak = 0
    val today = LocalDate.now()
    for (i in 0..364) {
        val date = today.minusDays(i.toLong())
        val dayName = date.dayOfWeek.toHabitDay() // "Mon", "Tue", etc.
        if (!habit.days.contains(dayName)) continue
        val dateStr = date.toString() // "YYYY-MM-DD"
        if (completions[dateStr]?.get(habitId) == true) {
            streak++
        } else if (i == 0) {
            continue // today not done yet — don't break streak
        } else {
            break
        }
    }
    return streak
}
```

**All-time best streak (look back up to 3 years):**
```kotlin
fun getLongestStreak(habitId: String): Int {
    var max = 0; var cur = 0
    val today = LocalDate.now()
    for (i in 1095 downTo 0) {
        val date = today.minusDays(i.toLong())
        val dayName = date.dayOfWeek.toHabitDay()
        if (!habit.days.contains(dayName)) continue
        val dateStr = date.toString()
        if (completions[dateStr]?.get(habitId) == true) {
            cur++; if (cur > max) max = cur
        } else if (i == 0) {
            // today — don't reset
        } else {
            cur = 0
        }
    }
    return max
}
```

**7/30-day completion rate:**
```kotlin
fun getCompletionRate(habitId: String, days: Int = 7): Int {
    var scheduled = 0; var done = 0
    val today = LocalDate.now()
    for (i in 0 until days) {
        val date = today.minusDays(i.toLong())
        val dayName = date.dayOfWeek.toHabitDay()
        if (!habit.days.contains(dayName)) continue
        scheduled++
        if (completions[date.toString()]?.get(habitId) == true) done++
    }
    return if (scheduled == 0) 0 else (done * 100 / scheduled)
}
```

---

## TIME & METRIC AGGREGATION LOGIC

```kotlin
// Total minutes for a habit in last N days
fun getTimeSpentInRange(habitId: String, days: Int): Int {
    val today = LocalDate.now()
    return (0 until days).sumOf { i ->
        val ds = today.minusDays(i.toLong()).toString()
        details[ds]?.get(habitId)?.timeSpent?.totalMinutes ?: 0
    }
}

// Per-day minutes for last N days (for bar chart)
fun getTimeSpentByDay(habitId: String, days: Int): List<DayData> {
    val today = LocalDate.now()
    return (days - 1 downTo 0).map { i ->
        val date = today.minusDays(i.toLong())
        DayData(
            label = "${date.dayOfMonth}/${date.monthValue}",
            value = details[date.toString()]?.get(habitId)?.timeSpent?.totalMinutes ?: 0
        )
    }
}

// Metric value per day for last N days
fun getMetricByDay(habitId: String, days: Int): List<DayData?> {
    val today = LocalDate.now()
    return (days - 1 downTo 0).map { i ->
        val date = today.minusDays(i.toLong())
        val v = details[date.toString()]?.get(habitId)?.metricValue
        if (v != null) DayData("${date.dayOfMonth}/${date.monthValue}", v)
        else null
    }
}
```

---

## LOCAL DATABASE (Room)

```kotlin
@Entity(tableName = "habits")
data class HabitEntity(
    @PrimaryKey val id: String,
    val name: String,
    val emoji: String,
    val color: String,
    val days: String,            // JSON array
    val time: String,
    val metricName: String?,
    val metricUnit: String?,
    val createdAt: Long
)

@Entity(tableName = "completions", primaryKeys = ["habitId", "date"])
data class CompletionEntity(
    val habitId: String,
    val date: String,
    val done: Boolean
)

@Entity(tableName = "completion_details", primaryKeys = ["habitId", "date"])
data class CompletionDetailEntity(
    val habitId: String,
    val date: String,
    val timeH: Int?,
    val timeM: Int?,
    val metricValue: Double?
)

@Entity(tableName = "user_profile")
data class UserProfileEntity(
    @PrimaryKey val uid: String,
    val name: String,
    val setupDone: Boolean,
    val timezone: String
)
```

---

## SYNC STRATEGY (Offline-First)

1. All reads from Room (instant)
2. All writes to Room first, then Firestore in background coroutine
3. On login: pull Firestore → merge into Room (Firestore wins)
4. Conflict resolution: last-write-wins on a per-field basis

---

## NOTIFICATIONS

### Local Exact-Time Alarms (AlarmManager)
- Schedule one alarm per habit per scheduled day at the habit's `time`
- Use `setExactAndAllowWhileIdle` for reliable delivery
- Notification: title = habit name, body = "Time for your {habit name}!"
- Cancel + reschedule all alarms whenever habits change

### Required Permissions (AndroidManifest.xml)
```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="android.permission.INTERNET" />
```

### Boot Receiver
```kotlin
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            // Reschedule all alarms from Room data
        }
    }
}
```

### FCM
- Register token on login, save to Firestore `users/{uid}.fcmToken`
- `FirebaseMessagingService`: show local notification in foreground; background handled by SDK

---

## DESIGN SYSTEM

```kotlin
object AppColors {
    val Indigo600  = Color(0xFF4F46E5)
    val Violet600  = Color(0xFF7C3AED)
    val Purple700  = Color(0xFF6D28D9)
    val Emerald500 = Color(0xFF10B981)
    val Teal500    = Color(0xFF14B8A6)
    val Amber500   = Color(0xFFF59E0B)
    val Orange500  = Color(0xFFF97316)
    val Rose500    = Color(0xFFF43F5E)
    val Slate50    = Color(0xFFF8FAFC)
    val Slate100   = Color(0xFFF1F5F9)
    val Slate400   = Color(0xFF94A3B8)
    val Slate800   = Color(0xFF1E293B)
}

val HeaderGradient = Brush.linearGradient(
    colors = listOf(Color(0xFF4F46E5), Color(0xFF7C3AED), Color(0xFF6D28D9))
)
```

**Shape:** Cards 16dp, Buttons 12dp, Chips 50%

**Animations:**
- Habit check-off: scale pulse (1.0 → 1.15 → 1.0, 300ms spring)
- Screen transitions: fade + slide from bottom
- Progress ring: animate sweep angle over 700ms
- Bottom sheets: slide up from bottom with scrim

---

## PROJECT STRUCTURE

```
app/src/main/java/com/yourname/habittracker/
├── data/
│   ├── local/
│   │   ├── AppDatabase.kt
│   │   ├── HabitDao.kt
│   │   ├── CompletionDao.kt
│   │   ├── CompletionDetailDao.kt
│   │   └── entities/
│   ├── remote/
│   │   └── FirestoreDataSource.kt
│   └── repository/
│       └── HabitRepositoryImpl.kt
├── domain/
│   ├── model/
│   │   ├── Habit.kt
│   │   ├── CompletionDetail.kt
│   │   └── UserProfile.kt
│   └── usecase/
│       ├── GetStreakUseCase.kt
│       ├── GetLongestStreakUseCase.kt
│       ├── GetCompletionRateUseCase.kt
│       ├── GetTimeSpentUseCase.kt
│       └── GetMetricTrendUseCase.kt
├── ui/
│   ├── auth/           LoginScreen + LoginViewModel
│   ├── setup/          SetupWizardScreen + SetupViewModel
│   ├── dashboard/      DashboardScreen + DashboardViewModel
│   │                   StreakMonitor + LogSheet
│   ├── habits/         HabitManagerScreen + HabitForm + HabitManagerViewModel
│   ├── stats/          StatsScreen + MonthCalendar + YearlyView
│   │                   HabitDetail + TimeAndMetricSection + MiniBarChart
│   │                   WeekDots + StatCard
│   ├── theme/          Color.kt + Type.kt + Theme.kt
│   └── components/     ProgressRing + common composables
├── notifications/
│   ├── NotificationScheduler.kt
│   ├── HabitAlarmReceiver.kt
│   ├── BootReceiver.kt
│   └── HabitMessagingService.kt
├── di/
│   ├── AppModule.kt
│   ├── DatabaseModule.kt
│   └── FirebaseModule.kt
└── MainActivity.kt
```

---

## GRADLE DEPENDENCIES

```kotlin
// Compose BOM
implementation(platform("androidx.compose:compose-bom:2024.02.00"))
implementation("androidx.compose.ui:ui")
implementation("androidx.compose.material3:material3")
implementation("androidx.compose.ui:ui-tooling-preview")
implementation("androidx.activity:activity-compose:1.8.2")
implementation("androidx.navigation:navigation-compose:2.7.6")
implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.7.0")

// Firebase BOM
implementation(platform("com.google.firebase:firebase-bom:32.7.0"))
implementation("com.google.firebase:firebase-auth-ktx")
implementation("com.google.firebase:firebase-firestore-ktx")
implementation("com.google.firebase:firebase-messaging-ktx")

// Google Sign-In
implementation("com.google.android.gms:play-services-auth:20.7.0")

// Room
implementation("androidx.room:room-runtime:2.6.1")
implementation("androidx.room:room-ktx:2.6.1")
kapt("androidx.room:room-compiler:2.6.1")

// DataStore
implementation("androidx.datastore:datastore-preferences:1.0.0")

// Hilt
implementation("com.google.dagger:hilt-android:2.50")
kapt("com.google.dagger:hilt-compiler:2.50")
implementation("androidx.hilt:hilt-navigation-compose:1.1.0")

// WorkManager
implementation("androidx.work:work-runtime-ktx:2.9.0")

// Coroutines
implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")

// JSON serialization
implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.2")
```

---

## KEY BEHAVIOURS (implement exactly)

1. Habit card tap → marks done INSTANTLY (update Room) → opens LogSheet after 350ms delay
2. Un-marking (tap done card) → clears completion but KEEPS the logged time + metric detail
3. Streak monitor re-evaluates in real-time: "Do it ✓" dismisses the nudge card instantly
4. Monthly calendar: future days = neutral grey (never red), today = indigo ring
5. Yearly mini-months: % badge = null if month hasn't started yet
6. "Best streak" scans 3 years of history, not just current run
7. Dismiss nudge = session-only (ViewModel in-memory, comes back on next app launch)
8. Days always shown in order: Mon Tue Wed Thu Fri Sat Sun
9. All time comparisons use device local timezone (never UTC)
10. Metric hint auto-fills when user enables progress tracking for a new emoji
11. Time bar chart: relative heights (tallest bar = container height), label below each bar
12. MiniBarChart: no bars for days with null/zero value; show only logged values

---

## DELIVERABLE CHECKLIST

- [ ] Login screen with Google Sign-In and friendly errors
- [ ] 3-step setup wizard (name → habits with metric → notifications)
- [ ] Dashboard: progress ring, habit cards, streak monitor nudges
- [ ] Habit cards: streak badge, time/metric badges on done cards
- [ ] LogSheet: time (h:m) + metric inputs, auto-opens on mark done
- [ ] Log strip on done cards for editing after the fact
- [ ] Habit Manager: add/edit bottom sheet with metric toggle, delete confirm
- [ ] Stats Overview: 4 summary cards + per-habit clickable list
- [ ] Stats Monthly: navigable calendar + per-habit month breakdown
- [ ] Stats Yearly: 12 mini-month grids + year summary
- [ ] Individual Habit Detail: 4 stat chips + Time section + Metric trend + Monthly/Yearly tabs
- [ ] MiniBarChart component (no external chart library needed)
- [ ] WeekDots component (last 7 days)
- [ ] Local alarm notifications at exact habit times
- [ ] Boot receiver to reschedule alarms after reboot
- [ ] FCM token registration saved to Firestore
- [ ] Offline-first: Room as source of truth, Firestore sync on login + background writes
- [ ] Sign-out → clear session → Login screen
