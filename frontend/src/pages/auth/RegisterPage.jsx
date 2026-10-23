import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Mail, Lock, CheckCircle2 } from 'lucide-react'
import AuthLayout, { AuthLink, Field, FormError, GoogleOption, PrimaryButton } from './AuthLayout'
import { useAuth } from '../../context/AuthContext'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function strengthOf(password) {
  if (!password) return null
  if (password.length < 6) return { label: 'Too short', color: 'bg-rose-400', level: 1 }
  if (password.length < 8) return { label: 'Weak', color: 'bg-orange-400', level: 2 }
  if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) return { label: 'Fair', color: 'bg-amber-400', level: 3 }
  return { label: 'Strong', color: 'bg-emerald-500', level: 4 }
}

export default function RegisterPage() {
  const { register, googleSignIn } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [globalError, setGlobalError] = useState('')
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const e = {}
    if (!name.trim() || name.trim().length < 2) e.name = 'Name must be at least 2 characters.'
    if (!EMAIL_RE.test(email)) e.email = 'Enter a valid email address.'
    if (password.length < 6) e.password = 'Password must be at least 6 characters.'
    if (password !== confirmPassword) e.confirmPassword = 'Passwords do not match.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const clearFieldError = (field) => setErrors((prev) => ({ ...prev, [field]: '' }))

  const onSubmit = async (e) => {
    e.preventDefault()
    setGlobalError('')
    if (!validate()) return
    setLoading(true)
    try {
      await register(name, email, password)
      navigate('/verify-email', { replace: true })
    } catch (err) {
      const msg = err.message || ''

      if (msg === 'UNVERIFIED_ACCOUNT') {
        navigate('/verify-email', { replace: true })
        return
      }

      if (
        msg.toLowerCase().includes('email already exists') ||
        msg.toLowerCase().includes('already in use') ||
        msg.toLowerCase().includes('already exists')
      ) {
        setErrors((prev) => ({ ...prev, email: msg }))
      } else {
        setGlobalError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const onGoogle = async () => {
    setGlobalError('')
    setLoading(true)
    try {
      await googleSignIn()
      navigate('/dashboard', { replace: true })
    } catch (err) {
      if (err?.message) setGlobalError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const strength = strengthOf(password)
  const matches = confirmPassword && password === confirmPassword

  return (
    <AuthLayout
      title="Create your ledger"
      subtitle="Track every rupee, privately. Takes a minute."
      back="/login"
      footer={<>Already have an account? <AuthLink to="/login">Sign in</AuthLink></>}
    >
      <form onSubmit={onSubmit} className="space-y-2.5" noValidate>
        <Field icon={User} label="Full name" value={name} error={errors.name}
          onChange={(e) => { setName(e.target.value); clearFieldError('name') }}
          placeholder="Full name" autoComplete="name" autoCapitalize="words" enterKeyHint="next" />

        <Field icon={Mail} label="Email" type="email" value={email} error={errors.email}
          onChange={(e) => { setEmail(e.target.value); clearFieldError('email') }}
          placeholder="Email address" autoComplete="email" inputMode="email" enterKeyHint="next" />

        <div>
          <Field icon={Lock} label="Password" type="password" value={password} error={errors.password}
            onChange={(e) => { setPassword(e.target.value); clearFieldError('password') }}
            placeholder="Password (6+ characters)" autoComplete="new-password" enterKeyHint="next" />
          {strength && (
            <div className="mt-1.5 flex items-center gap-2.5 px-1">
              <div className="flex flex-1 gap-1">
                {[1, 2, 3, 4].map(i => (
                  <span key={i} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i <= strength.level ? strength.color : 'bg-[var(--border-card)]'}`} />
                ))}
              </div>
              <span className="w-16 text-right text-[11.5px] font-medium text-[var(--text-muted)]">{strength.label}</span>
            </div>
          )}
        </div>

        <Field icon={Lock} label="Confirm password" type="password" value={confirmPassword} error={errors.confirmPassword}
          onChange={(e) => { setConfirmPassword(e.target.value); clearFieldError('confirmPassword') }}
          placeholder="Confirm password" autoComplete="new-password" enterKeyHint="go"
          trailing={matches ? <CheckCircle2 size={17} className="flex-shrink-0 text-emerald-500" /> : null} />

        <FormError>{globalError}</FormError>

        <PrimaryButton loading={loading} loadingText="Creating account…">Create account</PrimaryButton>
      </form>

      <GoogleOption onClick={onGoogle} disabled={loading} />

      <p className="mt-3 text-center text-[11px] leading-relaxed text-[var(--text-subtle)]">
        By continuing you agree to our <AuthLink to="/privacy">privacy policy</AuthLink>.
      </p>
    </AuthLayout>
  )
}
