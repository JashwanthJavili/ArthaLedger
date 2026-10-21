/* global __BUILD_ID__ */
// Keeps the installed app on the latest deploy without the user reloading.
//
// Every build writes /version.json with its build id (see vite.config.js).
// We check it when the app comes to the foreground and every few minutes.
// When a newer build exists we reload at a moment that won't interrupt:
// the next time the app returns from the background, or on the next page
// change — never while someone is typing.

const CURRENT = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev'
const CHECK_EVERY_MS = 5 * 60 * 1000
let updateReady = false
let lastCheck = 0

async function fetchLatestBuild() {
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    return data?.build || null
  } catch {
    return null // offline: keep running the current version
  }
}

export async function checkForUpdate() {
  if (CURRENT === 'dev' || updateReady) return updateReady
  const now = Date.now()
  if (now - lastCheck < 30 * 1000) return updateReady
  lastCheck = now
  const latest = await fetchLatestBuild()
  if (latest && latest !== CURRENT) {
    updateReady = true
    // Let the service worker pick up its new version too
    navigator.serviceWorker?.getRegistration?.().then(reg => reg?.update()).catch(() => {})
  }
  return updateReady
}

const isTyping = () => {
  const el = document.activeElement
  return Boolean(el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable))
}

/** Reload now if an update is waiting and it's a safe moment. */
export function applyUpdateIfReady() {
  if (updateReady && !isTyping()) {
    updateReady = false
    window.location.reload()
  }
}

export function startUpdateWatcher() {
  if (CURRENT === 'dev') return
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible') return
    // Returning to the app: apply a waiting update, else look for one
    if (updateReady) return applyUpdateIfReady()
    if (await checkForUpdate()) applyUpdateIfReady()
  })
  setInterval(checkForUpdate, CHECK_EVERY_MS)
  checkForUpdate()
}
