import { ref, set, get } from 'firebase/database'
import { auth, db } from './firebase'

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
    icon: '/L.png',
    badge: '/L.png',
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

export function triggerBudgetAlertNotification({ categoryName, spent, limit, percentage }) {
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
  let times = []
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

export function syncReminderWithServiceWorker() {
  const { enabled, times } = getDailyReminderSettings()
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SET_DAILY_REMINDER',
      enabled,
      times,
      time: times[0],
    })
  }
}

export async function syncReminderFromFirebase() {
  if (!auth.currentUser?.uid) return null
  try {
    const snap = await get(ref(db, `users/${auth.currentUser.uid}/reminderSettings`))
    if (snap.exists()) {
      const data = snap.val()
      if (typeof data.enabled === 'boolean') {
        localStorage.setItem(REMINDER_KEY_ENABLED, String(data.enabled))
      }
      let times = data.times || (data.time ? [data.time] : ['19:00'])
      localStorage.setItem(REMINDER_KEY_TIMES, JSON.stringify(times))
      localStorage.setItem(REMINDER_KEY_TIME, times[0])
      syncReminderWithServiceWorker()
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

  syncReminderWithServiceWorker()

  if (auth.currentUser?.uid) {
    set(ref(db, `users/${auth.currentUser.uid}/reminderSettings`), {
      enabled: Boolean(enabled),
      times: finalTimes,
      time: finalTimes[0],
      updatedAt: Date.now(),
    }).catch((e) => console.warn('Firebase reminder save error:', e))
  }
}

export async function testMobileNotification() {
  const token = localStorage.getItem('al_fcm_token')
  const apiBase = import.meta.env.VITE_API_URL || 'https://arthaledger-api.onrender.com'

  if (token) {
    fetch(`${apiBase}/api/v1/notifications/send-push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        title: '✍️ ArthaLedger Test Notification',
        body: "Mobile PWA notifications are connected! It's time to enter your today's expenses in ArthaLedger.",
        url: '/dashboard',
      }),
    }).catch((e) => console.warn('Backend push trigger error:', e))
  }

  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'TEST_NOTIFICATION' })
    return
  }
  sendNativeNotification('✍️ ArthaLedger Test Notification', {
    body: "Mobile notifications are working! It's time to enter your today's expenses in ArthaLedger.",
  })
}

// Client app-open daily reminder trigger is disabled to strictly rely on scheduled cloud push
export function checkAndTriggerDailyReminder() {
  syncReminderWithServiceWorker()
}
