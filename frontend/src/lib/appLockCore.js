/*
 * App lock: the app asks for a PIN (or this phone's fingerprint) every time
 * it opens or comes back to the screen.
 *
 * - The setting lives on the account (users/{uid}.appLock = { pinHash,
 *   pinLength }), so clearing the browser or using another device doesn't
 *   turn it off. A copy is kept on this device so the lock also holds offline
 *   and before the account has loaded.
 * - Fingerprint is per device: a platform passkey (WebAuthn) made on this
 *   phone. Each unlock is a fresh challenge whose signature is checked
 *   against the public key saved when it was set up.
 * - Whether this visit is unlocked is kept only in memory, so every reload
 *   and every return to the app starts locked.
 */

export const GUARD_ID = 'appLock'

// ── This visit: locked or unlocked (memory only) ────────────────────────────
let unlocked = false
let paused = 0
const listeners = new Set()
const emit = () => listeners.forEach((fn) => fn())

export const lockSession = {
  isUnlocked: () => unlocked,
  unlock() { if (!unlocked) { unlocked = true; emit() } },
  lock() { if (unlocked && paused === 0) { unlocked = false; emit() } },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn) },
}

/** Runs fn without locking when the screen briefly hides (e.g. a system fingerprint prompt). */
export async function withLockPaused(fn) {
  paused += 1
  try { return await fn() } finally {
    // the page reports "visible" again a moment after the system prompt closes
    setTimeout(() => { paused = Math.max(0, paused - 1) }, 1500)
  }
}

/**
 * Picking a file or sharing briefly hides the app; that's the person's own
 * action, so the lock waits until the app has focus again.
 */
export function pauseUntilFocus() {
  paused += 1
  const done = () => {
    window.removeEventListener('focus', done)
    setTimeout(() => { paused = Math.max(0, paused - 1) }, 1500)
  }
  window.addEventListener('focus', done)
}

// ── The setting, mirrored on this device ────────────────────────────────────
const localKey = (uid) => `artha.lock.${uid}`

export function readLocalLock(uid) {
  try {
    const v = JSON.parse(localStorage.getItem(localKey(uid)) || 'null')
    return v && typeof v.pinHash === 'string' ? { pinHash: v.pinHash, pinLength: v.pinLength } : null
  } catch { return null }
}

export function writeLocalLock(uid, config) {
  try {
    if (config) localStorage.setItem(localKey(uid), JSON.stringify({ pinHash: config.pinHash, pinLength: config.pinLength }))
    else localStorage.removeItem(localKey(uid))
  } catch { /* storage unavailable: the account copy still applies */ }
}

export function lockFromUserDoc(data) {
  const v = data?.appLock
  return v && typeof v.pinHash === 'string' && v.pinHash ? { pinHash: v.pinHash, pinLength: v.pinLength === 4 ? 4 : 6 } : null
}

// ── Fingerprint (WebAuthn platform authenticator) ───────────────────────────
const bioKey = (uid) => `artha.lock.bio.${uid}`
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const fromB64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0))

export async function canUseFingerprint() {
  try {
    return Boolean(window.PublicKeyCredential && window.isSecureContext)
      && await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch { return false }
}

export function hasFingerprint(uid) {
  try { return Boolean(JSON.parse(localStorage.getItem(bioKey(uid)) || 'null')?.id) } catch { return false }
}

export function removeFingerprint(uid) {
  try { localStorage.removeItem(bioKey(uid)) } catch { /* ignore */ }
}

/** Sets up fingerprint unlock on this device. Throws if the person cancels or it isn't possible. */
export async function enrollFingerprint(user) {
  const cred = await withLockPaused(() => navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: 'ArthaLedger', id: window.location.hostname },
      user: {
        id: crypto.getRandomValues(new Uint8Array(16)),
        name: user.email || 'ArthaLedger',
        displayName: user.displayName || user.email || 'ArthaLedger',
      },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged', requireResidentKey: false },
      timeout: 60000,
      attestation: 'none',
    },
  }))
  if (!cred) throw new Error('cancelled')
  const pk = typeof cred.response.getPublicKey === 'function' ? cred.response.getPublicKey() : null
  const alg = typeof cred.response.getPublicKeyAlgorithm === 'function' ? cred.response.getPublicKeyAlgorithm() : null
  localStorage.setItem(bioKey(user.uid), JSON.stringify({ id: b64u(cred.rawId), pk: pk ? b64u(pk) : null, alg }))
}

const sha256 = async (bytes) => new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))

// ECDSA signatures arrive DER-encoded; WebCrypto wants r||s (32 bytes each)
function derToRaw(der) {
  let i = 2
  if (der[1] & 0x80) i += der[1] & 0x7f
  const part = () => {
    if (der[i] !== 0x02) throw new Error('bad signature')
    const len = der[i + 1]
    let v = der.slice(i + 2, i + 2 + len)
    i += 2 + len
    while (v.length > 32 && v[0] === 0) v = v.slice(1)
    const out = new Uint8Array(32)
    out.set(v, 32 - v.length)
    return out
  }
  const r = part()
  const s = part()
  const raw = new Uint8Array(64)
  raw.set(r, 0)
  raw.set(s, 32)
  return raw
}

/** True only if this phone's fingerprint (or face/screen lock) just confirmed the person. */
export async function verifyFingerprint(uid) {
  let bio
  try { bio = JSON.parse(localStorage.getItem(bioKey(uid)) || 'null') } catch { bio = null }
  if (!bio?.id) return false
  const challenge = crypto.getRandomValues(new Uint8Array(32))
  const assertion = await withLockPaused(() => navigator.credentials.get({
    publicKey: {
      challenge,
      rpId: window.location.hostname,
      allowCredentials: [{ type: 'public-key', id: fromB64u(bio.id), transports: ['internal'] }],
      userVerification: 'required',
      timeout: 60000,
    },
  }))
  if (!assertion || b64u(assertion.rawId) !== bio.id) return false
  const { clientDataJSON, authenticatorData, signature } = assertion.response
  const client = JSON.parse(new TextDecoder().decode(clientDataJSON))
  if (client.type !== 'webauthn.get' || client.challenge !== b64u(challenge) || client.origin !== window.location.origin) return false
  const auth = new Uint8Array(authenticatorData)
  const rpHash = await sha256(new TextEncoder().encode(window.location.hostname))
  if (!rpHash.every((b, k) => auth[k] === b)) return false
  if (!(auth[32] & 0x01) || !(auth[32] & 0x04)) return false // user present and verified
  if (!bio.pk) return true // older browsers don't expose the key; the checks above still hold

  const signed = new Uint8Array(auth.length + 32)
  signed.set(auth, 0)
  signed.set(await sha256(clientDataJSON), auth.length)
  const spki = fromB64u(bio.pk)
  if (bio.alg === -257) {
    const key = await crypto.subtle.importKey('spki', spki, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'])
    return crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature, signed)
  }
  const key = await crypto.subtle.importKey('spki', spki, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
  return crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, derToRaw(new Uint8Array(signature)), signed)
}
