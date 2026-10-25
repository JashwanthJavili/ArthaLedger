import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, CheckCircle2 } from 'lucide-react'
import AuthLayout, { AuthLink, Field, FormError, GoogleOption, PrimaryButton } from './AuthLayout'
import { useAuth } from '../../context/AuthContext'
import { useI18n } from '../../i18n/core'
import { Trans } from '../../i18n/Trans'

export default function LoginPage() {
  const { login, googleSignIn } = useAuth()
  const { t } = useI18n()
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
    if (!email.trim()) { setError(t('auth.validation.emailRequired')); return }
    if (!password) { setError(t('auth.validation.passwordRequired')); return }
    setLoading(true)
    try {
      const cred = await login(email, password)
      if (!cred.user?.emailVerified) {
        navigate('/verify-email', { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
    } catch (err) {
      setError(err.message || t('auth.login.failed'))
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
      title={t('auth.login.title')}
      subtitle={t('auth.login.subtitle')}
      footer={<Trans k="auth.login.footer" components={{ link: <AuthLink to="/register" /> }} />}
    >
      {justVerified && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="mb-3 flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-3">
          <CheckCircle2 size={17} className="mt-px flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div>
            <p className="text-[13px] font-semibold text-emerald-700 dark:text-emerald-300">{t('auth.login.verifiedTitle')}</p>
            <p className="text-[12px] text-emerald-700/80 dark:text-emerald-300/80">{t('auth.login.verifiedText')}</p>
          </div>
        </motion.div>
      )}

      <form onSubmit={onSubmit} className="space-y-3" noValidate>
        <Field icon={Mail} label={t('common.email')} type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder={t('auth.fields.emailPlaceholder')} autoComplete="email" inputMode="email" enterKeyHint="next" />
        <div>
          <Field icon={Lock} label={t('common.password')} type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder={t('common.password')} autoComplete="current-password" enterKeyHint="go" />
          <div className="mt-1.5 text-right">
            <Link to="/forgot-password" className="text-[12.5px] font-medium text-[var(--gold-primary)] hover:underline">{t('auth.login.forgot')}</Link>
          </div>
        </div>

        <FormError>{error}</FormError>

        <PrimaryButton loading={loading} loadingText={t('auth.login.submitting')}>{t('common.signIn')}</PrimaryButton>
      </form>

      <GoogleOption onClick={onGoogle} disabled={loading} />
    </AuthLayout>
  )
}
