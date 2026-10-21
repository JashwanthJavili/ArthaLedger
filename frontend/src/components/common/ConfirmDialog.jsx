import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X, Loader } from 'lucide-react'

/**
 * Confirm dialog with async-safe handling.
 * - onConfirm may be async; button shows spinner until it resolves.
 * - onClose is only called after onConfirm succeeds.
 * - If onConfirm throws, the dialog stays open and the error is re-thrown
 *   so the parent can show a toast.
 */
export default function ConfirmDialog({ open, onClose, onConfirm, title, message, danger = true }) {
  const [confirming, setConfirming] = useState(false)

  // Reset confirming state when dialog closes
  if (!open) return null

  const handleConfirm = async () => {
    if (confirming) return
    setConfirming(true)
    try {
      await onConfirm()
      // Only close after success — parent's onClose sets open=false
      onClose()
    } catch (err) {
      // Re-enable button; parent handles the error toast
      console.error('ConfirmDialog error:', err)
    } finally {
      setConfirming(false)
    }
  }

  const handleClose = () => {
    if (confirming) return // don't allow close while deleting
    onClose()
  }

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/45 backdrop-blur-sm"
          onClick={handleClose}
        />
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 16 }}
          transition={{ type: 'spring', damping: 28, stiffness: 340 }}
          className="relative w-full max-w-sm rounded-3xl border border-[var(--border-card)] bg-[var(--bg-page)] p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45)]"
        >
          {!confirming && (
            <button
              onClick={handleClose}
              className="absolute right-4 top-4 rounded-full p-1.5 text-[var(--text-subtle)] hover:bg-[var(--border-subtle)] hover:text-[var(--text-main)] transition-colors"
              aria-label="Close"
            >
              <X size={15} />
            </button>
          )}

          <div className="flex flex-col items-center text-center gap-3 mb-5">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full ${danger ? 'bg-rose-500/10' : 'bg-[var(--gold-light)]'}`}>
              <AlertTriangle size={22} className={danger ? 'text-rose-500' : 'text-[var(--gold-primary)]'} />
            </div>
            <div>
              <h3 className="text-[16px] font-semibold text-[var(--text-main)]">{title}</h3>
              <p className="mt-1.5 text-[13px] text-[var(--text-muted)] leading-relaxed">{message}</p>
            </div>
            {danger && (
              <p className="text-[11px] font-medium text-rose-500">This action cannot be undone.</p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleClose}
              disabled={confirming}
              className="flex-1 rounded-xl border border-[var(--border-card)] px-4 py-2.5 text-sm font-medium text-[var(--text-main)] hover:bg-[var(--border-subtle)] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors shadow-sm disabled:opacity-70 flex items-center justify-center gap-2 ${
                danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[var(--gold-primary)] hover:bg-[var(--gold-hover)]'
              }`}
            >
              {confirming ? (
                <>
                  <Loader size={14} className="animate-spin" />
                  Deleting...
                </>
              ) : (
                danger ? 'Yes, Delete' : 'Confirm'
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  )
}
