import { useState, useEffect, useRef } from 'react'
import { X, ArrowRight, BookOpen } from 'lucide-react'
import { getCurrencySymbol, formatAmount } from '../../lib/format'

/**
 * TransferModal — move money from the current book to another book in the same project.
 *
 * Props:
 *   open          - boolean
 *   onClose       - fn
 *   currentBook   - { id, name }
 *   otherBooks    - [{ id, name }]  — all books in the project except current
 *   currentBalance - number
 *   onTransfer    - async fn({ toBookId, amount, note })
 */
export default function TransferModal({ open, onClose, currentBook, otherBooks = [], currentBalance = 0, onTransfer }) {
  const [toBookId, setToBookId] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const amountRef = useRef(null)

  const symbol = getCurrencySymbol()

  useEffect(() => {
    if (open) {
      setToBookId(otherBooks[0]?.id || '')
      setAmount('')
      setNote('')
      setErrors({})
      setTimeout(() => amountRef.current?.focus(), 80)
    }
  }, [open, otherBooks])

  if (!open) return null

  const validate = () => {
    const e = {}
    const num = Number(amount)
    if (!amount || num <= 0) e.amount = 'Enter a valid amount'
    if (num > currentBalance) e.amount = `Insufficient balance (${symbol}${formatAmount(currentBalance)})`
    if (!toBookId) e.toBook = 'Select a destination book'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev) => {
    ev.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      await onTransfer({ toBookId, amount: Number(amount), note: note.trim() })
      onClose()
    } catch (err) {
      setErrors({ submit: err.message || 'Transfer failed. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  const toBook = otherBooks.find(b => b.id === toBookId)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/35 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-sm sm:rounded-3xl rounded-t-3xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-blue-100 p-1.5">
              <ArrowRight size={15} className="text-blue-600" />
            </div>
            <span className="text-sm font-semibold text-stone-800">Transfer Between Books</span>
          </div>
          <button type="button" onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 transition-colors">
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-4 py-4 space-y-4">
          {/* From → To visual */}
          <div className="flex items-center gap-2 rounded-xl bg-stone-50 border border-stone-200 px-3 py-2.5">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <BookOpen size={12} className="text-amber-600 flex-shrink-0" />
              <span className="text-xs font-semibold text-stone-700 truncate">{currentBook?.name}</span>
            </div>
            <ArrowRight size={14} className="text-stone-400 flex-shrink-0" />
            <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-end">
              <BookOpen size={12} className="text-blue-500 flex-shrink-0" />
              <span className="text-xs font-semibold text-blue-700 truncate">
                {toBook?.name || 'Select book'}
              </span>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1.5">
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-base font-bold">{symbol}</span>
              <input
                ref={amountRef}
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={e => { setAmount(e.target.value); setErrors(p => ({ ...p, amount: '' })) }}
                placeholder="0.00"
                className={`w-full rounded-xl border bg-stone-50 pl-8 pr-3 py-2.5 text-2xl font-bold text-stone-800 placeholder-stone-300 focus:bg-white transition-colors ${
                  errors.amount ? 'border-red-300' : 'border-stone-200 focus:border-amber-300'
                }`}
              />
            </div>
            {errors.amount && <p className="mt-1 text-[11px] text-red-500">{errors.amount}</p>}
            <p className="mt-1 text-[10px] text-stone-400">
              Available: {symbol}{formatAmount(currentBalance)}
            </p>
          </div>

          {/* Destination book */}
          <div>
            <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1.5">
              Transfer To
            </label>
            {otherBooks.length === 0 ? (
              <p className="text-xs text-stone-400 rounded-xl border border-dashed border-stone-200 px-3 py-3 text-center">
                No other books in this project
              </p>
            ) : (
              <div className="space-y-1.5">
                {otherBooks.map(b => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => { setToBookId(b.id); setErrors(p => ({ ...p, toBook: '' })) }}
                    className={`w-full flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-all ${
                      toBookId === b.id
                        ? 'border-blue-400 bg-blue-50 text-blue-800'
                        : 'border-stone-200 bg-stone-50 text-stone-700 hover:border-blue-200 hover:bg-blue-50/40'
                    }`}
                  >
                    <BookOpen size={13} className={toBookId === b.id ? 'text-blue-500' : 'text-stone-400'} />
                    <span className="font-medium">{b.name}</span>
                    {toBookId === b.id && (
                      <span className="ml-auto text-[10px] text-blue-600 font-semibold">Selected</span>
                    )}
                  </button>
                ))}
              </div>
            )}
            {errors.toBook && <p className="mt-1 text-[11px] text-red-500">{errors.toBook}</p>}
          </div>

          {/* Note */}
          <div>
            <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1.5">
              Note <span className="text-stone-300 font-normal">(optional)</span>
            </label>
            <input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Monthly allocation"
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-800 placeholder-stone-400 focus:border-amber-300 focus:bg-white transition-colors"
            />
          </div>

          {/* Info note */}
          <div className="flex items-start gap-2 rounded-xl bg-blue-50 border border-blue-100 px-3 py-2.5">
            <span className="text-base leading-none mt-0.5 flex-shrink-0">ℹ️</span>
            <p className="text-xs text-blue-700 leading-relaxed">
              This transfer won't affect the project's overall balance — it's just moving money between books.
            </p>
          </div>

          {errors.submit && (
            <p className="rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-600 text-center">
              {errors.submit}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-stone-200 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || otherBooks.length === 0}
              className="flex-[2] rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-60"
            >
              {submitting ? 'Transferring...' : 'Transfer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
