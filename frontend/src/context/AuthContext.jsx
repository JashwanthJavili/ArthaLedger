import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  auth,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  reload,
} from '../lib/firebase'
import { unregisterPushForThisDevice } from '../lib/firebase'
import { claimDeviceFor, releaseDevice } from '../lib/deviceData'
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth'
import { getDoc, setDoc } from 'firebase/firestore'
import { deleteAllUserData, userDoc } from '../lib/userData'
import { translate } from '../i18n/core'

const AuthContext = createContext(null)

/** Map Firebase error codes → human-readable messages */
export function parseFirebaseError(err) {
  const code = err?.code || ''
  switch (code) {
    case 'auth/email-already-in-use':
      return translate('auth.errors.emailInUse')
    case 'auth/account-exists-with-different-credential':
      return translate('auth.errors.differentCredential')
    case 'auth/invalid-email':
      return translate('auth.errors.invalidEmail')
    case 'auth/weak-password':
      return translate('auth.errors.weakPassword')
    case 'auth/user-not-found':
      return translate('auth.errors.userNotFound')
    case 'auth/wrong-password':
      return translate('auth.errors.wrongPassword')
    case 'auth/invalid-credential':
      return translate('auth.errors.invalidCredential')
    case 'auth/too-many-requests':
      return translate('auth.errors.tooManyRequests')
    case 'auth/network-request-failed':
      return translate('auth.errors.network')
    case 'auth/popup-closed-by-user':
      return translate('auth.errors.popupClosed')
    case 'auth/cancelled-popup-request':
      return '' // silent
    case 'auth/requires-recent-login':
      return translate('auth.errors.requiresRecentLogin')
    default:
      // Raw Firebase messages are English-only; show the generic text instead
      return (!code && err?.message) || translate('common.somethingWrong')
  }
}

/** Cooldown tracker so we don't spam Firebase with resend requests */
const RESEND_COOLDOWN_MS = 60_000
let lastVerificationSentAt = 0

/** actionCodeSettings — redirect back to /login after clicking the link */
function buildActionCodeSettings() {
  return {
    url: `${window.location.origin}/login?verified=1`,
    handleCodeInApp: false,
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState(false) // true while register() is in progress
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState(() => {
    return sessionStorage.getItem('al_pending_email') || null
  })

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      // A different account on this device: drop the previous one's local data first
      if (nextUser) claimDeviceFor(nextUser.uid)
      setUser(nextUser)
      setLoading(false)
      if (nextUser?.emailVerified) {
        setPendingVerificationEmail(null)
        sessionStorage.removeItem('al_pending_email')
      }
    })
    return unsub
  }, [])

  // ── Helpers ───────────────────────────────────────────────────────────────

  const sendVerificationEmail = useCallback(async () => {
    const currentUser = auth.currentUser
    if (!currentUser) throw new Error(translate('auth.errors.noUser'))
    if (currentUser.emailVerified) return { alreadyVerified: true }

    const now = Date.now()
    if (now - lastVerificationSentAt < RESEND_COOLDOWN_MS) {
      const wait = Math.ceil((RESEND_COOLDOWN_MS - (now - lastVerificationSentAt)) / 1000)
      throw new Error(translate('auth.errors.waitBeforeResend', { seconds: wait }))
    }

    try {
      await sendEmailVerification(currentUser, buildActionCodeSettings())
      lastVerificationSentAt = Date.now()
      return { sent: true }
    } catch (err) {
      throw new Error(parseFirebaseError(err))
    }
  }, [])

  const reloadUser = useCallback(async () => {
    const currentUser = auth.currentUser
    if (!currentUser) return null
    try {
      await reload(currentUser)
      setUser(auth.currentUser)
      return auth.currentUser
    } catch {
      return null
    }
  }, [])

  // ── Auth actions ──────────────────────────────────────────────────────────

  const login = useCallback(async (email, password) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      // Reload to get fresh emailVerified status (handles cross-device verification)
      try { await reload(cred.user) } catch { /* non-fatal */ }
      const freshUser = auth.currentUser
      // Clear pending state
      setPendingVerificationEmail(null)
      sessionStorage.removeItem('al_pending_email')
      sessionStorage.removeItem('al_pending_pw')
      return { ...cred, user: freshUser }
    } catch (err) {
      throw new Error(parseFirebaseError(err))
    }
  }, [])

  const register = useCallback(async (name, email, password) => {
    setRegistering(true)
    let cred
    try {
      cred = await createUserWithEmailAndPassword(auth, email, password)
    } catch (err) {
      setRegistering(false)
      // Keep the code so the form can tell "email already in use" apart in any language
      throw Object.assign(new Error(parseFirebaseError(err)), { code: err?.code })
    }

    // Set display name
    if (name?.trim()) {
      try { await updateProfile(cred.user, { displayName: name.trim() }) } catch { /* non-fatal */ }
    }

    // Write profile to DB
    try {
      await setDoc(userDoc(cred.user.uid), { profile: {
        displayName: name?.trim() || '',
        email: cred.user.email,
        provider: 'password',
        emailVerified: false,
        createdAt: Date.now(),
      } }, { merge: true })
    } catch { /* non-fatal */ }

    // Send verification email — retry once if first attempt fails
    let emailSent = false
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        await sendEmailVerification(cred.user, buildActionCodeSettings())
        lastVerificationSentAt = Date.now()
        emailSent = true
        break
      } catch {
        if (attempt < 2) await new Promise((r) => setTimeout(r, 1500))
      }
    }
    if (!emailSent) {
      sessionStorage.setItem('al_verify_email_pending_send', '1')
    } else {
      sessionStorage.removeItem('al_verify_email_pending_send')
    }

    // Store email + password temporarily for the "I've verified" check
    // These are cleared once the user successfully signs in
    setPendingVerificationEmail(cred.user.email)
    sessionStorage.setItem('al_pending_email', cred.user.email)
    sessionStorage.setItem('al_pending_pw', password)

    // Sign out — they must verify before accessing the app
    await signOut(auth)
    setRegistering(false)

    return cred
  }, [])

  const googleSignIn = useCallback(async () => {
    try {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      const result = await signInWithPopup(auth, provider)
      const u = result.user

      setPendingVerificationEmail(null)
      sessionStorage.removeItem('al_pending_email')

      try {
        const snap = await getDoc(userDoc(u.uid))
        if (!snap.exists() || !snap.data().profile) {
          await setDoc(userDoc(u.uid), { profile: {
            displayName: u.displayName || '',
            email: u.email || '',
            provider: 'google',
            emailVerified: true,
            createdAt: Date.now(),
          } }, { merge: true })
        }
      } catch { /* non-fatal */ }

      return result
    } catch (err) {
      const msg = parseFirebaseError(err)
      if (msg) throw new Error(msg)
    }
  }, [])

  const resetPassword = useCallback(async (email) => {
    try {
      await sendPasswordResetEmail(auth, email)
    } catch (err) {
      throw new Error(parseFirebaseError(err))
    }
  }, [])

  const changePassword = useCallback(async (oldPassword, newPassword) => {
    const currentUser = auth.currentUser
    if (!currentUser?.email) throw new Error(translate('auth.errors.noUser'))
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, oldPassword)
      await reauthenticateWithCredential(currentUser, credential)
      await updatePassword(currentUser, newPassword)
    } catch (err) {
      throw new Error(parseFirebaseError(err))
    }
  }, [])

  const verifyPassword = useCallback(async (password) => {
    const currentUser = auth.currentUser
    if (!currentUser?.email) throw new Error(translate('auth.errors.noUser'))
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, password)
      await reauthenticateWithCredential(currentUser, credential)
    } catch (err) {
      throw new Error(parseFirebaseError(err))
    }
  }, [])

  const updateUserProfile = useCallback(async ({ displayName, phone, gender, dob, bio }) => {
    const currentUser = auth.currentUser
    if (!currentUser) throw new Error(translate('auth.errors.noUser'))

    // Update Firebase Auth display name
    if (displayName?.trim()) {
      try {
        await updateProfile(currentUser, { displayName: displayName.trim() })
        setUser({ ...auth.currentUser })
      } catch (err) {
        throw new Error(parseFirebaseError(err))
      }
    }

    // Update the saved profile
    try {
      const snap = await getDoc(userDoc(currentUser.uid))
      const existing = (snap.exists() && snap.data().profile) || {}
      await setDoc(userDoc(currentUser.uid), { profile: {
        ...existing,
        displayName: displayName?.trim() || existing.displayName || '',
        phone: phone?.trim() || '',
        gender: gender || '',
        dob: dob || '',
        bio: bio?.trim() || '',
        updatedAt: Date.now(),
      } }, { merge: true })
    } catch {
      throw new Error(translate('auth.errors.profileSaveFailed'))
    }
  }, [])

  const getUserProfile = useCallback(async () => {
    const currentUser = auth.currentUser
    if (!currentUser) return null
    try {
      const snap = await getDoc(userDoc(currentUser.uid))
      return (snap.exists() && snap.data().profile) || {}
    } catch {
      return {}
    }
  }, [])

  const logout = useCallback(async () => {
    // Unlink notifications while still signed in, then sign out and wipe local data
    await unregisterPushForThisDevice().catch(() => {})
    try {
      await signOut(auth)
    } catch { /* ignore */ }
    setPendingVerificationEmail(null)
    releaseDevice()
  }, [])

  const deleteAccount = useCallback(async (password) => {
    const currentUser = auth.currentUser
    if (!currentUser) throw new Error(translate('auth.errors.noUser'))

    const isPasswordUser = currentUser.providerData?.some((p) => p.providerId === 'password')
    if (isPasswordUser) {
      if (!password) throw new Error(translate('auth.errors.passwordToDelete'))
      try {
        const credential = EmailAuthProvider.credential(currentUser.email, password)
        await reauthenticateWithCredential(currentUser, credential)
      } catch (err) {
        throw new Error(parseFirebaseError(err))
      }
    }

    const uid = currentUser.uid
    // Data first, and stop if it fails: deleting the login while leaving the
    // records behind would orphan them (and break the privacy promise).
    try {
      await deleteAllUserData(uid)
    } catch {
      throw new Error(translate('auth.errors.deleteDataFailed'))
    }

    try {
      const { deleteUser } = await import('firebase/auth')
      await deleteUser(currentUser)
    } catch (err) {
      throw new Error(parseFirebaseError(err))
    }

    setPendingVerificationEmail(null)
    releaseDevice()
  }, [])

  // ── Derived state ─────────────────────────────────────────────────────────

  const isEmailVerified = useMemo(() => {
    if (!user) return false
    const isOAuth = user.providerData?.some((p) => p.providerId !== 'password')
    return user.emailVerified || isOAuth
  }, [user])

  const needsEmailVerification = useMemo(() => {
    if (pendingVerificationEmail && !user) return true
    if (user && !isEmailVerified) return true
    return false
  }, [pendingVerificationEmail, user, isEmailVerified])

  const value = useMemo(() => ({
    user,
    loading,
    registering,
    isEmailVerified,
    needsEmailVerification,
    pendingVerificationEmail,
    login,
    register,
    googleSignIn,
    resetPassword,
    changePassword,
    verifyPassword,
    updateUserProfile,
    getUserProfile,
    deleteAccount,
    sendVerificationEmail,
    reloadUser,
    logout,
  }), [
    user, loading, registering, isEmailVerified, needsEmailVerification, pendingVerificationEmail,
    login, register, googleSignIn,
    resetPassword, changePassword, verifyPassword, updateUserProfile, getUserProfile, deleteAccount,
    sendVerificationEmail, reloadUser, logout,
  ])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
