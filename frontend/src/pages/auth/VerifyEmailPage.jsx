import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, ArrowLeft, RefreshCw, Clock, Sparkles } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useI18n } from '../../i18n/core'
import { Trans } from '../../i18n/Trans'

const RESEND_COOLDOWN_S = 60

export default function VerifyEmailPage() {
  const { user, logout, sendVerificationEmail, isEmailVerified, pendingVerificationEmail } = useAuth()
  const navigate = useNavigate()
  const { t } = useI18n()

  const [resendCooldown, setResendCooldown] = useState(0)
  const [resending, setResending] = useState(false)
  const [resendMsg, setResendMsg] = useState('')

  const displayEmail = user?.email || pendingVerificationEmail || t('auth.verify.yourEmail')

  // Cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setInterval(() => setResendCooldown(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [resendCooldown])

  const handleResend = async () => {
    if (resendCooldown > 0 || resending || !user) return
    setResending(true)
    setResendMsg('')
    try {
      await sendVerificationEmail()
      setResendCooldown(RESEND_COOLDOWN_S)
      setResendMsg(t('auth.verify.sent'))
    } catch (err) {
      setResendMsg(err.message || t('auth.verify.failed'))
    } finally {
      setResending(false)
    }
  }

  const handleBackToSignIn = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-col items-center gap-3"
      >
        <img src="/L.png" alt="ArthaLedger" className="h-16 w-16 rounded-2xl shadow-md object-contain bg-amber-50 p-1" />
        <div className="text-center">
          <h1 className="font-serif text-2xl font-semibold text-stone-800">ArthaLedger</h1>
          <p className="mt-0.5 text-xs text-stone-400 tracking-wide">{t('auth.verify.tagline')}</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-sm rounded-3xl border border-amber-100/80 bg-white/88 p-6 shadow-xl backdrop-blur-md"
      >
        {/* Envelope icon */}
        <div className="flex justify-center mb-5">
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 p-5 shadow-sm border border-amber-100">
              <Mail size={36} className="text-amber-600" />
            </div>
          </motion.div>
        </div>

        {/* Message */}
        <div className="text-center mb-5">
          <h2 className="font-serif text-xl font-semibold text-stone-800 mb-2">{t('auth.verify.title')}</h2>
          <p className="text-sm text-stone-500 leading-relaxed">
            {t('auth.verify.sentTo')}
          </p>
          <p className="mt-1 text-sm font-semibold text-amber-700 break-all">{displayEmail}</p>
          <p className="mt-3 text-sm text-stone-600 leading-relaxed">
            {t('auth.verify.instructions')}
          </p>
        </div>

        {/* Spam notice */}
        <div className="mb-5 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5">
          <span className="text-base leading-none mt-0.5 flex-shrink-0">📬</span>
          <p className="text-xs text-amber-800 leading-relaxed">
            <Trans k="auth.verify.spam" components={{ b: <span className="font-semibold" /> }} />
          </p>
        </div>

        {/* Resend status */}
        {resendMsg && (
          <p className="mb-3 text-center text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
            {resendMsg}
          </p>
        )}

        <div className="space-y-2.5">
          {/* Back to sign in — primary action */}
          <button
            onClick={handleBackToSignIn}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-700 py-3 text-sm font-semibold text-white hover:bg-amber-800 transition-colors shadow-sm"
          >
            <ArrowLeft size={15} />
            {t('auth.verify.backToSignIn')}
          </button>

          {/* Resend — only if signed in */}
          {user && (
            <div className="rounded-2xl border border-amber-100 bg-amber-50/70 px-3 py-3">
              <p className="text-center text-[11px] text-stone-500">
                {t('auth.verify.notReceived')}
              </p>
              <button
                onClick={handleResend}
                disabled={resending || resendCooldown > 0}
                className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-white py-2.5 text-sm font-medium text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resending ? (
                  <><RefreshCw size={13} className="animate-spin" /> {t('auth.verify.sending')}</>
                ) : resendCooldown > 0 ? (
                  <><Clock size={13} /> {t('auth.verify.availableIn', { seconds: resendCooldown })}</>
                ) : (
                  <><Mail size={13} /> {t('auth.verify.resend')}</>
                )}
              </button>
              <p className="mt-2 text-center text-[10px] text-stone-400">
                {resendCooldown > 0
                  ? t('auth.verify.cooldownHint')
                  : t('auth.verify.resendHint')}
              </p>
            </div>
          )}
        </div>

        <p className="mt-5 text-center text-[10px] text-stone-300 italic">
          ArthaLedger — {t('auth.verify.tagline')}
        </p>
      </motion.div>
    </main>
  )
}
