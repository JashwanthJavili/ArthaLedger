import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, MailCheck } from 'lucide-react'
import AuthLayout, { AuthLink, Field, FormError, PrimaryButton } from './AuthLayout'
import { useAuth } from '../../context/AuthContext'
import { useI18n } from '../../i18n/core'
import { Trans } from '../../i18n/Trans'

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email.trim()) { setError(t('auth.validation.emailRequired')); return }
    setLoading(true)
    try {
      await resetPassword(email)
      setSent(true)
    } catch (err) {
      setError(err?.message || t('auth.forgot.failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title={sent ? t('auth.forgot.sentTitle') : t('auth.forgot.title')}
      subtitle={sent
        ? <Trans k="auth.forgot.sentSubtitle" vars={{ email }} components={{ b: <span className="font-semibold text-[var(--text-main)]" /> }} />
        : t('auth.forgot.subtitle')}
      back="/login"
      footer={<Trans k="auth.forgot.footer" components={{ link: <AuthLink to="/login" /> }} />}
    >
      {sent ? (
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--gold-light)]">
            <MailCheck size={34} className="text-[var(--gold-primary)]" />
          </div>
          <p className="mt-5 text-[13px] leading-relaxed text-[var(--text-muted)]">
            {t('auth.forgot.notFound')}
          </p>
          <Link to="/login"
            className="mt-6 flex h-[52px] w-full items-center justify-center rounded-2xl bg-[var(--gold-primary)] text-[15px] font-semibold text-white hover:bg-[var(--gold-hover)] transition-colors">
            {t('auth.forgot.backToSignIn')}
          </Link>
          <button type="button" onClick={() => setSent(false)}
            className="mt-3 h-11 text-[13.5px] font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer">
            {t('auth.forgot.differentEmail')}
          </button>
        </motion.div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3" noValidate>
          <Field icon={Mail} label={t('common.email')} type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder={t('auth.fields.emailPlaceholder')} autoComplete="email" inputMode="email" enterKeyHint="send" />
          <FormError>{error}</FormError>
          <PrimaryButton loading={loading} loadingText={t('auth.forgot.submitting')}>{t('auth.forgot.submit')}</PrimaryButton>
        </form>
      )}
    </AuthLayout>
  )
}
