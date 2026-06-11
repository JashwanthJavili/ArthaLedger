import { useEffect, useMemo, useState, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { format, isToday, isYesterday } from 'date-fns'
import {
  Filter, Search, Download, ArrowLeft, MoreVertical,
  Pencil, Trash2, X, TrendingUp, TrendingDown,
  BookOpen, Hash, Lock, Unlock,
} from 'lucide-react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import LayoutShell from '../components/LayoutShell'
import EntryCard from '../components/cards/EntryCard'
import SummaryStrip from '../components/cards/SummaryCard'
import EntryModal from '../components/forms/EntryModal'
import BookModal from '../components/forms/BookModal'
import CategoryManager from '../components/forms/CategoryManager'
import ConfirmDialog from '../components/common/ConfirmDialog'
import PinVerificationModal from '../components/common/PinVerificationModal'
import SetPinModal from '../components/common/SetPinModal'
import Toast from '../components/common/Toast'
import { useAppData } from '../context/AppDataContext'
import { exportBookPdf } from '../lib/pdf'
import { lockItem } from '../lib/pin'

const defaultCategories = []

/* ── Per-entry 3-dot menu ── */
function EntryMenu({ onEdit, onDelete }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-xl p-1.5 text-stone-400 hover:bg-amber-100 hover:text-amber-700 transition-colors"
        aria-label="Entry options"
      >
        <MoreVertical size={14} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-8 z-50 w-36 overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-xl"
          >
            <button
              onClick={() => { onEdit(); setOpen(false) }}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-xs text-stone-700 hover:bg-amber-50 transition-colors border-b border-amber-50"
            >
              <Pencil size={11} className="text-amber-600" /> Edit Entry
            </button>
            <button
              onClick={() => { onDelete(); setOpen(false) }}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-xs text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={11} /> Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Book header 3-dot menu ── */
function BookHeaderMenu({ onEdit, onDelete, onSetPin, hasPin }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center rounded-xl border border-amber-100 p-2 text-stone-600 hover:bg-amber-50 transition-colors"
        aria-label="Book options"
      >
        <MoreVertical size={15} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 mt-1 w-44 overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-xl z-40"
          >
            <button
              onClick={() => { onSetPin(); setOpen(false) }}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-xs text-stone-700 hover:bg-amber-50 transition-colors border-b border-amber-50"
            >
              {hasPin
                ? <><Unlock size={12} className="text-amber-600" /> Change PIN</>
                : <><Lock size={12} className="text-amber-600" /> Set PIN Lock</>
              }
            </button>
            <button
              onClick={() => { onEdit(); setOpen(false) }}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-xs text-stone-700 hover:bg-amber-50 transition-colors border-b border-amber-50"
            >
              <Pencil size={12} className="text-amber-600" /> Edit Book
            </button>
            <button
              onClick={() => { onDelete(); setOpen(false) }}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-xs text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={12} /> Delete Book
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function BookPage() {
  const { projectId, bookId } = useParams()
  const navigate = useNavigate()
  const {
    projects, booksByProject, entriesByBook,
    addEntry, deleteEntry, updateCategories, getCategories,
    updateBook, updateEntry, deleteBook, deleteBookWithPin, setPinForBook,
  } = useAppData()

  const [modalType, setModalType] = useState(null)
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showCatManager, setShowCatManager] = useState(false)
  const [categories, setCategories] = useState(defaultCategories)
  const [editingBook, setEditingBook] = useState(false)
  const [editingEntry, setEditingEntry] = useState(null)
  const [deleteEntryTarget, setDeleteEntryTarget] = useState(null)
  const [deleteBookConfirm, setDeleteBookConfirm] = useState(false)
  const [verifyPinForDelete, setVerifyPinForDelete] = useState(false)
  const [deletingBook, setDeletingBook] = useState(false)
  const [setPinOpen, setSetPinOpen] = useState(false)
  const [toast, setToast] = useState({ msg: '', type: 'success', visible: false })
  const [filters, setFilters] = useState({
    type: 'all', mode: 'all', category: 'all', enteredBy: 'all', from: '', to: '',
  })

  const project = projects.find((p) => p.id === projectId)
  const book = (booksByProject[projectId] || []).find((b) => b.id === bookId)
  const entries = entriesByBook[bookId] || []
  const descriptionSuggestions = useMemo(() => {
    const counts = new Map()
    const latestSeen = new Map()

    entries.forEach((entry) => {
      const description = String(entry.description || '').trim()
      if (!description) return
      const key = description.toLowerCase()
      counts.set(key, {
        description,
        count: (counts.get(key)?.count || 0) + 1,
      })
      latestSeen.set(key, Math.max(Number(latestSeen.get(key) || 0), Number(entry.timestamp || 0)))
    })

    return Array.from(counts.entries())
      .map(([key, value]) => ({
        description: value.description,
        count: value.count,
        lastUsedAt: latestSeen.get(key) || 0,
      }))
      .sort((a, b) => b.count - a.count || b.lastUsedAt - a.lastUsedAt)
  }, [entries])

  useEffect(() => {
    getCategories(projectId, bookId).then((saved) => {
      if (saved?.length) setCategories(saved)
    })
  }, [projectId, bookId, getCategories])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const focusedId = params.get('focusedEntryId')
    if (focusedId && entries.length > 0) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`entry-${focusedId}`)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          element.classList.add('ring-2', 'ring-amber-500', 'rounded-2xl', 'scale-[1.02]')
          const removeTimer = setTimeout(() => {
            element.classList.remove('ring-2', 'ring-amber-500', 'scale-[1.02]')
          }, 3000)
          return () => clearTimeout(removeTimer)
        }
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [entries])

  // Lock the book when navigating away (so PIN is required next visit)
  useEffect(() => {
    return () => {
      if (book?.pinHash) lockItem(bookId)
    }
  }, [bookId, book?.pinHash])

  const filteredEntries = useMemo(() => {
    return entries
      .filter((entry) => {
        const q = search.toLowerCase()
        const searchMatch =
          entry.description?.toLowerCase().includes(q) ||
          entry.category?.toLowerCase().includes(q) ||
          entry.enteredBy?.toLowerCase().includes(q)
        const typeMatch = filters.type === 'all' || entry.type === filters.type
        const modeMatch = filters.mode === 'all' || entry.mode === filters.mode
        const categoryMatch = filters.category === 'all' || entry.category === filters.category
        const byMatch = filters.enteredBy === 'all' || entry.enteredBy === filters.enteredBy
        const fromMatch = !filters.from || entry.timestamp >= new Date(filters.from).getTime()
        const toMatch = !filters.to || entry.timestamp <= new Date(filters.to + 'T23:59:59').getTime()
        return searchMatch && typeMatch && modeMatch && categoryMatch && byMatch && fromMatch && toMatch
      })
      .sort((a, b) => b.timestamp - a.timestamp)
  }, [entries, search, filters])

  // Group filtered entries by calendar date
  const groupedEntries = useMemo(() => {
    const groups = new Map()
    filteredEntries.forEach(entry => {
      const d = new Date(entry.timestamp)
      const key = format(d, 'yyyy-MM-dd')
      if (!groups.has(key)) groups.set(key, { date: d, entries: [] })
      groups.get(key).entries.push(entry)
    })
    return Array.from(groups.values())
  }, [filteredEntries])

  const formatGroupDate = (date) => {
    if (isToday(date))     return 'Today'
    if (isYesterday(date)) return 'Yesterday'
    return format(date, 'dd MMM yyyy')
  }

  const summary = useMemo(() => {
    const totalIn = entries
      .filter((e) => e.type === 'income' || e.type === 'transfer_in')
      .reduce((acc, e) => acc + Number(e.amount), 0)
    const totalOut = entries
      .filter((e) => e.type === 'expense' || e.type === 'transfer_out')
      .reduce((acc, e) => acc + Number(e.amount), 0)
    return { totalIn, totalOut, net: totalIn - totalOut }
  }, [entries])

  const hasActiveFilters = filters.type !== 'all' || filters.mode !== 'all' || filters.category !== 'all' || filters.enteredBy !== 'all' || filters.from || filters.to
  const enteredByList = Array.from(new Set(entries.map((e) => e.enteredBy).filter(Boolean)))

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type, visible: true })
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2200)
  }

  const clearFilters = () => setFilters({ type: 'all', mode: 'all', category: 'all', enteredBy: 'all', from: '', to: '' })

  if (!project || !book) {
    return (
      <LayoutShell>
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <p className="text-sm text-stone-500">Book not found.</p>
          <Link to={`/projects/${projectId}`} className="text-xs text-amber-700 hover:underline">Go back</Link>
        </div>
      </LayoutShell>
    )
  }

  return (
    <LayoutShell>
      <div className="space-y-3 pb-28">

        {/* ── Book header card ── */}
        <header className="rounded-2xl border border-amber-100/80 bg-white/88 p-3 shadow-sm backdrop-blur-sm">
          {/* Top row: back + title + actions */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <Link
                to={`/projects/${projectId}`}
                className="flex-shrink-0 inline-flex items-center gap-1 rounded-xl border border-amber-100 px-2.5 py-1.5 text-xs text-stone-600 hover:bg-amber-50 transition-colors"
              >
                <ArrowLeft size={13} />
              </Link>
              <div className="min-w-0">
                <div className="flex items-center">
                  <h1 className="text-base sm:text-lg font-semibold text-stone-800 truncate leading-tight">
                    {book.name}
                  </h1>
                </div>
                <p className="text-[10px] text-stone-400 mt-0.5 truncate">{project.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => exportBookPdf({ projectName: project.name, bookName: book.name, summary, entries })}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-medium text-white hover:bg-amber-700 transition-colors"
              >
                <Download size={13} />
                <span className="hidden sm:inline">PDF</span>
              </button>
              <BookHeaderMenu
                onEdit={() => setEditingBook(true)}
                onDelete={() => setDeleteBookConfirm(true)}
                onSetPin={() => setSetPinOpen(true)}
                hasPin={Boolean(book.pinHash)}
              />
            </div>
          </div>

          {/* Search + filter row */}
          <div className="flex gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-amber-100 bg-amber-50/40 px-3 py-2.5">
              <Search size={13} className="flex-shrink-0 text-stone-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search entries..."
                className="w-full bg-transparent text-sm text-stone-700 placeholder-stone-400 outline-none"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-stone-400 hover:text-stone-600">
                  <X size={12} />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs transition-colors ${
                showFilters || hasActiveFilters
                  ? 'border-amber-400 bg-amber-100 text-amber-800'
                  : 'border-amber-100 text-stone-600 hover:bg-amber-50'
              }`}
            >
              <Filter size={13} />
              <span className="hidden sm:inline">Filter</span>
              {hasActiveFilters && <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />}
            </button>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 rounded-xl border border-red-100 px-2.5 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </header>

        {/* ── Filters panel ── */}
        <AnimatePresence>
          {showFilters && (
            <motion.section
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="rounded-2xl border border-amber-100/80 bg-white/88 p-4 shadow-sm">
                <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Filters</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { label: 'Type', key: 'type', options: [['all','All types'],['income','Income'],['expense','Expense']] },
                    { label: 'Mode', key: 'mode', options: [['all','All modes'],['Cash','Cash'],['UPI','UPI']] },
                    { label: 'Category', key: 'category', options: [['all','All categories'], ...categories.map(c => [c,c])] },
                    { label: 'Person', key: 'enteredBy', options: [['all','All people'], ...enteredByList.map(n => [n,n])] },
                  ].map(({ label, key, options }) => (
                    <div key={key}>
                      <label className="block text-[10px] font-medium text-stone-400 mb-1">{label}</label>
                      <select
                        value={filters[key]}
                        onChange={(e) => setFilters((p) => ({ ...p, [key]: e.target.value }))}
                        className="w-full rounded-xl border border-amber-100 bg-amber-50/40 px-2.5 py-2 text-xs text-stone-700 focus:border-amber-300 focus:bg-white transition-colors"
                      >
                        {options.map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
                      </select>
                    </div>
                  ))}
                  <div>
                    <label className="block text-[10px] font-medium text-stone-400 mb-1">From date</label>
                    <input
                      type="date"
                      value={filters.from}
                      onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))}
                      className="w-full rounded-xl border border-amber-100 bg-amber-50/40 px-2.5 py-2 text-xs text-stone-700 focus:border-amber-300 focus:bg-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-stone-400 mb-1">To date</label>
                    <input
                      type="date"
                      value={filters.to}
                      onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))}
                      className="w-full rounded-xl border border-amber-100 bg-amber-50/40 px-2.5 py-2 text-xs text-stone-700 focus:border-amber-300 focus:bg-white transition-colors"
                    />
                  </div>
                </div>
                <button
                  onClick={clearFilters}
                  className="mt-3 text-xs text-red-500 hover:text-red-700 transition-colors"
                >
                  Clear all filters
                </button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ── Category manager ── */}
        <AnimatePresence>
          {showCatManager && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <CategoryManager
                categories={categories}
                onSave={async (cats) => {
                  setCategories(cats)
                  await updateCategories(projectId, bookId, cats)
                  showToast('Categories saved')
                  setShowCatManager(false)
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Summary strip (single compact card) ── */}
        <section>
          <h2 className="font-serif text-base font-semibold text-stone-700 mb-2">Summary</h2>
          <SummaryStrip
            net={summary.net}
            totalIn={summary.totalIn}
            totalOut={summary.totalOut}
            delay={0}
          />
        </section>

        {/* ── Entries section ── */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="font-serif text-base font-semibold text-stone-700">Transactions</h2>
              <p className="text-[11px] text-stone-400 mt-0.5">
                {filteredEntries.length === entries.length
                  ? `${entries.length} entr${entries.length !== 1 ? 'ies' : 'y'}`
                  : `${filteredEntries.length} of ${entries.length} entries`}
              </p>
            </div>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-amber-600 hover:text-amber-800 transition-colors">
                Clear filters
              </button>
            )}
          </div>

          {filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-14 text-center rounded-2xl border border-dashed border-amber-200 bg-amber-50/30">
              <Hash size={28} className="text-amber-300" />
              <div>
                <p className="text-sm font-medium text-stone-500">
                  {search || hasActiveFilters ? 'No entries match your filters' : 'No entries yet'}
                </p>
                <p className="mt-1 text-xs text-stone-400">
                  {!search && !hasActiveFilters && 'Use the buttons below to record your first transaction'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {groupedEntries.map(({ date, entries: dayEntries }) => {
                const dayIn  = dayEntries.filter(e => e.type === 'income').reduce((s, e) => s + Number(e.amount), 0)
                const dayOut = dayEntries.filter(e => e.type === 'expense').reduce((s, e) => s + Number(e.amount), 0)
                return (
                  <div key={format(date, 'yyyy-MM-dd')}>
                    {/* Date group header */}
                    <div className="flex items-center justify-between mb-2 px-1">
                      <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">
                        {formatGroupDate(date)}
                      </span>
                      <div className="flex items-center gap-2 text-[10px]">
                        {dayIn  > 0 && <span className="text-emerald-600 font-semibold">+₹{dayIn.toFixed(0)}</span>}
                        {dayOut > 0 && <span className="text-red-500 font-semibold">−₹{dayOut.toFixed(0)}</span>}
                      </div>
                    </div>
                    <div className="space-y-2">
                      {dayEntries.map((entry, idx) => (
                        <motion.div
                          key={entry.id}
                          id={`entry-${entry.id}`}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(idx * 0.03, 0.2) }}
                          className="flex items-start gap-2 transition-all duration-300"
                        >
                          <div className="flex-1 min-w-0">
                            <EntryCard entry={entry} />
                          </div>
                          <div className="flex-shrink-0 pt-3">
                            <EntryMenu
                              onEdit={() => setEditingEntry(entry)}
                              onDelete={() => setDeleteEntryTarget(entry)}
                            />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {/* ── Fixed bottom action bar ── */}
      <div className="fixed bottom-[4.5rem] left-1/2 z-30 w-[min(96vw,520px)] -translate-x-1/2">
        <div className="grid grid-cols-2 gap-2.5 rounded-2xl border border-amber-100/80 bg-white/95 p-2 shadow-xl backdrop-blur-md">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setModalType('income')}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 text-sm font-bold text-white hover:from-emerald-700 hover:to-teal-700 transition-all shadow-sm cursor-pointer"
          >
            <TrendingUp size={15} /> Cash In
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setModalType('expense')}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 px-4 py-3 text-sm font-bold text-white hover:from-rose-600 hover:to-red-700 transition-all shadow-sm cursor-pointer"
          >
            <TrendingDown size={15} /> Cash Out
          </motion.button>
        </div>
      </div>

      {/* ── Entry modal ── */}
      <EntryModal
        open={Boolean(modalType) || Boolean(editingEntry)}
        type={editingEntry ? editingEntry.type : (modalType || 'income')}
        categories={categories}
        descriptionSuggestions={descriptionSuggestions}
        initial={editingEntry || null}
        onClose={() => { setModalType(null); setEditingEntry(null) }}
        onSaveCategories={async (cats) => {
          setCategories(cats)
          await updateCategories(projectId, bookId, cats)
        }}
        onSubmit={async (payload) => {
          try {
            if (editingEntry) {
              await updateEntry(projectId, bookId, editingEntry.id, payload)
              showToast('Entry updated ✓')
            } else {
              await addEntry(projectId, bookId, payload)
              showToast(payload.type === 'income' ? 'Recorded with gratitude 🙏' : 'Entry noted mindfully 🕊️')
            }
          } catch (err) {
            showToast(err?.message || 'Failed to save entry', 'error')
          }
        }}
      />

      {/* ── Book edit modal ── */}
      <BookModal
        open={editingBook}
        onClose={() => setEditingBook(false)}
        initial={book}
        onSubmit={async (payload) => {
          await updateBook(projectId, bookId, payload)
          showToast('Book updated')
        }}
      />

      {/* ── Delete entry confirm ── */}
      <ConfirmDialog
        open={Boolean(deleteEntryTarget)}
        onClose={() => setDeleteEntryTarget(null)}
        onConfirm={async () => {
          await deleteEntry(projectId, bookId, deleteEntryTarget.id)
          showToast('Entry deleted', 'info')
        }}
        title="Delete Entry?"
        message={`"${deleteEntryTarget?.description}" (₹${deleteEntryTarget?.amount}) will be permanently deleted.`}
        danger
      />

      {/* ── Delete book confirm ── */}
      <ConfirmDialog
        open={deleteBookConfirm && !book?.pinHash}
        onClose={() => setDeleteBookConfirm(false)}
        onConfirm={async () => {
          await deleteBook(projectId, bookId)
          navigate(`/projects/${projectId}`)
          showToast('Book deleted', 'info')
        }}
        title="Delete Book?"
        message={`"${book.name}" and all ${entries.length} entries will be permanently deleted. This cannot be undone.`}
        danger
      />

      {/* ── PIN verification for deletion ── */}
      <PinVerificationModal
        open={deleteBookConfirm && Boolean(book?.pinHash)}
        onClose={() => setDeleteBookConfirm(false)}
        storedHash={book?.pinHash}
        itemType="book"
        itemName={book?.name}
        onVerified={async (pin) => {
          try {
            setDeletingBook(true)
            await deleteBookWithPin(projectId, bookId, pin)
            navigate(`/projects/${projectId}`)
            showToast('Book deleted', 'info')
          } catch (err) {
            showToast(err.message || 'Failed to delete book', 'error')
          } finally {
            setDeletingBook(false)
          }
        }}
      />

      <Toast message={toast.msg} type={toast.type} visible={toast.visible} />

      {/* ── Set / change PIN modal (from book page) ── */}
      <SetPinModal
        open={setPinOpen}
        onClose={() => setSetPinOpen(false)}
        hasPin={Boolean(book.pinHash)}
        storedHash={book.pinHash}
        onSet={async (hash) => {
          await setPinForBook(projectId, bookId, hash)
          showToast('PIN set 🔒')
        }}
        onRemove={async () => {
          await setPinForBook(projectId, bookId, null)
          lockItem(bookId)
          showToast('PIN removed')
        }}
      />
    </LayoutShell>
  )
}
