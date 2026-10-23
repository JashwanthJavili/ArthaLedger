import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, MailCheck } from 'lucide-react'
import AuthLayout, { AuthLink, Field, FormError, PrimaryButton } from './AuthLayout'
import { useAuth } from '../../context/AuthContext'

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email.trim()) { setError('Please enter your email.'); return }
    setLoading(true)
    try {
      await resetPassword(email)
      setSent(true)
    } catch (err) {
      setError(err?.message || 'Could not send reset email. Please check the address.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title={sent ? 'Check your inbox' : 'Forgot password?'}
      subtitle={sent
        ? <>We sent a reset link to <span className="font-semibold text-[var(--text-main)]">{email}</span>. Open it to choose a new password.</>
        : 'No worries. Enter your email and we’ll send you a link to reset it.'}
      back="/login"
      footer={<>Remembered it? <AuthLink to="/login">Back to sign in</AuthLink></>}
    >
      {sent ? (
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--gold-light)]">
            <MailCheck size={34} className="text-[var(--gold-primary)]" />
          </div>
          <p className="mt-5 text-[13px] leading-relaxed text-[var(--text-muted)]">
            Can’t find it? Check your spam folder, or try again in a minute.
          </p>
          <Link to="/login"
            className="mt-6 flex h-[52px] w-full items-center justify-center rounded-2xl bg-[var(--gold-primary)] text-[15px] font-semibold text-white hover:bg-[var(--gold-hover)] transition-colors">
            Back to sign in
          </Link>
          <button type="button" onClick={() => setSent(false)}
            className="mt-3 h-11 text-[13.5px] font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer">
            Use a different email
          </button>
        </motion.div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field icon={Mail} label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com" autoComplete="email" inputMode="email" enterKeyHint="send" />
          <FormError>{error}</FormError>
          <PrimaryButton loading={loading} loadingText="Sending…">Send reset link</PrimaryButton>
        </form>
      )}
    </AuthLayout>
  )
}
