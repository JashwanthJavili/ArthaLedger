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
import { get, ref, set } from 'firebase/database'

const AuthContext = createContext(null)

/** Map Firebase error codes → human-readable messages */
export function parseFirebaseError(err) {
  const code = err?.code || ''
  switch (code) {
    case 'auth/email-already-in-use':
      return 'EMAIL_ALREADY_IN_USE'   // handled specially in register flow
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

/** actionCodeSettings for email verification */
function buildActionCodeSettings() {
  return {
    url: `${window.location.origin}/login?verified=1`,
    handleCodeInApp: false,
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  /**
   * pendingVerificationEmail: stores the email address of a user who just
   * registered but was signed out pending verification. This lets the
   * VerifyEmailPage show the correct email even though user === null.
   */
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState(() => {
    // Persist across page refreshes via sessionStorage
    return sessionStorage.getItem('al_pending_email') || null
  })

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setLoading(false)
      // Once the user is verified and signed in, clear the pending email
      if (nextUser?.emailVerified) {
        setPendingVerificationEmail(null)
        sessionStorage.removeItem('al_pending_email')
      }
    })
    return unsub
  }, [])

  // ── Helpers ──────────────────────────────────────────────────────────────

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
      // Use auth.currentUser directly — don't spread (loses prototype methods)
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
      // Clear pending email on successful login
      setPendingVerificationEmail(null)
      sessionStorage.removeItem('al_pending_email')
      return cred
    } catch (err) {
      throw new Error(parseFirebaseError(err))
    }
  }, [])

  const register = useCallback(async (name, email, password) => {
    // Step 1: Try to create the account
    let cred
    try {
      cred = await createUserWithEmailAndPassword(auth, email, password)
    } catch (err) {
      const msg = parseFirebaseError(err)

      // Special case: account exists but may be unverified
      if (msg === 'EMAIL_ALREADY_IN_USE') {
        // Try to sign in silently to check verification status
        try {
          const existing = await signInWithEmailAndPassword(auth, email, password)
          if (!existing.user.emailVerified) {
            // Account exists but unverified — resend verification and redirect
            try {
              await sendEmailVerification(existing.user, buildActionCodeSettings())
              lastVerificationSentAt = Date.now()
            } catch { /* non-fatal */ }
            // Store email for the verify page, then sign out
            setPendingVerificationEmail(email)
            sessionStorage.setItem('al_pending_email', email)
            await signOut(auth)
            // Signal to the caller that we should go to verify-email
            throw new Error('UNVERIFIED_ACCOUNT')
          } else {
            // Account exists AND is verified — tell them to just sign in
            await signOut(auth)
            throw new Error('An account with this email already exists. Please sign in instead.')
          }
        } catch (innerErr) {
          // If the inner error is one we threw, re-throw it
          if (innerErr.message === 'UNVERIFIED_ACCOUNT' ||
              innerErr.message.includes('already exists')) {
            throw innerErr
          }
          // Wrong password or other sign-in error — just say account exists
          throw new Error('An account with this email already exists. Please sign in instead.')
        }
      }

      throw new Error(msg)
    }

    // Step 2: Account created — set display name
    if (name?.trim()) {
      try { await updateProfile(cred.user, { displayName: name.trim() }) } catch { /* non-fatal */ }
    }

    // Step 3: Write profile to DB (non-fatal)
    try {
      await set(ref(db, `users/${cred.user.uid}/profile`), {
        displayName: name?.trim() || '',
        email: cred.user.email,
        provider: 'password',
        emailVerified: false,
        createdAt: Date.now(),
      })
    } catch { /* non-fatal */ }

    // Step 4: Send verification email (non-fatal)
    try {
      await sendEmailVerification(cred.user, buildActionCodeSettings())
      lastVerificationSentAt = Date.now()
    } catch { /* non-fatal — user can resend */ }

    // Step 5: Store email for the verify page BEFORE signing out
    setPendingVerificationEmail(cred.user.email)
    sessionStorage.setItem('al_pending_email', cred.user.email)

    // Step 6: Sign out so they can't access the app until verified
    await signOut(auth)

    return cred
  }, [])

  const googleSignIn = useCallback(async () => {
    try {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      const result = await signInWithPopup(auth, provider)
      const u = result.user

      // Clear any pending verification state
      setPendingVerificationEmail(null)
      sessionStorage.removeItem('al_pending_email')

      // Write profile if first time (non-fatal)
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
      // silent cancel
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

  const logout = useCallback(async () => {
    try {
      await signOut(auth)
      setPendingVerificationEmail(null)
      sessionStorage.removeItem('al_pending_email')
    } catch { /* ignore */ }
  }, [])

  // ── Derived state ─────────────────────────────────────────────────────────

  const isEmailVerified = useMemo(() => {
    if (!user) return false
    const isOAuth = user.providerData?.some((p) => p.providerId !== 'password')
    return user.emailVerified || isOAuth
  }, [user])

  /**
   * True when we should show the verify-email page:
   * either the user is signed in but unverified,
   * OR they just registered (signed out) and we have their pending email.
   */
  const needsEmailVerification = useMemo(() => {
    if (pendingVerificationEmail && !user) return true
    if (user && !isEmailVerified) return true
    return false
  }, [pendingVerificationEmail, user, isEmailVerified])

  const value = useMemo(() => ({
    user,
    loading,
    isEmailVerified,
    needsEmailVerification,
    pendingVerificationEmail,
    login,
    register,
    googleSignIn,
    resetPassword,
    changePassword,
    sendVerificationEmail,
    reloadUser,
    logout,
  }), [
    user, loading, isEmailVerified, needsEmailVerification, pendingVerificationEmail,
    login, register, googleSignIn,
    resetPassword, changePassword,
    sendVerificationEmail, reloadUser, logout,
  ])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
