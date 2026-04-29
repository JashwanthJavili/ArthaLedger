import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, RefreshCw, LogOut, CheckCircle, Clock, Sparkles } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const POLL_INTERVAL_MS = 5000  // check every 5 s
const RESEND_COOLDOWN_S = 60   // UI countdown

export default function VerifyEmailPage() {
  const {
    user,
    logout,
    sendVerificationEmail,
    reloadUser,
    isEmailVerified,
    needsEmailVerification,
    pendingVerificationEmail,
  } = useAuth()

  const navigate = useNavigate()

  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendStatus, setResendStatus] = useState('')   // 'sent' | 'error' | ''
  const [resendMsg, setResendMsg] = useState('')
  const [resending, setResending] = useState(false)
  const [checking, setChecking] = useState(false)
  const [verified, setVerified] = useState(false)

  // The email to display — use live user email or the stored pending email
  const displayEmail = user?.email || pendingVerificationEmail || 'your email address'

  // ── Redirect if already verified ─────────────────────────────────────────
  useEffect(() => {
    if (isEmailVerified && !verified) {
      setVerified(true)
      const t = setTimeout(() => navigate('/dashboard', { replace: true }), 2200)
      return () => clearTimeout(t)
    }
  }, [isEmailVerified, verified, navigate])

  // ── Poll Firebase every 5 s (only when user is signed in) ────────────────
  useEffect(() => {
    if (verified || isEmailVerified || !user) return
    const interval = setInterval(async () => {
      const refreshed = await reloadUser()
      if (refreshed?.emailVerified) {
        setVerified(true)
        clearInterval(interval)
        setTimeout(() => navigate('/dashboard', { replace: true }), 2200)
      }
    }, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [verified, isEmailVerified, user, reloadUser, navigate])

  // ── Resend cooldown countdown ─────────────────────────────────────────────
  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [resendCooldown])

  // ── Resend handler ────────────────────────────────────────────────────────
  const handleResend = useCallback(async () => {
    if (resendCooldown > 0 || resending) return
    setResending(true)
    setResendStatus('')
    setResendMsg('')

    try {
      if (user) {
        // User is signed in — use the context helper
        await sendVerificationEmail()
      } else if (pendingVerificationEmail) {
        // User is signed out (just registered) — we can't send without being signed in.
        // Show a helpful message instead.
        setResendStatus('error')
        setResendMsg(
          'To resend the email, sign in with your email and password below, then request a new link from the verify page.'
        )
        setResending(false)
        return
      }
      setResendStatus('sent')
      setResendMsg('Verification email sent! Check your inbox and spam folder.')
      setResendCooldown(RESEND_COOLDOWN_S)
    } catch (err) {
      setResendStatus('error')
      setResendMsg(err.message || 'Failed to send email. Please try again.')
    } finally {
      setResending(false)
    }
  }, [resendCooldown, resending, sendVerificationEmail, user, pendingVerificationEmail])

  // ── Check now handler ─────────────────────────────────────────────────────
  const handleCheckNow = useCallback(async () => {
    if (!user) {
      // Signed-out user — tell them to sign in first
      setResendStatus('error')
      setResendMsg('Please sign in with your email and password to check verification status.')
      return
    }
    setChecking(true)
    const refreshed = await reloadUser()
    if (refreshed?.emailVerified) {
      setVerified(true)
      setTimeout(() => navigate('/dashboard', { replace: true }), 2200)
    } else {
      setResendStatus('error')
      setResendMsg('Email not verified yet. Please click the link in your inbox.')
    }
    setChecking(false)
  }, [user, reloadUser, navigate])

  // ── Sign out / use different account ─────────────────────────────────────
  const handleLogout = useCallback(async () => {
    await logout()
    navigate('/login', { replace: true })
  }, [logout, navigate])

  // ── Sign in to check (for signed-out pending users) ───────────────────────
  const handleGoToLogin = useCallback(() => {
    navigate('/login', { replace: true })
  }, [navigate])

  // ── Verified success screen ───────────────────────────────────────────────
  if (verified) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 18, stiffness: 260 }}
          className="flex flex-col items-center gap-5 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', damping: 14, stiffness: 300 }}
            className="relative"
          >
            <div className="rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 p-6 shadow-lg">
              <CheckCircle size={48} className="text-emerald-600" />
            </div>
            {[0, 60, 120, 180, 240, 300].map((deg) => (
              <motion.div
                key={deg}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }}
                transition={{ delay: 0.3 + deg / 1800, duration: 0.8 }}
                className="absolute top-1/2 left-1/2 h-2 w-2 rounded-full bg-emerald-400"
                style={{ transform: `rotate(${deg}deg) translateY(-44px) translate(-50%, -50%)` }}
              />
            ))}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h1 className="font-serif text-2xl font-semibold text-stone-800">Email Verified! 🙏</h1>
            <p className="mt-2 text-sm text-stone-500">Welcome to ArthaLedger. Redirecting you now...</p>
          </motion.div>

          <div className="h-1 w-64 rounded-full bg-emerald-200 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ delay: 0.3, duration: 2 }}
              className="h-full rounded-full bg-emerald-500"
            />
          </div>
        </motion.div>
      </main>
    )
  }

  // ── Waiting screen ────────────────────────────────────────────────────────
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-col items-center gap-3"
      >
        <div className="rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200 p-4 shadow-md">
          <Sparkles size={26} className="text-amber-700" />
        </div>
        <div className="text-center">
          <h1 className="font-serif text-2xl font-semibold text-stone-800">ArthaLedger</h1>
          <p className="mt-0.5 text-xs text-stone-400 tracking-wide">Where every rupee has meaning</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-sm rounded-3xl border border-amber-100/80 bg-white/88 p-6 shadow-xl backdrop-blur-md"
      >
        {/* Animated envelope */}
        <div className="flex justify-center mb-5">
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            className="relative"
          >
            <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 p-5 shadow-sm border border-amber-100">
              <Mail size={36} className="text-amber-600" />
            </div>
            <motion.span
              animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.8, repeat: Infinity }}
              className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-amber-500 border-2 border-white"
            />
          </motion.div>
        </div>

        {/* Email info */}
        <div className="text-center mb-4">
          <h2 className="font-serif text-xl font-semibold text-stone-800">Verify your email</h2>
          <p className="mt-2 text-sm text-stone-500 leading-relaxed">
            We sent a verification link to
          </p>
          <p className="mt-1 text-sm font-semibold text-amber-700 break-all">{displayEmail}</p>
          <p className="mt-2 text-xs text-stone-400 leading-relaxed">
            Click the link in that email to activate your account.
          </p>
        </div>

        {/* Spam notice */}
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5">
          <span className="text-base leading-none mt-0.5 flex-shrink-0">📬</span>
          <p className="text-xs text-amber-800 leading-relaxed">
            <span className="font-semibold">Don't see it?</span> Check your{' '}
            <span className="font-semibold">Spam</span> or{' '}
            <span className="font-semibold">Junk</span> folder — verification emails
            sometimes land there. Mark it "Not Spam" so future emails reach your inbox.
          </p>
        </div>

        {/* Status message */}
        <AnimatePresence mode="wait">
          {resendMsg && (
            <motion.div
              key={resendMsg}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className={`mb-4 rounded-xl border px-3 py-2.5 text-xs leading-relaxed ${
                resendStatus === 'sent'
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                  : 'bg-red-50 border-red-100 text-red-600'
              }`}
            >
              {resendMsg}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-2.5">
          {/* Primary action — different for signed-in vs signed-out */}
          {user ? (
            <button
              onClick={handleCheckNow}
              disabled={checking}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-700 transition-colors shadow-sm disabled:opacity-60"
            >
              {checking ? (
                <><RefreshCw size={15} className="animate-spin" /> Checking...</>
              ) : (
                <><CheckCircle size={15} /> I've verified my email</>
              )}
            </button>
          ) : (
            <button
              onClick={handleGoToLogin}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-700 transition-colors shadow-sm"
            >
              <CheckCircle size={15} />
              Sign in after verifying
            </button>
          )}

          {/* Resend */}
          {user && (
            <button
              onClick={handleResend}
              disabled={resending || resendCooldown > 0}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50"
            >
              {resending ? (
                <><RefreshCw size={14} className="animate-spin" /> Sending...</>
              ) : resendCooldown > 0 ? (
                <><Clock size={14} /> Resend in {resendCooldown}s</>
              ) : (
                <><Mail size={14} /> Resend verification email</>
              )}
            </button>
          )}

          {/* Sign out / use different account */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-stone-500 hover:bg-stone-50 transition-colors"
          >
            <LogOut size={14} />
            {user ? 'Sign out and use a different account' : 'Use a different account'}
          </button>
        </div>

        {/* Auto-check indicator — only when signed in */}
        {user && (
          <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-stone-400">
            <motion.span
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="h-1.5 w-1.5 rounded-full bg-amber-400"
            />
            Checking automatically every few seconds...
          </div>
        )}

        <p className="mt-4 text-center text-[10px] text-stone-300 italic">
          ArthaLedger — Where every rupee has meaning
        </p>
      </motion.div>
    </main>
  )
}
