import { useState, useEffect, useMemo, useRef } from 'react'
import { X, ArrowRight, BookOpen } from 'lucide-react'
import { getCurrencySymbol, formatAmount } from '../../lib/format'
const LAST_TRANSFER_KEY = 'al_last_transfer_target'

/**
 * TransferModal — move money from the current book to any other book the user can see.
 *
 * Props:
 *   open          - boolean
 *   onClose       - fn
 *   currentBook   - { id, name }
 *   projects      - [{ id, name }]
 *   booksByProject- { [projectId]: [{ id, name }] }
 *   currentBalance - number
 *   onTransfer    - async fn({ destinationProjectId, destinationBookId, amount, note })
 */
export default function TransferModal({
  open,
  onClose,
  currentProject,
  currentBook,
  projects = [],
  booksByProject = {},
  currentBalance = 0,
  onTransfer,
}) {
  const [destinationProjectId, setDestinationProjectId] = useState('')
  const [destinationBookId, setDestinationBookId] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const amountRef = useRef(null)
  const formRef = useRef(null)

  const symbol = getCurrencySymbol()

  const destinationProjects = useMemo(() => {
    return projects
      .filter(project => (booksByProject[project.id] || []).length > 0)
      .map(project => ({
        ...project,
        books: booksByProject[project.id] || [],
      }))
  }, [projects, booksByProject])

  const selectedProject = destinationProjects.find(project => project.id === destinationProjectId)
  const destinationBooks = selectedProject?.books || []
  const selectedBook = destinationBooks.find(book => book.id === destinationBookId)

  useEffect(() => {
    if (open) {
      let savedTarget = {}
      try {
        savedTarget = JSON.parse(localStorage.getItem(LAST_TRANSFER_KEY) || '{}') || {}
      } catch {
        savedTarget = {}
      }
      const currentProjectHasOtherBooks = (booksByProject[currentProject?.id] || []).filter(book => book.id !== currentBook?.id)
      const savedProject = destinationProjects.find(project => project.id === savedTarget.projectId && (project.books || []).some(book => book.id === savedTarget.bookId)) || null
      const preferredProject = savedProject || (currentProjectHasOtherBooks.length
        ? currentProject
        : destinationProjects.find(project => project.id !== currentProject?.id) || destinationProjects[0] || null)

      const preferredBook = savedProject
        ? (savedProject.books || []).find(book => book.id === savedTarget.bookId)
        : preferredProject
        ? (preferredProject.id === currentProject?.id
          ? currentProjectHasOtherBooks[0]
          : (preferredProject.books || [])[0])
        : null

      setDestinationProjectId(preferredProject?.id || '')
      setDestinationBookId(preferredBook?.id || '')
      setAmount('')
      setNote('')
      setErrors({})
      setTimeout(() => amountRef.current?.focus(), 80)
    }
  }, [open, booksByProject, currentBook?.id, currentProject, destinationProjects])

  useEffect(() => {
    if (!open) return
    if (!destinationProjectId) return

    const books = booksByProject[destinationProjectId] || []
    const validBooks = books.filter(book => !(destinationProjectId === currentProject?.id && book.id === currentBook?.id))

    if (validBooks.length === 0) {
      setDestinationBookId('')
      return
    }

    if (!validBooks.some(book => book.id === destinationBookId)) {
      setDestinationBookId(validBooks[0].id)
    }
  }, [open, destinationProjectId, destinationBookId, booksByProject, currentBook?.id, currentProject?.id])

  if (!open) return null

  const validate = () => {
    const e = {}
    const num = Number(amount)
    if (!amount || num <= 0) e.amount = 'Enter a valid amount'
    if (num > currentBalance) e.amount = `Insufficient balance (${symbol}${formatAmount(currentBalance)})`
    if (!destinationProjectId) e.destinationProject = 'Select a destination project'
    if (!destinationBookId) e.destinationBook = 'Select a destination book'
    if (currentProject?.id === destinationProjectId && currentBook?.id === destinationBookId) {
      e.destinationBook = 'Source and destination books must be different'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev) => {
    ev.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      await onTransfer({
        destinationProjectId,
        destinationBookId,
        amount: Number(amount),
        note: note.trim(),
      })
      localStorage.setItem(LAST_TRANSFER_KEY, JSON.stringify({ projectId: destinationProjectId, bookId: destinationBookId }))
      onClose()
    } catch (err) {
      setErrors({ submit: err.message || 'Transfer failed. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  const projectLabel = selectedProject?.name || 'Select project'
  const bookLabel = selectedBook?.name || 'Select book'

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
      return
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      formRef.current?.requestSubmit()
    }
  }

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

        <form ref={formRef} onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="px-4 py-4 space-y-4">
          {/* From → To visual */}
          <div className="flex items-center gap-2 rounded-xl bg-stone-50 border border-stone-200 px-3 py-2.5">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <BookOpen size={12} className="text-amber-600 flex-shrink-0" />
              <span className="text-xs font-semibold text-stone-700 truncate">
                {currentProject?.name ? `${currentProject.name} · ` : ''}{currentBook?.name}
              </span>
            </div>
            <ArrowRight size={14} className="text-stone-400 flex-shrink-0" />
            <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-end">
              <BookOpen size={12} className="text-blue-500 flex-shrink-0" />
              <span className="text-xs font-semibold text-blue-700 truncate">
                {selectedProject?.name ? `${projectLabel} · ` : ''}{bookLabel}
              </span>
            </div>
          </div>

          {/* Destination project */}
          <div>
            <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1.5">
              Destination Project
            </label>
            {destinationProjects.length === 0 ? (
              <p className="text-xs text-stone-400 rounded-xl border border-dashed border-stone-200 px-3 py-3 text-center">
                No projects with books available
              </p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
                {destinationProjects.map(project => (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => {
                      setDestinationProjectId(project.id)
                      const books = (booksByProject[project.id] || []).filter(book => !(project.id === currentProject?.id && book.id === currentBook?.id))
                      setDestinationBookId(books[0]?.id || '')
                      setErrors(prev => ({ ...prev, destinationProject: '', destinationBook: '' }))
                    }}
                    className={`w-full flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-all ${
                      destinationProjectId === project.id
                        ? 'border-blue-400 bg-blue-50 text-blue-800'
                        : 'border-stone-200 bg-stone-50 text-stone-700 hover:border-blue-200 hover:bg-blue-50/40'
                    }`}
                  >
                    <BookOpen size={13} className={destinationProjectId === project.id ? 'text-blue-500' : 'text-stone-400'} />
                    <span className="font-medium truncate">{project.name}</span>
                    <span className="ml-auto text-[10px] text-stone-400">{project.books.length} book{project.books.length !== 1 ? 's' : ''}</span>
                  </button>
                ))}
              </div>
            )}
            {errors.destinationProject && <p className="mt-1 text-[11px] text-red-500">{errors.destinationProject}</p>}
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
            {!selectedProject ? (
              <p className="text-xs text-stone-400 rounded-xl border border-dashed border-stone-200 px-3 py-3 text-center">
                Select a project first
              </p>
            ) : destinationBooks.filter(book => !(selectedProject.id === currentProject?.id && book.id === currentBook?.id)).length === 0 ? (
              <p className="text-xs text-stone-400 rounded-xl border border-dashed border-stone-200 px-3 py-3 text-center">
                No destination books available in this project
              </p>
            ) : (
              <div className="space-y-1.5">
                {destinationBooks
                  .filter(book => !(selectedProject.id === currentProject?.id && book.id === currentBook?.id))
                  .map(book => (
                  <button
                    key={book.id}
                    type="button"
                    onClick={() => { setDestinationBookId(book.id); setErrors(p => ({ ...p, destinationBook: '' })) }}
                    className={`w-full flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-all ${
                      destinationBookId === book.id
                        ? 'border-blue-400 bg-blue-50 text-blue-800'
                        : 'border-stone-200 bg-stone-50 text-stone-700 hover:border-blue-200 hover:bg-blue-50/40'
                    }`}
                  >
                    <BookOpen size={13} className={destinationBookId === book.id ? 'text-blue-500' : 'text-stone-400'} />
                    <span className="font-medium truncate">{book.name}</span>
                    {destinationBookId === book.id && (
                      <span className="ml-auto text-[10px] text-blue-600 font-semibold">Selected</span>
                    )}
                  </button>
                ))}
              </div>
            )}
            {errors.destinationBook && <p className="mt-1 text-[11px] text-red-500">{errors.destinationBook}</p>}
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
              This transfer creates one outgoing entry in the source book and one incoming entry in the destination book.
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
              disabled={submitting || !selectedProject || !selectedBook}
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
