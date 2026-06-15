import { useMemo, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Trash2, Hash, Layers } from 'lucide-react'
import { format } from 'date-fns'
import LayoutShell from '../components/LayoutShell'
import { useAppData } from '../context/AppDataContext'
import Toast from '../components/common/Toast'
import ConfirmDialog from '../components/common/ConfirmDialog'
import SummaryCard from '../components/cards/SummaryCard'
import { formatAmount, getCurrencySymbol } from '../lib/format'

export default function ExpenseGroupDetailPage() {
  const { tripId } = useParams()
  const navigate = useNavigate()
  const { trips, projects, booksByProject, entriesByBook, unlinkEntryFromTrip, deleteTrip } = useAppData()
  const [deleteGroupConfirm, setDeleteGroupConfirm] = useState(false)
  const [toast, setToast] = useState({ msg: '', type: 'success', visible: false })
  const symbol = getCurrencySymbol()

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
      .sort((a, b) => b.entry.timestamp - a.entry.timestamp) // Sort by transaction date descending
  }, [group, projects, booksByProject, entriesByBook])

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

  if (!group) {
    return (
      <LayoutShell>
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <p className="text-sm text-stone-500">Group not found.</p>
          <Link to="/trips" className="text-xs text-amber-700 hover:underline">
            Go back to groups
          </Link>
        </div>
      </LayoutShell>
    )
  }

  return (
    <LayoutShell>
      <div className="space-y-4 pb-28">
        {/* Header */}
        <header className="rounded-2xl border border-amber-100/80 bg-white/88 p-3 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Link
                to="/trips"
                className="flex-shrink-0 inline-flex items-center gap-1 rounded-xl border border-amber-100 px-2.5 py-1.5 text-xs text-stone-600 hover:bg-amber-50 transition-colors"
              >
                <ArrowLeft size={13} />
              </Link>
              <div className="min-w-0">
                <h1 className="text-base font-semibold text-stone-800 truncate leading-tight">
                  {group.name}
                </h1>
                {group.description && (
                  <p className="text-[10px] text-stone-400 mt-0.5 truncate">{group.description}</p>
                )}
              </div>
            </div>

            <button
              onClick={() => setDeleteGroupConfirm(true)}
              className="rounded-xl border border-red-100 p-2 text-stone-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
              title="Delete Group"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </header>

        {/* Statistics summary card */}
        <section>
          <SummaryCard
            net={stats.net}
            totalIn={stats.totalIncome}
            totalOut={stats.totalSpent}
            delay={0}
          />
        </section>

        {/* Category breakdown (Visual progress bars) */}
        {categoryStats.length > 0 && (
          <section className="rounded-2xl border border-amber-100/80 bg-white/88 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Layers size={14} className="text-amber-600" />
              <h2 className="text-xs font-bold text-stone-500 uppercase tracking-wide">
                Category Split
              </h2>
            </div>
            <div className="space-y-3">
              {categoryStats.map((cat, idx) => (
                <div key={cat.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-stone-700">{cat.name}</span>
                    <span className="text-stone-500 font-medium">
                      {symbol}
                      {formatAmount(cat.amount)} ({cat.percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-amber-50 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${cat.percentage}%` }}
                      transition={{ delay: idx * 0.05, duration: 0.5 }}
                      className="h-full bg-amber-500 rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Transactions list */}
        <section className="space-y-2">
          <h2 className="font-serif text-base font-semibold text-stone-700">Linked Transactions</h2>

          {resolvedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-14 text-center rounded-2xl border border-dashed border-amber-200 bg-amber-50/20">
              <Hash size={24} className="text-amber-300" />
              <p className="text-xs font-medium text-stone-500">No transactions linked yet</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {resolvedItems.map(({ entry, projectId, bookId, projectName, bookName }) => {
                const isIncome = entry.type === 'income' || entry.type === 'transfer_in'
                const amountColor = entry.isSavings
                  ? 'text-violet-600'
                  : entry.type === 'transfer_in'
                  ? 'text-blue-600'
                  : entry.type === 'transfer_out'
                  ? 'text-blue-500'
                  : isIncome
                  ? 'text-emerald-700'
                  : 'text-red-600'

                return (
                  <div
                    key={`${projectId}_${bookId}_${entry.id}`}
                    className="relative rounded-2xl border border-amber-100/80 bg-white/90 p-3.5 shadow-sm transition-all"
                  >
                    {/* Origin Breadcrumbs */}
                    <div className="flex items-center justify-between gap-2 mb-2 text-[10px] text-stone-400">
                      <span className="truncate max-w-[75%] font-medium">
                        Project:{' '}
                        <span className="font-semibold text-stone-600">{projectName}</span> · Book:{' '}
                        <span className="font-semibold text-stone-600">{bookName}</span>
                      </span>
                      <span className="flex-shrink-0">
                        {format(new Date(entry.timestamp), 'dd MMM, h:mm a')}
                      </span>
                    </div>

                    {/* Main Row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-stone-800 leading-tight">
                          {entry.description}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="text-xs text-stone-400">{entry.category}</span>
                          <span className="inline-block h-1 w-1 rounded-full bg-amber-100" />
                          <span className="text-[10px] text-stone-400 bg-amber-50/50 border border-amber-100/30 px-1.5 py-0.5 rounded font-medium">
                            {entry.mode}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm sm:text-base font-bold ${amountColor}`}>
                          {isIncome ? '+' : '−'}
                          {symbol}
                          {formatAmount(entry.amount)}
                        </p>
                      </div>
                    </div>

                    {/* Actions bar inside card */}
                    <div className="mt-3 flex items-center justify-between border-t border-amber-50 pt-2">
                      <Link
                        to={`/projects/${projectId}/books/${bookId}?focusedEntryId=${entry.id}`}
                        className="text-amber-700 hover:underline text-[10px] font-bold"
                      >
                        View in original book →
                      </Link>
                      <button
                        onClick={() => handleUnlink(projectId, bookId, entry.id)}
                        className="text-red-500 hover:text-red-700 text-[10px] font-bold cursor-pointer"
                      >
                        Unlink
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

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
