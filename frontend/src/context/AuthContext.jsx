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
  db,
} from '../lib/firebase'
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth'
import { get, ref, remove, set } from 'firebase/database'

const AuthContext = createContext(null)

/** Map Firebase error codes → human-readable messages */
export function parseFirebaseError(err) {
  const code = err?.code || ''
  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please sign in instead.'
    case 'auth/account-exists-with-different-credential':
      return 'This email is registered with a different sign-in method (e.g. Google). Please use that method.'
    case 'auth/invalid-email':
      return 'Please enter a valid email address.'
    case 'auth/weak-password':
      return 'Password is too weak. Use at least 6 characters.'
    case 'auth/user-not-found':
      return 'No account found with this email.'
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.'
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please try again.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.'
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection.'
    case 'auth/popup-closed-by-user':
      return 'Sign-in popup was closed. Please try again.'
    case 'auth/cancelled-popup-request':
      return '' // silent
    case 'auth/requires-recent-login':
      return 'For security, please sign out and sign in again before changing your password.'
    default:
      return err?.message || 'Something went wrong. Please try again.'
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
    if (!currentUser) throw new Error('No authenticated user.')
    if (currentUser.emailVerified) return { alreadyVerified: true }

    const now = Date.now()
    if (now - lastVerificationSentAt < RESEND_COOLDOWN_MS) {
      const wait = Math.ceil((RESEND_COOLDOWN_MS - (now - lastVerificationSentAt)) / 1000)
      throw new Error(`Please wait ${wait}s before requesting another email.`)
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
      throw new Error(parseFirebaseError(err))
    }

    // Set display name
    if (name?.trim()) {
      try { await updateProfile(cred.user, { displayName: name.trim() }) } catch { /* non-fatal */ }
    }

    // Write profile to DB
    try {
      await set(ref(db, `users/${cred.user.uid}/profile`), {
        displayName: name?.trim() || '',
        email: cred.user.email,
        provider: 'password',
        emailVerified: false,
        createdAt: Date.now(),
      })
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
        const snap = await get(ref(db, `users/${u.uid}/profile`))
        if (!snap.exists()) {
          await set(ref(db, `users/${u.uid}/profile`), {
            displayName: u.displayName || '',
            email: u.email || '',
            provider: 'google',
            emailVerified: true,
            createdAt: Date.now(),
          })
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
    if (!currentUser?.email) throw new Error('No authenticated user found.')
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, oldPassword)
      await reauthenticateWithCredential(currentUser, credential)
      await updatePassword(currentUser, newPassword)
    } catch (err) {
      throw new Error(parseFirebaseError(err))
    }
  }, [])

  const updateUserProfile = useCallback(async ({ displayName, phone, gender, dob, bio }) => {
    const currentUser = auth.currentUser
    if (!currentUser) throw new Error('No authenticated user found.')

    // Update Firebase Auth display name
    if (displayName?.trim()) {
      try {
        await updateProfile(currentUser, { displayName: displayName.trim() })
        setUser({ ...auth.currentUser })
      } catch (err) {
        throw new Error(parseFirebaseError(err))
      }
    }

    // Update profile in Realtime Database
    try {
      const profileRef = ref(db, `users/${currentUser.uid}/profile`)
      const snap = await get(profileRef)
      const existing = snap.val() || {}
      await set(profileRef, {
        ...existing,
        displayName: displayName?.trim() || existing.displayName || '',
        phone: phone?.trim() || '',
        gender: gender || '',
        dob: dob || '',
        bio: bio?.trim() || '',
        updatedAt: Date.now(),
      })
    } catch (err) {
      throw new Error('Failed to save profile. Please try again.')
    }
  }, [])

  const getUserProfile = useCallback(async () => {
    const currentUser = auth.currentUser
    if (!currentUser) return null
    try {
      const snap = await get(ref(db, `users/${currentUser.uid}/profile`))
      return snap.val() || {}
    } catch {
      return {}
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await signOut(auth)
      setPendingVerificationEmail(null)
      sessionStorage.removeItem('al_pending_email')
      sessionStorage.removeItem('al_pending_pw')
    } catch { /* ignore */ }
  }, [])

  const deleteAccount = useCallback(async (password) => {
    const currentUser = auth.currentUser
    if (!currentUser) throw new Error('No authenticated user found.')

    const isPasswordUser = currentUser.providerData?.some((p) => p.providerId === 'password')
    if (isPasswordUser) {
      if (!password) throw new Error('Please enter your password to confirm deletion.')
      try {
        const credential = EmailAuthProvider.credential(currentUser.email, password)
        await reauthenticateWithCredential(currentUser, credential)
      } catch (err) {
        throw new Error(parseFirebaseError(err))
      }
    }

    const uid = currentUser.uid
    try { await remove(ref(db, `users/${uid}`)) } catch { /* non-fatal */ }

    try {
      const { deleteUser } = await import('firebase/auth')
      await deleteUser(currentUser)
    } catch (err) {
      throw new Error(parseFirebaseError(err))
    }

    setPendingVerificationEmail(null)
    sessionStorage.clear()
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
    updateUserProfile,
    getUserProfile,
    deleteAccount,
    sendVerificationEmail,
    reloadUser,
    logout,
  }), [
    user, loading, registering, isEmailVerified, needsEmailVerification, pendingVerificationEmail,
    login, register, googleSignIn,
    resetPassword, changePassword, updateUserProfile, getUserProfile, deleteAccount,
    sendVerificationEmail, reloadUser, logout,
  ])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
