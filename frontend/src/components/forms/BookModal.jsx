import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

export default function BookModal({ open, onClose, onSubmit, initial }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (open) {
      setName(initial?.name || '')
      setDescription(initial?.description || '')
    }
  }, [open, initial])

  if (!open) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit({ name: name.trim(), description: description.trim() })
    onClose()
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/30 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.form
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onSubmit={handleSubmit}
          className="relative w-full max-w-md space-y-4 rounded-3xl bg-white p-5 sm:p-6 shadow-2xl"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-semibold text-stone-800">
              {initial ? 'Edit Book' : 'New Book'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-stone-100 p-1.5 text-stone-400 hover:bg-stone-50 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Book Name *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Monthly Budget, Savings"
                className="w-full rounded-xl border border-amber-100 bg-amber-50/40 px-3 py-2.5 text-sm text-stone-800 placeholder-stone-400 focus:border-amber-300 focus:bg-white transition-colors"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this book for?"
                className="w-full rounded-xl border border-amber-100 bg-amber-50/40 px-3 py-2.5 text-sm text-stone-800 placeholder-stone-400 focus:border-amber-300 focus:bg-white transition-colors resize-none"
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-stone-600 hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-700 transition-colors shadow-sm"
            >
              {initial ? 'Save Changes' : 'Create Book'}
            </button>
          </div>
        </motion.form>
      </div>
    </AnimatePresence>
  )
}
