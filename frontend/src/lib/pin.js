/**
 * PIN utilities — SHA-256 hashing via Web Crypto API.
 * PINs are exactly 4 or 6 numeric digits.
 * Never store raw PINs — only hashes go to Firebase.
 */

const PIN_REGEX = /^\d{4}$|^\d{6}$/

export function validatePin(pin) {
  // Validate PIN format. Returns { valid: bool, error?: string }
  if (!pin || typeof pin !== 'string') {
    return { valid: false, error: 'PIN is required' }
  }
  if (!/^\d{4}$/.test(pin) && !/^\d{6}$/.test(pin)) {
    return { valid: false, error: 'PIN must be exactly 4 or 6 digits' }
  }
  return { valid: true }
}

export async function hashPin(pin) {
  const encoder = new TextEncoder()
  const data = encoder.encode(String(pin))
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyPin(pin, storedHash) {
  const hash = await hashPin(pin)
  return hash === storedHash
}

/**
 * Session unlock store.
 * Each unlock is stored in sessionStorage with a TTL of 10 minutes.
 * When the user navigates away and comes back (new page load or after TTL),
 * they must re-enter the PIN.
 */
const UNLOCK_TTL_MS = 10 * 60 * 1000 // 10 minutes

function _key(id) {
  return `al_pin_unlock_${id}`
}

function _lockoutKey(id) {
  return `al_pin_lockout_${id}`
}

function _attemptsKey(id) {
  return `al_pin_attempts_${id}`
}

export function isUnlocked(id) {
  try {
    const raw = sessionStorage.getItem(_key(id))
    if (!raw) return false
    const { expiresAt } = JSON.parse(raw)
    if (Date.now() > expiresAt) {
      sessionStorage.removeItem(_key(id))
      return false
    }
    return true
  } catch {
    return false
  }
}

export function setUnlocked(id) {
  try {
    sessionStorage.setItem(_key(id), JSON.stringify({
      unlockedAt: Date.now(),
      expiresAt: Date.now() + UNLOCK_TTL_MS,
    }))
  } catch { /* ignore storage errors */ }
}

export function lockItem(id) {
  try {
    sessionStorage.removeItem(_key(id))
  } catch { /* ignore */ }
}

export function lockAll() {
  try {
    const keys = Object.keys(sessionStorage).filter(k => k.startsWith('al_pin_unlock_'))
    keys.forEach(k => sessionStorage.removeItem(k))
  } catch { /* ignore */ }
}

// ── PIN Attempt Tracking (Rate Limiting) ───────────────────────────────────

/**
 * Get PIN attempt data for an item (persisted across page refresh).
 * Returns: { attempts: number, lockedUntil: timestamp ms or 0 }
 */
export function getPinAttemptData(id) {
  try {
    const lockoutRaw = sessionStorage.getItem(_lockoutKey(id))
    const attemptsRaw = sessionStorage.getItem(_attemptsKey(id))

    const lockoutData = lockoutRaw ? JSON.parse(lockoutRaw) : { lockedUntil: 0 }
    const attemptsData = attemptsRaw ? JSON.parse(attemptsRaw) : { attempts: 0, lastAttemptAt: 0 }

    // If lockout has expired, clear it
    if (lockoutData.lockedUntil > 0 && Date.now() > lockoutData.lockedUntil) {
      sessionStorage.removeItem(_lockoutKey(id))
      lockoutData.lockedUntil = 0
    }

    return {
      attempts: attemptsData.attempts,
      lockedUntil: lockoutData.lockedUntil,
      lastAttemptAt: attemptsData.lastAttemptAt,
    }
  } catch {
    return { attempts: 0, lockedUntil: 0, lastAttemptAt: 0 }
  }
}

/**
 * Record a failed PIN attempt.
 * Returns: { lockedUntil: timestamp ms or 0, shouldLock: boolean, lockoutSeconds: number }
 */
export function recordPinAttempt(id) {
  try {
    const current = getPinAttemptData(id)
    const newAttempts = current.attempts + 1

    // Determine if we should trigger lockout
    let lockoutSeconds = 0
    if (newAttempts >= 9) lockoutSeconds = 15 * 60 + Math.random() * 5 * 60 // 15-20 min with jitter
    else if (newAttempts >= 6) lockoutSeconds = 5 * 60 + Math.random() * 2 * 60 // 5-7 min with jitter
    else if (newAttempts >= 3) lockoutSeconds = 1 * 60 + Math.random() * 1 * 60 // 1-2 min with jitter

    const lockedUntil = lockoutSeconds > 0 ? Date.now() + lockoutSeconds * 1000 : 0

    // Persist
    sessionStorage.setItem(_attemptsKey(id), JSON.stringify({
      attempts: newAttempts,
      lastAttemptAt: Date.now(),
    }))

    if (lockedUntil > 0) {
      sessionStorage.setItem(_lockoutKey(id), JSON.stringify({ lockedUntil }))
    }

    return {
      newAttempts,
      lockedUntil,
      lockoutSeconds: Math.ceil(lockoutSeconds),
    }
  } catch {
    return { newAttempts: 1, lockedUntil: 0, lockoutSeconds: 0 }
  }
}

/**
 * Clear PIN attempt tracking for an item (call after successful PIN entry).
 */
export function clearPinAttempts(id) {
  try {
    sessionStorage.removeItem(_attemptsKey(id))
    sessionStorage.removeItem(_lockoutKey(id))
  } catch { /* ignore */ }
}
