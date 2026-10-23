import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'

const ease = [0.16, 1, 0.3, 1]

/**
 * Full-screen auth layout that fits on one phone screen without scrolling:
 * brand row (with back button), a serif title, the form, and the footer
 * pinned to the bottom. On wide screens the form sits in a card.
 */
export default function AuthLayout({ title, subtitle, back, children, footer }) {
  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-[var(--bg-page)] px-5 pb-[max(env(safe-area-inset-bottom),14px)] pt-[max(env(safe-area-inset-top),10px)]">
      {/* Soft glow behind the brand */}
      <div className="pointer-events-none absolute -top-44 left-1/2 h-[380px] w-[520px] -translate-x-1/2 rounded-full bg-[var(--gold-primary)] opacity-[0.13] blur-[90px]" />

      <div className="relative mx-auto flex w-full max-w-[400px] flex-1 flex-col">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease }}
          className="flex h-12 items-center gap-2.5">
          {back && (
            <Link to={back} aria-label="Back"
              className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-main)] hover:bg-[var(--border-subtle)] active:bg-[var(--border-subtle)] transition-colors">
              <ArrowLeft size={20} />
            </Link>
          )}
          <img src="/icons/maskable-192.png" alt="" draggable="false" className="h-8 w-8 rounded-full shadow-[0_6px_16px_-8px_rgba(0,0,0,0.35)]" />
          <span className="font-serif-luxury text-[16px] font-semibold text-[var(--text-main)]">ArthaLedger</span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.05, ease }} className="mt-[clamp(16px,4dvh,36px)]">
          <h1 className="font-serif-luxury text-[clamp(25px,3.6dvh,31px)] font-semibold leading-[1.12] tracking-[-0.015em] text-[var(--text-main)]">{title}</h1>
          {subtitle && <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--text-muted)]">{subtitle}</p>}
        </motion.div>

        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.1, ease }}
          className="mt-[clamp(14px,3.2dvh,28px)] sm:rounded-3xl sm:border sm:border-[var(--border-card)] sm:bg-[var(--bg-card)] sm:p-6 sm:shadow-[0_30px_80px_-40px_rgba(0,0,0,0.35)]">
          {children}
        </motion.section>

        <div className="min-h-3 flex-1" />
        {footer && <p className="text-center text-[13.5px] text-[var(--text-muted)]">{footer}</p>}
      </div>
    </main>
  )
}

/** Link styled for the footer / inline text */
export function AuthLink({ to, children }) {
  return <Link to={to} className="font-semibold text-[var(--gold-primary)] hover:underline">{children}</Link>
}

/** Text field with a leading icon, optional password reveal and inline error.
 * `label` names the field for screen readers and is the placeholder unless one is given. */
export function Field({ icon: Icon, label, error, type = 'text', trailing, placeholder, ...props }) {
  const [reveal, setReveal] = useState(false)
  const isPassword = type === 'password'
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <span className={`flex h-[50px] items-center gap-3 rounded-2xl border bg-[var(--bg-card)] px-4 transition-colors focus-within:border-[var(--gold-primary)] focus-within:shadow-[0_0_0_4px_var(--gold-light)] ${
        error ? 'border-rose-400/70' : 'border-[var(--border-card)]'
      }`}>
        {Icon && <Icon size={17} className="flex-shrink-0 text-[var(--text-subtle)]" />}
        <input
          {...props}
          aria-label={label}
          placeholder={placeholder || label}
          type={isPassword && reveal ? 'text' : type}
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-[var(--text-main)] placeholder:text-[var(--text-subtle)] outline-none"
        />
        {trailing}
        {isPassword && (
          <button type="button" onClick={() => setReveal(v => !v)} aria-label={reveal ? 'Hide password' : 'Show password'}
            className="-mr-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[var(--text-subtle)] hover:text-[var(--text-main)] cursor-pointer">
            {reveal ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        )}
      </span>
      <AnimatePresence initial={false}>
        {error && (
          <motion.span initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="block overflow-hidden">
            <span className="block pt-1 text-[12px] text-rose-500">{error}</span>
          </motion.span>
        )}
      </AnimatePresence>
    </label>
  )
}

export function PrimaryButton({ loading, loadingText, children, ...props }) {
  return (
    <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={loading} {...props}
      className="flex h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-[var(--gold-primary)] text-[15px] font-semibold text-white shadow-[0_14px_30px_-14px_rgba(176,126,52,0.8)] hover:bg-[var(--gold-hover)] transition-colors disabled:opacity-70 cursor-pointer">
      {loading ? <><Loader2 size={17} className="animate-spin" /> {loadingText}</> : children}
    </motion.button>
  )
}

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M21.6 12.237c0-.77-.07-1.51-.203-2.237H12v4.243h5.575c-.24 1.29-.97 2.387-2.07 3.12v2.59h3.34c1.955-1.8 3.085-4.45 3.085-7.716z" fill="#4285F4"/>
    <path d="M12 22c2.7 0 4.97-.9 6.63-2.44l-3.34-2.59c-.93.62-2.12.99-3.29.99-2.53 0-4.69-1.7-5.46-3.98H3.03v2.5C4.67 19.94 8.05 22 12 22z" fill="#34A853"/>
    <path d="M6.54 13.98a6.997 6.997 0 010-3.96V7.52H3.03a9.99 9.99 0 000 8.96l3.51-2.46z" fill="#FBBC05"/>
    <path d="M12 6.5c1.47 0 2.78.5 3.82 1.48l2.87-2.87C16.96 3.7 14.7 2.5 12 2.5 8.05 2.5 4.67 4.56 3.03 7.5l3.51 2.99C7.31 8.2 9.47 6.5 12 6.5z" fill="#EA4335"/>
  </svg>
)

/** "or" divider followed by the Google button */
export function GoogleOption({ onClick, disabled }) {
  return (
    <>
      <div className="my-[clamp(10px,2dvh,18px)] flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--border-card)]" />
        <span className="text-[12px] text-[var(--text-subtle)]">or</span>
        <div className="h-px flex-1 bg-[var(--border-card)]" />
      </div>
      <motion.button type="button" whileTap={{ scale: 0.98 }} onClick={onClick} disabled={disabled}
        className="flex h-[50px] w-full items-center justify-center gap-3 rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] text-[14.5px] font-medium text-[var(--text-main)] hover:bg-[var(--bg-card-hover)] transition-colors disabled:opacity-60 cursor-pointer">
        <GoogleIcon /> Continue with Google
      </motion.button>
    </>
  )
}

export function FormError({ children }) {
  return (
    <AnimatePresence initial={false}>
      {children && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className="flex items-start gap-2.5 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-3.5 py-2.5 text-[12.5px] text-rose-600 dark:text-rose-400">
          <AlertCircle size={16} className="mt-px flex-shrink-0" />
          <span>{children}</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
