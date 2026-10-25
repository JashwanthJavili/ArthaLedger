import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Receipt } from 'lucide-react'
import { useI18n } from '../../i18n/core'

/**
 * Bottom sheet (mobile) / centered dialog (desktop) listing one category's
 * transactions for the vault's active period. `transactions` arrive pre-sorted.
 */
export default function CategoryTransactionsSheet({
  open, category, transactions, bookDetailsMap, periodLabel, formatMoney, onClose, onOpenEntry,
}) {
  const { t, intl } = useI18n()
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const isIncome = category?.type === 'income'
  const total = (transactions || []).reduce((s, x) => s + Number(x.amount || 0), 0)

  return createPortal(
    <AnimatePresence>
      {open && category && (
        <motion.div
          key="vault-category-sheet"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4"
        >
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={category.name}
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex w-full flex-col overflow-hidden rounded-t-3xl border border-[var(--border-card)] bg-[var(--bg-page)] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45)] sm:max-w-[480px] sm:rounded-3xl"
            style={{ maxHeight: '85vh' }}
          >
            {/* Header */}
            <div className="flex flex-shrink-0 items-start justify-between gap-3 border-b border-[var(--border-subtle)] px-5 pt-5 pb-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-[15px] font-semibold text-[var(--text-main)]">{category.name}</h3>
                  <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    isIncome
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  }`}>
                    {isIncome ? t('common.income') : t('vault.sheet.spending')}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[11px] tabular-nums text-[var(--text-subtle)]">
                  {t('vault.sheet.transactions', { count: transactions.length })} · {formatMoney(total)}
                  {periodLabel ? ` · ${periodLabel}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={t('common.close')}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--border-subtle)] text-[var(--text-muted)] transition-colors hover:text-[var(--text-main)] cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* List */}
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {transactions.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--gold-light)] text-[var(--gold-primary)]">
                    <Receipt size={19} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-main)]">{t('vault.sheet.emptyTitle')}</p>
                    <p className="mt-1 text-xs text-[var(--text-subtle)]">{t('vault.sheet.emptyBody')}</p>
                  </div>
                </div>
              ) : (
                <ul className="divide-y divide-[var(--border-subtle)] rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)]">
                  {transactions.map((txn, idx) => {
                    const date = new Date(txn.timestamp)
                    const dateStr = date.toLocaleDateString(intl, { day: 'numeric', month: 'short', year: 'numeric' })
                    const timeStr = date.toLocaleTimeString(intl, { hour: '2-digit', minute: '2-digit', hour12: true })
                    const details = bookDetailsMap[txn.bookId]
                    const meta = [dateStr, timeStr, !txn.mode || txn.mode === 'Cash' ? t('vault.sheet.cash') : txn.mode, details?.bookName].filter(Boolean).join(' · ')
                    return (
                      <li key={txn.id || idx}>
                        <button
                          type="button"
                          onClick={() => onOpenEntry(txn)}
                          className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--border-subtle)]/60 cursor-pointer first:rounded-t-2xl last:rounded-b-2xl"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-medium text-[var(--text-main)]">
                              {txn.description || (isIncome ? t('vault.sheet.untitledIncome') : t('vault.sheet.untitledSpending'))}
                            </span>
                            <span className="block truncate text-[11px] text-[var(--text-subtle)]">{meta}</span>
                          </span>
                          <span className={`flex-shrink-0 text-[13px] font-semibold tabular-nums ${
                            isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--text-main)]'
                          }`}>
                            {isIncome ? '+' : '−'}{formatMoney(txn.amount)}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
