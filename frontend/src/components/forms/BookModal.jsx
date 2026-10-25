import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useI18n } from '../../i18n/core'

const TAGLINE_MAX = 80

export default function BookModal({ open, onClose, onSubmit, initial }) {
  const { t } = useI18n()
  const [name, setName] = useState('')
  // Stored as `description` for backward compatibility; shown to users as "Tagline".
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (open) {
      setName(initial?.name || '')
      setDescription(initial?.description || '')
    }
  }, [open, initial])

  if (!open) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit({ name: name.trim(), description: description.trim() })
    onClose()
  }

  const fieldCls = 'w-full rounded-xl border border-[var(--border-card)] bg-[var(--bg-card)] px-3.5 py-2.5 text-[13px] text-[var(--text-main)] placeholder-[var(--text-subtle)] outline-none focus:border-[var(--gold-primary)] transition-colors'

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
        />
        <motion.form
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          onSubmit={handleSubmit}
          onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
          className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-[var(--border-card)] bg-[var(--bg-page)] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45)]"
        >
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[var(--border-subtle)]">
            <h2 className="text-[15px] font-semibold text-[var(--text-main)]">
              {initial ? t('forms.book.editTitle') : t('forms.book.newTitle')}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          <div className="space-y-4 px-5 py-5">
            <div>
              <label htmlFor="book-name" className="mb-1.5 block text-[11px] font-semibold text-[var(--text-muted)]">{t('forms.book.name')}</label>
              <input
                id="book-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('forms.book.namePlaceholder')}
                className={fieldCls}
                required
                autoFocus
              />
            </div>
            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <label htmlFor="book-tagline" className="text-[11px] font-semibold text-[var(--text-muted)]">
                  {t('forms.tagline')} <span className="font-normal text-[var(--text-subtle)]">{t('forms.optionalParen')}</span>
                </label>
                <span className="text-[10px] tabular-nums text-[var(--text-subtle)]">{description.length}/{TAGLINE_MAX}</span>
              </div>
              <input
                id="book-tagline"
                value={description}
                maxLength={TAGLINE_MAX}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('forms.book.taglinePlaceholder')}
                className={fieldCls}
              />
            </div>
          </div>

          <div className="flex gap-3 border-t border-[var(--border-subtle)] px-5 pt-3 pb-5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-[var(--border-card)] py-3 text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--border-subtle)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-[2] rounded-xl bg-[var(--gold-primary)] py-3 text-xs font-semibold text-white hover:bg-[var(--gold-hover)] disabled:opacity-40 transition-colors cursor-pointer"
            >
              {initial ? t('forms.saveChanges') : t('forms.book.create')}
            </button>
          </div>
        </motion.form>
      </div>
    </AnimatePresence>
  )
}
