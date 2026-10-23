// Keeps each account's on-device data to that account.
//
// The app keeps a few conveniences in browser storage (last book used,
// reminder times, PIN-lock state, the push token). They are not user data
// in the database sense, but they must never carry over to the next person
// who signs in on the same phone. We remember which account owns this
// device's storage and wipe it whenever a different account signs in, and
// on every log out.

const OWNER_KEY = 'al_owner'
// Device-wide preferences that are fine to keep between accounts
const KEEP = new Set(['sl_dark', OWNER_KEY])

function wipe() {
  try {
    Object.keys(localStorage)
      .filter(k => (k.startsWith('al_') || k.startsWith('sl_')) && !KEEP.has(k))
      .forEach(k => localStorage.removeItem(k))
  } catch { /* storage unavailable */ }
  try {
    // Keep only "already saw the launch screen this session"
    const visited = sessionStorage.getItem('al_visited')
    sessionStorage.clear()
    if (visited) sessionStorage.setItem('al_visited', visited)
  } catch { /* storage unavailable */ }
}

/** Call when a user is signed in: clears anything left by a different account. */
export function claimDeviceFor(uid) {
  if (!uid) return
  try {
    const owner = localStorage.getItem(OWNER_KEY)
    if (owner && owner !== uid) wipe()
    localStorage.setItem(OWNER_KEY, uid)
  } catch { /* storage unavailable */ }
}

/** Call on log out and account deletion. */
export function releaseDevice() {
  wipe()
  try { localStorage.removeItem(OWNER_KEY) } catch { /* storage unavailable */ }
}
