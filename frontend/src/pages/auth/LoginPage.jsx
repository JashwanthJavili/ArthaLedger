import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, CheckCircle2 } from 'lucide-react'
import AuthLayout, { AuthLink, Field, FormError, GoogleOption, PrimaryButton } from './AuthLayout'
import { useAuth } from '../../context/AuthContext'

export default function LoginPage() {
  const { login, googleSignIn } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const justVerified = searchParams.get('verified') === '1'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email.trim()) { setError('Please enter your email.'); return }
    if (!password) { setError('Please enter your password.'); return }
    setLoading(true)
    try {
      const cred = await login(email, password)
      if (!cred.user?.emailVerified) {
        navigate('/verify-email', { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
    } catch (err) {
      setError(err.message || 'Sign-in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const onGoogle = async () => {
    setError('')
    setLoading(true)
    try {
      await googleSignIn()
      // Google accounts are always verified
      navigate('/dashboard', { replace: true })
    } catch (err) {
      if (err?.message) setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to pick up right where you left off."
      footer={<>New to ArthaLedger? <AuthLink to="/register">Create an account</AuthLink></>}
    >
      {justVerified && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-3">
          <CheckCircle2 size={17} className="mt-px flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div>
            <p className="text-[13px] font-semibold text-emerald-700 dark:text-emerald-300">Email verified</p>
            <p className="text-[12px] text-emerald-700/80 dark:text-emerald-300/80">Sign in with the same email and password to continue.</p>
          </div>
        </motion.div>
      )}

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field icon={Mail} label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com" autoComplete="email" inputMode="email" enterKeyHint="next" />
        <div>
          <Field icon={Lock} label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password" autoComplete="current-password" enterKeyHint="go" />
          <div className="mt-2 text-right">
            <Link to="/forgot-password" className="text-[12.5px] font-medium text-[var(--gold-primary)] hover:underline">Forgot password?</Link>
          </div>
        </div>

        <FormError>{error}</FormError>

        <PrimaryButton loading={loading} loadingText="Signing in…">Sign in</PrimaryButton>
      </form>

      <GoogleOption onClick={onGoogle} disabled={loading} />
    </AuthLayout>
  )
}
