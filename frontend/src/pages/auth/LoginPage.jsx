import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
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

export default function LoginPage() {
  const { login, googleSignIn } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const justVerified = searchParams.get('verified') === '1'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
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
      // If email/password user hasn't verified yet, send them to verify screen
      if (!cred.user.emailVerified) {
        // They're signed in but unverified — redirect to verify page
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
    <AuthLayout footer={<span>New here? <Link to="/register" className="text-amber-700 font-medium hover:underline">Create account</Link></span>}>
      <div className="space-y-4">
        <div className="text-center mb-5">
          <h2 className="font-serif text-xl font-semibold text-stone-800">Welcome back</h2>
          <p className="mt-1 text-xs text-stone-400">Sign in to continue your mindful journey</p>
        </div>

        {/* Verified success banner */}
        {justVerified && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2.5 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2.5 mb-1"
          >
            <CheckCircle size={16} className="flex-shrink-0 text-emerald-600" />
            <div>
              <p className="text-xs font-semibold text-emerald-700">Email verified! 🙏</p>
              <p className="text-[10px] text-emerald-600">Sign in below to enter ArthaLedger.</p>
            </div>
          </motion.div>
        )}

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Email</label>
            <input
              className="w-full rounded-xl border border-amber-100 bg-amber-50/40 px-3 py-2.5 text-sm placeholder-stone-400 focus:border-amber-300 focus:bg-white transition-colors"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Password</label>
            <div className="relative">
              <input
                className="w-full rounded-xl border border-amber-100 bg-amber-50/40 px-3 py-2.5 pr-10 text-sm placeholder-stone-400 focus:border-amber-300 focus:bg-white transition-colors"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-600"
            >
              {error}
            </motion.p>
          )}

          <p className="text-right">
            <Link to="/forgot-password" className="text-xs text-amber-700 hover:underline">Forgot password?</Link>
          </p>

          <button
            className="w-full rounded-xl bg-amber-700 py-2.5 text-sm font-medium text-white hover:bg-amber-800 transition-colors shadow-sm disabled:opacity-60"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
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
