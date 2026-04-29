import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, CheckCircle } from 'lucide-react'
import AuthLayout from './AuthLayout'
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
    <AuthLayout footer={<span><Link to="/login" className="text-amber-700 font-medium hover:underline">Back to sign in</Link></span>}>
      <div className="space-y-4">
        <div className="text-center mb-5">
          <h2 className="font-serif text-xl font-semibold text-stone-800">Reset Password</h2>
          <p className="mt-1 text-xs text-stone-400">Restore access gently and continue with clarity</p>
        </div>

        {sent ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-3 py-4 text-center"
          >
            <div className="rounded-full bg-emerald-100 p-3">
              <CheckCircle size={24} className="text-emerald-600" />
            </div>
            <p className="text-sm font-medium text-stone-700">Reset email sent!</p>
            <p className="text-xs text-stone-400">Check your inbox and follow the instructions to reset your password.</p>
          </motion.div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Email Address</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  className="w-full rounded-xl border border-amber-100 bg-amber-50/40 pl-9 pr-3 py-2.5 text-sm placeholder-stone-400 focus:border-amber-300 focus:bg-white transition-colors"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="you@example.com"
                  required
                  autoFocus
                />
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

            <button
              className="w-full rounded-xl bg-amber-700 py-2.5 text-sm font-medium text-white hover:bg-amber-800 transition-colors shadow-sm disabled:opacity-60"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}
      </div>
    </AuthLayout>
  )
}
