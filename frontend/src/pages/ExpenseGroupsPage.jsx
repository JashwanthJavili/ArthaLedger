import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Compass, Plus, Trash2, ChevronRight, Hash, FolderHeart, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import LayoutShell from '../components/LayoutShell'
import { useAppData } from '../context/AppDataContext'
import Toast from '../components/common/Toast'
import ConfirmDialog from '../components/common/ConfirmDialog'
import { formatAmount, getCurrencySymbol } from '../lib/format'
import Loader from '../components/common/Loader'

export default function ExpenseGroupsPage() {
  const { loading, error, trips, entriesByBook, createTrip, deleteTrip } = useAppData()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [toast, setToast] = useState({ msg: '', type: 'success', visible: false })
  const symbol = getCurrencySymbol()

  const [stalled, setStalled] = useState(false)

  useEffect(() => {
    let t = null
    if (loading) t = setTimeout(() => setStalled(true), 3500)
    else setStalled(false)
    return () => clearTimeout(t)
  }, [loading])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type, visible: true })
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2200)
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
          <div className="rounded-2xl bg-red-50 border border-red-100 p-4 max-w-sm">
            <p className="text-sm font-semibold text-red-800">Unable to Load Data</p>
            <p className="text-xs text-red-600 mt-1">{error}</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 cursor-pointer"
          >
            Retry Loading
          </button>
        </div>
      </LayoutShell>
    )
  }

  if (loading && !stalled) {
    return <Loader text="Loading expense groups..." />
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!name.trim()) return

    try {
      await createTrip({ name: name.trim(), description: description.trim() })
      showToast('Expense Group created ✓')
      setName('')
      setDescription('')
      setShowCreateModal(false)
    } catch (err) {
      showToast(err?.message || 'Failed to create group', 'error')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteTrip(deleteTarget.id)
      showToast('Group deleted', 'info')
      setDeleteTarget(null)
    } catch (err) {
      showToast(err?.message || 'Failed to delete group', 'error')
    }
  }

  return (
    <LayoutShell>
      <div className="space-y-4 pb-24">
        {loading && (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-3.5 text-xs text-red-700 leading-relaxed font-medium">
            ⚠️ Connection is taking longer than expected. Please check your internet connection.
          </div>
        )}
        {/* Header */}
        <header className="flex items-center justify-between rounded-2xl border border-amber-100/80 bg-white/88 p-3 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="rounded-xl border border-amber-100 p-2 text-stone-600 bg-amber-50/20">
              <Compass size={18} className="text-amber-700" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-stone-800">Expense Groups</h1>
              <p className="text-[10px] text-stone-400 mt-0.5">Cross-book ledger aggregates</p>
            </div>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700 transition-colors shadow-sm cursor-pointer"
          >
            <Plus size={14} /> New Group
          </button>
        </header>

        {/* Groups List */}
        {groupsWithStats.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center rounded-2xl border border-dashed border-amber-200 bg-amber-50/20">
            <FolderHeart size={32} className="text-amber-300" />
            <div>
              <p className="text-sm font-medium text-stone-600">
                {loading ? 'Retrieving expense groups...' : 'No Expense Groups yet'}
              </p>
              <p className="mt-1 text-xs text-stone-400 max-w-xs mx-auto px-4">
                {loading ? 'Connecting to database...' : 'Create a group here, then go to any project book, select transactions, and send them here.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-2.5">
            {groupsWithStats.map((group) => (
              <motion.div
                key={group.id}
                whileHover={{ y: -1, boxShadow: '0 4px 20px rgba(185,147,78,0.08)' }}
                className="group relative flex items-center justify-between rounded-2xl border border-amber-100/80 bg-white/90 p-4 shadow-sm transition-all"
              >
                <Link to={`/trips/${group.id}`} className="flex-1 min-w-0 pr-8">
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-stone-800 group-hover:text-amber-800 transition-colors">
                      {group.name}
                    </h2>
                    {group.description && (
                      <p className="text-xs text-stone-400 mt-0.5 truncate">{group.description}</p>
                    )}
                  </div>

                  <div className="mt-3 flex items-center gap-4 text-xs">
                    <div>
                      <span className="text-stone-400">Total Spent:</span>{' '}
                      <span className="font-semibold text-red-600">
                        {symbol}{formatAmount(group.totalSpent)}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-400">Total In:</span>{' '}
                      <span className="font-semibold text-emerald-600">
                        {symbol}{formatAmount(group.totalIncome)}
                      </span>
                    </div>
                    <div className="text-[10px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full font-medium">
                      {group.entryCount} item{group.entryCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                </Link>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setDeleteTarget(group)}
                    className="opacity-0 group-hover:opacity-100 rounded-xl p-2 text-stone-400 hover:bg-red-50 hover:text-red-600 transition-all cursor-pointer"
                    title="Delete Group"
                  >
                    <Trash2 size={14} />
                  </button>
                  <Link
                    to={`/trips/${group.id}`}
                    className="rounded-xl border border-amber-100/50 p-2 text-stone-400 hover:bg-amber-50 hover:text-amber-700 transition-colors"
                  >
                    <ChevronRight size={14} />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Creation Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
              onClick={() => setShowCreateModal(false)}
            />
            <motion.form
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onSubmit={handleCreate}
              className="relative w-full max-w-md space-y-4 rounded-3xl bg-white p-5 sm:p-6 shadow-2xl z-10"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-xl bg-amber-100 p-2">
                    <Compass size={16} className="text-amber-700" />
                  </div>
                  <h2 className="text-base sm:text-lg font-semibold text-stone-800">
                    New Expense Group
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-stone-100 p-1.5 text-stone-400 hover:bg-stone-50 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">
                    Group Name *
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Europe Trip 2026, Office Refurbish"
                    className="w-full rounded-xl border border-amber-100 bg-amber-50/40 px-3 py-2.5 text-sm text-stone-800 placeholder-stone-400 focus:border-amber-300 focus:bg-white outline-none transition-colors"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide context or dates..."
                    className="w-full rounded-xl border border-amber-100 bg-amber-50/40 px-3 py-2.5 text-sm text-stone-800 placeholder-stone-400 focus:border-amber-300 focus:bg-white outline-none resize-none transition-colors"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-stone-600 hover:bg-stone-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-700 transition-colors shadow-sm"
                >
                  Create Group
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Expense Group?"
        message={`"${deleteTarget?.name}" will be deleted. The original transactions will NOT be affected.`}
        danger
      />

      <Toast message={toast.msg} type={toast.type} visible={toast.visible} />
    </LayoutShell>
  )
}
