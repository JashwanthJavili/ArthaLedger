import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import { useI18n } from '../../i18n/core'

const nameOf = (c) => (typeof c === 'string' ? c : c?.name) || ''

/**
 * A compact category chip (name with the arrow right beside it) that opens a
 * scrollable, searchable list to choose from.
 */
export default function CategoryPicker({ value, categories, onChange, allowNone = true, label }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label={label}
        className="inline-flex min-w-0 max-w-[60%] items-center gap-1 rounded-full border border-[var(--border-card)] bg-[var(--bg-page)] py-1 pl-2.5 pr-2 text-[12px] text-[var(--text-main)] hover:border-[var(--text-subtle)] transition-colors cursor-pointer">
        <span className={`truncate ${value ? '' : 'text-[var(--text-muted)]'}`}>{value || t('sms.noCategory')}</span>
        <ChevronDown size={13} className="flex-shrink-0 text-[var(--text-muted)]" />
      </button>
      <CategoryPickerSheet open={open} onClose={() => setOpen(false)} value={value} categories={categories}
        allowNone={allowNone} title={label} onPick={(v) => { onChange(v); setOpen(false) }} />
    </>
  )
}

function CategoryPickerSheet({ open, onClose: close, value, categories, allowNone, title, onPick: pick }) {
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  // The search starts empty each time the list opens
  const onClose = () => { setQuery(''); close() }
  const onPick = (v) => { setQuery(''); pick(v) }
  const listRef = useRef(null)
  // The current choice is always offered, even if it isn't in the saved list
  const names = useMemo(() => [...new Set([...categories.map(nameOf), value].filter(Boolean))], [categories, value])
  const noneLabel = t('sms.noCategory')
  const showNone = allowNone && !names.includes(noneLabel)
  const q = query.trim().toLowerCase()
  const shown = q ? names.filter((n) => n.toLowerCase().includes(q)) : names

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Start with the current choice in view
    requestAnimationFrame(() => listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'center' }))
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const item = (key, text, selected, pick, muted = false) => (
    <li key={key}>
      <button type="button" role="option" aria-selected={selected} onClick={pick}
        className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[14px] transition-colors cursor-pointer ${selected ? 'bg-[var(--gold-light)] font-semibold text-[var(--gold-primary)]' : `${muted ? 'text-[var(--text-muted)]' : 'text-[var(--text-main)]'} hover:bg-[var(--border-subtle)]`}`}>
        <span className="min-w-0 flex-1 truncate">{text}</span>
        {selected && <Check size={16} className="flex-shrink-0" />}
      </button>
    </li>
  )

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-4">
          <motion.div className="absolute inset-0 bg-black/45" onClick={onClose}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div role="dialog" aria-modal="true" aria-label={title}
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 340 }}
            className="relative flex max-h-[78vh] w-full max-w-md flex-col rounded-t-3xl border border-[var(--border-card)] bg-[var(--bg-page)] pb-[env(safe-area-inset-bottom)] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45)] sm:rounded-3xl">
            <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-4">
              <p className="text-[15px] font-semibold text-[var(--text-main)]">{title}</p>
              <button type="button" onClick={onClose} aria-label={t('common.close')}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--border-subtle)] cursor-pointer">
                <X size={16} />
              </button>
            </div>
            {names.length > 6 && (
              <div className="px-4 pb-2">
                <label className="flex items-center gap-2 rounded-xl border border-[var(--border-card)] bg-[var(--bg-page)] px-3 py-2.5 focus-within:border-[var(--gold-primary)]">
                  <Search size={15} className="flex-shrink-0 text-[var(--text-muted)]" />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('sms.searchCategory')}
                    aria-label={t('sms.searchCategory')} className="min-w-0 flex-1 bg-transparent text-[14px] text-[var(--text-main)] outline-none" />
                </label>
              </div>
            )}
            <ul ref={listRef} role="listbox" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-3">
              {showNone && !q && item('__none', noneLabel, !value, () => onPick(''), true)}
              {shown.map((n) => item(n, n, n === value, () => onPick(n)))}
              {q && !shown.length && <li className="px-3 py-6 text-center text-[13px] text-[var(--text-muted)]">{t('sms.noCategoryMatch')}</li>}
            </ul>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
