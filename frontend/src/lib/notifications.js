import { getDoc, setDoc } from 'firebase/firestore'
import { auth, requestFCMToken } from './firebase'
import { remindersDoc } from './userData'

// LocalStorage Keys for persistent multi-time reminder config
const REMINDER_KEY_ENABLED = 'al_reminder_enabled'
const REMINDER_KEY_TIMES = 'al_reminder_times'
const REMINDER_KEY_TIME = 'al_reminder_time'

// Four nudges a day by default: plan the morning, check in after lunch,
// wrap up the evening, and log before bed.
export const DEFAULT_REMINDER_TIMES = ['09:00', '13:30', '19:30', '22:00']
// Bumped when the default schedule changes; older saved schedules are upgraded once.
const SCHEDULE_VERSION = 2

export function parseTime24(timeStr) {
  if (!timeStr) return { hour: 19, minute: 0 }

  const str = String(timeStr).trim().toUpperCase()
  const isPM = str.includes('PM')
  const isAM = str.includes('AM')

  const cleanStr = str.replace(/AM|PM/g, '').trim()
  const parts = cleanStr.split(':').map((n) => parseInt(n, 10) || 0)

  let hour = parts[0] || 0
  const minute = parts[1] || 0

  if (isPM && hour < 12) hour += 12
  if (isAM && hour === 12) hour = 0

  return { hour, minute }
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'

  try {
    const permission = await Notification.requestPermission()
    return permission
  } catch (e) {
    console.error('Failed to request notification permission:', e)
    return 'denied'
  }
}

export function getNotificationPermissionState() {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission
}

export async function sendNativeNotification(title, options = {}) {
  if (!('Notification' in window)) return false
  if (Notification.permission !== 'granted') return false

  const defaultOptions = {
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-96.png',
    vibrate: [120, 60, 120],
    timestamp: Date.now(),
    ...options,
  }

  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready
      if (registration && registration.showNotification) {
        await registration.showNotification(title, defaultOptions)
        return true
      }
    } catch (e) {
      console.warn('SW notification fallback to window Notification:', e)
    }
  }

  try {
    new Notification(title, defaultOptions)
    return true
  } catch (e) {
    console.error('Failed to dispatch native notification:', e)
    return false
  }
}

const BUDGET_ALERTS_KEY = 'al_budget_alerts'

/** Budget alerts are off until the user switches them on in Settings. */
export function isBudgetAlertsEnabled() {
  try { return localStorage.getItem(BUDGET_ALERTS_KEY) === 'true' } catch { return false }
}

export function setBudgetAlertsEnabled(on) {
  try { localStorage.setItem(BUDGET_ALERTS_KEY, String(Boolean(on))) } catch { /* storage unavailable */ }
}

const inr = (n) => `\u20b9${Math.round(Number(n) || 0).toLocaleString('en-IN')}`

export function triggerBudgetAlertNotification({ categoryName, spent, limit, percentage }) {
  if (!isBudgetAlertsEnabled()) return
  const pct = Math.round(percentage)
  const left = Number(limit) - Number(spent)
  const common = {
    data: { url: '/analytics' },
    actions: [{ action: 'view', title: 'View budget' }, { action: 'dismiss', title: 'Dismiss' }],
    renotify: true,
  }
  if (percentage >= 100) {
    sendNativeNotification(`${categoryName} is over budget`, {
      ...common,
      body: `${inr(spent)} of ${inr(limit)} spent this month \u00b7 ${inr(-left)} over`,
      tag: `budget-${categoryName}`,
    })
  } else if (percentage >= 80) {
    sendNativeNotification(`${categoryName} \u00b7 ${pct}% of budget used`, {
      ...common,
      body: `${inr(spent)} of ${inr(limit)} spent \u00b7 ${inr(left)} left this month`,
      tag: `budget-${categoryName}`,
    })
  }
}

export function getDailyReminderSettings() {
  const enabled = localStorage.getItem(REMINDER_KEY_ENABLED) === 'true'
  let times
  try {
    times = JSON.parse(localStorage.getItem(REMINDER_KEY_TIMES) || '[]')
  } catch {
    times = []
  }
  if (!Array.isArray(times) || times.length === 0) times = [...DEFAULT_REMINDER_TIMES]
  return { enabled, times, time: times[0] }
}

const API_BASE = import.meta.env.VITE_API_URL || 'https://arthaledger-api.onrender.com'

function userTimeZone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata' } catch { return 'Asia/Kolkata' }
}

/**
 * Registers this device with the push server (FCM token saved under the user).
 * Safe to call often: it only does work when notifications are allowed.
 * Without a saved token the server has nowhere to send reminders, so this is
 * what makes notifications arrive while the app is closed.
 */
export async function ensurePushRegistration() {
  if (!auth.currentUser?.uid) return null
  if (!('Notification' in window) || Notification.permission !== 'granted') return null
  return requestFCMToken()
}

// Kept for older callers; the service worker no longer runs its own timers.
export function syncReminderWithServiceWorker() {}

export async function syncReminderFromFirebase() {
  if (!auth.currentUser?.uid) return null
  try {
    const settingsRef = remindersDoc(auth.currentUser.uid)
    const snap = await getDoc(settingsRef)
    if (snap.exists()) {
      const data = snap.data()
      if (typeof data.enabled === 'boolean') {
        localStorage.setItem(REMINDER_KEY_ENABLED, String(data.enabled))
      }
      let times = Array.isArray(data.times) && data.times.length ? data.times : (data.time ? [data.time] : [...DEFAULT_REMINDER_TIMES])
      // One-time upgrade to the four-a-day schedule
      if (Number(data.scheduleVersion || 1) < SCHEDULE_VERSION) {
        times = [...DEFAULT_REMINDER_TIMES]
        setDoc(settingsRef, { times, time: times[0], scheduleVersion: SCHEDULE_VERSION }, { merge: true }).catch(() => {})
      }
      localStorage.setItem(REMINDER_KEY_TIMES, JSON.stringify(times))
      localStorage.setItem(REMINDER_KEY_TIME, times[0])
      // Keep the server's idea of "7 PM" in this device's time zone
      const tz = userTimeZone()
      if (data.timezone !== tz) setDoc(settingsRef, { timezone: tz }, { merge: true }).catch(() => {})
      return { enabled: Boolean(data.enabled), times, time: times[0] }
    }
  } catch (e) {
    console.warn('Failed to sync reminder settings from Firebase:', e)
  }
  return null
}

export function saveDailyReminderSettings({ enabled, times = DEFAULT_REMINDER_TIMES }) {
  const finalTimes = Array.isArray(times) && times.length > 0 ? times : [...DEFAULT_REMINDER_TIMES]
  localStorage.setItem(REMINDER_KEY_ENABLED, String(enabled))
  localStorage.setItem(REMINDER_KEY_TIMES, JSON.stringify(finalTimes))
  localStorage.setItem(REMINDER_KEY_TIME, finalTimes[0])

  if (!auth.currentUser?.uid) return Promise.resolve()
  return setDoc(remindersDoc(auth.currentUser.uid), {
    enabled: Boolean(enabled),
    times: finalTimes,
    time: finalTimes[0],
    timezone: userTimeZone(),
    scheduleVersion: SCHEDULE_VERSION,
    updatedAt: Date.now(),
  }, { merge: true }).then(() => (enabled ? ensurePushRegistration() : null))
}

/** Reminder state as the server sees it: { enabled, times, timezone, devices, next_reminder }. */
export async function getServerReminderStatus() {
  const idToken = await auth.currentUser?.getIdToken()
  if (!idToken) throw new Error('Not signed in')
  const res = await fetch(`${API_BASE}/api/v1/notifications/status`, { headers: { Authorization: `Bearer ${idToken}` } })
  if (!res.ok) throw new Error(`Server error ${res.status}`)
  return res.json()
}

/**
 * Turns the daily reminder on, end to end. Used by both the Home prompt and
 * Settings so they behave identically:
 *   1. asks Android/the browser for notification permission (system dialog)
 *   2. saves the reminder times to the server
 *   3. registers this device for push
 *   4. asks the server to confirm what it now sees
 *
 * Resolves to { status } (status may be null if the server is still waking up).
 * Rejects with err.code: 'unsupported' | 'blocked' | 'not-granted' | 'save-failed' | 'no-device'.
 */
export async function enableDailyReminder(times = DEFAULT_REMINDER_TIMES) {
  const fail = (code, message) => Object.assign(new Error(message), { code })
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    throw fail('unsupported', 'This device doesn’t support notifications.')
  }
  if (Notification.permission === 'denied') {
    throw fail('blocked', 'Notifications are blocked. Allow them in phone Settings → Apps → ArthaLedger → Notifications.')
  }
  const perm = await requestNotificationPermission()
  if (perm === 'denied') throw fail('blocked', 'Notifications were blocked. You can allow them later in phone Settings → Apps → ArthaLedger.')
  if (perm !== 'granted') throw fail('not-granted', 'Notification permission is needed for reminders.')

  try {
    await saveDailyReminderSettings({ enabled: true, times })
  } catch {
    throw fail('save-failed', 'Couldn’t save the reminder. Check your connection and try again.')
  }
  const token = await ensurePushRegistration()
  if (!token) throw fail('no-device', 'Reminder saved, but this device couldn’t register for notifications.')

  let status = null
  try { status = await getServerReminderStatus() } catch { /* server waking up; settings are saved */ }
  return { status }
}

/**
 * Sends a real push through the server to every registered device of this
 * user — the same path daily reminders use, so it proves closed-app delivery.
 * Returns { ok, sent, message }.
 */
export async function testMobileNotification() {
  try {
    const token = await ensurePushRegistration()
    const idToken = await auth.currentUser?.getIdToken()
    if (!token) throw new Error('This device is not registered for push yet. Allow notifications first.')
    if (!idToken) throw new Error('Please sign in again.')
    // Send to THIS device only, so a test on the phone arrives on the phone
    const res = await fetch(`${API_BASE}/api/v1/notifications/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ token }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.detail || `Server error ${res.status}`)
    const sent = Number(body.result?.success_count || 0)
    if (sent === 0) {
      const why = body.result?.errors?.[0]?.error || 'unknown error'
      throw new Error(`The server couldn't reach this device (${why}). Turn notifications off and on again.`)
    }
    return { ok: true, sent, message: 'Sent to this device. Lock the phone or close the app to see it arrive.' }
  } catch (err) {
    // Fall back to a local notification so the user still sees something
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'TEST_NOTIFICATION' })
    } else {
      sendNativeNotification('Notifications are on', { body: 'This is how ArthaLedger reminders will look on this device.' })
    }
    return { ok: false, sent: 0, message: err?.message || 'Push server unreachable' }
  }
}

/** Short id of this device's push registration (matches the server's device list). */
export function thisDeviceId() {
  try { return (localStorage.getItem('al_fcm_token') || '').slice(-8) } catch { return '' }
}

/**
 * One-off reminder N minutes from now. Makes sure notifications are allowed
 * and this device is registered first. Resolves to { at (ms), minutesLeft }.
 */
export async function remindIn(minutes) {
  const perm = await requestNotificationPermission()
  if (perm !== 'granted') {
    throw new Error(perm === 'denied'
      ? 'Notifications are blocked. Allow them in phone Settings → Apps → ArthaLedger → Notifications.'
      : 'Notification permission is needed.')
  }
  const token = await ensurePushRegistration()
  if (!token) throw new Error('This device couldn’t register for notifications.')
  const idToken = await auth.currentUser?.getIdToken()
  if (!idToken) throw new Error('Please sign in again.')
  const res = await fetch(`${API_BASE}/api/v1/notifications/remind-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ minutes }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.detail || `Server error ${res.status} (it may be waking up — try again)`)
  const at = Number(body.at)
  return { at, minutesLeft: Math.max(1, Math.ceil((at - Date.now()) / 60000)) }
}

/** Next occurrence of any "HH:MM" time from now: { at: Date, minutes } or null. */
export function nextReminderInfo(times = [], now = new Date()) {
  let best = null
  for (const t of times) {
    const [h, m] = String(t).split(':').map(Number)
    if (Number.isNaN(h) || Number.isNaN(m)) continue
    const at = new Date(now)
    at.setHours(h, m, 0, 0)
    if (at <= now) at.setDate(at.getDate() + 1)
    if (!best || at < best) best = at
  }
  return best ? { at: best, minutes: Math.max(0, Math.ceil((best - now) / 60000)) } : null
}

/** "in 5 min" / "in 2 h 10 min" / "in 1 day" */
export function formatTimeLeft(minutes) {
  if (minutes <= 0) return 'now'
  if (minutes < 60) return `in ${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h >= 24) return 'in 1 day'
  return m ? `in ${h} h ${m} min` : `in ${h} h`
}

// App-open hook: refreshes this device's push registration
export function checkAndTriggerDailyReminder() {
  ensurePushRegistration()
}
