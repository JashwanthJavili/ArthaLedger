import { useState } from 'react'
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

  return (
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
          className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
        >
          {!confirming && (
            <button
              onClick={handleClose}
              className="absolute right-4 top-4 rounded-xl p-1.5 text-stone-400 hover:bg-stone-100 transition-colors"
              aria-label="Close"
            >
              <X size={15} />
            </button>
          )}

          <div className="flex flex-col items-center text-center gap-3 mb-5">
            <div className={`rounded-2xl p-3.5 ${danger ? 'bg-red-50' : 'bg-amber-50'}`}>
              <AlertTriangle size={26} className={danger ? 'text-red-500' : 'text-amber-500'} />
            </div>
            <div>
              <h3 className="font-serif text-lg font-semibold text-stone-800">{title}</h3>
              <p className="mt-2 text-sm text-stone-500 leading-relaxed">{message}</p>
            </div>
            {danger && (
              <p className="text-xs text-red-400 font-medium bg-red-50 rounded-xl px-3 py-1.5 border border-red-100">
                ⚠️ This action cannot be undone
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleClose}
              disabled={confirming}
              className="flex-1 rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-stone-600 hover:bg-stone-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors shadow-sm disabled:opacity-70 flex items-center justify-center gap-2 ${
                danger ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-600 hover:bg-amber-700'
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
    </AnimatePresence>
  )
}
