# ✨ Habit Tracker

A beautiful, full-featured daily habit tracking web app — built with React + Vite, backed by Firebase, and hosted on Vercel.

**Live demo:** _(add your Vercel URL here after deployment)_

---

## Features

| Feature | Details |
|---|---|
| 🔐 Google Sign-In | One-click login via Firebase Auth |
| ☁️ Cloud Sync | Habits and completions synced across all devices via Firestore |
| 📅 Daily Dashboard | Check off habits, see progress ring and motivational messages |
| 🔔 Push Notifications | Browser push reminders even when the tab is closed (FCM) |
| ✨ Habit Management | Add / edit / delete habits with icon, color, days and time |
| 📊 Statistics | Streaks, 7-day completion rate, per-habit week dots |
| 📱 Mobile-first | Installable PWA-ready, works on any device |

---

## High-Level Design (HLD)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser / PWA)                       │
│                                                                     │
│  ┌──────────────┐   ┌─────────────────────────────────────────┐    │
│  │  React App   │   │         Service Worker                  │    │
│  │  (Vite SPA)  │   │  firebase-messaging-sw.js               │    │
│  │              │   │  • Handles background FCM messages      │    │
│  │  Login       │   │  • Shows push notifications when        │    │
│  │  Setup       │   │    app tab is closed                    │    │
│  │  Dashboard   │   └──────────────┬──────────────────────────┘    │
│  │  Habits      │                  │ Web Push                       │
│  │  Stats       │                  │                               │
│  └──────┬───────┘                  │                               │
│         │ Firebase SDK             │                               │
└─────────┼──────────────────────────┼───────────────────────────────┘
          │                          │
          ▼                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          FIREBASE                                   │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ Firebase Auth│  │  Firestore   │  │  Firebase Cloud          │  │
│  │              │  │              │  │  Messaging (FCM)         │  │
│  │ • Google     │  │ users/       │  │                          │  │
│  │   Sign-In    │  │   {uid}/     │  │ • Push to device tokens  │  │
│  │ • JWT tokens │  │     profile  │  │ • Background delivery    │  │
│  │              │  │     habits/  │  │                          │  │
│  └──────────────┘  │     completions/ └──────────────────────────┘  │
│                    └──────────────┘                                 │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │ Admin SDK
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      VERCEL (Hosting + Serverless)                  │
│                                                                     │
│  ┌──────────────────┐      ┌──────────────────────────────────┐    │
│  │  Static SPA      │      │  /api/send-notifications         │    │
│  │  (dist/)         │      │                                  │    │
│  │                  │      │  • Reads Firestore users         │    │
│  │  Served globally │      │  • Matches habit times to now    │    │
│  │  via CDN         │      │  • Sends FCM push per user       │    │
│  └──────────────────┘      └───────────────┬──────────────────┘    │
│                                             ▲                       │
└─────────────────────────────────────────────┼───────────────────────┘
                                              │ HTTP GET every 1 min
                                   ┌──────────┴──────────┐
                                   │   cron-job.org       │
                                   │   (free external     │
                                   │    cron scheduler)   │
                                   └──────────────────────┘
```

### Data Flow

```
User checks off a habit
        │
        ▼
localStorage (instant, offline-first)
        │
        └──► Firestore (background sync)
                    │
                    └──► All user's devices see update on next load
```

### Notification Flow

```
cron-job.org fires every minute
        │
        ▼
GET /api/send-notifications?secret=XXX
        │
        ▼
Vercel serverless reads Firestore
        │
        ▼
For each user: check habits matching current time + day + not completed
        │
        ▼
Firebase Admin SDK sends FCM message to user's device token
        │
        ▼
Service Worker receives message → shows browser push notification
        │
        ▼
User clicks → app opens to dashboard
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 5 |
| Auth | Firebase Authentication (Google) |
| Database | Cloud Firestore |
| Push Notifications | Firebase Cloud Messaging (FCM) |
| Hosting | Vercel (free Hobby plan) |
| Cron | cron-job.org (free) |
| Language | JavaScript (ES Modules) |

---

## Local Development Setup

### Prerequisites
- Node.js 18+
- A Firebase project (see Firebase Setup below)

### 1. Clone and install

```bash
git clone https://github.com/v508706/habit-tracker.git
cd habit-tracker
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
# Fill in your Firebase values (see Firebase Setup section)
```

### 3. Run

```bash
npm run dev
# Opens at http://localhost:5173
```

---

## Firebase Setup

### Step 1 — Create a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → name it `habit-tracker` → click through
3. On the project dashboard, click **Web** (</>) to add a web app
4. Register the app → copy the `firebaseConfig` object

### Step 2 — Enable Google Sign-In

1. Firebase Console → **Authentication** → **Sign-in method**
2. Click **Google** → Enable → Save
3. Add your Vercel domain to **Authorized domains** after deployment

### Step 3 — Create Firestore Database

1. Firebase Console → **Firestore Database** → **Create database**
2. Choose **Start in production mode** → pick your region
3. Go to **Rules** tab and paste:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Step 4 — Enable Cloud Messaging (FCM)

1. Firebase Console → **Project Settings** → **Cloud Messaging** tab
2. Under **Web Push certificates** → **Generate key pair**
3. Copy the VAPID key

### Step 5 — Get Admin SDK credentials

1. Firebase Console → **Project Settings** → **Service accounts**
2. Click **Generate new private key** → download the JSON file
3. Extract `project_id`, `client_email`, `private_key` from the JSON

### Step 6 — Fill `.env.local`

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123...web:abc...
VITE_FIREBASE_VAPID_KEY=BGsS...

FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

CRON_SECRET=pick-any-long-random-string
```

---

## Vercel Deployment

### Step 1 — Import from GitHub

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Import** next to `v508706/habit-tracker`
3. Framework preset: **Vite** (auto-detected)

### Step 2 — Add environment variables

In Vercel → Settings → **Environment Variables**, add every key from `.env.example` with your real values.

> ⚠️ For `FIREBASE_ADMIN_PRIVATE_KEY`, paste the full key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`. Replace actual newlines with `\n`.

### Step 3 — Deploy

Click **Deploy**. Vercel will run `npm run build` (which generates the service worker and builds the React app).

### Step 4 — Add Vercel domain to Firebase

1. Firebase Console → Authentication → Sign-in method → **Authorized domains**
2. Add your Vercel URL (e.g. `habit-tracker-xxx.vercel.app`)

---

## Push Notification Cron Setup

Vercel Hobby plan doesn't support sub-hourly cron. Use **cron-job.org** (free):

1. Sign up at [cron-job.org](https://cron-job.org)
2. Create a new cronjob:
   - **URL:** `https://your-app.vercel.app/api/send-notifications?secret=YOUR_CRON_SECRET`
   - **Schedule:** Every 1 minute
   - **Request method:** GET
3. Save and enable

The endpoint checks each user's habits against the current minute, then fires FCM pushes for any due, uncompleted habits.

---

## Firestore Data Model

```
users/
  {uid}                         ← user profile document
    name: string
    setupDone: boolean
    timezone: string            ← e.g. "Asia/Kolkata"
    fcmToken: string | null     ← device push token
    updatedAt: timestamp

  {uid}/habits/
    {habitId}                   ← one document per habit
      name: string
      emoji: string             ← e.g. "🏃"
      color: string             ← hex color
      days: string[]            ← ["Mon","Tue","Wed","Thu","Fri"]
      time: string              ← "07:30" (24-hour)

  {uid}/completions/
    {YYYY-MM-DD}                ← one document per day
      {habitId}: boolean        ← true = completed
```

---

## User Manual

### First Launch

When you open the app for the first time you will see a **3-step setup wizard**:

1. **Your Name** — Enter what you'd like to be called.
2. **Add Habits** — Click **+ Add a Habit** to create each routine:
   - Pick an icon from the emoji grid
   - Type the habit name (e.g. "Morning Run")
   - Choose a color
   - Select which days it repeats (tap day initials)
   - Set a reminder time
   - Click **Add Habit** — repeat for all your habits
3. **Notifications** — Click **Enable Notifications** and allow the browser prompt. This lets the app remind you on time.

Click **Get Started!** to open your dashboard.

---

### Today Tab (📅)

- Shows today's date and a **circular progress ring** (% of habits done)
- Lists every habit scheduled for today, sorted by time
- **Tap any habit card** to toggle it complete (turns green with a ✓)
- Tap again to undo
- A motivational message updates as you complete more habits

---

### Habits Tab (✨)

- Lists all your habits with days and time
- **+ Add** button (top right) → opens a form to add a new habit
- **✏️ Edit** button → modify name, icon, color, days, or time
- **🗑️ Delete** button → removes the habit (history is preserved)

---

### Stats Tab (📊)

| Metric | What it means |
|---|---|
| Active Habits | Total habits you're tracking |
| Total Check-ins | All-time completion count |
| 7-Day Rate | % of scheduled habits completed in the last 7 days |
| Best Streak | Highest consecutive-day streak across all habits |

Each habit shows:
- **Day streak 🔥** — consecutive scheduled days completed
- **7-Day Rate %** — bar filled to that percentage
- **Week dots** — ✓ green = done, ✕ red = missed, grey = not scheduled that day

---

### Notifications

- When the app is **open**: in-tab reminders fire at the exact scheduled minute
- When the app is **closed**: push notifications arrive via FCM (requires notification permission + cron setup)
- To re-enable notifications: browser Settings → Site permissions → Notifications → Allow

---

### Sign Out

Tap the **🚪 Logout** button in the bottom navigation bar. Your data is safely stored in the cloud and will be waiting when you log back in.

---

## Project Structure

```
habit-tracker/
├── api/
│   └── send-notifications.js   # Vercel serverless — FCM push sender
├── public/
│   ├── firebase-messaging-sw.template.js  # SW template (committed)
│   └── firebase-messaging-sw.js           # Generated (gitignored)
├── scripts/
│   └── generate-sw.mjs         # Injects env vars into SW before build
├── src/
│   ├── firebase.js             # Firebase client init
│   ├── App.jsx                 # Root: auth guard + tab navigation
│   ├── context/
│   │   └── AuthContext.jsx     # Google auth context
│   ├── utils/
│   │   ├── storage.js          # localStorage helpers (offline-first cache)
│   │   ├── db.js               # Firestore cloud sync layer
│   │   └── notifications.js    # FCM + browser notification helpers
│   └── components/
│       ├── Auth/LoginPage.jsx
│       ├── Setup/SetupWizard.jsx
│       ├── Dashboard/Dashboard.jsx
│       ├── Habits/HabitManager.jsx
│       ├── Habits/HabitForm.jsx
│       └── Stats/Stats.jsx
├── .env.example                # Template — copy to .env.local
├── vercel.json                 # Vercel config
└── README.md
```

---

## License

MIT © 2025 [v508706](https://github.com/v508706)
