import { useState, useRef, useEffect, useMemo } from 'react'
import { format } from 'date-fns'
import { Link, useParams, useNavigate } from 'react-router-dom'
import {
  Plus, ArrowLeft, BookOpen,
  MoreVertical, Pencil, Trash2, Lock, ShieldAlert, Unlock, ArrowLeftRight,
  Eye, EyeOff,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import LayoutShell from '../components/LayoutShell'
import PageSkeleton from '../components/common/PageSkeleton'
import BookModal from '../components/forms/BookModal'
import TransferModal from '../components/forms/TransferModal'
import DeleteDialog from '../components/common/DeleteDialog'
import PinModal from '../components/common/PinModal'
import SetPinModal from '../components/common/SetPinModal'
import Toast from '../components/common/Toast'
import SummaryStrip from '../components/cards/SummaryCard'
import { useAppData } from '../context/AppDataContext'
import { isUnlocked, setUnlocked, lockItem } from '../lib/pin'
import { formatAmount, getCurrencySymbol } from '../lib/format'
import ProjectAvatar from '../components/common/ProjectAvatar'
import { useI18n } from '../i18n/core'

/**
 * 3-dot menu for each book card.
 * Delete is blocked if the book is PIN-locked and not yet unlocked.
 */
function BookMenu({ book, onEdit, onDelete, onDeleteBlocked }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const locked = Boolean(book.pinHash) && !isUnlocked(book.id, book.pinHash)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [])

  const item = 'flex w-full items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-[var(--text-main)] hover:bg-[var(--border-subtle)] transition-colors cursor-pointer'

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-subtle)] hover:bg-[var(--border-subtle)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
        aria-label={t('project.bookOptions')}
      >
        <MoreVertical size={15} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-9 z-50 w-44 overflow-hidden rounded-2xl border border-[var(--border-card)] bg-[var(--bg-page)] py-1 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.3)]"
          >
            <button onClick={(e) => { e.stopPropagation(); onEdit(); setOpen(false) }} className={item}>
              <Pencil size={13} className="text-[var(--text-muted)]" /> {t('project.editBook')}
            </button>
            <div className="my-1 h-px bg-[var(--border-subtle)]" />
            <button
              onClick={(e) => {
                e.stopPropagation()
                setOpen(false)
                if (locked) onDeleteBlocked()
                else onDelete()
              }}
              className={`${item} !text-rose-600 dark:!text-rose-400`}
            >
              {locked ? <Lock size={13} /> : <Trash2 size={13} />} {t('project.deleteBook')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const roundMoney = (n) => Math.round(n * 100) / 100

export default function ProjectDetailPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const {
    loading,
    error,
    projects, booksByProject, entriesByBook,
    createBook, updateBook, deleteBook,
    deleteProject,
    setPinForBook, setPinForProject,
    transferBetweenBooks,
  } = useAppData()
  const { t, locale } = useI18n()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBook, setEditingBook] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteProjectConfirm, setDeleteProjectConfirm] = useState(false)
  const [verifyProjectPinForDelete, setVerifyProjectPinForDelete] = useState(false)
  const [toast, setToast] = useState({ msg: '', type: 'success', visible: false })
  const [stalled, setStalled] = useState(false)

  useEffect(() => {
    // `stalled` is only read while loading, so it never needs resetting here
    if (!loading) return
    const timer = setTimeout(() => setStalled(true), 3500)
    return () => clearTimeout(timer)
  }, [loading])

  // Transfer state
  const [transferSource, setTransferSource] = useState(null) // book being transferred from

  // Hide/show book amounts — persisted per project in localStorage
  const bookAmountsKey = `al_show_book_amounts_${projectId}`
  const [showBookAmounts, setShowBookAmounts] = useState(() => {
    const stored = localStorage.getItem(bookAmountsKey)
    return stored === null ? true : stored === 'true'
  })
  const toggleBookAmounts = () => {
    setShowBookAmounts(v => {
      localStorage.setItem(bookAmountsKey, String(!v))
      return !v
    })
  }

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
  const hasAnyTransferTarget = useMemo(() => {
    const totalBooks = projects.reduce((sum, projectItem) => sum + (booksByProject[projectItem.id] || []).length, 0)
    return totalBooks > 1
  }, [projects, booksByProject])

  useEffect(() => {
    projectPinLockRef.current = Boolean(project?.pinHash)
  }, [project?.pinHash])

  // Only lock the project when navigating OUTSIDE the project.
  // Navigating to a book within this project should NOT trigger a re-lock,
  // otherwise the user gets asked for the PIN again when they come back.
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (projectPinLockRef.current) lockItem(projectId)
    }
    // Lock on actual page unload (tab close / browser navigation)
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      // On React unmount, only lock if we're navigating outside the project.
      // We detect this by checking if the new pathname still starts with this project's path.
      const currentPath = window.location.pathname
      const projectPath = `/projects/${projectId}`
      const isLeavingProject = !currentPath.startsWith(projectPath)
      if (projectPinLockRef.current && isLeavingProject) {
        lockItem(projectId)
      }
    }
  }, [projectId])

  // Check if any book in this project is PIN-locked
  const hasLockedBooks = books.some(b => Boolean(b.pinHash))
  // PIN that authorises deleting the whole project: the project's own, else a locked book's
  const deletePinSource = project?.pinHash
    ? { id: projectId, pinHash: project.pinHash, pinLength: project.pinLength }
    : books.find(b => b.pinHash)

  // Project-level PIN
  const isProjectLocked = Boolean(project?.pinHash) && !isUnlocked(projectId, project?.pinHash)

  // Project-level summary across all books — includes transfers as visible movement
  // Transfers between two books of this project only move money around inside
  // it, so they're left out of the project's cash in / cash out (net is unchanged).
  const projectSummary = useMemo(() => {
    let totalIn = 0, totalOut = 0, internalMoved = 0
    books.forEach(book => {
      const entries = entriesByBook[book.id] || []
      entries.forEach(e => {
        const amt = Number(e.amount || 0)
        const isInternal = e.transferId && e.fromProjectId === projectId && e.toProjectId === projectId
        if (isInternal) {
          if (e.type === 'transfer_out') internalMoved += amt
          return
        }
        if (e.type === 'income' || e.type === 'transfer_in') totalIn += amt
        else if (e.type === 'expense' || e.type === 'transfer_out') totalOut += amt
      })
    })
    totalIn = roundMoney(totalIn)
    totalOut = roundMoney(totalOut)
    return { totalIn, totalOut, net: roundMoney(totalIn - totalOut), internalMoved: roundMoney(internalMoved) }
  }, [books, entriesByBook, projectId])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type, visible: true })
    setTimeout(() => setToast((s) => ({ ...s, visible: false })), 2200)
  }

  if (error) {
    return (
      <LayoutShell>
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-4">
          <div className="rounded-2xl bg-red-50 border border-red-100 p-4 max-w-sm">
            <p className="text-sm font-semibold text-red-800">{t('dashboard.loadError')}</p>
            <p className="text-xs text-red-600 mt-1">{error}</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 cursor-pointer"
          >
            {t('dashboard.retryLoading')}
          </button>
        </div>
      </LayoutShell>
    )
  }

  if (!project) {
    if (loading) return <PageSkeleton slow={stalled} hideHeader label={t('project.opening')} />

    return (
      <LayoutShell>
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <p className="text-sm text-stone-500">{t('project.notFound')}</p>
          <Link to="/dashboard" className="text-xs text-amber-700 hover:underline">{t('project.backToDashboard')}</Link>
        </div>
      </LayoutShell>
    )
  }

  // If project is PIN-locked, show PIN modal immediately — no intermediate screen
  if (isProjectLocked) {
    return (
      <LayoutShell>
        <div className="flex flex-col items-center justify-center py-20 gap-5 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--gold-light)] text-[var(--gold-primary)]">
            <Lock size={28} />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-main)]">{project.name}</h2>
            <p className="mt-1 text-xs text-[var(--text-subtle)]">{t('project.pinProtected')}</p>
          </div>
          <Link to="/dashboard" className="text-xs text-[var(--text-subtle)] hover:text-[var(--text-main)] transition-colors">
            ← {t('project.backToDashboard')}
          </Link>
        </div>

        {/* PIN modal opens automatically */}
        <PinModal
          open={true}
          onClose={() => {
            if (!isUnlocked(projectId, project.pinHash)) navigate('/dashboard', { replace: true })
          }}
          storedHash={project.pinHash}
          pinLength={project.pinLength}
          guardId={projectId}
          itemName={project.name}
          onUnlock={() => {
            setUnlocked(projectId, project.pinHash)
            forceUpdate(n => n + 1)
          }}
          onRehash={(hash, length) => setPinForProject(projectId, hash, length)}
          onRemovePin={async () => {
            await setPinForProject(projectId, null)
            showToast(t('project.toast.pinRemoved'))
          }}
        />
      </LayoutShell>
    )
  }

  const symbol = getCurrencySymbol()
  const bookStats = (book) => {
    const entries = entriesByBook[book.id] || []
    let totalIn = 0, totalOut = 0
    entries.forEach((e) => {
      const amt = Number(e.amount || 0)
      if (e.type === 'income' || e.type === 'transfer_in') totalIn += amt
      else if (e.type === 'expense' || e.type === 'transfer_out') totalOut += amt
    })
    totalIn = roundMoney(totalIn)
    totalOut = roundMoney(totalOut)
    return { count: entries.length, totalIn, totalOut, balance: roundMoney(totalIn - totalOut) }
  }
  const iconBtn = 'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-[var(--border-card)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--text-subtle)] transition-colors cursor-pointer'

  return (
    <LayoutShell hideHeader>
      <div className="mx-auto max-w-2xl space-y-5 pb-28">
        {loading && stalled && (
          <div className="rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] px-4 py-3 text-[11px] text-[var(--text-muted)]">
            {t('dashboard.stillSyncing')}
          </div>
        )}

        {/* ── Header ── */}
        <header className="flex items-center gap-3">
          <Link to="/dashboard" aria-label={t('project.backToHome')} className={iconBtn + ' !text-[var(--text-main)]'}>
            <ArrowLeft size={17} />
          </Link>
          <ProjectAvatar project={project} className="h-11 w-11 rounded-2xl" iconSize={20} />
          <div className="min-w-0 flex-1">
            <h1 className="font-serif-luxury truncate text-[23px] font-semibold leading-[1.15] tracking-[-0.01em] text-[var(--text-main)]">{project.name}</h1>
            <p className="font-serif-luxury mt-0.5 truncate text-[13.5px] italic text-[var(--text-muted)]">
              {project.description || t('dashboard.books', { count: books.length })}
            </p>
          </div>
          <button
            onClick={() => setSetPinOpen(true)}
            className={iconBtn}
            title={project.pinHash ? t('project.changePin') : t('project.setPin')}
            aria-label={project.pinHash ? t('project.changePin') : t('project.setPin')}
          >
            {project.pinHash ? <Lock size={16} className="text-[var(--gold-primary)]" /> : <Unlock size={16} />}
          </button>
          <button
            onClick={() => {
              if (hasLockedBooks || project.pinHash) setVerifyProjectPinForDelete(true)
              else setDeleteProjectConfirm(true)
            }}
            className={iconBtn + ' hover:!text-rose-500 hover:!border-rose-500/40'}
            title={t('dashboard.deleteProject')}
            aria-label={t('dashboard.deleteProject')}
          >
            <Trash2 size={16} />
          </button>
        </header>

        {hasLockedBooks && (
          <div className="flex items-center gap-2.5 rounded-xl border border-[var(--border-card)] bg-[var(--bg-card)] px-3.5 py-2.5">
            <ShieldAlert size={14} className="flex-shrink-0 text-[var(--gold-primary)]" />
            <p className="text-[11px] text-[var(--text-muted)]">{t('project.someLocked')}</p>
          </div>
        )}

        {/* ── Overview ── */}
        {books.length > 0 && (
          <section>
            <div className="mb-2 flex items-center justify-between px-1">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-subtle)]">{t('project.overview')}</h2>
              <button
                onClick={toggleSummary}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-[var(--text-subtle)] hover:text-[var(--text-main)] hover:bg-[var(--border-subtle)] transition-colors cursor-pointer"
              >
                {showSummary ? <><EyeOff size={13} /> {t('project.hide')}</> : <><Eye size={13} /> {t('project.show')}</>}
              </button>
            </div>
            {showSummary ? (
              <>
                <SummaryStrip
                  net={projectSummary.net}
                  totalIn={projectSummary.totalIn}
                  totalOut={projectSummary.totalOut}
                  delay={0.05}
                />
                {projectSummary.internalMoved > 0 && (
                  <p className="mt-1.5 px-1 text-[10px] text-[var(--text-subtle)]">
                    {t('project.excludesInternal', { amount: `${symbol}${formatAmount(projectSummary.internalMoved)}` })}
                  </p>
                )}
              </>
            ) : (
              <div className="rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] px-4 py-3.5 text-center text-xs tracking-[0.3em] text-[var(--text-subtle)]">
                ••••••
              </div>
            )}
          </section>
        )}

        {/* ── Books ── */}
        <section>
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-subtle)]">
              {t('project.books')}{books.length > 0 ? ` · ${books.length}` : ''}
            </h2>
            {books.length > 0 && (
              <button
                onClick={toggleBookAmounts}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-[var(--text-subtle)] hover:text-[var(--text-main)] hover:bg-[var(--border-subtle)] transition-colors cursor-pointer"
              >
                {showBookAmounts ? <><EyeOff size={13} /> {t('project.hideAmounts')}</> : <><Eye size={13} /> {t('project.showAmounts')}</>}
              </button>
            )}
          </div>

          {books.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--border-card)] py-14 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--gold-light)] text-[var(--gold-primary)]">
                <BookOpen size={20} />
              </span>
              <div>
                <p className="text-sm font-semibold text-[var(--text-main)]">{t('project.empty.title')}</p>
                <p className="mt-1 text-xs text-[var(--text-subtle)]">{t('project.empty.body')}</p>
              </div>
              <button onClick={() => { setEditingBook(null); setModalOpen(true) }}
                className="mt-1 rounded-xl bg-[var(--gold-primary)] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[var(--gold-hover)] transition-colors cursor-pointer">
                {t('project.createBook')}
              </button>
            </motion.div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)] rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)]">
              {books.map((book, idx) => {
                const stats = bookStats(book)
                const isBookLocked = Boolean(book.pinHash) && !isUnlocked(book.id, book.pinHash)
                const subline = book.description
                  || `${t('project.entries', { count: stats.count })}${book.updatedAt ? ` · ${t('dashboard.updated', { date: format(new Date(book.updatedAt), 'd MMM', { locale }) })}` : ''}`
                return (
                  <motion.div
                    key={book.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(idx * 0.03, 0.2) }}
                    onClick={() => {
                      if (isBookLocked) setPinTarget(book)
                      else navigate(`/projects/${projectId}/books/${book.id}`)
                    }}
                    className="flex cursor-pointer items-center gap-3 py-3 pl-4 pr-2 transition-colors hover:bg-[var(--border-subtle)]/60 first:rounded-t-2xl last:rounded-b-2xl"
                  >
                    <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold uppercase ${
                      isBookLocked ? 'bg-[var(--border-subtle)] text-[var(--text-subtle)]' : 'bg-[var(--gold-light)] text-[var(--gold-primary)]'
                    }`}>
                      {isBookLocked ? <Lock size={15} /> : book.name.charAt(0)}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-[14px] font-semibold text-[var(--text-main)]">{book.name}</p>
                        {book.pinHash && !isBookLocked && <Unlock size={11} className="flex-shrink-0 text-[var(--text-subtle)]" />}
                      </div>
                      <p className="truncate text-[11px] text-[var(--text-subtle)]">{subline}</p>
                    </div>

                    <div className="flex-shrink-0 text-right">
                      <p className={`text-[14px] font-semibold tabular-nums ${stats.balance < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-[var(--text-main)]'}`}>
                        {isBookLocked || !showBookAmounts ? '•••••' : `${stats.balance < 0 ? '−' : ''}${symbol}${formatAmount(Math.abs(stats.balance))}`}
                      </p>
                      {!isBookLocked && showBookAmounts && (stats.totalIn > 0 || stats.totalOut > 0) && (
                        <p className="text-[10px] tabular-nums text-[var(--text-subtle)]">
                          <span className="text-emerald-600 dark:text-emerald-400">+{formatAmount(stats.totalIn, 0)}</span>
                          {' · '}
                          <span>−{formatAmount(stats.totalOut, 0)}</span>
                        </p>
                      )}
                    </div>

                    <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                      {hasAnyTransferTarget && !isBookLocked && (
                        <button
                          onClick={() => setTransferSource(book)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-subtle)] hover:bg-[var(--gold-light)] hover:text-[var(--gold-primary)] transition-colors cursor-pointer"
                          title={t('project.transferMoney')}
                          aria-label={t('project.transferFrom', { name: book.name })}
                        >
                          <ArrowLeftRight size={15} />
                        </button>
                      )}
                      <BookMenu
                        book={book}
                        onEdit={() => { setEditingBook(book); setModalOpen(true) }}
                        onDelete={() => setDeleteTarget(book)}
                        onDeleteBlocked={() => setDeleteTarget(book)}
                      />
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {/* ── New book ── */}
      {books.length > 0 && (
        <motion.button whileTap={{ scale: 0.95 }}
          onClick={() => { setEditingBook(null); setModalOpen(true) }}
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 sm:right-6 z-30 inline-flex items-center gap-2 rounded-full bg-[var(--gold-primary)] px-5 py-3.5 text-[13px] font-semibold text-white shadow-[0_12px_30px_-8px_rgba(197,160,89,0.6)] hover:bg-[var(--gold-hover)] transition-colors cursor-pointer">
          <Plus size={17} strokeWidth={2.4} />
          {t('project.newBook')}
        </motion.button>
      )}

      {/* ── Book modal ── */}
      <BookModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingBook(null) }}
        initial={editingBook}
        onSubmit={async (payload) => {
          if (editingBook) {
            await updateBook(projectId, editingBook.id, payload)
            showToast(t('project.toast.bookUpdated'))
          } else {
            await createBook(projectId, payload)
            showToast(t('project.toast.bookCreated'))
          }
        }}
      />

      {/* ── Delete book ── */}
      <DeleteDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        kind="book"
        name={deleteTarget?.name}
        stats={deleteTarget ? [
          { label: t('dashboard.delete.transactions'), value: String((entriesByBook[deleteTarget.id] || []).length) },
          { label: t('common.balance'), value: `${bookStats(deleteTarget).balance < 0 ? "−" : ""}${symbol}${formatAmount(Math.abs(bookStats(deleteTarget).balance))}` },
        ] : []}
        pin={deleteTarget?.pinHash && !isUnlocked(deleteTarget.id, deleteTarget.pinHash)
          ? { storedHash: deleteTarget.pinHash, length: deleteTarget.pinLength, guardId: deleteTarget.id }
          : null}
        onConfirm={async () => {
          await deleteBook(projectId, deleteTarget.id)
          showToast(t('project.toast.bookDeleted'), 'info')
        }}
      />

      {/* ── Delete project (PIN asked first when the project or a book is locked) ── */}
      <DeleteDialog
        open={deleteProjectConfirm || verifyProjectPinForDelete}
        onClose={() => { setDeleteProjectConfirm(false); setVerifyProjectPinForDelete(false) }}
        kind="project"
        name={project?.name}
        stats={[
          { label: t('dashboard.delete.books', { count: books.length }), value: String(books.length) },
          { label: t('dashboard.delete.transactions'), value: String(books.reduce((n, b) => n + (entriesByBook[b.id] || []).length, 0)) },
        ]}
        note={t('dashboard.delete.note')}
        pin={verifyProjectPinForDelete && deletePinSource?.pinHash
          ? { storedHash: deletePinSource.pinHash, length: deletePinSource.pinLength, guardId: deletePinSource.id }
          : null}
        onConfirm={async () => {
          await deleteProject(projectId)
          navigate('/dashboard')
          showToast(t('dashboard.toast.deleted'), 'info')
        }}
      />

      <Toast message={toast.msg} type={toast.type} visible={toast.visible} />

      {/* ── Set / Change / Remove project PIN ── */}
      <SetPinModal
        open={setPinOpen}
        onClose={() => setSetPinOpen(false)}
        hasPin={Boolean(project?.pinHash)}
        storedHash={project?.pinHash}
        pinLength={project?.pinLength}
        guardId={projectId}
        itemName={project?.name}
        onSet={async (hash, length) => {
          setUnlocked(projectId, hash)
          await setPinForProject(projectId, hash, length)
          showToast(t('project.toast.pinSet', { length }))
        }}
        onRemove={async () => {
          await setPinForProject(projectId, null)
          lockItem(projectId)
          showToast(t('project.toast.projectPinRemoved'))
        }}
      />

      {/* ── PIN modal: open book ── */}
      <PinModal
        open={Boolean(pinTarget)}
        onClose={() => setPinTarget(null)}
        storedHash={pinTarget?.pinHash}
        pinLength={pinTarget?.pinLength}
        guardId={pinTarget?.id}
        itemName={pinTarget?.name || ''}
        onRehash={(hash, length) => setPinForBook(projectId, pinTarget.id, hash, length)}
        onUnlock={() => {
          setUnlocked(pinTarget.id, pinTarget.pinHash)
          const bookId = pinTarget.id
          setPinTarget(null)
          forceUpdate(n => n + 1)
          navigate(`/projects/${projectId}/books/${bookId}`)
        }}
        onRemovePin={async () => {
          await setPinForBook(projectId, pinTarget.id, null)
          showToast(t('project.toast.pinRemoved'))
        }}
      />

      {/* ── PIN modal: unlock before delete ── */}
      <PinModal
        open={Boolean(pinForDeleteTarget)}
        onClose={() => setPinForDeleteTarget(null)}
        storedHash={pinForDeleteTarget?.pinHash}
        pinLength={pinForDeleteTarget?.pinLength}
        guardId={pinForDeleteTarget?.id}
        itemName={pinForDeleteTarget?.name || ''}
        onUnlock={() => {
          // After PIN verified, mark as unlocked and open the delete confirm
          setUnlocked(pinForDeleteTarget.id, pinForDeleteTarget.pinHash)
          const book = pinForDeleteTarget
          setPinForDeleteTarget(null)
          forceUpdate(n => n + 1)
          // Small delay so the PIN modal closes first
          setTimeout(() => setDeleteTarget(book), 150)
        }}
        onRemovePin={async () => {
          await setPinForBook(projectId, pinForDeleteTarget.id, null)
          showToast(t('project.toast.pinRemoved'))
        }}
      />

      {/* ── Transfer modal — opened from book card → button ── */}
      {transferSource && (
        <TransferModal
          open={true}
          onClose={() => setTransferSource(null)}
          currentProject={project}
          currentBook={transferSource}
          projects={projects}
          booksByProject={booksByProject}
          currentBalance={bookStats(transferSource).balance}
          getBookBalance={(id) => {
            const owner = projects.find((p) => (booksByProject[p.id] || []).some((b) => b.id === id))
            const target = (booksByProject[owner?.id] || []).find((b) => b.id === id)
            return target ? bookStats(target).balance : 0
          }}
          onTransfer={async ({ destinationProjectId, destinationBookId, amount, note }) => {
            await transferBetweenBooks({
              sourceProjectId: projectId,
              sourceBookId: transferSource.id,
              destinationProjectId,
              destinationBookId,
              amount,
              note,
            })
            showToast(t('project.toast.transferred', { amount: `${symbol}${formatAmount(amount)}` }))
            setTransferSource(null)
          }}
        />
      )}
    </LayoutShell>
  )
}
