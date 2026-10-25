import { getDoc, setDoc } from 'firebase/firestore'
import { auth, requestFCMToken } from './firebase'
import { remindersDoc } from './userData'
import { translate } from '../i18n/core'

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
    actions: [{ action: 'view', title: translate('reminders.budget.view') }, { action: 'dismiss', title: translate('reminders.budget.dismiss') }],
    renotify: true,
  }
  if (percentage >= 100) {
    sendNativeNotification(translate('reminders.budget.overTitle', { category: categoryName }), {
      ...common,
      body: translate('reminders.budget.overBody', { spent: inr(spent), limit: inr(limit), over: inr(-left) }),
      tag: `budget-${categoryName}`,
    })
  } else if (percentage >= 80) {
    sendNativeNotification(translate('reminders.budget.nearTitle', { category: categoryName, pct }), {
      ...common,
      body: translate('reminders.budget.nearBody', { spent: inr(spent), limit: inr(limit), left: inr(left) }),
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
  if (!idToken) throw new Error(translate('reminders.errors.notSignedIn'))
  const res = await fetch(`${API_BASE}/api/v1/notifications/status`, { headers: { Authorization: `Bearer ${idToken}` } })
  if (!res.ok) throw new Error(translate('reminders.errors.serverError', { status: res.status }))
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
    throw fail('unsupported', translate('reminders.errors.unsupported'))
  }
  if (Notification.permission === 'denied') {
    throw fail('blocked', translate('reminders.errors.blockedSettings'))
  }
  const perm = await requestNotificationPermission()
  if (perm === 'denied') throw fail('blocked', translate('reminders.errors.blockedLater'))
  if (perm !== 'granted') throw fail('not-granted', translate('reminders.errors.needed'))

  try {
    await saveDailyReminderSettings({ enabled: true, times })
  } catch {
    throw fail('save-failed', translate('reminders.errors.saveFailed'))
  }
  const token = await ensurePushRegistration()
  if (!token) throw fail('no-device', translate('reminders.errors.noDevice'))

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
    if (!token) throw new Error(translate('reminders.errors.notRegistered'))
    if (!idToken) throw new Error(translate('reminders.errors.signInAgain'))
    // Send to THIS device only, so a test on the phone arrives on the phone
    const res = await fetch(`${API_BASE}/api/v1/notifications/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ token }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.detail || translate('reminders.errors.serverError', { status: res.status }))
    const sent = Number(body.result?.success_count || 0)
    if (sent === 0) {
      const why = body.result?.errors?.[0]?.error || translate('reminders.errors.unknownError')
      throw new Error(translate('reminders.errors.unreachableDevice', { why }))
    }
    return { ok: true, sent, message: translate('reminders.test.sentOk') }
  } catch (err) {
    // Fall back to a local notification so the user still sees something
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'TEST_NOTIFICATION', title: translate('reminders.test.title'), body: translate('reminders.test.body') })
    } else {
      sendNativeNotification(translate('reminders.test.title'), { body: translate('reminders.test.body') })
    }
    return { ok: false, sent: 0, message: err?.message || translate('reminders.errors.pushUnreachable') }
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
      ? translate('reminders.errors.blockedSettings')
      : translate('reminders.errors.permissionNeeded'))
  }
  const token = await ensurePushRegistration()
  if (!token) throw new Error(translate('reminders.errors.cantRegister'))
  const idToken = await auth.currentUser?.getIdToken()
  if (!idToken) throw new Error(translate('reminders.errors.signInAgain'))
  const res = await fetch(`${API_BASE}/api/v1/notifications/remind-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ minutes }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.detail || translate('reminders.errors.serverWaking', { status: res.status }))
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
  if (minutes <= 0) return translate('reminders.timeLeft.now')
  if (minutes < 60) return translate('reminders.timeLeft.minutes', { count: minutes })
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h >= 24) return translate('reminders.timeLeft.day')
  return m ? translate('reminders.timeLeft.hoursMinutes', { hours: h, minutes: m }) : translate('reminders.timeLeft.hours', { count: h })
}

// App-open hook: refreshes this device's push registration
export function checkAndTriggerDailyReminder() {
  ensurePushRegistration()
}
