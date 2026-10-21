import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { X, ArrowDown, Check, AlertTriangle, Lock } from 'lucide-react'
import { getCurrencySymbol, formatAmount } from '../../lib/format'

const LAST_TRANSFER_KEY = 'al_last_transfer_target'

/**
 * TransferModal — move money from the current book to another book.
 *
 * Props:
 *   open, onClose
 *   currentProject  - { id, name }
 *   currentBook     - { id, name }
 *   projects        - [{ id, name }]
 *   booksByProject  - { [projectId]: [{ id, name }] }
 *   currentBalance  - number (balance of the source book right now)
 *   getBookBalance  - optional fn(bookId) → number, shown next to destinations
 *   editing         - optional { amount, note, toProjectId, toBookId } to edit a transfer
 *   onTransfer      - async fn({ destinationProjectId, destinationBookId, amount, note })
 */
export default function TransferModal(props) {
  if (!props.open) return null
  return createPortal(<TransferDialog {...props} />, document.body)
}

function TransferDialog({
  onClose,
  currentProject,
  currentBook,
  projects = [],
  booksByProject = {},
  currentBalance = 0,
  getBookBalance,
  editing = null,
  onTransfer,
}) {
  const symbol = getCurrencySymbol()
  const isEdit = Boolean(editing)
  // When editing, the existing transfer amount is already deducted; it's available again.
  const available = Math.round((Number(currentBalance) + (isEdit ? Number(editing.amount || 0) : 0)) * 100) / 100

  const destinationProjects = useMemo(() => projects
    .map((project) => ({
      ...project,
      books: (booksByProject[project.id] || []).filter((b) => !(project.id === currentProject?.id && b.id === currentBook?.id)),
    }))
    .filter((project) => project.books.length > 0), [projects, booksByProject, currentProject?.id, currentBook?.id])

  const initialTarget = (() => {
    if (isEdit) return { projectId: editing.toProjectId, bookId: editing.toBookId }
    let saved = {}
    try { saved = JSON.parse(localStorage.getItem(LAST_TRANSFER_KEY) || '{}') || {} } catch { saved = {} }
    const savedProject = destinationProjects.find((p) => p.id === saved.projectId && p.books.some((b) => b.id === saved.bookId))
    if (savedProject) return { projectId: savedProject.id, bookId: saved.bookId }
    const preferred = destinationProjects.find((p) => p.id === currentProject?.id) || destinationProjects[0]
    return { projectId: preferred?.id || '', bookId: preferred?.books[0]?.id || '' }
  })()

  const [destinationProjectId, setDestinationProjectId] = useState(initialTarget.projectId)
  const [destinationBookId, setDestinationBookId] = useState(initialTarget.bookId)
  const [amount, setAmount] = useState(isEdit ? String(editing.amount) : '')
  const [note, setNote] = useState(isEdit ? editing.note || '' : '')
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const amountRef = useRef(null)

  useEffect(() => {
    const t = setTimeout(() => amountRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [])

  const selectedProject = destinationProjects.find((p) => p.id === destinationProjectId)
  const destinationBooks = selectedProject?.books || []
  const allBooks = Object.values(booksByProject).flat()
  const selectedBook = destinationBooks.find((b) => b.id === destinationBookId) || allBooks.find((b) => b.id === destinationBookId)
  const destinationProjectName = projects.find((p) => p.id === destinationProjectId)?.name

  const num = Number(amount) || 0
  const remaining = Math.round((available - num) * 100) / 100
  const overLimit = num > available

  const pickProject = (project) => {
    setDestinationProjectId(project.id)
    setDestinationBookId(project.books[0]?.id || '')
    setErrors((e) => ({ ...e, destination: '' }))
  }

  const validate = () => {
    const e = {}
    if (!amount || num <= 0) e.amount = 'Enter a valid amount'
    else if (overLimit) e.amount = `Only ${symbol}${formatAmount(available)} available`
    if (!isEdit && (!destinationProjectId || !destinationBookId)) e.destination = 'Choose a book to send to'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev) => {
    ev.preventDefault()
    if (submitting || !validate()) return
    setSubmitting(true)
    try {
      await onTransfer({ destinationProjectId, destinationBookId, amount: num, note: note.trim() })
      if (!isEdit) localStorage.setItem(LAST_TRANSFER_KEY, JSON.stringify({ projectId: destinationProjectId, bookId: destinationBookId }))
      onClose()
    } catch (err) {
      setErrors({ submit: err.message || 'Transfer failed. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  const sectionLabel = 'mb-2 block text-[11px] font-semibold text-[var(--text-muted)]'

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }}
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex w-full sm:max-w-[440px] flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl border border-[var(--border-card)] bg-[var(--bg-page)] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45)]"
        style={{ maxHeight: '92vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[var(--border-subtle)]">
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--text-main)]">{isEdit ? 'Edit transfer' : 'Transfer money'}</h2>
            <p className="mt-0.5 text-[11px] text-[var(--text-subtle)]">
              {isEdit ? 'Changes update both books' : 'Move money to another book'}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer">
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {/* From → To */}
          <div className="relative rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)]">
            <div className="px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-subtle)]">From</p>
              <div className="mt-0.5 flex items-baseline justify-between gap-3">
                <p className="truncate text-[13px] font-semibold text-[var(--text-main)]">{currentBook?.name}</p>
                <p className="flex-shrink-0 text-[11px] text-[var(--text-subtle)]">
                  Available <span className="font-semibold tabular-nums text-[var(--text-main)]">{symbol}{formatAmount(available)}</span>
                </p>
              </div>
              {currentProject?.name && <p className="truncate text-[11px] text-[var(--text-subtle)]">{currentProject.name}</p>}
            </div>
            <div className="relative border-t border-[var(--border-subtle)]">
              <span className="absolute left-1/2 top-0 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--border-card)] bg-[var(--bg-page)] text-[var(--gold-primary)]">
                <ArrowDown size={14} strokeWidth={2.4} />
              </span>
              <div className="px-4 py-3 pt-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-subtle)]">To</p>
                <p className={`mt-0.5 truncate text-[13px] font-semibold ${selectedBook ? 'text-[var(--text-main)]' : 'text-[var(--text-subtle)]'}`}>
                  {selectedBook?.name || 'Choose a book below'}
                </p>
                {destinationProjectName && <p className="truncate text-[11px] text-[var(--text-subtle)]">{destinationProjectName}</p>}
              </div>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label htmlFor="transfer-amount" className={sectionLabel}>Amount</label>
            <div className={`flex items-center gap-3 rounded-2xl border bg-[var(--bg-card)] px-4 py-2.5 transition-colors ${
              errors.amount || overLimit ? 'border-rose-500' : 'border-[var(--border-card)] focus-within:border-[var(--gold-primary)]'
            }`}>
              <span className="text-lg font-semibold text-[var(--text-subtle)]">{symbol}</span>
              <input
                id="transfer-amount"
                ref={amountRef}
                type="number" inputMode="decimal" min="0.01" step="0.01"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setErrors((p) => ({ ...p, amount: '', submit: '' })) }}
                placeholder="0.00"
                className="no-spin min-w-0 flex-1 bg-transparent text-[24px] font-bold tabular-nums tracking-tight text-[var(--text-main)] placeholder-[var(--text-subtle)]/50 outline-none"
              />
              <button type="button" onClick={() => { setAmount(String(Math.max(available, 0))); setErrors((p) => ({ ...p, amount: '' })) }}
                disabled={available <= 0}
                className="rounded-lg bg-[var(--gold-light)] px-2.5 py-1 text-[11px] font-semibold text-[var(--gold-primary)] hover:bg-[var(--gold-primary)] hover:text-white disabled:opacity-40 transition-colors cursor-pointer">
                Max
              </button>
            </div>
            <p className={`mt-1.5 text-[11px] ${errors.amount || overLimit ? 'text-rose-500' : 'text-[var(--text-subtle)]'}`}>
              {errors.amount
                || (overLimit
                  ? `Only ${symbol}${formatAmount(available)} available`
                  : num > 0 ? `${symbol}${formatAmount(remaining)} will remain in ${currentBook?.name}` : 'Enter how much to send')}
            </p>
          </div>

          {/* Destination */}
          {isEdit ? (
            <div className="flex items-start gap-2.5 rounded-xl bg-[var(--border-subtle)] px-3.5 py-3">
              <Lock size={14} className="mt-0.5 flex-shrink-0 text-[var(--text-subtle)]" />
              <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">
                The destination can't be changed. To send to a different book, delete this transfer and create a new one.
              </p>
            </div>
          ) : (
            <div>
              <span className={sectionLabel}>Send to</span>
              {destinationProjects.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[var(--border-card)] px-3 py-4 text-center text-xs text-[var(--text-subtle)]">
                  Create another book to transfer money.
                </p>
              ) : (
                <>
                  {destinationProjects.length > 1 && (
                    <div className="mb-2.5 flex gap-1.5 overflow-x-auto pb-1">
                      {destinationProjects.map((project) => {
                        const active = project.id === destinationProjectId
                        return (
                          <button key={project.id} type="button" onClick={() => pickProject(project)}
                            className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors cursor-pointer ${
                              active
                                ? 'border-[var(--text-main)] bg-[var(--text-main)] font-semibold text-[var(--bg-page)]'
                                : 'border-[var(--border-card)] bg-[var(--bg-card)] font-medium text-[var(--text-muted)] hover:text-[var(--text-main)]'
                            }`}>
                            {project.name}{project.id === currentProject?.id ? ' (this project)' : ''}
                          </button>
                        )
                      })}
                    </div>
                  )}
                  <ul className="divide-y divide-[var(--border-subtle)] rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)]">
                    {destinationBooks.map((book) => {
                      const active = book.id === destinationBookId
                      const bal = getBookBalance ? getBookBalance(book.id) : null
                      return (
                        <li key={book.id}>
                          <button type="button"
                            onClick={() => { setDestinationBookId(book.id); setErrors((p) => ({ ...p, destination: '' })) }}
                            className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer first:rounded-t-2xl last:rounded-b-2xl ${active ? 'bg-[var(--gold-light)]' : 'hover:bg-[var(--border-subtle)]'}`}>
                            <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border transition-colors ${
                              active ? 'border-[var(--gold-primary)] bg-[var(--gold-primary)] text-white' : 'border-[var(--border-card)]'
                            }`}>
                              {active && <Check size={12} strokeWidth={3} />}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13px] font-medium text-[var(--text-main)]">{book.name}</span>
                              {book.description && <span className="block truncate text-[11px] text-[var(--text-subtle)]">{book.description}</span>}
                            </span>
                            {bal != null && (
                              <span className="flex-shrink-0 text-[11px] tabular-nums text-[var(--text-subtle)]">
                                {bal < 0 ? '−' : ''}{symbol}{formatAmount(Math.abs(bal), 0)}
                              </span>
                            )}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </>
              )}
              {errors.destination && <p className="mt-1.5 text-[11px] text-rose-500">{errors.destination}</p>}
            </div>
          )}

          {/* Note */}
          <div>
            <label htmlFor="transfer-note" className={sectionLabel}>Note <span className="font-normal text-[var(--text-subtle)]">(optional)</span></label>
            <input
              id="transfer-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Monthly allocation"
              className="w-full rounded-xl border border-[var(--border-card)] bg-[var(--bg-card)] px-3.5 py-2.5 text-[13px] text-[var(--text-main)] placeholder-[var(--text-subtle)] outline-none focus:border-[var(--gold-primary)] transition-colors"
            />
          </div>

          {errors.submit && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/[0.06] px-3.5 py-3">
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-rose-500" />
              <p className="text-xs text-rose-700 dark:text-rose-300">{errors.submit}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--border-subtle)] px-5 pt-3 pb-5">
          <button
            type="submit"
            disabled={submitting || overLimit || num <= 0 || (!isEdit && !selectedBook)}
            className="w-full rounded-2xl bg-[var(--gold-primary)] py-3.5 text-[13px] font-semibold text-white hover:bg-[var(--gold-hover)] disabled:opacity-40 transition-colors cursor-pointer"
          >
            {submitting
              ? (isEdit ? 'Saving…' : 'Transferring…')
              : isEdit
                ? 'Save changes'
                : num > 0 && selectedBook ? `Transfer ${symbol}${formatAmount(num)} to ${selectedBook.name}` : 'Transfer'}
          </button>
          <p className="mt-2 text-center text-[10px] text-[var(--text-subtle)]">
            Recorded as Transfer out here and Transfer in at the destination. Only this book can edit or delete it.
          </p>
        </div>
      </motion.form>
    </motion.div>
  )
}
