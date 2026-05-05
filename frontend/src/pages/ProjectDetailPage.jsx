import { useState, useRef, useEffect, useMemo } from 'react'
import { format } from 'date-fns'
import { Link, useParams, useNavigate } from 'react-router-dom'
import {
  Plus, ArrowLeft, BookOpen,
  MoreVertical, Pencil, Trash2, Lock, ShieldAlert, Unlock, ArrowRight,
  Eye, EyeOff,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import LayoutShell from '../components/LayoutShell'
import BookModal from '../components/forms/BookModal'
import TransferModal from '../components/forms/TransferModal'
import ConfirmDialog from '../components/common/ConfirmDialog'
import PinVerificationModal from '../components/common/PinVerificationModal'
import PinModal from '../components/common/PinModal'
import SetPinModal from '../components/common/SetPinModal'
import Toast from '../components/common/Toast'
import SummaryStrip from '../components/cards/SummaryCard'
import { useAppData } from '../context/AppDataContext'
import { isUnlocked, setUnlocked, lockItem } from '../lib/pin'
import { formatAmount, getCurrencySymbol } from '../lib/format'

/**
 * 3-dot menu for each book card.
 * Delete is blocked if the book is PIN-locked and not yet unlocked.
 */
function BookMenu({ book, onEdit, onDelete, onDeleteBlocked }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const locked = Boolean(book.pinHash) && !isUnlocked(book.id)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
        className="rounded-xl p-1.5 text-stone-400 hover:bg-amber-100 hover:text-amber-700 transition-colors"
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
            className="absolute right-0 top-8 z-50 w-44 overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-xl"
          >
            {/* Edit — always allowed */}
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); setOpen(false) }}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-xs text-stone-700 hover:bg-amber-50 transition-colors border-b border-amber-50"
            >
              <Pencil size={12} className="text-amber-600" /> Edit Book
            </button>

            {/* Delete — blocked if locked */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setOpen(false)
                if (locked) {
                  onDeleteBlocked()
                } else {
                  onDelete()
                }
              }}
              className={`flex w-full items-center gap-2 px-3 py-2.5 text-xs transition-colors ${
                locked
                  ? 'text-red-600 hover:bg-red-50'
                  : 'text-red-600 hover:bg-red-50'
              }`}
            >
              {locked
                ? <><Trash2 size={12} /> Delete</>
                : <><Trash2 size={12} /> Delete Book</>
              }
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function ProjectDetailPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const {
    projects, booksByProject, entriesByBook,
    createBook, updateBook, deleteBook,
    deleteProject, deleteProjectWithPin,
    setPinForBook, setPinForProject,
    transferBetweenBooks,
  } = useAppData()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBook, setEditingBook] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteProjectConfirm, setDeleteProjectConfirm] = useState(false)
  const [verifyProjectPinForDelete, setVerifyProjectPinForDelete] = useState(false)
  const [toast, setToast] = useState({ msg: '', type: 'success', visible: false })

  // Transfer state
  const [transferSource, setTransferSource] = useState(null) // book being transferred from

  // Hide/show project summary — persisted per project in localStorage
  const summaryKey = `al_show_summary_${projectId}`
  const [showSummary, setShowSummary] = useState(() => {
    const stored = localStorage.getItem(summaryKey)
    return stored === null ? true : stored === 'true'
  })
  const toggleSummary = () => {
    setShowSummary(v => {
      localStorage.setItem(summaryKey, String(!v))
      return !v
    })
  }

  // Project PIN state
  const [setPinOpen, setSetPinOpen] = useState(false)
  const [, forceUpdate] = useState(0)
  // Track whether this project currently has a PIN so unmount can clear its unlock state.
  const projectPinLockRef = useRef(false)

  // Book PIN flow state
  const [pinTarget, setPinTarget] = useState(null)
  const [pinForDeleteTarget, setPinForDeleteTarget] = useState(null)

  const project = projects.find((p) => p.id === projectId)
  const books = booksByProject[projectId] || []

  useEffect(() => {
    projectPinLockRef.current = Boolean(project?.pinHash)
  }, [project?.pinHash])

  // Clear the project unlock when leaving the page so it prompts again on next visit.
  useEffect(() => {
    return () => {
      if (projectPinLockRef.current) lockItem(projectId)
    }
  }, [projectId]) // only projectId — not project?.pinHash to avoid re-running on data load

  // Check if any book in this project is PIN-locked
  const hasLockedBooks = books.some(b => Boolean(b.pinHash))

  // Project-level PIN
  const isProjectLocked = Boolean(project?.pinHash) && !isUnlocked(projectId)

  // Project-level summary across all books — excludes internal transfers
  const projectSummary = useMemo(() => {
    let totalIn = 0, totalOut = 0
    books.forEach(book => {
      const entries = entriesByBook[book.id] || []
      entries.forEach(e => {
        if (e.isTransfer) return // skip transfer entries
        if (e.type === 'income') totalIn += Number(e.amount)
        else if (e.type === 'expense') totalOut += Number(e.amount)
      })
    })
    return { totalIn, totalOut, net: totalIn - totalOut }
  }, [books, entriesByBook])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type, visible: true })
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2200)
  }

  if (!project) {
    return (
      <LayoutShell>
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <p className="text-sm text-stone-500">Project not found.</p>
          <Link to="/dashboard" className="text-xs text-amber-700 hover:underline">Back to dashboard</Link>
        </div>
      </LayoutShell>
    )
  }

  // If project is PIN-locked, show PIN modal immediately — no intermediate screen
  if (isProjectLocked) {
    return (
      <LayoutShell>
        <div className="flex flex-col items-center justify-center py-20 gap-5 text-center">
          <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 p-6 shadow-sm border border-amber-100">
            <Lock size={36} className="text-amber-500" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-semibold text-stone-800">{project.name}</h2>
            <p className="text-xs text-stone-400 mt-1">This project is PIN-protected</p>
          </div>
          <Link to="/dashboard" className="text-xs text-stone-400 hover:text-stone-600 transition-colors">
            ← Back to dashboard
          </Link>
        </div>

        {/* PIN modal opens automatically */}
        <PinModal
          open={true}
          onClose={() => {
            if (!isUnlocked(projectId)) navigate('/dashboard', { replace: true })
          }}
          storedHash={project.pinHash}
          itemName={project.name}
          onUnlock={() => {
            setUnlocked(projectId)
            forceUpdate(n => n + 1)
          }}
          onRemovePin={async () => {
            await setPinForProject(projectId, null)
            showToast('PIN removed')
          }}
        />
      </LayoutShell>
    )
  }

  return (
    <LayoutShell>
      <div className="space-y-4 sm:space-y-5">

        {/* ── Page header ── */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link to="/dashboard"
              className="flex-shrink-0 inline-flex items-center gap-1 rounded-xl border border-amber-100 px-2.5 py-1.5 text-xs text-stone-600 hover:bg-amber-50 transition-colors">
              <ArrowLeft size={13} />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="font-serif text-xl sm:text-2xl font-semibold text-stone-800 truncate leading-tight">
                  {project.name}
                </h1>
              </div>
              {project.description && (
                <p className="text-xs text-stone-400 truncate mt-0.5">{project.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* PIN lock toggle */}
            <button
              onClick={() => setSetPinOpen(true)}
              className="inline-flex items-center gap-1 rounded-xl border border-amber-100 px-2.5 py-1.5 text-xs text-stone-600 hover:bg-amber-50 transition-colors"
              title={project.pinHash ? 'Change/Remove PIN' : 'Set PIN Lock'}
            >
              {project.pinHash ? <Unlock size={13} /> : <Lock size={13} />}
              <span className="hidden sm:inline">{project.pinHash ? 'PIN' : 'Lock'}</span>
            </button>

            {/* Delete project */}
            <button
              onClick={() => {
                if (hasLockedBooks || project.pinHash) {
                  setVerifyProjectPinForDelete(true)
                } else {
                  setDeleteProjectConfirm(true)
                }
              }}
              className="inline-flex items-center gap-1 rounded-xl border border-red-100 px-2.5 py-1.5 text-xs text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={13} />
              <span className="hidden sm:inline">Delete</span>
            </button>
          </div>
        </div>

        {/* Locked books warning */}
        {hasLockedBooks && (
          <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5">
            <ShieldAlert size={14} className="flex-shrink-0 text-amber-600 mt-0.5" />
            <p className="text-xs text-amber-700 leading-relaxed">
              <span className="font-semibold">This project has PIN-protected books.</span> You'll need to enter a PIN to delete this project.
            </p>
          </div>
        )}

        {/* Project summary */}
        {books.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-serif text-base font-semibold text-stone-700">Project Summary</h2>
              <button
                onClick={toggleSummary}
                className="rounded-xl border border-amber-100 p-1.5 text-stone-400 hover:bg-amber-50 hover:text-stone-600 transition-colors"
                title={showSummary ? 'Hide summary' : 'Show summary'}
              >
                {showSummary ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
            </div>
            {showSummary ? (
              <SummaryStrip
                net={projectSummary.net}
                totalIn={projectSummary.totalIn}
                totalOut={projectSummary.totalOut}
                delay={0.05}
              />
            ) : (
              <div className="rounded-2xl border border-amber-100/80 bg-white/88 px-4 py-3 shadow-sm flex items-center justify-between">
                <span className="text-xs text-stone-400">Summary hidden</span>
                <button
                  onClick={toggleSummary}
                  className="text-xs text-amber-600 hover:text-amber-800 font-medium transition-colors"
                >
                  Show
                </button>
              </div>
            )}
          </section>
        )}

        <div>
          <h2 className="font-serif text-lg font-semibold text-stone-800">Your Books</h2>
          <p className="text-xs text-stone-400 mt-0.5">
            {books.length === 0 ? 'No cashbooks yet' : `${books.length} cashbook${books.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {/* ── Books list ── */}
        {books.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 p-6 shadow-sm">
              <BookOpen size={36} className="text-amber-400" />
            </div>
            <div>
              <p className="font-serif text-base font-medium text-stone-600">No cashbooks yet</p>
              <p className="mt-1 text-xs text-stone-400">Create your first cashbook to start tracking</p>
            </div>
            <button onClick={() => { setEditingBook(null); setModalOpen(true) }}
              className="rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-amber-700 transition-colors shadow-sm">
              Create First Book
            </button>
          </motion.div>
        ) : (
          <div className="grid gap-3 sm:gap-4">
            {books.map((book, idx) => {
              const entries = entriesByBook[book.id] || []
              // Calculate balance by summing all entries (same as BookPage)
              // This avoids timestamp ordering issues with balanceAfter
              const totalIn = entries
                .filter((e) => e.type === 'income' || e.type === 'transfer_in')
                .reduce((s, e) => s + Number(e.amount), 0)
              const totalOut = entries
                .filter((e) => e.type === 'expense' || e.type === 'transfer_out')
                .reduce((s, e) => s + Number(e.amount), 0)
              const balance = totalIn - totalOut
              const isBookLocked = Boolean(book.pinHash) && !isUnlocked(book.id)
              const symbol = getCurrencySymbol()

              return (
                <motion.div key={book.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.06 }}>
                  <div
                    onClick={() => {
                      if (isBookLocked) {
                        setPinTarget(book)
                      } else {
                        navigate(`/projects/${projectId}/books/${book.id}`)
                      }
                    }}
                    className="cursor-pointer rounded-2xl border border-amber-100/80 bg-white/88 p-3 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex-shrink-0 rounded-lg p-1.5 bg-amber-100">
                          {isBookLocked
                            ? <Lock size={13} className="text-amber-700" />
                            : <BookOpen size={13} className="text-amber-700" />
                          }
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-sm font-semibold text-stone-800 truncate leading-tight">
                              {book.name}
                            </h3>
                            {book.pinHash && isUnlocked(book.id) && (
                              <span className="text-[9px] text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-1.5 py-0.5 font-medium flex-shrink-0">
                                Unlocked
                              </span>
                            )}
                          </div>
                          {book.description && (
                            <p className="text-[11px] text-stone-400 truncate">{book.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <div className="text-right">
                          <p className={`text-sm font-bold ${balance >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                            {balance < 0 ? '-' : ''}{symbol}{formatAmount(Math.abs(balance))}
                          </p>
                        </div>
                        {/* Transfer button — only shown when there are other books */}
                        {books.length > 1 && !isBookLocked && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setTransferSource(book)
                            }}
                            className="rounded-lg p-1.5 text-blue-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            title="Transfer to another book"
                          >
                            <ArrowRight size={13} />
                          </button>
                        )}
                        <BookMenu
                          book={book}
                          onEdit={() => { setEditingBook(book); setModalOpen(true) }}
                          onDelete={() => setDeleteTarget(book)}
                          onDeleteBlocked={() => setPinForDeleteTarget(book)}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-stone-500">{entries.length} entries</span>
                      <span className="text-stone-300">·</span>
                      <span className="text-emerald-700 font-medium">+{symbol}{formatAmount(totalIn, 0)}</span>
                      <span className="text-stone-300">·</span>
                      <span className="text-red-600 font-medium">-{symbol}{formatAmount(totalOut, 0)}</span>
                      <span className="ml-auto text-stone-400">
                        {book.updatedAt ? format(new Date(book.updatedAt), 'dd MMM') : ''}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── FAB ── */}
      <motion.button whileTap={{ scale: 0.95 }}
        onClick={() => { setEditingBook(null); setModalOpen(true) }}
        className="fixed bottom-20 right-4 sm:right-6 inline-flex items-center gap-2 rounded-2xl bg-amber-700 px-4 py-3 text-sm font-medium text-white shadow-lg hover:bg-amber-800 transition-colors">
        <Plus size={18} />
        <span className="hidden sm:inline">New Book</span>
      </motion.button>

      {/* ── Book modal ── */}
      <BookModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingBook(null) }}
        initial={editingBook}
        onSubmit={async (payload) => {
          if (editingBook) {
            await updateBook(projectId, editingBook.id, payload)
            showToast('Book updated')
          } else {
            await createBook(projectId, payload)
            showToast('Book created 🙏')
          }
        }}
      />

      {/* ── Delete book confirm (only shown after PIN verified or no PIN) ── */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          await deleteBook(projectId, deleteTarget.id)
          showToast('Book deleted', 'info')
        }}
        title="Delete Book?"
        message={`"${deleteTarget?.name}" and all its entries will be permanently deleted. This cannot be undone.`}
        danger
      />

      {/* ── Delete project confirm (only if no locked books) ── */}
      <ConfirmDialog
        open={deleteProjectConfirm}
        onClose={() => setDeleteProjectConfirm(false)}
        onConfirm={async () => {
          try {
            await deleteProject(projectId)
            navigate('/dashboard')
            showToast('Project deleted', 'info')
          } catch (err) {
            showToast(err.message || 'Failed to delete project', 'error')
          }
        }}
        title="Delete Entire Project?"
        message={`"${project.name}" and ALL its books and entries will be permanently deleted. This action is irreversible.`}
        danger
      />

      {/* ── PIN verification for project deletion ── */}
      <PinVerificationModal
        open={verifyProjectPinForDelete}
        onClose={() => setVerifyProjectPinForDelete(false)}
        storedHash={project?.pinHash || books.find(b => b.pinHash)?.pinHash || ''}
        itemType="project"
        itemName={project?.name}
        onVerified={async (pin) => {
          try {
            await deleteProjectWithPin(projectId, pin)
            navigate('/dashboard')
            showToast('Project deleted', 'info')
          } catch (err) {
            showToast(err.message || 'Failed to delete project', 'error')
          }
        }}
      />

      <Toast message={toast.msg} type={toast.type} visible={toast.visible} />

      {/* ── Set / Change / Remove project PIN ── */}
      <SetPinModal
        open={setPinOpen}
        onClose={() => setSetPinOpen(false)}
        hasPin={Boolean(project?.pinHash)}
        storedHash={project?.pinHash}
        onSet={async (hash) => {
          await setPinForProject(projectId, hash)
          showToast('Project PIN set 🔒')
        }}
        onRemove={async () => {
          await setPinForProject(projectId, null)
          lockItem(projectId)
          showToast('Project PIN removed')
        }}
      />

      {/* ── PIN modal: open book ── */}
      <PinModal
        open={Boolean(pinTarget)}
        onClose={() => setPinTarget(null)}
        storedHash={pinTarget?.pinHash}
        itemName={pinTarget?.name || ''}
        onUnlock={() => {
          setUnlocked(pinTarget.id)
          const bookId = pinTarget.id
          setPinTarget(null)
          forceUpdate(n => n + 1)
          navigate(`/projects/${projectId}/books/${bookId}`)
        }}
        onRemovePin={async () => {
          await setPinForBook(projectId, pinTarget.id, null)
          showToast('PIN removed')
        }}
      />

      {/* ── PIN modal: unlock before delete ── */}
      <PinModal
        open={Boolean(pinForDeleteTarget)}
        onClose={() => setPinForDeleteTarget(null)}
        storedHash={pinForDeleteTarget?.pinHash}
        itemName={`Unlock "${pinForDeleteTarget?.name || ''}" to delete`}
        onUnlock={() => {
          // After PIN verified, mark as unlocked and open the delete confirm
          setUnlocked(pinForDeleteTarget.id)
          const book = pinForDeleteTarget
          setPinForDeleteTarget(null)
          forceUpdate(n => n + 1)
          // Small delay so the PIN modal closes first
          setTimeout(() => setDeleteTarget(book), 150)
        }}
        onRemovePin={async () => {
          await setPinForBook(projectId, pinForDeleteTarget.id, null)
          showToast('PIN removed')
        }}
      />

      {/* ── Transfer modal — opened from book card → button ── */}
      {transferSource && (
        <TransferModal
          open={true}
          onClose={() => setTransferSource(null)}
          currentBook={transferSource}
          otherBooks={books.filter(b => b.id !== transferSource.id)}
          currentBalance={(() => {
            const ents = entriesByBook[transferSource.id] || []
            if (!ents.length) return 0
            const sorted = [...ents].sort((a, b) => a.timestamp - b.timestamp)
            return Number(sorted[sorted.length - 1].balanceAfter || 0)
          })()}
          onTransfer={async ({ toBookId, amount, note }) => {
            await transferBetweenBooks(projectId, transferSource.id, toBookId, amount, note)
            const symbol = getCurrencySymbol()
            showToast(`${symbol}${formatAmount(amount, 0)} transferred 🔄`)
            setTransferSource(null)
          }}
        />
      )}
    </LayoutShell>
  )
}
