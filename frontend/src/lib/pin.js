/**
 * PIN utilities.
 *
 * Hashing: PBKDF2-SHA256 with a random per-PIN salt and a high iteration count,
 * stored as `pbkdf2$<iterations>$<saltB64>$<hashB64>`. A 4–6 digit PIN has very
 * few combinations, so a slow salted hash is what makes an exposed hash
 * expensive to brute-force. Legacy unsalted SHA-256 hex hashes still verify and
 * are flagged via `needsRehash` so callers can upgrade them on next unlock.
 *
 * Never store raw PINs — only hashes go to the database.
 */

const PBKDF2_ITERATIONS = 150_000
const PBKDF2_PREFIX = 'pbkdf2'

export const PIN_LENGTHS = [4, 6]

export function validatePin(pin, length) {
  if (!pin || typeof pin !== 'string') return { valid: false, error: 'PIN is required' }
  if (length && pin.length !== length) return { valid: false, error: `PIN must be ${length} digits` }
  if (!/^\d{4}$/.test(pin) && !/^\d{6}$/.test(pin)) return { valid: false, error: 'PIN must be exactly 4 or 6 digits' }
  return { valid: true }
}

/** Reject PINs that are trivially guessable (repeats, straight sequences, common picks). */
export function weakPinReason(pin) {
  if (/^(\d)\1+$/.test(pin)) return 'Avoid repeating the same digit.'
  const digits = pin.split('').map(Number)
  const asc = digits.every((d, i) => i === 0 || d === (digits[i - 1] + 1) % 10)
  const desc = digits.every((d, i) => i === 0 || d === (digits[i - 1] + 9) % 10)
  if (asc || desc) return 'Avoid simple sequences like 1234.'
  const common = ['1212', '1122', '2580', '0852', '6969', '1004', '2000', '121212', '112233', '159753', '696969', '123123', '010203']
  if (common.includes(pin)) return 'This PIN is too common. Choose another.'
  if (pin.length === 6 && pin.slice(0, 3) === pin.slice(3)) return 'Avoid repeating a pattern.'
  return null
}

const toB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)))
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

async function pbkdf2(pin, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(pin)), 'PBKDF2', false, ['deriveBits'])
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256)
}

async function legacySha256Hex(pin) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(pin)))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Constant-time comparison so timing doesn't reveal how much of the hash matched.
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function hashPin(pin) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const bits = await pbkdf2(pin, salt, PBKDF2_ITERATIONS)
  return `${PBKDF2_PREFIX}$${PBKDF2_ITERATIONS}$${toB64(salt)}$${toB64(bits)}`
}

export function needsRehash(storedHash) {
  return typeof storedHash === 'string' && !storedHash.startsWith(`${PBKDF2_PREFIX}$`)
}

export async function verifyPin(pin, storedHash) {
  if (!storedHash || typeof storedHash !== 'string') return false
  if (storedHash.startsWith(`${PBKDF2_PREFIX}$`)) {
    const [, iter, saltB64, hashB64] = storedHash.split('$')
    const iterations = Number(iter)
    if (!iterations || !saltB64 || !hashB64) return false
    const bits = await pbkdf2(pin, fromB64(saltB64), iterations)
    return safeEqual(toB64(bits), hashB64)
  }
  return safeEqual(await legacySha256Hex(pin), storedHash)
}

/**
 * Unlock state lives only in memory: it survives in-app navigation but not a
 * reload, and can't be forged by editing browser storage. Each unlock is tied
 * to the hash it was verified against, so changing the PIN elsewhere relocks.
 */
const UNLOCK_TTL_MS = 10 * 60 * 1000
const unlocks = new Map() // id → { expiresAt, hash }

export function isUnlocked(id, storedHash) {
  const u = unlocks.get(id)
  if (!u) return false
  if (Date.now() > u.expiresAt) { unlocks.delete(id); return false }
  if (storedHash && u.hash && u.hash !== storedHash) { unlocks.delete(id); return false }
  return true
}

export function setUnlocked(id, storedHash) {
  unlocks.set(id, { expiresAt: Date.now() + UNLOCK_TTL_MS, hash: storedHash || null })
}

export function lockItem(id) {
  unlocks.delete(id)
}

export function lockAll() {
  unlocks.clear()
}
