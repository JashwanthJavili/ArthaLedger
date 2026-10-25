import { useMemo, useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import {
  Plus, Search, FolderOpen, MoreVertical, Pencil, Trash2, ChevronRight, X,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import LayoutShell from '../components/LayoutShell'
import Loader from '../components/common/Loader'
import QuoteCard from '../components/common/QuoteCard'
import ReminderPrompt from '../components/common/ReminderPrompt'
import AccountMenu from '../components/common/AccountMenu'
import LanguageMenu from '../components/common/LanguageMenu'
import ProjectAvatar from '../components/common/ProjectAvatar'
import ProjectModal from '../components/forms/ProjectModal'
import DeleteDialog from '../components/common/DeleteDialog'
import Toast from '../components/common/Toast'
import { useAppData } from '../context/AppDataContext'
import { getQuoteOfTheDay } from '../lib/quotes'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n/core'
import { Trans } from '../i18n/Trans'

function ProjectMenu({ onEdit, onDelete }) {
  const { t } = useI18n()
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
        className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-subtle)] hover:text-[var(--text-main)] hover:bg-[var(--border-subtle)] transition-colors cursor-pointer"
        aria-label={t('dashboard.projectOptions')}
      >
        <MoreVertical size={16} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-9 z-50 w-40 overflow-hidden rounded-2xl border border-[var(--border-card)] bg-[var(--bg-page)] py-1 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.3)]"
          >
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(); setOpen(false) }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-[var(--text-main)] hover:bg-[var(--border-subtle)] transition-colors cursor-pointer"
            >
              <Pencil size={13} className="text-[var(--text-muted)]" /> {t('dashboard.editProject')}
            </button>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); setOpen(false) }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              <Trash2 size={13} /> {t('dashboard.deleteProject')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function DashboardPage() {
  const { loading, error, projects, booksByProject, createProject, updateProject, deleteProject } = useAppData()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [search, setSearch] = useState('')
  const { user } = useAuth()
  const { t, locale, lang } = useI18n()
  const [stalled, setStalled] = useState(false)
  const [toast, setToast] = useState({ msg: '', type: 'success', visible: false })

  useEffect(() => {
    // `stalled` is only read while loading, so it never needs resetting here
    if (!loading) return
    const timer = setTimeout(() => setStalled(true), 3500)
    return () => clearTimeout(timer)
  }, [loading])

  // eslint-disable-next-line react-hooks/exhaustive-deps -- lang: re-pick the text when the language changes
  const quote = useMemo(() => getQuoteOfTheDay(), [lang])
  const filtered = projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))

  const totalBooksCount = useMemo(
    () => Object.values(booksByProject).reduce((acc, books) => acc + (books?.length || 0), 0),
    [booksByProject],
  )


  const showToast = (msg, type = 'success') => {
    setToast({ msg, type, visible: true })
    setTimeout(() => setToast((s) => ({ ...s, visible: false })), 2200)
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return t('dashboard.greeting.morning')
    if (h < 17) return t('dashboard.greeting.afternoon')
    if (h < 20) return t('dashboard.greeting.evening')
    return t('dashboard.greeting.night')
  }

  if (error) {
    return (
      <LayoutShell>
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-4">
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-5 max-w-sm">
            <p className="text-sm font-semibold text-rose-500">{t('dashboard.loadError')}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">{error}</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="rounded-xl bg-[var(--gold-primary)] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[var(--gold-hover)] transition-colors"
          >
            {t('dashboard.retryLoading')}
          </button>
        </div>
      </LayoutShell>
    )
  }

  if (loading && !stalled) return <Loader />

  const firstName = user?.displayName?.split(' ')[0] || t('dashboard.greeting.fallbackName')

  return (
    <LayoutShell>
      <ReminderPrompt />
      <div className="mx-auto max-w-2xl space-y-6">
        {loading && stalled && (
          <div className="rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] px-4 py-3 text-[11px] text-[var(--text-muted)]">
            {t('dashboard.stillSyncing')}
          </div>
        )}

        {/* ── Greeting ── */}
        <motion.header initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3 pt-1">
          <div className="min-w-0 flex-1">
            <p className="font-serif-luxury text-[16px] italic text-[var(--text-muted)]">{greeting()}</p>
            <h1 className="font-serif-luxury truncate text-[30px] font-semibold leading-[1.1] tracking-[-0.015em] text-[var(--text-main)]">
              {firstName}
            </h1>
            <p className="mt-2 text-[12px] text-[var(--text-subtle)]">
              <Trans k="dashboard.projectCount" vars={{ count: projects.length }} components={{ b: <b className="font-semibold text-[var(--text-muted)]" /> }} />
              <span className="mx-1.5 text-[var(--border-card)]">•</span>
              <Trans k="dashboard.bookCount" vars={{ count: totalBooksCount }} components={{ b: <b className="font-semibold text-[var(--text-muted)]" /> }} />
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <LanguageMenu />
            <AccountMenu />
          </div>
        </motion.header>

        {/* ── Quote of the day ── */}
        <QuoteCard quote={quote} />

        {/* ── Projects ── */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-subtle)]">
              {t('dashboard.projects')}{projects.length > 0 ? ` · ${projects.length}` : ''}
            </h2>
          </div>

          {projects.length > 4 && (
            <div className="flex h-10 items-center gap-2 rounded-xl border border-[var(--border-card)] bg-[var(--bg-card)] px-3.5 focus-within:border-[var(--gold-primary)] transition-colors">
              <Search size={15} className="flex-shrink-0 text-[var(--text-subtle)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('dashboard.searchProjects')}
                className="w-full bg-transparent text-[13px] text-[var(--text-main)] placeholder-[var(--text-subtle)] outline-none"
              />
              {search && (
                <button onClick={() => setSearch('')} aria-label={t('dashboard.clearSearch')} className="text-[var(--text-subtle)] hover:text-[var(--text-main)] cursor-pointer">
                  <X size={14} />
                </button>
              )}
            </div>
          )}

          {projects.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--border-card)] py-12 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--gold-light)] text-[var(--gold-primary)]">
                <FolderOpen size={20} />
              </span>
              <div>
                <p className="text-sm font-semibold text-[var(--text-main)]">{t('dashboard.empty.title')}</p>
                <p className="mt-1 text-xs text-[var(--text-subtle)]">{t('dashboard.empty.body')}</p>
              </div>
              {!loading && (
                <button onClick={() => { setEditingProject(null); setModalOpen(true) }}
                  className="mt-1 rounded-xl bg-[var(--gold-primary)] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[var(--gold-hover)] transition-colors cursor-pointer">
                  {t('dashboard.createProject')}
                </button>
              )}
            </motion.div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)] rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)]">
              {filtered.length === 0 && (
                <p className="px-4 py-6 text-center text-xs text-[var(--text-subtle)]">{t('dashboard.noMatch', { query: search })}</p>
              )}
              {filtered.map((project, idx) => {
                const books = booksByProject[project.id] || []
                const isProjectPinLocked = Boolean(project.pinHash)
                const lockedBook = books.find((b) => b.pinHash)
                const subline = project.description
                  || `${t('dashboard.books', { count: books.length })}${project.updatedAt ? ` · ${t('dashboard.updated', { date: format(new Date(project.updatedAt), 'd MMM', { locale }) })}` : ''}`
                return (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(idx * 0.03, 0.2) }}
                    className="first:rounded-t-2xl last:rounded-b-2xl"
                  >
                    <Link
                      to={`/projects/${project.id}`}
                      className="group flex items-center gap-3 py-3 pl-4 pr-2 transition-colors hover:bg-[var(--border-subtle)]/60"
                    >
                      <ProjectAvatar project={project} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-semibold text-[var(--text-main)]">{project.name}</span>
                        <span className="block truncate text-[11px] text-[var(--text-subtle)]">{subline}</span>
                      </span>
                      <ChevronRight size={16} className="flex-shrink-0 text-[var(--text-subtle)] transition-transform group-hover:translate-x-0.5" />
                      <ProjectMenu
                        project={project}
                        onEdit={() => { setEditingProject(project); setModalOpen(true) }}
                        onDelete={() => {
                          setDeleteTarget({
                            ...project,
                            hasLockedBooks: Boolean(lockedBook) || isProjectPinLocked,
                            lockedBookPin: project.pinHash || lockedBook?.pinHash || '',
                            lockedPinLength: project.pinHash ? project.pinLength : lockedBook?.pinLength,
                            lockedGuardId: project.pinHash ? project.id : lockedBook?.id,
                          })
                        }}
                      />
                    </Link>
                  </motion.div>
                )
              })}
              <button
                onClick={() => { setEditingProject(null); setModalOpen(true) }}
                className="flex w-full items-center gap-3 py-3 pl-4 pr-4 text-left transition-colors hover:bg-[var(--border-subtle)]/60 cursor-pointer rounded-b-2xl"
              >
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-dashed border-[var(--gold-primary)]/50 text-[var(--gold-primary)]">
                  <Plus size={16} />
                </span>
                <span className="text-[13px] font-semibold text-[var(--gold-primary)]">{t('dashboard.newProject')}</span>
              </button>
            </div>
          )}
        </section>
      </div>

      {/* ── Project Modal (Create / Edit) ── */}
      <ProjectModal
        open={modalOpen}
        initial={editingProject}
        onClose={() => { setModalOpen(false); setEditingProject(null) }}
        onSubmit={async (payload) => {
          if (editingProject) {
            await updateProject(editingProject.id, payload)
            showToast(t('dashboard.toast.updated'))
          } else {
            await createProject(payload)
            showToast(t('dashboard.toast.created'))
          }
        }}
      />

      {/* ── Delete project (PIN asked first when a book inside is locked) ── */}
      <DeleteDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        kind="project"
        name={deleteTarget?.name}
        stats={deleteTarget ? (() => {
          const list = booksByProject[deleteTarget.id] || []
          return [
            { label: t('dashboard.delete.books', { count: list.length }), value: String(list.length) },
            { label: t('dashboard.delete.transactions'), value: String(list.reduce((n, b) => n + Object.keys(b.entries || {}).length, 0)) },
          ]
        })() : []}
        note={t('dashboard.delete.note')}
        pin={deleteTarget?.hasLockedBooks && deleteTarget?.lockedBookPin
          ? { storedHash: deleteTarget.lockedBookPin, length: deleteTarget.lockedPinLength, guardId: deleteTarget.lockedGuardId }
          : null}
        onConfirm={async () => {
          await deleteProject(deleteTarget.id)
          showToast(t('dashboard.toast.deleted'), 'info')
        }}
      />

      <Toast message={toast.msg} type={toast.type} visible={toast.visible} />
    </LayoutShell>
  )
}

