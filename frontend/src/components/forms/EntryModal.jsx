import { useState, useEffect, useRef } from 'react'
import { X, TrendingUp, TrendingDown, ChevronDown, ChevronUp, Wallet, Smartphone, HandCoins, Landmark, Plus, Trash2 } from 'lucide-react'

const MODES = [
  { id: 'Cash', icon: Wallet },
  { id: 'UPI', icon: Smartphone },
  { id: 'Online', icon: HandCoins },
  { id: 'Bank', icon: Landmark },
]

const currencyMap = { INR: '₹', USD: '$', EUR: '€', GBP: '£', JPY: '¥', AED: 'د.إ', SGD: 'S$' }

export default function EntryModal({ open, type, onClose, onSubmit, categories, initial, onSaveCategories }) {
  const [form, setForm] = useState({
    amount: '', description: '', category: '', mode: 'Cash',
    enteredBy: '', notes: '', timestamp: new Date().toISOString().slice(0, 16),
  })
  const [localCats, setLocalCats] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [showMore, setShowMore] = useState(false)
  const [showCatPanel, setShowCatPanel] = useState(false)
  const [newCatInput, setNewCatInput] = useState('')
  const amountRef = useRef(null)

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
      setErrors({})
      setShowMore(Boolean(initial?.notes || initial?.enteredBy))
      setShowCatPanel(false)
      setNewCatInput('')
      // Focus amount after mount
      setTimeout(() => amountRef.current?.focus(), 80)
    }
  }, [open, initial, categories])

  if (!open) return null

  const symbol = currencyMap[localStorage.getItem('sl_currency') || 'INR'] || '₹'
  const isIncome = type === 'income'

  const update = (key, value) => {
    setForm(p => ({ ...p, [key]: value }))
    if (errors[key]) setErrors(e => ({ ...e, [key]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.amount || Number(form.amount) <= 0) e.amount = 'Enter amount'
    if (!form.description.trim()) e.description = 'Enter description'
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

  const addCat = () => {
    const t = newCatInput.trim()
    if (!t || localCats.includes(t)) return
    const updated = [...localCats, t]
    setLocalCats(updated)
    update('category', t)
    setNewCatInput('')
    // Persist to Firebase immediately
    onSaveCategories?.(updated)
  }

  const removeCat = (cat) => {
    const updated = localCats.filter(c => c !== cat)
    setLocalCats(updated)
    if (form.category === cat) update('category', updated[0] || '')
    // Persist to Firebase immediately
    onSaveCategories?.(updated)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/35 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet — no AnimatePresence to avoid height-animation conflicts */}
      <div
        className="relative w-full sm:max-w-sm sm:rounded-3xl rounded-t-3xl bg-white shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: '88vh' }}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-4 py-3 flex items-center justify-between border-b border-stone-100">
          <div className="flex items-center gap-2">
            <div className={`rounded-lg p-1.5 ${isIncome ? 'bg-emerald-100' : 'bg-red-100'}`}>
              {isIncome
                ? <TrendingUp size={15} className="text-emerald-600" />
                : <TrendingDown size={15} className="text-red-500" />
              }
            </div>
            <span className="text-sm font-semibold text-stone-800">
              {initial ? 'Edit Entry' : isIncome ? 'Cash In' : 'Cash Out'}
            </span>
          </div>
          <button type="button" onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Scrollable body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">

            {/* ── Amount ── */}
            <div>
              <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1.5">
                Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-base font-bold">{symbol}</span>
                <input
                  ref={amountRef}
                  type="number" inputMode="decimal" min="0.01" step="0.01"
                  value={form.amount}
                  onChange={e => update('amount', e.target.value)}
                  placeholder="0.00"
                  className={`w-full rounded-xl border bg-stone-50 pl-8 pr-3 py-2.5 text-2xl font-bold text-stone-800 placeholder-stone-300 focus:bg-white transition-colors ${
                    errors.amount ? 'border-red-300' : 'border-stone-200 focus:border-amber-300'
                  }`}
                />
              </div>
              {errors.amount && <p className="mt-1 text-[11px] text-red-500">{errors.amount}</p>}
            </div>

            {/* ── Description ── */}
            <div>
              <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1.5">
                Description
              </label>
              <input
                value={form.description}
                onChange={e => update('description', e.target.value)}
                placeholder="e.g. Groceries, Salary, Rent"
                className={`w-full rounded-xl border bg-stone-50 px-3 py-2.5 text-sm text-stone-800 placeholder-stone-400 focus:bg-white transition-colors ${
                  errors.description ? 'border-red-300' : 'border-stone-200 focus:border-amber-300'
                }`}
              />
              {errors.description && <p className="mt-1 text-[11px] text-red-500">{errors.description}</p>}
            </div>

            {/* ── Payment Mode ── */}
            <div>
              <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1.5">
                Payment Mode
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {MODES.map(({ id, icon: Icon }) => {
                  const modeVal = id === 'Bank' ? 'Bank Transfer' : id
                  const active = form.mode === modeVal
                  return (
                    <button key={id} type="button" onClick={() => update('mode', modeVal)}
                      className={`flex flex-col items-center gap-1 rounded-xl border py-2 text-[10px] font-medium transition-all ${
                        active ? 'border-amber-400 bg-amber-100 text-amber-800' : 'border-stone-200 bg-stone-50 text-stone-500'
                      }`}>
                      <Icon size={14} />
                      <span>{id}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── More details toggle ── */}
            <button
              type="button"
              onClick={() => setShowMore(v => !v)}
              className="w-full flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-medium text-stone-500 hover:bg-stone-100 transition-colors"
            >
              <span>More details (Category, Date, Notes)</span>
              {showMore ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {/* ── More details panel — plain conditional, no animation ── */}
            {showMore && (
              <div className="space-y-3 pt-0.5">

                {/* Category */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
                      Category
                    </label>
                    <button type="button" onClick={() => setShowCatPanel(v => !v)}
                      className="text-[10px] text-amber-600 font-medium hover:text-amber-800 transition-colors">
                      {showCatPanel ? 'Done' : 'Manage'}
                    </button>
                  </div>

                  {showCatPanel ? (
                    /* Category management panel */
                    <div className="rounded-xl border border-stone-200 bg-stone-50 p-2.5 space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {localCats.map(cat => (
                          <div key={cat}
                            className={`inline-flex items-center gap-1 rounded-full border text-[11px] font-medium ${
                              form.category === cat
                                ? 'border-amber-400 bg-amber-100 text-amber-800'
                                : 'border-stone-200 bg-white text-stone-600'
                            }`}>
                            <button type="button" onClick={() => update('category', cat)}
                              className="pl-2.5 py-1 leading-none">{cat}</button>
                            <button type="button" onClick={() => removeCat(cat)}
                              className="pr-1.5 py-1 text-stone-400 hover:text-red-500 transition-colors">
                              <Trash2 size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-1.5">
                        <input
                          value={newCatInput}
                          onChange={e => setNewCatInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCat())}
                          placeholder="New category name"
                          className="flex-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-700 placeholder-stone-400 focus:border-amber-300 focus:outline-none"
                        />
                        <button type="button" onClick={addCat}
                          className="rounded-lg bg-amber-100 px-2.5 py-1.5 text-amber-700 hover:bg-amber-200 transition-colors">
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Category selector — chips, no dropdown that overflows */
                    <div className="flex flex-wrap gap-1.5">
                      {localCats.map(cat => (
                        <button key={cat} type="button" onClick={() => update('category', cat)}
                          className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                            form.category === cat
                              ? 'border-amber-400 bg-amber-100 text-amber-800'
                              : 'border-stone-200 bg-stone-50 text-stone-600 hover:border-amber-200 hover:bg-amber-50'
                          }`}>
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Date & Time */}
                <div>
                  <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1.5">
                    Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={form.timestamp}
                    onChange={e => update('timestamp', e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-800 focus:border-amber-300 focus:bg-white transition-colors"
                  />
                </div>

                {/* Entered By */}
                <div>
                  <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1.5">
                    Entered By
                  </label>
                  <input
                    value={form.enteredBy}
                    onChange={e => update('enteredBy', e.target.value)}
                    placeholder="Your name (optional)"
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:border-amber-300 focus:bg-white transition-colors"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1.5">
                    Notes
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={e => update('notes', e.target.value)}
                    placeholder="Any additional notes..."
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:border-amber-300 focus:bg-white transition-colors resize-none"
                    rows={2}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 px-4 pb-4 pt-2.5 border-t border-stone-100 bg-white flex gap-2">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-stone-200 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className={`flex-[2] rounded-xl py-2.5 text-sm font-semibold text-white transition-colors shadow-sm disabled:opacity-60 ${
                isIncome ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-500 hover:bg-red-600'
              }`}>
              {submitting ? 'Saving...' : initial ? 'Update' : isIncome ? 'Record Income' : 'Record Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
