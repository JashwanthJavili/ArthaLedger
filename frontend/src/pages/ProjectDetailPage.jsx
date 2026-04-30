import { useState, useRef, useEffect } from 'react'
import { format } from 'date-fns'
import { Link, useParams, useNavigate } from 'react-router-dom'
import {
  Plus, ArrowLeft, BookOpen,
  MoreVertical, Pencil, Trash2, Lock, ShieldAlert,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import LayoutShell from '../components/LayoutShell'
import BookModal from '../components/forms/BookModal'
import ConfirmDialog from '../components/common/ConfirmDialog'
import PinVerificationModal from '../components/common/PinVerificationModal'
import PinModal from '../components/common/PinModal'
import Toast from '../components/common/Toast'
import { useAppData } from '../context/AppDataContext'
import { isUnlocked, setUnlocked } from '../lib/pin'

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
  const { projects, booksByProject, entriesByBook, createBook, updateBook, deleteBook, deleteProject, deleteProjectWithPin, setPinForBook } = useAppData()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBook, setEditingBook] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)       // book to delete (after PIN if needed)
  const [deleteProjectConfirm, setDeleteProjectConfirm] = useState(false)
  const [verifyProjectPinForDelete, setVerifyProjectPinForDelete] = useState(false)
  const [toast, setToast] = useState({ msg: '', type: 'success', visible: false })

  // PIN flow state
  const [pinTarget, setPinTarget] = useState(null)             // book awaiting PIN to open
  const [pinForDeleteTarget, setPinForDeleteTarget] = useState(null) // book awaiting PIN to delete
  const [, forceUpdate] = useState(0)

  const project = projects.find((p) => p.id === projectId)
  const books = booksByProject[projectId] || []

  // Check if any book in this project is PIN-locked
  const hasLockedBooks = books.some(b => Boolean(b.pinHash))

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
              <h1 className="font-serif text-xl sm:text-2xl font-semibold text-stone-800 truncate leading-tight">
                {project.name}
              </h1>
              {project.description && (
                <p className="text-xs text-stone-400 truncate mt-0.5">{project.description}</p>
              )}
            </div>
          </div>

          {/* Delete project — requires PIN if any book is locked */}
          <button
            onClick={() => {
              if (hasLockedBooks) {
                setVerifyProjectPinForDelete(true)
              } else {
                setDeleteProjectConfirm(true)
              }
            }}
            className={`flex-shrink-0 inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs transition-colors ${
              'border-red-100 text-red-500 hover:bg-red-50'
            }`}
          >
            <Trash2 size={13} />
            <span className="hidden sm:inline">Delete Project</span>
          </button>
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
              const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp)
              const balance = sorted.length ? Number(sorted[sorted.length - 1].balanceAfter || 0) : 0
              const totalIn = entries.filter((e) => e.type === 'income').reduce((s, e) => s + Number(e.amount), 0)
              const totalOut = entries.filter((e) => e.type === 'expense').reduce((s, e) => s + Number(e.amount), 0)
              const isBookLocked = Boolean(book.pinHash) && !isUnlocked(book.id)

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
                            ₹{balance.toFixed(2)}
                          </p>
                        </div>
                        <BookMenu
                          book={book}
                          onEdit={() => { setEditingBook(book); setModalOpen(true) }}
                          onDelete={() => setDeleteTarget(book)}
                          onDeleteBlocked={() => {
                            // Show PIN modal to unlock first, then proceed to delete
                            setPinForDeleteTarget(book)
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-stone-500">{entries.length} entries</span>
                      <span className="text-stone-300">·</span>
                      <span className="text-emerald-700 font-medium">+₹{totalIn.toFixed(0)}</span>
                      <span className="text-stone-300">·</span>
                      <span className="text-red-600 font-medium">-₹{totalOut.toFixed(0)}</span>
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
        storedHash={books.find(b => b.pinHash)?.pinHash || ''}
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
    </LayoutShell>
  )
}
