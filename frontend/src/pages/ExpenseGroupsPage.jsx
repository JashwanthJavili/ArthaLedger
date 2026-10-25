import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, ChevronRight, FolderHeart, X, Loader2, Info } from 'lucide-react'
import { Link } from 'react-router-dom'
import LayoutShell from '../components/LayoutShell'
import { useAppData } from '../context/AppDataContext'
import Toast from '../components/common/Toast'
import ConfirmDialog from '../components/common/ConfirmDialog'
import { formatAmount, getCurrencySymbol } from '../lib/format'
import Loader from '../components/common/Loader'
import GroupsHelpSheet from '../components/common/GroupsHelpSheet'
import { useI18n } from '../i18n/core'

const card = 'rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)]'
const sectionTitle = 'text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-subtle)]'
const field = 'w-full rounded-xl border border-[var(--border-card)] bg-[var(--bg-card)] px-3.5 py-2.5 text-[14px] text-[var(--text-main)] placeholder-[var(--text-subtle)] outline-none focus:border-[var(--gold-primary)] transition-colors'
const label = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-subtle)]'

export default function ExpenseGroupsPage() {
  const { loading, error, trips, entriesByBook, createTrip, deleteTrip } = useAppData()
  const { t } = useI18n()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [toast, setToast] = useState({ msg: '', type: 'success', visible: false })
  const symbol = getCurrencySymbol()

  const [stalled, setStalled] = useState(false)

  useEffect(() => {
    if (!loading) return undefined
    const timer = setTimeout(() => setStalled(true), 3500)
    return () => {
      clearTimeout(timer)
      setStalled(false)
    }
  }, [loading])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type, visible: true })
    setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 2200)
  }

  // Calculate statistics for each group
  const groupsWithStats = useMemo(() => {
    return trips.map((group) => {
      let totalSpent = 0
      let totalIncome = 0
      let count = 0

      if (group.entries) {
        Object.values(group.entries).forEach(({ bookId, entryId }) => {
          const bookEntries = entriesByBook[bookId] || []
          const entry = bookEntries.find((e) => e.id === entryId)
          if (entry) {
            count++
            const amt = Number(entry.amount || 0)
            if (entry.type === 'expense' || entry.type === 'transfer_out') {
              totalSpent += amt
            } else if (entry.type === 'income' || entry.type === 'transfer_in') {
              totalIncome += amt
            }
          }
        })
      }

      return {
        ...group,
        totalSpent,
        totalIncome,
        entryCount: count,
      }
    })
  }, [trips, entriesByBook])

  if (error) {
    return (
      <LayoutShell>
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-4">
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-5 max-w-sm">
            <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">{t('groups.loadError')}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl bg-[var(--gold-primary)] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[var(--gold-hover)] transition-colors cursor-pointer"
          >
            {t('groups.retryLoading')}
          </button>
        </div>
      </LayoutShell>
    )
  }

  if (loading && !stalled) {
    return <Loader text={t('groups.list.loading')} />
  }

  const closeCreate = () => {
    if (creating) return
    setShowCreateModal(false)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!name.trim() || creating) return

    setCreating(true)
    try {
      await createTrip({ name: name.trim(), description: description.trim() })
      showToast(t('groups.list.created'))
      setName('')
      setDescription('')
      setShowCreateModal(false)
    } catch (err) {
      showToast(err?.message || t('groups.list.createFailed'), 'error')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteTrip(deleteTarget.id)
      showToast(t('groups.list.deleted'), 'info')
      setDeleteTarget(null)
    } catch (err) {
      showToast(err?.message || t('groups.list.deleteFailed'), 'error')
    }
  }

  const totals = groupsWithStats.reduce(
    (acc, g) => ({ spent: acc.spent + g.totalSpent, income: acc.income + g.totalIncome, items: acc.items + g.entryCount }),
    { spent: 0, income: 0, items: 0 },
  )

  return (
    <LayoutShell>
      <div className="mx-auto max-w-2xl space-y-6">
        {loading && (
          <div className="rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] px-4 py-3 text-[11px] text-[var(--text-muted)]">
            {t('groups.slowSync')}
          </div>
        )}

        {/* ── Header ── */}
        <motion.header initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between gap-3 pt-1">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-serif-luxury text-[28px] font-semibold leading-tight tracking-[-0.01em] text-[var(--text-main)]">{t('groups.list.title')}</h1>
              <button type="button" onClick={() => setShowHelp(true)} aria-label={t('groups.list.howItWorks')}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-card)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--gold-primary)] transition-colors cursor-pointer">
                <Info size={15} />
              </button>
            </div>
            <p className="font-serif-luxury mt-0.5 text-[14px] italic text-[var(--text-muted)]">{t('groups.list.subtitle')}</p>
          </div>
          {groupsWithStats.length > 0 && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-1 inline-flex h-10 flex-shrink-0 items-center gap-1.5 rounded-xl bg-[var(--gold-primary)] px-3.5 text-[13px] font-semibold text-white hover:bg-[var(--gold-hover)] transition-colors cursor-pointer"
            >
              <Plus size={15} /> {t('groups.list.newGroup')}
            </button>
          )}
        </motion.header>

        {groupsWithStats.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--border-card)] px-6 py-14 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--gold-light)] text-[var(--gold-primary)]">
              <FolderHeart size={20} />
            </span>
            <div>
              <p className="text-sm font-semibold text-[var(--text-main)]">
                {loading ? t('groups.list.retrieving') : t('groups.list.emptyTitle')}
              </p>
              <p className="mx-auto mt-1 max-w-xs text-xs text-[var(--text-subtle)]">
                {loading
                  ? t('groups.list.connecting')
                  : t('groups.list.emptyText')}
              </p>
            </div>
            {!loading && (
              <button onClick={() => setShowCreateModal(true)}
                className="mt-1 inline-flex items-center gap-1.5 rounded-xl bg-[var(--gold-primary)] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[var(--gold-hover)] transition-colors cursor-pointer">
                <Plus size={14} /> {t('groups.list.createGroup')}
              </button>
            )}
            {!loading && (
              <button type="button" onClick={() => setShowHelp(true)}
                className="inline-flex min-h-10 items-center gap-1.5 text-[12.5px] font-semibold text-[var(--gold-primary)] hover:underline cursor-pointer">
                <Info size={13} /> {t('groups.list.howItWorks')}
              </button>
            )}
          </motion.div>
        ) : (
          <>
            {/* ── Overview ── */}
            <section>
              <h2 className={`${sectionTitle} mb-2 px-1`}>{t('groups.overview')}</h2>
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
                className={`${card} grid grid-cols-3 divide-x divide-[var(--border-subtle)]`}>
                <div className="min-w-0 px-4 py-3">
                  <p className="text-[10px] text-[var(--text-subtle)]">{t('groups.list.statGroups')}</p>
                  <p className="mt-0.5 truncate text-[15px] font-semibold tabular-nums text-[var(--text-main)]">{groupsWithStats.length}</p>
                </div>
                <div className="min-w-0 px-4 py-3">
                  <p className="text-[10px] text-[var(--text-subtle)]">{t('groups.list.statSpent')}</p>
                  <p className="mt-0.5 truncate text-[15px] font-semibold tabular-nums text-[var(--text-main)]">{symbol}{formatAmount(totals.spent)}</p>
                </div>
                <div className="min-w-0 px-4 py-3">
                  <p className="text-[10px] text-[var(--text-subtle)]">{t('groups.list.statReceived')}</p>
                  <p className="mt-0.5 truncate text-[15px] font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{symbol}{formatAmount(totals.income)}</p>
                </div>
              </motion.div>
            </section>

            {/* ── Groups list ── */}
            <section>
              <h2 className={`${sectionTitle} mb-2 px-1`}>{t('groups.list.allGroups', { count: groupsWithStats.length })}</h2>
              <div className={`${card} divide-y divide-[var(--border-subtle)]`}>
                {groupsWithStats.map((group) => (
                  <div key={group.id} className="group flex items-center first:rounded-t-2xl last:rounded-b-2xl hover:bg-[var(--border-subtle)]/60 transition-colors">
                    <Link to={`/trips/${group.id}`} className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 pr-2">
                      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--gold-light)] font-serif-luxury text-[15px] font-semibold text-[var(--gold-primary)]">
                        {(group.name || '?').trim().charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold text-[var(--text-main)]">{group.name}</p>
                        <p className="mt-0.5 truncate text-[11.5px] text-[var(--text-subtle)]">
                          {t('groups.list.items', { count: group.entryCount })}
                          {group.description ? ` · ${group.description}` : ''}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-[13px] font-semibold tabular-nums text-[var(--text-main)]">
                          {symbol}{formatAmount(group.totalSpent)}
                        </p>
                        {group.totalIncome > 0 ? (
                          <p className="mt-0.5 text-[11px] font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                            +{symbol}{formatAmount(group.totalIncome)}
                          </p>
                        ) : (
                          <p className="mt-0.5 text-[11px] text-[var(--text-subtle)]">{t('groups.list.spent')}</p>
                        )}
                      </div>
                      <ChevronRight size={15} className="flex-shrink-0 text-[var(--text-subtle)]" />
                    </Link>
                    <button
                      onClick={() => setDeleteTarget(group)}
                      className="mr-2 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[var(--text-subtle)] hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                      title={t('groups.deleteGroup')}
                      aria-label={t('groups.list.deleteNamed', { name: group.name })}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
              <p className="mt-2 px-1 text-[10.5px] text-[var(--text-subtle)]">
                {t('groups.list.footnote')}
              </p>
            </section>
          </>
        )}
      </div>

      {/* ── Create sheet ── */}
      {createPortal(
        <AnimatePresence>
          {showCreateModal && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4"
              onKeyDown={(e) => { if (e.key === 'Escape') closeCreate() }}
            >
              <div className="absolute inset-0 bg-black/50" onClick={closeCreate} />
              <motion.form
                role="dialog" aria-modal="true" aria-label={t('groups.list.newGroup')}
                initial={{ y: 28, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 28, opacity: 0 }}
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                onSubmit={handleCreate}
                className="relative flex w-full sm:max-w-[440px] flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl border border-[var(--border-card)] bg-[var(--bg-page)] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45)]"
                style={{ maxHeight: '88vh', paddingBottom: 'env(safe-area-inset-bottom)' }}
              >
                <div className="flex flex-shrink-0 items-start justify-between gap-3 border-b border-[var(--border-subtle)] px-5 pt-5 pb-4">
                  <div className="min-w-0">
                    <h3 className="truncate text-[15px] font-semibold text-[var(--text-main)]">{t('groups.list.newGroup')}</h3>
                    <p className="mt-0.5 text-[11px] text-[var(--text-subtle)]">{t('groups.create.subtitle')}</p>
                  </div>
                  <button type="button" onClick={closeCreate} aria-label={t('common.close')}
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer">
                    <X size={15} />
                  </button>
                </div>

                <div className="space-y-4 overflow-y-auto px-5 py-5">
                  <div>
                    <label htmlFor="group-name" className={label}>{t('common.name')}</label>
                    <input
                      id="group-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t('groups.create.namePlaceholder')}
                      className={field}
                      required
                      autoFocus
                    />
                  </div>
                  <div>
                    <label htmlFor="group-desc" className={label}>{t('groups.create.description')} <span className="normal-case tracking-normal font-normal">{t('groups.create.optional')}</span></label>
                    <textarea
                      id="group-desc"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={t('groups.create.descPlaceholder')}
                      className={`${field} resize-none`}
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex gap-2 border-t border-[var(--border-subtle)] px-5 py-4">
                  <button
                    type="button"
                    onClick={closeCreate}
                    className="flex-1 rounded-xl border border-[var(--border-card)] px-4 py-2.5 text-[13px] font-medium text-[var(--text-main)] hover:bg-[var(--border-subtle)] transition-colors cursor-pointer"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !name.trim()}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--gold-primary)] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[var(--gold-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    {creating && <Loader2 size={14} className="animate-spin" />}
                    {t('groups.list.createGroup')}
                  </button>
                </div>
              </motion.form>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('groups.list.confirmTitle')}
        message={t('groups.list.confirmMessage', { name: deleteTarget?.name })}
        danger
      />

      <Toast message={toast.msg} type={toast.type} visible={toast.visible} />
      <GroupsHelpSheet open={showHelp} onClose={() => setShowHelp(false)} />
    </LayoutShell>
  )
}
