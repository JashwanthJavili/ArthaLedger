import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, Eye, EyeOff, X } from 'lucide-react'
import { useI18n } from '../../i18n/core'

// ── Tints for row icon tiles ────────────────────────────────────────────────
const TINTS = {
  gold: 'bg-[var(--gold-light)] text-[var(--gold-primary)]',
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  sky: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  neutral: 'bg-[var(--border-subtle)] text-[var(--text-muted)]',
}

const INPUT_CLS =
  'w-full rounded-xl border border-[var(--border-card)] bg-[var(--bg-card)] px-3.5 py-2.5 text-[14px] text-[var(--text-main)] placeholder:text-[var(--text-subtle)] outline-none transition-colors focus:border-[var(--gold-primary)] disabled:cursor-not-allowed disabled:opacity-60'

export function IconTile({ icon: Icon, tint = 'gold' }) {
  return (
    <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${TINTS[tint] || TINTS.gold}`}>
      <Icon size={16} strokeWidth={2} />
    </span>
  )
}

// ── Switch ──────────────────────────────────────────────────────────────────
export function Switch({ checked, onChange, label, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-[26px] w-[44px] flex-shrink-0 cursor-pointer items-center rounded-full p-[3px] transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-primary)]/40 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? 'bg-[var(--gold-primary)]' : 'bg-black/10 dark:bg-white/15'
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition-transform duration-200 ${
          checked ? 'translate-x-[18px]' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

// ── Grouped section ─────────────────────────────────────────────────────────
export function Group({ title, footer, children, delay = 0 }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-2"
    >
      {title && (
        <h2 className="px-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-subtle)]">{title}</h2>
      )}
      <div className="overflow-hidden rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] divide-y divide-[var(--border-subtle)]">
        {children}
      </div>
      {footer && <p className="px-1 text-[11.5px] leading-relaxed text-[var(--text-subtle)]">{footer}</p>}
    </motion.section>
  )
}

/**
 * A settings row. Renders as a Link (`to`), external anchor (`href`), button (`onClick`)
 * or a static div. `trailing` overrides the default chevron for interactive rows.
 */
export function Row({ icon, tint = 'gold', label, hint, value, trailing, onClick, to, href, danger = false, disabled = false }) {
  const interactive = Boolean(onClick || to || href)
  const right = trailing !== undefined ? trailing : interactive ? (
    <ChevronRight size={16} className="flex-shrink-0 text-[var(--text-subtle)]" />
  ) : null

  const body = (
    <>
      {icon && <IconTile icon={icon} tint={danger ? 'rose' : tint} />}
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-[14px] font-medium leading-snug ${danger ? 'text-rose-600 dark:text-rose-400' : 'text-[var(--text-main)]'}`}>
          {label}
        </span>
        {hint && <span className="mt-0.5 block truncate text-[12px] leading-snug text-[var(--text-muted)]">{hint}</span>}
      </span>
      {value != null && value !== '' && (
        <span className="max-w-[45%] flex-shrink-0 truncate text-right text-[13px] text-[var(--text-muted)]">{value}</span>
      )}
      {right}
    </>
  )

  const cls = `flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
    interactive && !disabled ? 'cursor-pointer hover:bg-[var(--border-subtle)] active:bg-[var(--border-subtle)]' : ''
  } ${disabled ? 'opacity-60' : ''}`

  if (to) return <Link to={to} className={`${cls} no-underline`}>{body}</Link>
  if (href) return <a href={href} className={`${cls} no-underline`}>{body}</a>
  if (onClick) return <button type="button" onClick={onClick} disabled={disabled} className={cls}>{body}</button>
  return <div className={cls}>{body}</div>
}

// ── Sheet (portal; bottom sheet on mobile, centered dialog on desktop) ──────
export function Sheet({ open, onClose, label, children, wide = false }) {
  return createPortal(
    <AnimatePresence>
      {open && <SheetPanel onClose={onClose} label={label} wide={wide}>{children}</SheetPanel>}
    </AnimatePresence>,
    document.body,
  )
}

function SheetPanel({ onClose, label, wide, children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4"
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.div
        role="dialog" aria-modal="true" aria-label={label}
        initial={{ y: 28, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 28, opacity: 0 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        className={`relative flex w-full ${wide ? 'sm:max-w-[520px]' : 'sm:max-w-[440px]'} flex-col overflow-hidden rounded-t-3xl border border-[var(--border-card)] bg-[var(--bg-page)] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45)] sm:rounded-3xl`}
        style={{ maxHeight: '88vh', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

export function SheetHeader({ title, subtitle, onClose }) {
  const { t } = useI18n()
  return (
    <div className="flex flex-shrink-0 items-start justify-between gap-3 border-b border-[var(--border-subtle)] px-5 pt-5 pb-4">
      <div className="min-w-0">
        <h3 className="truncate text-[15px] font-semibold text-[var(--text-main)]">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[12px] text-[var(--text-subtle)]">{subtitle}</p>}
      </div>
      <button type="button" onClick={onClose} aria-label={t('common.close')}
        className="flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-full bg-[var(--border-subtle)] text-[var(--text-muted)] transition-colors hover:text-[var(--text-main)]">
        <X size={15} />
      </button>
    </div>
  )
}

export function SheetBody({ children, className = '' }) {
  return <div className={`min-h-0 flex-1 overflow-y-auto px-5 py-4 ${className}`}>{children}</div>
}

export function SheetFooter({ children }) {
  return <div className="flex flex-shrink-0 gap-2 border-t border-[var(--border-subtle)] px-5 py-4">{children}</div>
}

// ── Form bits ───────────────────────────────────────────────────────────────
export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between gap-2 text-[12px] font-medium text-[var(--text-muted)]">
        <span>{label}</span>
        {hint && <span className="text-[11px] font-normal text-[var(--text-subtle)]">{hint}</span>}
      </span>
      {children}
    </label>
  )
}

export function TextInput({ className = '', ...props }) {
  return <input {...props} className={`${INPUT_CLS} ${className}`} />
}

export function TextArea({ className = '', ...props }) {
  return <textarea {...props} className={`${INPUT_CLS} resize-none ${className}`} />
}

export function PasswordInput({ show, onToggleShow, className = '', ...props }) {
  const { t } = useI18n()
  const [localShow, setLocalShow] = useState(false)
  const visible = show ?? localShow
  const toggle = onToggleShow ?? (() => setLocalShow(v => !v))
  return (
    <div className="relative">
      <input {...props} type={visible ? 'text' : 'password'} className={`${INPUT_CLS} pr-10 ${className}`} />
      <button type="button" onClick={toggle} aria-label={visible ? t('dialogs.hidePassword') : t('dialogs.showPassword')}
        className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-[var(--text-subtle)] transition-colors hover:text-[var(--text-main)]">
        {visible ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  )
}

export function ErrorNote({ children }) {
  if (!children) return null
  return (
    <p role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-[12.5px] text-rose-600 dark:text-rose-400">
      {children}
    </p>
  )
}

export function Button({ variant = 'primary', className = '', ...props }) {
  const styles = {
    primary: 'bg-[var(--gold-primary)] text-white hover:bg-[var(--gold-hover)] shadow-sm',
    secondary: 'border border-[var(--border-card)] text-[var(--text-main)] hover:bg-[var(--border-subtle)]',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm',
  }
  return (
    <button
      type="button"
      {...props}
      className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[14px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${styles[variant]} ${className}`}
    />
  )
}
