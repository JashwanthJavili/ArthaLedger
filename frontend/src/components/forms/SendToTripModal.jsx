import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'

export default function SendToTripModal({ open, onClose, onSend }) {
  const { trips, createTrip } = useAppData()
  const [newGroupName, setNewGroupName] = useState('')
  const [isCreatingInline, setIsCreatingInline] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  const handleSelectGroup = (tripId) => {
    onSend(tripId)
    onClose()
  }

  const handleCreateAndSend = async (e) => {
    e.preventDefault()
    if (!newGroupName.trim()) return

    try {
      setError('')
      const newTripId = await createTrip({ name: newGroupName.trim(), description: 'Created via selection' })
      onSend(newTripId)
      setNewGroupName('')
      setIsCreatingInline(false)
      onClose()
    } catch (err) {
      setError(err?.message || 'Failed to create expense group')
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/30 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal Sheet */}
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md space-y-4 rounded-3xl bg-white p-5 sm:p-6 shadow-2xl z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-semibold text-stone-800">
              Send to Expense Group
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-stone-100 p-1.5 text-stone-400 hover:bg-stone-50 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* List of existing groups */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">Select Group</p>
            <div className="max-h-48 overflow-y-auto pr-1 space-y-1.5">
              {trips.length === 0 ? (
                <p className="text-xs text-stone-500 py-2 italic">
                  No active expense groups. Create one below to begin.
                </p>
              ) : (
                trips.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => handleSelectGroup(group.id)}
                    className="w-full flex items-center justify-between rounded-xl border border-amber-100/60 bg-amber-50/20 px-3.5 py-3 text-left text-sm text-stone-700 hover:bg-amber-100/50 hover:border-amber-200 transition-all cursor-pointer"
                  >
                    <div>
                      <span className="font-semibold text-stone-800">{group.name}</span>
                      {group.description && (
                        <p className="text-[10px] text-stone-400 mt-0.5">{group.description}</p>
                      )}
                    </div>
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">
                      {group.entries ? Object.keys(group.entries).length : 0} entries
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          <hr className="border-amber-100/50" />

          {/* Inline creation */}
          {!isCreatingInline ? (
            <button
              onClick={() => setIsCreatingInline(true)}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-amber-200 py-3 text-xs font-semibold text-amber-700 hover:bg-amber-50/40 transition-colors cursor-pointer"
            >
              <Plus size={14} /> Create New Expense Group
            </button>
          ) : (
            <form onSubmit={handleCreateAndSend} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  New Group Name
                </label>
                <div className="flex gap-2">
                  <input
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="e.g. Holiday Trip, Project Materials"
                    className="flex-1 rounded-xl border border-amber-100 bg-amber-50/40 px-3 py-2.5 text-sm text-stone-800 placeholder-stone-400 focus:border-amber-300 focus:bg-white outline-none transition-colors"
                    required
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-amber-700 transition-colors"
                  >
                    Create & Send
                  </button>
                </div>
                {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreatingInline(false)
                  setError('')
                }}
                className="text-xs text-stone-400 hover:text-stone-600"
              >
                Cancel
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
