import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { datePresets } from '../../lib/dateRanges'
import { X } from 'lucide-react'
import { useI18n } from '../../i18n/core'

function Group({ title, children }) {
  return (
    <section>
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-subtle)]">{title}</h3>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </section>
  )
}

export default function FilterSheet({ open, ...props }) {
  return createPortal(
    <AnimatePresence>
      {open && <FilterSheetDialog key="filter-sheet" {...props} />}
    </AnimatePresence>,
    document.body,
  )
}

function FilterSheetDialog({ onClose, filters, setFilters, categoryNames, enteredByList, resultCount, onReset }) {
  const { t } = useI18n()
  const presets = datePresets()
  const activePreset = presets.find(p => p.from === filters.from && p.to === filters.to)
  const [customOpen, setCustomOpen] = useState(!activePreset)
  const set = (key, value) => setFilters(p => ({ ...p, [key]: value }))

  const chip = active => `rounded-full border px-3.5 py-1.5 text-xs transition-colors cursor-pointer ${
    active
      ? 'border-[var(--text-main)] bg-[var(--text-main)] text-[var(--bg-page)] font-semibold'
      : 'border-[var(--border-card)] bg-[var(--bg-card)] text-[var(--text-muted)] font-medium hover:text-[var(--text-main)] hover:border-[var(--text-subtle)]'
  }`
  const dateInput = 'w-full rounded-xl border border-[var(--border-card)] bg-[var(--bg-card)] px-3 py-2 text-xs text-[var(--text-main)] outline-none focus:border-[var(--gold-primary)] transition-colors'

  const options = (key, list, allLabel) => [
    <button key="all" type="button" onClick={() => set(key, 'all')} className={chip(filters[key] === 'all')}>{allLabel}</button>,
    ...list.map(([val, lbl]) => (
      <button key={val} type="button" onClick={() => set(key, val)} className={chip(filters[key] === val)}>{lbl}</button>
    )),
  ]

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }}
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={t('forms.filters.title')}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex w-full sm:max-w-[440px] flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl border border-[var(--border-card)] bg-[var(--bg-page)] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45)]"
        style={{ maxHeight: '88vh' }}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[var(--border-subtle)]">
          <h2 className="text-[15px] font-semibold text-[var(--text-main)]">{t('forms.filters.title')}</h2>
          <button type="button" onClick={onClose} aria-label={t('common.close')} autoFocus
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer">
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <Group title={t('forms.filters.type')}>
            {options('type', [['income', t('forms.filters.cashIn')], ['expense', t('forms.filters.cashOut')], ['transfer_in', t('forms.filters.transferIn')], ['transfer_out', t('forms.filters.transferOut')]], t('common.all'))}
          </Group>

          <Group title={t('forms.filters.paymentMode')}>
            {options('mode', [['Cash', t('forms.filters.cash')], ['UPI', 'UPI']], t('common.all'))}
          </Group>

          <section>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-subtle)]">{t('common.date')}</h3>
            <div className="flex flex-wrap gap-1.5">
              {presets.map(p => (
                <button key={p.id} type="button"
                  onClick={() => { setFilters(f => ({ ...f, from: p.from, to: p.to })); setCustomOpen(false) }}
                  className={chip(!customOpen && activePreset?.id === p.id)}>
                  {p.label}
                </button>
              ))}
              <button type="button" onClick={() => setCustomOpen(true)} className={chip(customOpen)}>{t('forms.filters.custom')}</button>
            </div>
            {customOpen && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-1 block text-[11px] text-[var(--text-muted)]">{t('forms.filters.from')}</span>
                  <input type="date" value={filters.from} max={filters.to || undefined}
                    onChange={e => set('from', e.target.value)} className={dateInput} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] text-[var(--text-muted)]">{t('forms.filters.to')}</span>
                  <input type="date" value={filters.to} min={filters.from || undefined}
                    onChange={e => set('to', e.target.value)} className={dateInput} />
                </label>
              </div>
            )}
          </section>

          {categoryNames.length > 0 && (
            <Group title={t('common.category')}>
              {options('category', categoryNames.map(c => [c, c]), t('common.all'))}
            </Group>
          )}

          {enteredByList.length > 0 && (
            <Group title={t('forms.filters.enteredBy')}>
              {options('enteredBy', enteredByList.map(n => [n, n]), t('forms.filters.everyone'))}
            </Group>
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-[var(--border-subtle)] px-5 pt-3 pb-5">
          <button type="button" onClick={() => { onReset(); setCustomOpen(false) }}
            className="rounded-xl border border-[var(--border-card)] px-4 py-3 text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--border-subtle)] hover:text-[var(--text-main)] transition-colors cursor-pointer">
            {t('common.reset')}
          </button>
          <button type="button" onClick={onClose}
            className="flex-1 rounded-xl bg-[var(--gold-primary)] py-3 text-xs font-semibold text-white hover:bg-[var(--gold-hover)] transition-colors cursor-pointer">
            {t('forms.filters.showResults', { count: resultCount })}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
