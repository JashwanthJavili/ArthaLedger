import { useMemo, useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Trash2, Hash, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, PiggyBank, Link2Off, FolderX,
} from 'lucide-react'
import { format } from 'date-fns'
import LayoutShell from '../components/LayoutShell'
import PageSkeleton from '../components/common/PageSkeleton'
import { useAppData } from '../context/AppDataContext'
import Toast from '../components/common/Toast'
import ConfirmDialog from '../components/common/ConfirmDialog'
import SummaryCard from '../components/cards/SummaryCard'
import { formatAmount, getCurrencySymbol } from '../lib/format'
import { compareNewestFirst } from '../lib/entryOrder'

const card = 'rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)]'
const sectionTitle = 'text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-subtle)]'
const iconBtn = 'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-[var(--border-card)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--text-subtle)] transition-colors cursor-pointer'
const chip = (active) => `flex-shrink-0 rounded-full border px-3 py-1.5 text-[12px] transition-colors cursor-pointer ${
  active
    ? 'border-[var(--gold-primary)] bg-[var(--gold-light)] font-semibold text-[var(--text-main)]'
    : 'border-[var(--border-card)] bg-[var(--bg-card)] font-medium text-[var(--text-muted)] hover:text-[var(--text-main)]'
}`

function entryVisual(entry) {
  const isTransfer = entry.type === 'transfer_in' || entry.type === 'transfer_out'
  if (entry.isSavings) return { Icon: PiggyBank, chip: 'bg-violet-500/10 text-violet-600 dark:text-violet-400', amount: 'text-violet-600 dark:text-violet-400' }
  if (isTransfer) return { Icon: ArrowLeftRight, chip: 'bg-sky-500/10 text-sky-600 dark:text-sky-400', amount: 'text-sky-600 dark:text-sky-400' }
  if (entry.type === 'income') return { Icon: ArrowDownLeft, chip: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', amount: 'text-emerald-600 dark:text-emerald-400' }
  return { Icon: ArrowUpRight, chip: 'bg-rose-500/10 text-rose-600 dark:text-rose-400', amount: 'text-[var(--text-main)]' }
}

export default function ExpenseGroupDetailPage() {
  const { tripId } = useParams()
  const navigate = useNavigate()
  const { loading, error, trips, projects, booksByProject, entriesByBook, unlinkEntryFromTrip, deleteTrip } = useAppData()
  const [deleteGroupConfirm, setDeleteGroupConfirm] = useState(false)
  const [unlinkTarget, setUnlinkTarget] = useState(null)
  const [toast, setToast] = useState({ msg: '', type: 'success', visible: false })
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all')
  const symbol = getCurrencySymbol()

  const [stalled, setStalled] = useState(false)

  useEffect(() => {
    if (!loading) return undefined
    const t = setTimeout(() => setStalled(true), 3500)
    return () => {
      clearTimeout(t)
      setStalled(false)
    }
  }, [loading])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type, visible: true })
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2200)
  }

  // Find current group
  const group = trips.find((t) => t.id === tripId)

  // Resolve linked entries with full context details
  const resolvedItems = useMemo(() => {
    if (!group?.entries) return []

    return Object.values(group.entries)
      .map(({ projectId, bookId, entryId, addedAt }) => {
        // Resolve project name
        const project = projects.find((p) => p.id === projectId)
        const projectName = project ? project.name : 'Unknown Project'

        // Resolve book name
        const books = booksByProject[projectId] || []
        const book = books.find((b) => b.id === bookId)
        const bookName = book ? book.name : 'Unknown Book'

        // Resolve entry details
        const bookEntries = entriesByBook[bookId] || []
        const entry = bookEntries.find((e) => e.id === entryId)

        if (!entry) return null // If original entry was deleted, skip it

        return {
          entry,
          projectId,
          bookId,
          projectName,
          bookName,
          addedAt,
        }
      })
      .filter(Boolean)
      .sort((a, b) => compareNewestFirst(a.entry, b.entry)) // Sort by transaction date descending
  }, [group, projects, booksByProject, entriesByBook])

  // Get unique categories for dropdown filter
  const uniqueCategories = useMemo(() => {
    const cats = new Set()
    resolvedItems.forEach(({ entry }) => {
      cats.add(entry.category || 'General')
    })
    return Array.from(cats).sort()
  }, [resolvedItems])

  // Filtered items list
  const filteredItems = useMemo(() => {
    if (selectedCategoryFilter === 'all') return resolvedItems
    return resolvedItems.filter(({ entry }) => (entry.category || 'General') === selectedCategoryFilter)
  }, [resolvedItems, selectedCategoryFilter])

  // Aggregate stats
  const stats = useMemo(() => {
    let totalSpent = 0
    let totalIncome = 0

    resolvedItems.forEach(({ entry }) => {
      const amt = Number(entry.amount || 0)
      if (entry.type === 'expense' || entry.type === 'transfer_out') {
        totalSpent += amt
      } else if (entry.type === 'income' || entry.type === 'transfer_in') {
        totalIncome += amt
      }
    })

    return {
      totalSpent,
      totalIncome,
      net: totalIncome - totalSpent,
    }
  }, [resolvedItems])

  // Category breakdown stats for visual graph
  const categoryStats = useMemo(() => {
    const cats = {}
    resolvedItems
      .filter(({ entry }) => entry.type === 'expense' || entry.type === 'transfer_out')
      .forEach(({ entry }) => {
        const cat = entry.category || 'General'
        cats[cat] = (cats[cat] || 0) + Number(entry.amount || 0)
      })

    const total = Object.values(cats).reduce((s, v) => s + v, 0)

    return Object.entries(cats)
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
  }, [resolvedItems])

  const handleUnlink = async (projectId, bookId, entryId) => {
    try {
      await unlinkEntryFromTrip(tripId, projectId, bookId, entryId)
      showToast('Unlinked from group')
    } catch (err) {
      showToast(err?.message || 'Failed to unlink item', 'error')
    }
  }

  const handleDeleteGroup = async () => {
    try {
      await deleteTrip(tripId)
      navigate('/trips')
    } catch (err) {
      showToast(err?.message || 'Failed to delete group', 'error')
    }
  }

  if (error) {
    return (
      <LayoutShell>
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-4">
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-5 max-w-sm">
            <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">Unable to Load Data</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl bg-[var(--gold-primary)] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[var(--gold-hover)] transition-colors cursor-pointer"
          >
            Retry Loading
          </button>
        </div>
      </LayoutShell>
    )
  }

  if (!group) {
    if (loading) return <PageSkeleton slow={stalled} label="Loading group" />

    return (
      <LayoutShell>
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 py-20 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--gold-light)] text-[var(--gold-primary)]">
            <FolderX size={20} />
          </span>
          <div>
            <p className="text-sm font-semibold text-[var(--text-main)]">Group not found</p>
            <p className="mt-1 text-xs text-[var(--text-subtle)]">It may have been deleted on another device.</p>
          </div>
          <Link to="/trips"
            className="mt-1 rounded-xl bg-[var(--gold-primary)] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[var(--gold-hover)] transition-colors">
            Back to groups
          </Link>
        </div>
      </LayoutShell>
    )
  }

  const itemCount = resolvedItems.length

  return (
    <LayoutShell>
      <div className="mx-auto max-w-2xl space-y-6">
        {loading && stalled && (
          <div className="rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] px-4 py-3 text-[11px] text-[var(--text-muted)]">
            Still syncing — your connection seems slow.
          </div>
        )}

        {/* ── Header ── */}
        <header className="flex items-center gap-3 pt-1">
          <Link to="/trips" aria-label="Back to groups" className={iconBtn + ' !text-[var(--text-main)]'}>
            <ArrowLeft size={17} />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="font-serif-luxury truncate text-[23px] font-semibold leading-[1.15] tracking-[-0.01em] text-[var(--text-main)]">
              {group.name}
            </h1>
            <p className="font-serif-luxury mt-0.5 truncate text-[13.5px] italic text-[var(--text-muted)]">
              {group.description || `${itemCount} linked ${itemCount === 1 ? 'transaction' : 'transactions'}`}
            </p>
          </div>
          <button
            onClick={() => setDeleteGroupConfirm(true)}
            className={iconBtn + ' hover:!text-rose-500 hover:!border-rose-500/40'}
            title="Delete group"
            aria-label="Delete group"
          >
            <Trash2 size={16} />
          </button>
        </header>

        {/* ── Overview ── */}
        <section>
          <h2 className={`${sectionTitle} mb-2 px-1`}>Overview</h2>
          <SummaryCard
            net={stats.net}
            totalIn={stats.totalIncome}
            totalOut={stats.totalSpent}
            delay={0}
          />
        </section>

        {/* ── Category split ── */}
        {categoryStats.length > 0 && (
          <section>
            <div className="mb-2 flex items-center justify-between px-1">
              <h2 className={sectionTitle}>Spending by category</h2>
              <span className="text-[10.5px] text-[var(--text-subtle)]">Tap to filter</span>
            </div>
            <div className={`${card} divide-y divide-[var(--border-subtle)]`}>
              {categoryStats.map((cat, idx) => {
                const isSelected = selectedCategoryFilter === cat.name
                return (
                  <button
                    type="button"
                    key={cat.name}
                    onClick={() => setSelectedCategoryFilter(isSelected ? 'all' : cat.name)}
                    aria-pressed={isSelected}
                    className={`block w-full px-4 py-3 text-left first:rounded-t-2xl last:rounded-b-2xl transition-colors cursor-pointer ${
                      isSelected ? 'bg-[var(--gold-light)]' : 'hover:bg-[var(--border-subtle)]/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="min-w-0 truncate text-[13px] font-medium text-[var(--text-main)]">{cat.name}</span>
                      <span className="flex-shrink-0 text-[13px] tabular-nums">
                        <span className="font-semibold text-[var(--text-main)]">{symbol}{formatAmount(cat.amount)}</span>
                        <span className="ml-1.5 inline-block w-9 text-right text-[11px] text-[var(--text-subtle)]">{cat.percentage.toFixed(0)}%</span>
                      </span>
                    </div>
                    <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[var(--border-subtle)]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${cat.percentage}%` }}
                        transition={{ delay: idx * 0.05, duration: 0.5 }}
                        className="h-full rounded-full bg-[var(--gold-primary)]"
                      />
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Transactions ── */}
        <section className="space-y-2.5">
          <h2 className={`${sectionTitle} px-1`}>
            Transactions{itemCount > 0 ? ` · ${selectedCategoryFilter === 'all' ? itemCount : `${filteredItems.length} of ${itemCount}`}` : ''}
          </h2>

          {uniqueCategories.length > 1 && (
            <div className="wheel-scroll -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
              <button type="button" onClick={() => setSelectedCategoryFilter('all')} className={chip(selectedCategoryFilter === 'all')}>
                All
              </button>
              {uniqueCategories.map((cat) => (
                <button type="button" key={cat} onClick={() => setSelectedCategoryFilter(cat)} className={chip(selectedCategoryFilter === cat)}>
                  {cat}
                </button>
              ))}
            </div>
          )}

          {resolvedItems.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--border-card)] px-6 py-12 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--gold-light)] text-[var(--gold-primary)]">
                <Hash size={20} />
              </span>
              <div>
                <p className="text-sm font-semibold text-[var(--text-main)]">
                  {loading ? 'Retrieving transactions…' : 'No transactions linked yet'}
                </p>
                {!loading && (
                  <p className="mx-auto mt-1 max-w-xs text-xs text-[var(--text-subtle)]">
                    Open any book, select transactions and choose “Add to group”.
                  </p>
                )}
              </div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--border-card)] px-6 py-12 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--gold-light)] text-[var(--gold-primary)]">
                <Hash size={20} />
              </span>
              <p className="text-sm font-semibold text-[var(--text-main)]">No items in this category</p>
              <button
                onClick={() => setSelectedCategoryFilter('all')}
                className="rounded-xl bg-[var(--gold-primary)] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[var(--gold-hover)] transition-colors cursor-pointer"
              >
                Show all
              </button>
            </div>
          ) : (
            <div className={`${card} divide-y divide-[var(--border-subtle)]`}>
              {filteredItems.map(({ entry, projectId, bookId, projectName, bookName }) => {
                const isIncome = entry.type === 'income' || entry.type === 'transfer_in'
                const visual = entryVisual(entry)
                const Icon = visual.Icon
                const meta = [
                  entry.category || 'General',
                  entry.subcategory,
                  entry.mode,
                ].filter(Boolean).join(' · ')

                return (
                  <div
                    key={`${projectId}_${bookId}_${entry.id}`}
                    className="flex items-center first:rounded-t-2xl last:rounded-b-2xl hover:bg-[var(--border-subtle)]/60 transition-colors"
                  >
                    <Link
                      to={`/projects/${projectId}/books/${bookId}?focusedEntryId=${entry.id}`}
                      className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 pr-2"
                      title="View in original book"
                    >
                      <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${visual.chip}`}>
                        <Icon size={16} strokeWidth={2.2} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-semibold text-[var(--text-main)]">
                          {entry.description || entry.category || 'Transaction'}
                        </p>
                        <p className="mt-0.5 truncate text-[11.5px] text-[var(--text-muted)]">{meta}</p>
                        <p className="mt-0.5 truncate text-[10.5px] text-[var(--text-subtle)]">
                          {projectName} / {bookName} · {format(new Date(entry.timestamp), 'dd MMM, h:mm a')}
                        </p>
                      </div>
                      <p className={`flex-shrink-0 text-[13.5px] font-semibold tabular-nums ${visual.amount}`}>
                        {isIncome ? '+' : '−'}{symbol}{formatAmount(entry.amount)}
                      </p>
                    </Link>
                    <button
                      onClick={() => setUnlinkTarget({ projectId, bookId, entryId: entry.id, description: entry.description })}
                      className="mr-2 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[var(--text-subtle)] hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                      title="Remove from group"
                      aria-label="Remove from group"
                    >
                      <Link2Off size={15} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {resolvedItems.length > 0 && (
            <p className="px-1 text-[10.5px] text-[var(--text-subtle)]">
              Tap a transaction to open it in its book. Removing it from this group doesn’t delete it.
            </p>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={Boolean(unlinkTarget)}
        onClose={() => setUnlinkTarget(null)}
        onConfirm={() => handleUnlink(unlinkTarget.projectId, unlinkTarget.bookId, unlinkTarget.entryId)}
        title="Remove from group?"
        message={`${unlinkTarget?.description ? `"${unlinkTarget.description}"` : 'This transaction'} will be removed from this group. It stays in its original book.`}
        danger={false}
      />

      <ConfirmDialog
        open={deleteGroupConfirm}
        onClose={() => setDeleteGroupConfirm(false)}
        onConfirm={handleDeleteGroup}
        title="Delete Group?"
        message={`"${group.name}" will be deleted. The original transactions will NOT be affected.`}
        danger
      />

      <Toast message={toast.msg} type={toast.type} visible={toast.visible} />
    </LayoutShell>
  )
}
