import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, TrendingUp, TrendingDown, Wallet, Smartphone, HandCoins, Landmark, Check } from 'lucide-react'

const MODES = [
  { id: 'Cash', icon: Wallet, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  { id: 'UPI', icon: Smartphone, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  { id: 'Online', icon: HandCoins, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  { id: 'Bank Transfer', icon: Landmark, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200' },
]

export default function EntryModal({ open, type, onClose, onSubmit, categories, initial }) {
  const [form, setForm] = useState({
    amount: '',
    description: '',
    category: '',
    mode: 'Cash',
    enteredBy: '',
    notes: '',
    timestamp: new Date().toISOString().slice(0, 16),
  })
  const [newCat, setNewCat] = useState('')
  const [localCats, setLocalCats] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (open) {
      const cats = categories?.length ? categories : ['General']
      setLocalCats(cats)
      setForm({
        amount: initial?.amount ?? '',
        description: initial?.description || '',
        category: initial?.category || cats[0] || 'General',
        mode: initial?.mode || 'Cash',
        enteredBy: initial?.enteredBy || '',
        notes: initial?.notes || '',
        timestamp: initial
          ? new Date(initial.timestamp).toISOString().slice(0, 16)
          : new Date().toISOString().slice(0, 16),
      })
      setNewCat('')
      setErrors({})
    }
  }, [open, initial, categories])

  if (!open) return null

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }))
  }

  const addCategory = () => {
    const trimmed = newCat.trim()
    if (!trimmed || localCats.includes(trimmed)) return
    const updated = [...localCats, trimmed]
    setLocalCats(updated)
    update('category', trimmed)
    setNewCat('')
  }

  const validate = () => {
    const e = {}
    if (!form.amount || Number(form.amount) <= 0) e.amount = 'Enter a valid amount'
    if (!form.description.trim()) e.description = 'Description is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      await onSubmit({
        ...form,
        amount: Number(form.amount),
        type,
        timestamp: new Date(form.timestamp).getTime(),
        _localCategories: localCats,
      })
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  const isIncome = type === 'income'
  const currencyMap = { INR: '₹', USD: '$', EUR: '€', GBP: '£', JPY: '¥', AED: 'د.إ', SGD: 'S$' }
  const symbol = currencyMap[localStorage.getItem('sl_currency') || 'INR'] || '₹'

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Sheet */}
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 320 }}
          className="relative w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl bg-white shadow-2xl overflow-hidden flex flex-col"
          style={{ maxHeight: '92vh' }}
        >
          {/* ── Colored header ── */}
          <div className={`flex-shrink-0 px-5 py-4 ${isIncome
            ? 'bg-gradient-to-r from-emerald-500 via-emerald-500 to-teal-500'
            : 'bg-gradient-to-r from-red-500 via-red-500 to-rose-500'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-white/20 p-2">
                  {isIncome
                    ? <TrendingUp size={18} className="text-white" />
                    : <TrendingDown size={18} className="text-white" />
                  }
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white leading-tight">
                    {initial ? 'Edit Entry' : isIncome ? 'Add Cash In' : 'Add Cash Out'}
                  </h2>
                  <p className="text-xs text-white/70 mt-0.5">
                    {isIncome ? 'Recorded with gratitude 🙏' : 'Entry noted mindfully 🕊️'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-white/20 p-2 text-white hover:bg-white/30 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* ── Scrollable form body ── */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
                  Amount *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-lg font-semibold">{symbol}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => update('amount', e.target.value)}
                    placeholder="0.00"
                    className={`w-full rounded-2xl border bg-stone-50 pl-9 pr-4 py-3.5 text-xl font-semibold text-stone-800 placeholder-stone-300 focus:bg-white transition-colors ${
                      errors.amount ? 'border-red-300 focus:border-red-400' : 'border-stone-200 focus:border-amber-300'
                    }`}
                    autoFocus
                  />
                </div>
                {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount}</p>}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
                  Description *
                </label>
                <input
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                  placeholder="What is this for?"
                  className={`w-full rounded-2xl border bg-stone-50 px-4 py-3 text-sm text-stone-800 placeholder-stone-400 focus:bg-white transition-colors ${
                    errors.description ? 'border-red-300 focus:border-red-400' : 'border-stone-200 focus:border-amber-300'
                  }`}
                />
                {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description}</p>}
              </div>

              {/* Payment Mode — button grid, never overflows */}
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
                  Payment Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {MODES.map(({ id, icon: Icon, color, bg, border }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => update('mode', id)}
                      className={`flex items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-sm font-medium transition-all ${
                        form.mode === id
                          ? `${bg} ${border} ${color} shadow-sm`
                          : 'border-stone-200 bg-stone-50 text-stone-500 hover:bg-stone-100'
                      }`}
                    >
                      <Icon size={15} />
                      <span>{id}</span>
                      {form.mode === id && <Check size={13} className="ml-auto" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category — chips, never a dropdown that overflows */}
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
                  Category
                </label>
                {/* Chip grid — wraps naturally */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {localCats.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => update('category', cat)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                        form.category === cat
                          ? 'border-amber-400 bg-amber-100 text-amber-800 shadow-sm'
                          : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-amber-50 hover:border-amber-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                {/* Add new category */}
                <div className="flex gap-2">
                  <input
                    value={newCat}
                    onChange={(e) => setNewCat(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory())}
                    placeholder="Add new category..."
                    className="flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-700 placeholder-stone-400 focus:border-amber-300 focus:bg-white transition-colors"
                  />
                  <button
                    type="button"
                    onClick={addCategory}
                    className="rounded-xl bg-amber-100 px-3 py-2 text-amber-700 hover:bg-amber-200 transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Entered By */}
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
                  Entered By
                </label>
                <input
                  value={form.enteredBy}
                  onChange={(e) => update('enteredBy', e.target.value)}
                  placeholder="Your name (optional)"
                  className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-800 placeholder-stone-400 focus:border-amber-300 focus:bg-white transition-colors"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
                  Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => update('notes', e.target.value)}
                  placeholder="Any additional notes..."
                  className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-800 placeholder-stone-400 focus:border-amber-300 focus:bg-white transition-colors resize-none"
                  rows={2}
                />
              </div>

              {/* Date & Time */}
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={form.timestamp}
                  onChange={(e) => update('timestamp', e.target.value)}
                  className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-800 focus:border-amber-300 focus:bg-white transition-colors"
                  required
                />
              </div>
            </div>

            {/* ── Sticky footer ── */}
            <div className="flex-shrink-0 px-5 pb-6 pt-3 border-t border-stone-100 bg-white flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-2xl border border-stone-200 px-4 py-3 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={`flex-[2] rounded-2xl px-4 py-3 text-sm font-semibold text-white transition-colors shadow-sm disabled:opacity-60 ${
                  isIncome ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {submitting
                  ? 'Saving...'
                  : initial
                    ? 'Update Entry'
                    : isIncome ? '+ Record Income' : '- Record Expense'
                }
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
