/**
 * Firestore cloud sync layer.
 * All writes go to localStorage first (instant) then sync to Firestore in the background.
 * On login, Firestore data is pulled down to localStorage.
 */
import {
  doc, collection, setDoc, getDoc, getDocs,
  writeBatch, serverTimestamp, deleteDoc,
} from 'firebase/firestore'
import { db } from '../firebase'
import {
  saveHabits, getHabits,
  saveCompletions, getCompletions,
  saveUserName, markSetupDone,
} from './storage'

// ─── Pull from Firestore → localStorage on login ────────────────────────────

export async function initUserData(uid) {
  try {
    const userSnap = await getDoc(doc(db, 'users', uid))
    const profile  = userSnap.exists() ? userSnap.data() : null

    if (profile?.name)      saveUserName(profile.name)
    if (profile?.setupDone) markSetupDone()

    const habitsSnap = await getDocs(collection(db, 'users', uid, 'habits'))
    const habits = habitsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    if (habits.length > 0) saveHabits(habits)

    const compSnap = await getDocs(collection(db, 'users', uid, 'completions'))
    if (!compSnap.empty) {
      const completions = {}
      compSnap.forEach(d => { completions[d.id] = d.data() })
      saveCompletions(completions)
    }

    return { setupDone: !!profile?.setupDone, name: profile?.name || '' }
  } catch (e) {
    console.warn('[db] initUserData failed, using local cache:', e.message)
    return null
  }
}

// ─── Profile ─────────────────────────────────────────────────────────────────

export async function cloudSaveProfile(uid, { name, setupDone, timezone }) {
  try {
    await setDoc(
      doc(db, 'users', uid),
      { name, setupDone, timezone, updatedAt: serverTimestamp() },
      { merge: true }
    )
  } catch (e) { console.warn('[db] profile sync failed:', e.message) }
}

// ─── Habits ──────────────────────────────────────────────────────────────────

export async function cloudSaveHabits(uid, habits) {
  try {
    const batch    = writeBatch(db)
    const existing = await getDocs(collection(db, 'users', uid, 'habits'))
    const newIds   = new Set(habits.map(h => h.id))

    existing.docs.forEach(d => { if (!newIds.has(d.id)) batch.delete(d.ref) })
    habits.forEach(({ id, ...data }) =>
      batch.set(doc(db, 'users', uid, 'habits', id), data, { merge: true })
    )
    await batch.commit()
  } catch (e) { console.warn('[db] habits sync failed:', e.message) }
}

// ─── Completions ─────────────────────────────────────────────────────────────

export async function cloudToggleCompletion(uid, habitId, date, value) {
  try {
    await setDoc(
      doc(db, 'users', uid, 'completions', date),
      { [habitId]: value },
      { merge: true }
    )
  } catch (e) { console.warn('[db] completion sync failed:', e.message) }
}

// ─── FCM token ───────────────────────────────────────────────────────────────

export async function cloudSaveFcmToken(uid, token) {
  try {
    await setDoc(doc(db, 'users', uid), { fcmToken: token }, { merge: true })
  } catch (e) { console.warn('[db] FCM token save failed:', e.message) }
}
