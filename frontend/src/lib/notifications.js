import { ref, set, get } from 'firebase/database'
import { auth, db } from './firebase'

// LocalStorage Keys for persistent reminder config
const REMINDER_KEY_ENABLED = 'al_reminder_enabled'
const REMINDER_KEY_TIME = 'al_reminder_time'
const REMINDER_KEY_LAST_SENT = 'al_reminder_last_sent'

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

  // Prefer ServiceWorker registration if available
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

  // Fallback to standard Notification constructor
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
  const time = localStorage.getItem(REMINDER_KEY_TIME) || '19:00'
  return { enabled, time }
}

export function syncReminderWithServiceWorker() {
  const { enabled, time } = getDailyReminderSettings()
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SET_DAILY_REMINDER',
      enabled,
      time,
    })
  }
}

export async function syncReminderFromFirebase() {
  if (!auth.currentUser?.uid) return
  try {
    const snap = await get(ref(db, `users/${auth.currentUser.uid}/reminderSettings`))
    if (snap.exists()) {
      const data = snap.val()
      if (typeof data.enabled === 'boolean') {
        localStorage.setItem(REMINDER_KEY_ENABLED, String(data.enabled))
      }
      if (data.time) {
        localStorage.setItem(REMINDER_KEY_TIME, data.time)
      }
      syncReminderWithServiceWorker()
      return data
    }
  } catch (e) {
    console.warn('Failed to sync reminder settings from Firebase:', e)
  }
  return null
}

export function saveDailyReminderSettings({ enabled, time = '19:00' }) {
  localStorage.setItem(REMINDER_KEY_ENABLED, String(enabled))
  localStorage.setItem(REMINDER_KEY_TIME, time)
  syncReminderWithServiceWorker()

  if (auth.currentUser?.uid) {
    set(ref(db, `users/${auth.currentUser.uid}/reminderSettings`), {
      enabled: Boolean(enabled),
      time,
      updatedAt: Date.now(),
    }).catch(e => console.warn('Firebase reminder save error:', e))
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
    }).catch(e => console.warn('Backend push trigger error:', e))
  }

  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'TEST_NOTIFICATION' })
    return
  }
  sendNativeNotification('✍️ ArthaLedger Test Notification', {
    body: "Mobile notifications are working! It's time to enter your today's expenses in ArthaLedger.",
  })
}

export function checkAndTriggerDailyReminder() {
  syncReminderWithServiceWorker()

  const { enabled, time } = getDailyReminderSettings()
  if (!enabled || getNotificationPermissionState() !== 'granted') return

  const now = new Date()
  const [targetHour, targetMinute] = time.split(':').map(Number)

  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()

  // Strictly check that the current time is within 0 to 2 minutes of the target reminder time
  const diffMinutes = (currentHour * 60 + currentMinute) - (targetHour * 60 + targetMinute)
  if (diffMinutes < 0 || diffMinutes > 2) return

  const todayStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`
  const lastSentDate = localStorage.getItem(REMINDER_KEY_LAST_SENT)

  if (lastSentDate === todayStr) return

  sendNativeNotification('✍️ Daily Expense Reminder', {
    body: "It's time to enter your today's expenses in ArthaLedger.",
    tag: 'daily-expense-reminder',
    data: { url: '/dashboard' },
  })

  localStorage.setItem(REMINDER_KEY_LAST_SENT, todayStr)
}
