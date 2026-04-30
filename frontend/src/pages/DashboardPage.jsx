import { useMemo, useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import {
  Plus, Search, Eye, EyeOff, BookOpen, TrendingUp,
  Calendar, FolderOpen, MoreVertical, Pencil, Trash2,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import LayoutShell from '../components/LayoutShell'
import Loader from '../components/common/Loader'
import QuoteCard from '../components/common/QuoteCard'
import ProjectModal from '../components/forms/ProjectModal'
import ConfirmDialog from '../components/common/ConfirmDialog'
import PinVerificationModal from '../components/common/PinVerificationModal'
import Toast from '../components/common/Toast'
import { useAppData } from '../context/AppDataContext'
import { getQuoteOfTheDay } from '../lib/quotes'
import { useAuth } from '../context/AuthContext'

function ProjectMenu({ project, onEdit, onDelete }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative" onClick={(e) => e.preventDefault()}>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((v) => !v) }}
        className="rounded-xl p-1.5 text-stone-400 hover:bg-amber-100 hover:text-amber-700 transition-colors"
        aria-label="Project options"
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
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(); setOpen(false) }}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-xs text-stone-700 hover:bg-amber-50 transition-colors border-b border-amber-50"
            >
              <Pencil size={12} className="text-amber-600" /> Edit Project
            </button>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); setOpen(false) }}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-xs text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={12} /> Delete Project
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function DashboardPage() {
  const { loading, projects, booksByProject, entriesByBook, createProject, updateProject, deleteProject, deleteProjectWithPin } = useAppData()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [verifyPinForDelete, setVerifyPinForDelete] = useState(false)
  const [search, setSearch] = useState('')
  const { user } = useAuth()
  const [stalled, setStalled] = useState(false)
  const [showValues, setShowValues] = useState(true)
  const [toast, setToast] = useState({ msg: '', type: 'success', visible: false })

  useEffect(() => {
    let t = null
    if (loading) t = setTimeout(() => setStalled(true), 3500)
    else setStalled(false)
    return () => clearTimeout(t)
  }, [loading])

  const quote = useMemo(() => getQuoteOfTheDay(), [])
  const filtered = projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type, visible: true })
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2200)
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  if (loading && !stalled) return <Loader text="Arranging your projects..." />

  return (
    <LayoutShell>
      <div className="space-y-4 sm:space-y-5">

        {/* ── Greeting ── */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="px-1">
          <p className="text-xs text-stone-400 font-medium">{greeting()},</p>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-stone-800 leading-tight">
            {user?.displayName?.split(' ')[0] || 'Friend'} 🙏
          </h1>
        </motion.div>

        {/* ── Daily Quote ── */}
        <QuoteCard quote={quote} />

        {/* ── Section heading + search ── */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-lg sm:text-xl font-semibold text-stone-800">Your Projects</h2>
            <p className="text-xs text-stone-400 mt-0.5">
              {projects.length === 0 ? 'No projects yet' : `${projects.length} project${projects.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowValues(!showValues)}
              className="rounded-xl border border-amber-100 p-2 text-stone-400 hover:bg-amber-50 hover:text-stone-600 transition-colors"
              title={showValues ? 'Hide values' : 'Show values'}
            >
              {showValues ? <Eye size={15} /> : <EyeOff size={15} />}
            </button>
          </div>
        </div>

        {/* ── Search bar ── */}
        <div className="flex items-center gap-2 rounded-2xl border border-amber-100/80 bg-white/80 px-3 py-2.5 shadow-sm backdrop-blur-sm">
          <Search size={15} className="flex-shrink-0 text-stone-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="flex-1 bg-transparent text-sm text-stone-700 placeholder-stone-400 outline-none"
          />
        </div>

        {/* ── Projects grid ── */}
        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center gap-4 py-16 text-center"
          >
            <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 p-6 shadow-sm">
              <FolderOpen size={36} className="text-amber-400" />
            </div>
            <div>
              <p className="font-serif text-base font-medium text-stone-600">No projects yet</p>
              <p className="mt-1 text-xs text-stone-400">Create your first project to begin tracking</p>
            </div>
            <button
              onClick={() => { setEditingProject(null); setModalOpen(true) }}
              className="rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-amber-700 transition-colors shadow-sm"
            >
              Create First Project
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filtered.map((project, idx) => {
              const books = booksByProject[project.id] || []
              const net = books.reduce((acc, b) => {
                const entries = entriesByBook[b.id] || []
                if (!entries.length) return acc
                const last = [...entries].sort((a, b2) => a.timestamp - b2.timestamp).at(-1)
                return acc + Number(last?.balanceAfter || 0)
              }, 0)
              const totalEntries = books.reduce((acc, b) => acc + (entriesByBook[b.id]?.length || 0), 0)

              return (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.06 }}
                  className="relative"
                >
                  <Link
                    to={`/projects/${project.id}`}
                    className="block rounded-2xl border border-amber-100/80 bg-white/88 p-3 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                  >
                    {/* Card header */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex-shrink-0 rounded-lg bg-amber-100 p-1.5">
                          <FolderOpen size={13} className="text-amber-700" />
                        </div>
                        <h3 className="text-sm font-semibold text-stone-800 truncate leading-tight">
                          {project.name}
                        </h3>
                      </div>
                      <ProjectMenu
                        project={project}
                        onEdit={() => { setEditingProject(project); setModalOpen(true) }}
                        onDelete={() => {
                          const books = booksByProject[project.id] || []
                          const lockedBook = books.find(b => b.pinHash)
                          setDeleteTarget({
                            ...project,
                            hasLockedBooks: lockedBook ? true : false,
                            lockedBookPin: lockedBook?.pinHash || '',
                          })
                        }}
                      />
                    </div>

                    {project.description && (
                      <p className="text-[11px] text-stone-400 line-clamp-1 mb-2">{project.description}</p>
                    )}

                    {/* Stats — inline row */}
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="flex items-center gap-1 text-stone-500">
                        <BookOpen size={10} className="text-amber-500" />
                        {showValues ? books.length : '●'} books
                      </span>
                      <span className="text-stone-300">·</span>
                      <span className={`font-semibold ${net >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                        {showValues ? `${net >= 0 ? '+' : '-'}₹${Math.abs(net) >= 1000 ? (Math.abs(net)/1000).toFixed(1)+'k' : Math.abs(net).toFixed(0)}` : '●●●'}
                      </span>
                      <span className="text-stone-300">·</span>
                      <span className="text-stone-400 ml-auto">
                        {project.updatedAt ? format(new Date(project.updatedAt), 'dd MMM') : '-'}
                      </span>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── FAB ── */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => { setEditingProject(null); setModalOpen(true) }}
        className="fixed bottom-20 right-4 sm:right-6 inline-flex items-center gap-2 rounded-2xl bg-amber-700 px-4 py-3 text-sm font-medium text-white shadow-lg hover:bg-amber-800 transition-colors"
      >
        <Plus size={18} />
        <span className="hidden sm:inline">New Project</span>
      </motion.button>

      {/* ── Project modal (create / edit) ── */}
      <ProjectModal
        open={modalOpen}
        initial={editingProject}
        onClose={() => { setModalOpen(false); setEditingProject(null) }}
        onSubmit={async (payload) => {
          if (editingProject) {
            await updateProject(editingProject.id, payload)
            showToast('Project updated')
          } else {
            await createProject(payload)
            showToast('Project created 🙏')
          }
        }}
      />

      {/* ── Double-confirm delete dialog (only if no locked books) ── */}
      <ConfirmDialog
        open={Boolean(deleteTarget) && !deleteTarget?.hasLockedBooks}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          try {
            await deleteProject(deleteTarget.id)
            showToast('Project deleted', 'info')
          } catch (err) {
            showToast(err.message || 'Failed to delete project', 'error')
          }
        }}
        title="Delete Project?"
        message={`"${deleteTarget?.name}" and all its books and entries will be permanently deleted. This cannot be undone.`}
        danger
      />

      {/* ── PIN verification for project deletion ── */}
      <PinVerificationModal
        open={Boolean(deleteTarget?.hasLockedBooks)}
        onClose={() => setDeleteTarget(null)}
        storedHash={deleteTarget?.lockedBookPin || ''}
        itemType="project"
        itemName={deleteTarget?.name}
        onVerified={async (pin) => {
          try {
            await deleteProjectWithPin(deleteTarget.id, pin)
            showToast('Project deleted', 'info')
          } catch (err) {
            showToast(err.message || 'Failed to delete project', 'error')
          }
          setDeleteTarget(null)
        }}
      />

      <Toast message={toast.msg} type={toast.type} visible={toast.visible} />
    </LayoutShell>
  )
}
