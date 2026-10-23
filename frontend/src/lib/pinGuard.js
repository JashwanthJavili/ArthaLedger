import { deleteDoc, getDoc, setDoc } from 'firebase/firestore'
import { pinGuardDoc } from './userData'

/**
 * Wrong-PIN attempt guard, keyed by the locked item's id.
 *
 * Stored in the user's database record (so clearing the browser, a new tab or
 * another device doesn't reset it) and mirrored in localStorage as a fallback.
 * Reads take the stricter of the two.
 *
 * Schedule: 5 free attempts, then 30s, 1m, 2m, 4m … doubling, capped at 1 hour.
 */
export const FREE_ATTEMPTS = 5
const MAX_LOCK_MS = 60 * 60 * 1000

export function lockoutMsFor(failures) {
  if (failures < FREE_ATTEMPTS) return 0
  return Math.min(30_000 * 2 ** (failures - FREE_ATTEMPTS), MAX_LOCK_MS)
}

const EMPTY = { failures: 0, lockedUntil: 0 }
const localKey = (id) => `al_pin_guard_${id}`

function readLocal(id) {
  try { return { ...EMPTY, ...(JSON.parse(localStorage.getItem(localKey(id)) || 'null') || {}) } } catch { return { ...EMPTY } }
}
function writeLocal(id, value) {
  try { localStorage.setItem(localKey(id), JSON.stringify(value)) } catch { /* storage unavailable */ }
}

export async function readGuard(uid, id) {
  const local = readLocal(id)
  let remote = { ...EMPTY }
  if (uid && id) {
    try {
      const snap = await getDoc(pinGuardDoc(uid, id))
      remote = { ...EMPTY, ...(snap.exists() ? snap.data() : {}) }
    } catch { /* offline: use local */ }
  }
  return {
    failures: Math.max(Number(local.failures) || 0, Number(remote.failures) || 0),
    lockedUntil: Math.max(Number(local.lockedUntil) || 0, Number(remote.lockedUntil) || 0),
  }
}

export async function recordFailure(uid, id) {
  const current = await readGuard(uid, id)
  const failures = current.failures + 1
  const ms = lockoutMsFor(failures)
  const next = { failures, lockedUntil: ms ? Date.now() + ms : 0 }
  writeLocal(id, next)
  if (uid && id) {
    try { await setDoc(pinGuardDoc(uid, id), next) } catch { /* local copy still applies */ }
  }
  return next
}

export async function clearGuard(uid, id) {
  try { localStorage.removeItem(localKey(id)) } catch { /* ignore */ }
  if (uid && id) {
    try { await deleteDoc(pinGuardDoc(uid, id)) } catch { /* ignore */ }
  }
}
