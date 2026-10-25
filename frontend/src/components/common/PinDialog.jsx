import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { X, ChevronLeft } from 'lucide-react'
import { useI18n } from '../../i18n/core'

/** Shared shell for PIN screens: portal, backdrop, icon, title, back/close. */
export default function PinDialog({ icon: Icon, iconTone = 'gold', title, subtitle, onClose, onBack, children, footer }) {
  const { t } = useI18n()
  const tones = {
    gold: 'bg-[var(--gold-light)] text-[var(--gold-primary)]',
    danger: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  }
  return createPortal(
    <motion.div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose?.() } }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[360px] rounded-3xl border border-[var(--border-card)] bg-[var(--bg-page)] px-6 pt-6 pb-7 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.5)]"
      >
        <div className="flex items-center justify-between">
          {onBack ? (
            <button type="button" onClick={onBack} aria-label={t('common.back')}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--border-subtle)] transition-colors cursor-pointer">
              <ChevronLeft size={18} />
            </button>
          ) : <span className="h-8 w-8" />}
          {onClose && (
            <button type="button" onClick={onClose} aria-label={t('common.close')}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer">
              <X size={15} />
            </button>
          )}
        </div>

        <div className="-mt-4 flex flex-col items-center text-center">
          {Icon && (
            <span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${tones[iconTone]}`}>
              <Icon size={24} />
            </span>
          )}
          <h2 className="mt-3 text-[17px] font-semibold text-[var(--text-main)]">{title}</h2>
          {subtitle && <p className="mt-1 max-w-[280px] text-xs leading-relaxed text-[var(--text-subtle)]">{subtitle}</p>}
        </div>

        <div className="mt-5">{children}</div>
        {footer && <div className="mt-4">{footer}</div>}
      </motion.div>
    </motion.div>,
    document.body,
  )
}
