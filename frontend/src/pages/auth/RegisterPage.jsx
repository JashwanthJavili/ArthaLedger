import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, CheckCircle } from 'lucide-react'
import AuthLayout from './AuthLayout'
import { useAuth } from '../../context/AuthContext'

const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M21.6 12.237c0-.77-.07-1.51-.203-2.237H12v4.243h5.575c-.24 1.29-.97 2.387-2.07 3.12v2.59h3.34c1.955-1.8 3.085-4.45 3.085-7.716z" fill="#4285F4"/>
    <path d="M12 22c2.7 0 4.97-.9 6.63-2.44l-3.34-2.59c-.93.62-2.12.99-3.29.99-2.53 0-4.69-1.7-5.46-3.98H3.03v2.5C4.67 19.94 8.05 22 12 22z" fill="#34A853"/>
    <path d="M6.54 13.98a6.997 6.997 0 010-3.96V7.52H3.03a9.99 9.99 0 000 8.96l3.51-2.46z" fill="#FBBC05"/>
    <path d="M12 6.5c1.47 0 2.78.5 3.82 1.48l2.87-2.87C16.96 3.7 14.7 2.5 12 2.5 8.05 2.5 4.67 4.56 3.03 7.5l3.51 2.99C7.31 8.2 9.47 6.5 12 6.5z" fill="#EA4335"/>
  </svg>
)

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function RegisterPage() {
  const { register, googleSignIn } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
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
      // register() sends verification email then signs out — go to verify screen
      navigate('/verify-email', { replace: true })
    } catch (err) {
      const msg = err.message || ''

      // Unverified account detected — redirect to verify page
      if (msg === 'UNVERIFIED_ACCOUNT') {
        navigate('/verify-email', { replace: true })
        return
      }

      // Route specific messages to the right field
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

  const pwStrength = () => {
    if (password.length === 0) return null
    if (password.length < 6) return { label: 'Too short', color: 'bg-red-400', width: '25%' }
    if (password.length < 8) return { label: 'Weak', color: 'bg-orange-400', width: '50%' }
    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) return { label: 'Fair', color: 'bg-yellow-400', width: '70%' }
    return { label: 'Strong', color: 'bg-emerald-500', width: '100%' }
  }
  const strength = pwStrength()

  return (
    <AuthLayout footer={<span>Already have an account? <Link to="/login" className="text-amber-700 font-medium hover:underline">Sign in</Link></span>}>
      <div className="space-y-4">
        <div className="text-center mb-2">
          <h2 className="font-serif text-xl font-semibold text-stone-800">Create account</h2>
          <p className="mt-1 text-xs text-stone-400">Begin your mindful financial journey</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3" noValidate>
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Full Name</label>
            <input
              className={`w-full rounded-xl border px-3 py-2.5 text-sm placeholder-stone-400 transition-colors ${
                errors.name ? 'border-red-300 bg-red-50' : 'border-amber-100 bg-amber-50/40 focus:border-amber-300 focus:bg-white'
              }`}
              value={name}
              onChange={(e) => { setName(e.target.value); clearFieldError('name') }}
              type="text"
              placeholder="Your full name"
              autoComplete="name"
            />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Email</label>
            <input
              className={`w-full rounded-xl border px-3 py-2.5 text-sm placeholder-stone-400 transition-colors ${
                errors.email ? 'border-red-300 bg-red-50' : 'border-amber-100 bg-amber-50/40 focus:border-amber-300 focus:bg-white'
              }`}
              value={email}
              onChange={(e) => { setEmail(e.target.value); clearFieldError('email') }}
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
            />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Password</label>
            <div className="relative">
              <input
                className={`w-full rounded-xl border px-3 py-2.5 pr-10 text-sm placeholder-stone-400 transition-colors ${
                  errors.password ? 'border-red-300 bg-red-50' : 'border-amber-100 bg-amber-50/40 focus:border-amber-300 focus:bg-white'
                }`}
                value={password}
                onChange={(e) => { setPassword(e.target.value); clearFieldError('password') }}
                type={showPw ? 'text' : 'password'}
                placeholder="Min. 6 characters"
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {/* Strength bar */}
            {strength && (
              <div className="mt-1.5">
                <div className="h-1 w-full rounded-full bg-stone-100 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-300 ${strength.color}`} style={{ width: strength.width }} />
                </div>
                <p className="text-[10px] text-stone-400 mt-0.5">{strength.label}</p>
              </div>
            )}
            {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Confirm Password</label>
            <div className="relative">
              <input
                className={`w-full rounded-xl border px-3 py-2.5 pr-10 text-sm placeholder-stone-400 transition-colors ${
                  errors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-amber-100 bg-amber-50/40 focus:border-amber-300 focus:bg-white'
                }`}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); clearFieldError('confirmPassword') }}
                type={showConfirm ? 'text' : 'password'}
                placeholder="Re-enter password"
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              {confirmPassword && password === confirmPassword && (
                <CheckCircle size={14} className="absolute right-9 top-1/2 -translate-y-1/2 text-emerald-500" />
              )}
            </div>
            {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>}
          </div>

          {/* Global error */}
          {globalError && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-600"
            >
              {globalError}
            </motion.p>
          )}

          <button
            className="w-full rounded-xl bg-amber-700 py-2.5 text-sm font-medium text-white hover:bg-amber-800 transition-colors shadow-sm disabled:opacity-60"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-amber-100" />
          <span className="text-xs text-stone-400">or</span>
          <div className="h-px flex-1 bg-amber-100" />
        </div>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 transition-colors shadow-sm disabled:opacity-60"
        >
          <GoogleIcon />
          Continue with Google
        </motion.button>
      </div>
    </AuthLayout>
  )
}
