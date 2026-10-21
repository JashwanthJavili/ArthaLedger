import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, ChevronRight, Loader2 } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'

const field = 'min-w-0 flex-1 rounded-xl border border-[var(--border-card)] bg-[var(--bg-card)] px-3.5 py-2.5 text-[14px] text-[var(--text-main)] placeholder-[var(--text-subtle)] outline-none focus:border-[var(--gold-primary)] transition-colors'

export default function SendToTripModal({ open, onClose, onSend }) {
  const { trips, createTrip } = useAppData()
  const [newGroupName, setNewGroupName] = useState('')
  const [isCreatingInline, setIsCreatingInline] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const handleSelectGroup = (tripId) => {
    onSend(tripId)
    onClose()
  }

  const handleCreateAndSend = async (e) => {
    e.preventDefault()
    if (!newGroupName.trim() || creating) return

    setCreating(true)
    try {
      setError('')
      const newTripId = await createTrip({ name: newGroupName.trim(), description: 'Created via selection' })
      onSend(newTripId)
      setNewGroupName('')
      setIsCreatingInline(false)
      onClose()
    } catch (err) {
      setError(err?.message || 'Failed to create expense group')
    } finally {
      setCreating(false)
    }
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4"
          onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
        >
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />

          <motion.div
            role="dialog" aria-modal="true" aria-label="Add to group"
            initial={{ y: 28, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 28, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex w-full sm:max-w-[440px] flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl border border-[var(--border-card)] bg-[var(--bg-page)] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45)]"
            style={{ maxHeight: '88vh', paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-[var(--border-subtle)] px-5 pt-5 pb-4">
              <div className="min-w-0">
                <h3 className="truncate text-[15px] font-semibold text-[var(--text-main)]">Add to group</h3>
                <p className="mt-0.5 text-[11px] text-[var(--text-subtle)]">The selected transactions stay in this book</p>
              </div>
              <button type="button" onClick={onClose} aria-label="Close"
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer">
                <X size={15} />
              </button>
            </div>

            <div className="space-y-5 overflow-y-auto px-5 py-5">
              {/* Existing groups */}
              <div>
                <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-subtle)]">Choose a group</p>
                {trips.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-[var(--border-card)] px-4 py-5 text-center text-xs text-[var(--text-subtle)]">
                    No groups yet. Create one below to begin.
                  </p>
                ) : (
                  <div className="max-h-[40vh] overflow-y-auto rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] divide-y divide-[var(--border-subtle)]">
                    {trips.map((group) => {
                      const count = group.entries ? Object.keys(group.entries).length : 0
                      return (
                        <button
                          key={group.id}
                          type="button"
                          onClick={() => handleSelectGroup(group.id)}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left first:rounded-t-2xl last:rounded-b-2xl hover:bg-[var(--border-subtle)]/60 transition-colors cursor-pointer"
                        >
                          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--gold-light)] font-serif-luxury text-[14px] font-semibold text-[var(--gold-primary)]">
                            {(group.name || '?').trim().charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13.5px] font-semibold text-[var(--text-main)]">{group.name}</p>
                            <p className="mt-0.5 truncate text-[11px] text-[var(--text-subtle)]">
                              {count} {count === 1 ? 'entry' : 'entries'}{group.description ? ` · ${group.description}` : ''}
                            </p>
                          </div>
                          <ChevronRight size={15} className="flex-shrink-0 text-[var(--text-subtle)]" />
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Inline creation */}
              {!isCreatingInline ? (
                <button
                  type="button"
                  onClick={() => setIsCreatingInline(true)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--border-card)] py-3 text-[13px] font-semibold text-[var(--gold-primary)] hover:bg-[var(--gold-light)] transition-colors cursor-pointer"
                >
                  <Plus size={15} /> New group
                </button>
              ) : (
                <form onSubmit={handleCreateAndSend} className="space-y-2">
                  <label htmlFor="send-new-group" className="block px-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-subtle)]">
                    New group name
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="send-new-group"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="e.g. Holiday Trip"
                      className={field}
                      required
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={creating || !newGroupName.trim()}
                      className="flex flex-shrink-0 items-center gap-1.5 rounded-xl bg-[var(--gold-primary)] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[var(--gold-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      {creating && <Loader2 size={14} className="animate-spin" />}
                      Create & add
                    </button>
                  </div>
                  {error && <p className="px-1 text-[11px] text-rose-600 dark:text-rose-400">{error}</p>}
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingInline(false)
                      setError('')
                    }}
                    className="px-1 text-[12px] font-medium text-[var(--text-subtle)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
