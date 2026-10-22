import { ref, set, get } from 'firebase/database'
import { auth, db, requestFCMToken } from './firebase'

// LocalStorage Keys for persistent multi-time reminder config
const REMINDER_KEY_ENABLED = 'al_reminder_enabled'
const REMINDER_KEY_TIMES = 'al_reminder_times'
const REMINDER_KEY_TIME = 'al_reminder_time'

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
    vibrate: [100, 50, 100],
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

/** Budget alerts are on unless the user switched them off (and permission is granted). */
export function isBudgetAlertsEnabled() {
  try { return localStorage.getItem(BUDGET_ALERTS_KEY) !== 'false' } catch { return true }
}

export function setBudgetAlertsEnabled(on) {
  try { localStorage.setItem(BUDGET_ALERTS_KEY, String(Boolean(on))) } catch { /* storage unavailable */ }
}

export function triggerBudgetAlertNotification({ categoryName, spent, limit, percentage }) {
  if (!isBudgetAlertsEnabled()) return
  if (percentage >= 100) {
    sendNativeNotification(`🚨 Budget Exceeded: ${categoryName}`, {
      body: `You have reached ${Math.round(percentage)}% of your target budget (₹${spent.toLocaleString('en-IN')} / ₹${limit.toLocaleString('en-IN')}).`,
      tag: `budget-exceeded-${categoryName}`,
      data: { url: '/analytics' },
    })
  } else if (percentage >= 80) {
    sendNativeNotification(`⚠️ Budget Warning: ${categoryName}`, {
      body: `You have used ${Math.round(percentage)}% of your target budget (₹${spent.toLocaleString('en-IN')} / ₹${limit.toLocaleString('en-IN')}).`,
      tag: `budget-warning-${categoryName}`,
      data: { url: '/analytics' },
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
  if (!Array.isArray(times) || times.length === 0) {
    const single = localStorage.getItem(REMINDER_KEY_TIME) || '19:00'
    times = [single]
  }
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
    const path = `users/${auth.currentUser.uid}/reminderSettings`
    const snap = await get(ref(db, path))
    if (snap.exists()) {
      const data = snap.val()
      if (typeof data.enabled === 'boolean') {
        localStorage.setItem(REMINDER_KEY_ENABLED, String(data.enabled))
      }
      const times = Array.isArray(data.times) && data.times.length ? data.times : (data.time ? [data.time] : ['19:00'])
      localStorage.setItem(REMINDER_KEY_TIMES, JSON.stringify(times))
      localStorage.setItem(REMINDER_KEY_TIME, times[0])
      // Keep the server's idea of "7 PM" in this device's time zone
      const tz = userTimeZone()
      if (data.timezone !== tz) set(ref(db, `${path}/timezone`), tz).catch(() => {})
      return { enabled: Boolean(data.enabled), times, time: times[0] }
    }
  } catch (e) {
    console.warn('Failed to sync reminder settings from Firebase:', e)
  }
  return null
}

export function saveDailyReminderSettings({ enabled, times = ['19:00'] }) {
  const finalTimes = Array.isArray(times) && times.length > 0 ? times : ['19:00']
  localStorage.setItem(REMINDER_KEY_ENABLED, String(enabled))
  localStorage.setItem(REMINDER_KEY_TIMES, JSON.stringify(finalTimes))
  localStorage.setItem(REMINDER_KEY_TIME, finalTimes[0])

  if (auth.currentUser?.uid) {
    const path = `users/${auth.currentUser.uid}/reminderSettings`
    Promise.all([
      set(ref(db, `${path}/enabled`), Boolean(enabled)),
      set(ref(db, `${path}/times`), finalTimes),
      set(ref(db, `${path}/time`), finalTimes[0]),
      set(ref(db, `${path}/timezone`), userTimeZone()),
      set(ref(db, `${path}/updatedAt`), Date.now()),
    ]).catch((e) => console.warn('Firebase reminder save error:', e))
  }
  if (enabled) ensurePushRegistration()
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
    if (!token || !idToken) throw new Error('This device is not registered for push yet.')
    const res = await fetch(`${API_BASE}/api/v1/notifications/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.detail || `Server error ${res.status}`)
    const sent = Number(body.result?.success_count || 0)
    if (sent === 0) throw new Error('The server could not reach this device.')
    return { ok: true, sent, message: `Sent to ${sent} device${sent === 1 ? '' : 's'}. Close the app to see it arrive in the background.` }
  } catch (err) {
    // Fall back to a local notification so the user still sees something
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'TEST_NOTIFICATION' })
    } else {
      sendNativeNotification('ArthaLedger', { body: 'Notifications are working on this device.' })
    }
    return { ok: false, sent: 0, message: err?.message || 'Push server unreachable' }
  }
}

// App-open hook: refreshes this device's push registration
export function checkAndTriggerDailyReminder() {
  ensurePushRegistration()
}
