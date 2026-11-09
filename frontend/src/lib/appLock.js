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
import { deleteField, setDoc, updateDoc } from 'firebase/firestore'
import { userDoc } from './userData'
import { clearGuard } from './pinGuard'
import { GUARD_ID, lockSession, removeFingerprint, writeLocalLock } from './appLockCore.js'

export * from './appLockCore.js'

export async function saveLock(uid, pinHash, pinLength) {
  const config = { pinHash, pinLength, updatedAt: Date.now() }
  lockSession.unlock() // whoever sets it is already in
  await setDoc(userDoc(uid), { appLock: config }, { merge: true })
  writeLocalLock(uid, config)
}

export async function removeLock(uid) {
  await updateDoc(userDoc(uid), { appLock: deleteField() })
  writeLocalLock(uid, null)
  removeFingerprint(uid)
  await clearGuard(uid, GUARD_ID)
}

