/**
 * Web Push & Native System Notifications for ArthaLedger
 */

const REMINDER_KEY_ENABLED = 'al_daily_reminder_enabled'
const REMINDER_KEY_TIME = 'al_daily_reminder_time' // e.g. "19:00"
const REMINDER_KEY_LAST_SENT = 'al_last_reminder_date'

export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return 'unsupported'
  }
  try {
    const permission = await Notification.requestPermission()
    return permission
  } catch (err) {
    console.error('Notification permission error:', err)
    return 'denied'
  }
}

export function getNotificationPermissionState() {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission // 'granted' | 'denied' | 'default'
}

export async function sendNativeNotification(title, options = {}) {
  if (!('Notification' in window)) return false
  if (Notification.permission !== 'granted') return false

  const defaultOptions = {
    icon: '/icon-192.svg',
    badge: '/icon-192.svg',
    vibrate: [100, 50, 100],
    ...options,
  }

  // Prefer ServiceWorker registration if available
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready
      if (reg && reg.showNotification) {
        await reg.showNotification(title, defaultOptions)
        return true
      }
    } catch (e) {
      console.warn('SW notification fallback to window Notification:', e)
    }
  }

  // Window Notification fallback
  try {
    new Notification(title, defaultOptions)
    return true
  } catch (err) {
    console.error('Failed to trigger notification:', err)
    return false
  }
}

/**
 * Triggers a native Push Alert when a Category Budget threshold (80% or 100%) is crossed
 */
export function triggerBudgetAlertNotification({ category, pct, spent, soft, symbol = '₹' }) {
  if (getNotificationPermissionState() !== 'granted') return

  const formattedPct = Math.round(pct)
  let title = ''
  let body = ''

  if (pct >= 100) {
    title = `🚨 Budget Exceeded: ${category}`
    body = `You have reached ${formattedPct}% of your ${category} budget (${symbol}${spent.toLocaleString()} / ${symbol}${soft.toLocaleString()}).`
  } else if (pct >= 80) {
    title = `⚠️ Budget Warning: ${category}`
    body = `You have used ${formattedPct}% of your ${category} budget (${symbol}${spent.toLocaleString()} / ${symbol}${soft.toLocaleString()}).`
  } else {
    return
  }

  sendNativeNotification(title, {
    body,
    tag: `budget-alert-${category}`,
    data: { url: '/analytics' },
  })
}

/**
 * Daily Reminder Settings & Trigger Functions
 */

export function getDailyReminderSettings() {
  const enabled = localStorage.getItem(REMINDER_KEY_ENABLED) === 'true'
  const time = localStorage.getItem(REMINDER_KEY_TIME) || '19:00'
  return { enabled, time }
}

export function saveDailyReminderSettings({ enabled, time = '19:00' }) {
  localStorage.setItem(REMINDER_KEY_ENABLED, String(enabled))
  localStorage.setItem(REMINDER_KEY_TIME, time)
}

export function checkAndTriggerDailyReminder() {
  const { enabled, time } = getDailyReminderSettings()
  if (!enabled || getNotificationPermissionState() !== 'granted') return

  const now = new Date()
  const [targetHour, targetMinute] = time.split(':').map(Number)

  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()

  // Check if current time has passed target time today
  const isTimeForReminder =
    currentHour > targetHour || (currentHour === targetHour && currentMinute >= targetMinute)

  if (!isTimeForReminder) return

  const todayStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`
  const lastSentDate = localStorage.getItem(REMINDER_KEY_LAST_SENT)

  // Avoid sending multiple reminders on the same day
  if (lastSentDate === todayStr) return

  // Trigger Notification
  sendNativeNotification('✍️ Daily Expense Reminder', {
    body: "It's time for your evening check-in! Don't forget to log today's cash in & cash out transactions.",
    tag: 'daily-expense-reminder',
    data: { url: '/dashboard' },
  })

  localStorage.setItem(REMINDER_KEY_LAST_SENT, todayStr)
}
