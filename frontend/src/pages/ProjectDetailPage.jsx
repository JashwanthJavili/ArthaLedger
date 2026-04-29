import { useState, useRef, useEffect } from 'react'
import { format } from 'date-fns'
import { Link, useParams, useNavigate } from 'react-router-dom'
import {
  Plus, ArrowLeft, BookOpen, TrendingUp, TrendingDown,
  Hash, Calendar, MoreVertical, Pencil, Trash2,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import LayoutShell from '../components/LayoutShell'
import BookModal from '../components/forms/BookModal'
import ConfirmDialog from '../components/common/ConfirmDialog'
import Toast from '../components/common/Toast'
import { useAppData } from '../context/AppDataContext'

function BookMenu({ book, onEdit, onDelete }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

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
            className="absolute right-0 top-8 z-50 w-40 overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-xl"
          >
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); setOpen(false) }}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-xs text-stone-700 hover:bg-amber-50 transition-colors border-b border-amber-50"
            >
              <Pencil size={12} className="text-amber-600" /> Edit Book
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); setOpen(false) }}
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

export default function ProjectDetailPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { projects, booksByProject, entriesByBook, createBook, updateBook, deleteBook, deleteProject } = useAppData()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBook, setEditingBook] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteProjectConfirm, setDeleteProjectConfirm] = useState(false)
  const [toast, setToast] = useState({ msg: '', type: 'success', visible: false })

  const project = projects.find((p) => p.id === projectId)
  const books = booksByProject[projectId] || []

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
            <Link
              to="/dashboard"
              className="flex-shrink-0 inline-flex items-center gap-1 rounded-xl border border-amber-100 px-2.5 py-1.5 text-xs text-stone-600 hover:bg-amber-50 transition-colors"
            >
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
          <button
            onClick={() => setDeleteProjectConfirm(true)}
            className="flex-shrink-0 inline-flex items-center gap-1 rounded-xl border border-red-100 px-2.5 py-1.5 text-xs text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={13} />
            <span className="hidden sm:inline">Delete Project</span>
          </button>
        </div>

        {/* ── Section heading ── */}
        <div>
          <h2 className="font-serif text-lg font-semibold text-stone-800">Your Books</h2>
          <p className="text-xs text-stone-400 mt-0.5">
            {books.length === 0 ? 'No cashbooks yet' : `${books.length} cashbook${books.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {/* ── Books list ── */}
        {books.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center gap-4 py-16 text-center"
          >
            <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 p-6 shadow-sm">
              <BookOpen size={36} className="text-amber-400" />
            </div>
            <div>
              <p className="font-serif text-base font-medium text-stone-600">No cashbooks yet</p>
              <p className="mt-1 text-xs text-stone-400">Create your first cashbook to start tracking</p>
            </div>
            <button
              onClick={() => { setEditingBook(null); setModalOpen(true) }}
              className="rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-amber-700 transition-colors shadow-sm"
            >
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

              return (
                <motion.div
                  key={book.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.06 }}
                >
                  {/* Entire card is clickable to open book */}
                  <div
                    onClick={() => navigate(`/projects/${projectId}/books/${book.id}`)}
                    className="cursor-pointer rounded-2xl sm:rounded-3xl border border-amber-100/80 bg-white/88 p-4 sm:p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                  >
                    {/* Book header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex-shrink-0 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 p-2 shadow-sm">
                          <BookOpen size={14} className="text-amber-700" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm sm:text-base font-semibold text-stone-800 truncate leading-tight">
                            {book.name}
                          </h3>
                          {book.description && (
                            <p className="text-xs text-stone-400 truncate mt-0.5">{book.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-right">
                          <p className={`text-sm font-bold ${balance >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                            ₹{balance.toFixed(2)}
                          </p>
                          <p className="text-[10px] text-stone-400">Balance</p>
                        </div>
                        {/* 3-dot menu */}
                        <BookMenu
                          book={book}
                          onEdit={() => { setEditingBook(book); setModalOpen(true) }}
                          onDelete={() => setDeleteTarget(book)}
                        />
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="rounded-xl bg-stone-50 p-2.5 text-center">
                        <Hash size={10} className="mx-auto text-stone-400 mb-1" />
                        <p className="font-bold text-stone-700 text-sm">{entries.length}</p>
                        <p className="text-[10px] text-stone-400">Entries</p>
                      </div>
                      <div className="rounded-xl bg-emerald-50 p-2.5 text-center">
                        <TrendingUp size={10} className="mx-auto text-emerald-500 mb-1" />
                        <p className="font-bold text-emerald-700 text-xs truncate">₹{totalIn.toFixed(0)}</p>
                        <p className="text-[10px] text-stone-400">In</p>
                      </div>
                      <div className="rounded-xl bg-red-50 p-2.5 text-center">
                        <TrendingDown size={10} className="mx-auto text-red-400 mb-1" />
                        <p className="font-bold text-red-600 text-xs truncate">₹{totalOut.toFixed(0)}</p>
                        <p className="text-[10px] text-stone-400">Out</p>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-2 border-t border-amber-50">
                      <span className="inline-flex items-center gap-1 text-[10px] text-stone-400">
                        <Calendar size={9} />
                        {book.updatedAt ? format(new Date(book.updatedAt), 'dd MMM yyyy') : 'Never updated'}
                      </span>
                      <span className="text-[10px] text-amber-600 font-medium">Tap to open →</span>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── FAB ── */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => { setEditingBook(null); setModalOpen(true) }}
        className="fixed bottom-20 right-4 sm:right-6 inline-flex items-center gap-2 rounded-2xl bg-amber-700 px-4 py-3 text-sm font-medium text-white shadow-lg hover:bg-amber-800 transition-colors"
      >
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

      {/* ── Delete book confirm ── */}
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

      {/* ── Delete project confirm ── */}
      <ConfirmDialog
        open={deleteProjectConfirm}
        onClose={() => setDeleteProjectConfirm(false)}
        onConfirm={async () => {
          await deleteProject(projectId)
          navigate('/dashboard')
        }}
        title="Delete Entire Project?"
        message={`"${project.name}" and ALL its books and entries will be permanently deleted. This action is irreversible.`}
        danger
      />

      <Toast message={toast.msg} type={toast.type} visible={toast.visible} />
    </LayoutShell>
  )
}
