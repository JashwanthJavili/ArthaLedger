import { useState, useEffect, useRef } from 'react'
import {
  X, TrendingUp, TrendingDown, ChevronDown, ChevronUp,
  Wallet, Smartphone, Plus, Trash2, Tag, Calendar, User, FileText,
  PiggyBank, Check
} from 'lucide-react'

const MODES = [
  { id: 'Cash', label: 'Cash', icon: Wallet },
  { id: 'UPI',  label: 'UPI',  icon: Smartphone },
]

const currencyMap = { INR: '₹', USD: '$', EUR: '€', GBP: '£', JPY: '¥', AED: 'د.إ', SGD: 'S$' }
const LAST_ENTRY_KEY = 'al_last_entry_defaults'

function localDatetimeValue(date = new Date()) {
  const pad = n => String(n).padStart(2, '0')
  return (
    date.getFullYear() + '-' +
    pad(date.getMonth() + 1) + '-' +
    pad(date.getDate()) + 'T' +
    pad(date.getHours()) + ':' +
    pad(date.getMinutes())
  )
}

export default function EntryModal({ open, type, onClose, onSubmit, categories, descriptionSuggestions = [], initial, onSaveCategories }) {
  const [amount,      setAmount]      = useState('')
  const [description, setDesc]        = useState('')
  const [category,    setCategory]    = useState('')
  const [mode,        setMode]        = useState('UPI')
  const [enteredBy,   setEnteredBy]   = useState('')
  const [notes,       setNotes]       = useState('')
  const [timestamp,   setTimestamp]   = useState('')
  const [isSavings,   setIsSavings]   = useState(false)

  const [localCats,    setLocalCats]    = useState([])
  const [submitting,   setSubmitting]   = useState(false)
  const [errors,       setErrors]       = useState({})
  const [showMore,     setShowMore]     = useState(false)
  const [showCatPanel, setShowCatPanel] = useState(false)
  const [newCatInput,  setNewCatInput]  = useState('')

  // Track whether the form is already open so that when the parent updates
  // the `categories` prop (after onSaveCategories), we do NOT reset the form.
  const isOpenRef   = useRef(false)
  const amountRef   = useRef(null)
  const formRef     = useRef(null)

  const loadLastEntryDefaults = () => {
    try {
      return JSON.parse(localStorage.getItem(LAST_ENTRY_KEY) || '{}') || {}
    } catch {
      return {}
    }
  }

  useEffect(() => {
    if (open && !isOpenRef.current) {
      // First open — initialise everything
      isOpenRef.current = true
      const cats = categories?.length ? categories : ['General']
      const saved = initial ? {} : loadLastEntryDefaults()
      setLocalCats(cats)
      setAmount(initial?.amount != null ? String(initial.amount) : '')
      setDesc(initial?.description || '')
      setCategory(initial?.category || saved.category || cats[0] || 'General')
      setMode(initial?.mode || saved.mode || 'UPI')
      setEnteredBy(initial?.enteredBy || saved.enteredBy || '')
      setNotes(initial?.notes || '')
      setIsSavings(Boolean(initial?.isSavings ?? saved.isSavings))
      setTimestamp(
        initial
          ? localDatetimeValue(new Date(initial.timestamp))
          : localDatetimeValue()
      )
      setErrors({})
      setShowMore(Boolean(initial?.notes || initial?.enteredBy || initial?.isSavings))
      setShowCatPanel(false)
      setNewCatInput('')
      setTimeout(() => amountRef.current?.focus(), 80)
    }

    if (!open) {
      // Reset the guard when modal closes
      isOpenRef.current = false
    }
  }, [open, initial, categories])

  // When categories prop updates while modal is open (after saving a new cat),
  // only sync the list — never touch amount/description/etc.
  useEffect(() => {
    if (open && isOpenRef.current && categories?.length) {
      setLocalCats(categories)
    }
  }, [categories]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null

  const symbol   = currencyMap[localStorage.getItem('sl_currency') || 'INR'] || '₹'
  const isIncome = type === 'income'

  const accent = isIncome
    ? { ring: 'focus:border-emerald-400', chip: 'border-emerald-400 bg-emerald-50 text-emerald-800', btn: 'bg-emerald-600 hover:bg-emerald-700', modeActive: 'border-emerald-400 bg-emerald-50 text-emerald-800' }
    : { ring: 'focus:border-rose-400',    chip: 'border-rose-400 bg-rose-50 text-rose-800',          btn: 'bg-rose-500 hover:bg-rose-600',       modeActive: 'border-rose-400 bg-rose-50 text-rose-800' }

  const clearErr = key => setErrors(e => ({ ...e, [key]: '' }))

  const validate = () => {
    const e = {}
    if (!amount || Number(amount) <= 0) e.amount = 'Enter amount'
    if (!description.trim()) e.description = 'Enter description'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      await onSubmit({
        amount: Number(amount),
        description,
        category,
        mode,
        enteredBy,
        notes,
        type,
        isSavings,
        timestamp: new Date(timestamp).getTime(),
        _localCategories: localCats,
      })
      if (!initial) {
        localStorage.setItem(LAST_ENTRY_KEY, JSON.stringify({ category, mode, enteredBy, isSavings }))
      }
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  const applyDescriptionSuggestion = (description) => {
    setDesc(description)
    setErrors({})
    setTimeout(() => amountRef.current?.focus(), 0)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
      return
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      formRef.current?.requestSubmit()
    }
  }

  // addCat: only touches localCats + category — amount/description untouched
  const addCat = () => {
    const t = newCatInput.trim()
    if (!t || localCats.includes(t)) return
    const updated = [...localCats, t]
    setLocalCats(updated)
    setCategory(t)
    setNewCatInput('')
    onSaveCategories?.(updated)
    setShowCatPanel(false)
  }

  const removeCat = (cat) => {
    const updated = localCats.filter(c => c !== cat)
    setLocalCats(updated)
    if (category === cat) setCategory(updated[0] || '')
    onSaveCategories?.(updated)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative w-full sm:max-w-sm sm:rounded-3xl rounded-t-3xl bg-white shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '92vh' }}
      >
        {/* Coloured header — live amount preview */}
        <div className={`flex-shrink-0 px-5 pt-5 pb-4 ${isSavings ? 'bg-violet-600' : isIncome ? 'bg-emerald-600' : 'bg-rose-500'}`}>
          <div className="w-8 h-1 rounded-full bg-white/30 mx-auto mb-4 sm:hidden" />
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60">
                  {initial ? 'Edit Entry' : isIncome ? 'Money In' : 'Money Out'}
                </p>
                {isSavings && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider">
                    <PiggyBank size={9} /> Savings
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-light text-white/70">{symbol}</span>
                <span className={`text-4xl font-bold tracking-tight ${amount ? 'text-white' : 'text-white/30'}`}>
                  {amount || '0.00'}
                </span>
              </div>
            </div>
            <button
              type="button" onClick={onClose}
              className="rounded-xl p-2 bg-white/15 hover:bg-white/25 text-white transition-colors mt-0.5"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="flex flex-col flex-1 overflow-hidden bg-white">
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

            {/* Amount */}
            <div>
              <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1.5">
                Amount
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-base select-none">
                  {symbol}
                </span>
                <input
                  ref={amountRef}
                  type="number" inputMode="decimal" min="0.01" step="0.01"
                  value={amount}
                  onChange={e => { setAmount(e.target.value); clearErr('amount') }}
                  placeholder="0.00"
                  className={`w-full rounded-2xl border bg-stone-50 pl-9 pr-4 py-3 text-2xl font-bold text-stone-800 placeholder-stone-300 focus:bg-white outline-none transition-colors ${
                    errors.amount ? 'border-red-300' : `border-stone-200 ${accent.ring}`
                  }`}
                />
              </div>
              {errors.amount && <p className="mt-1 text-[11px] text-red-500">{errors.amount}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1.5">
                Description
              </label>
              <input
                value={description}
                onChange={e => { setDesc(e.target.value); clearErr('description') }}
                placeholder="e.g. Groceries, Salary, Rent…"
                className={`w-full rounded-2xl border bg-stone-50 px-4 py-2.5 text-sm text-stone-800 placeholder-stone-400 focus:bg-white outline-none transition-colors ${
                  errors.description ? 'border-red-300' : `border-stone-200 ${accent.ring}`
                }`}
              />
              {errors.description && <p className="mt-1 text-[11px] text-red-500">{errors.description}</p>}

              {!initial && descriptionSuggestions?.length > 0 && (
                <div className="space-y-1 mt-2.5">
                  <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Frequent Descriptions</span>
                  <div className="flex gap-1.5 overflow-x-auto pb-1.5 snap-x snap-mandatory">
                    {descriptionSuggestions.slice(0, 6).map((item) => (
                      <button
                        key={item.description}
                        type="button"
                        onClick={() => applyDescriptionSuggestion(item.description)}
                        className="snap-start rounded-full border border-amber-100/70 bg-amber-50/20 px-3 py-1 text-xs text-stone-650 font-medium hover:border-amber-250 hover:bg-amber-50/45 transition-all flex-shrink-0 cursor-pointer whitespace-nowrap dark:border-amber-955/40 dark:bg-amber-950/10 dark:text-stone-300"
                      >
                        {item.description}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Category */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-1.5 text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
                  <Tag size={10} /> Category
                </label>
                <button
                  type="button" onClick={() => setShowCatPanel(v => !v)}
                  className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg transition-colors ${
                    showCatPanel
                      ? 'bg-stone-800 text-white'
                      : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                  }`}
                >
                  {showCatPanel ? (
                    <><Check size={9} strokeWidth={3} /> Done</>
                  ) : (
                    <><Plus size={9} strokeWidth={3} /> Manage</>
                  )}
                </button>
              </div>

              {/* Category chips — always visible */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {localCats.map(cat => (
                  <button
                    key={cat} type="button"
                    onClick={() => setCategory(cat)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                      category === cat
                        ? accent.chip
                        : 'border-stone-200 bg-stone-50 text-stone-500 hover:border-stone-300 hover:bg-stone-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Manage panel — slides in below chips, no form reset */}
              {showCatPanel && (
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3 space-y-2.5">
                  <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
                    Add or remove categories
                  </p>
                  {/* Existing cats with delete */}
                  <div className="flex flex-wrap gap-1.5">
                    {localCats.map(cat => (
                      <div key={cat}
                        className={`inline-flex items-center rounded-full border text-[11px] font-medium overflow-hidden ${
                          category === cat ? accent.chip : 'border-stone-200 bg-white text-stone-600'
                        }`}
                      >
                        <span className="pl-3 pr-1.5 py-1">{cat}</span>
                        <button
                          type="button" onClick={() => removeCat(cat)}
                          className="pr-2 py-1 text-stone-300 hover:text-red-400 transition-colors"
                          title={`Remove ${cat}`}
                        >
                          <Trash2 size={9} />
                        </button>
                      </div>
                    ))}
                  </div>
                  {/* Add new */}
                  <div className="flex gap-2">
                    <input
                      value={newCatInput}
                      onChange={e => setNewCatInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCat())}
                      placeholder="New category name…"
                      className="flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-700 placeholder-stone-400 focus:border-stone-400 outline-none"
                    />
                    <button
                      type="button" onClick={addCat}
                      disabled={!newCatInput.trim()}
                      className="rounded-xl bg-stone-800 px-3 py-2 text-white hover:bg-stone-700 disabled:opacity-40 transition-colors"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Date & Time */}
            <div>
              <label className="flex items-center gap-1.5 text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1.5">
                <Calendar size={10} /> Date & Time
              </label>
              <input
                type="datetime-local"
                value={timestamp}
                onChange={e => setTimestamp(e.target.value)}
                className={`w-full rounded-2xl border bg-stone-50 px-4 py-2.5 text-sm text-stone-800 focus:bg-white outline-none transition-colors border-stone-200 ${accent.ring}`}
              />
            </div>

            {/* Payment Mode */}
            <div>
              <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1.5">
                Payment Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                {MODES.map(({ id, label, icon: Icon }) => {
                  const active = mode === id
                  return (
                    <button key={id} type="button" onClick={() => setMode(id)}
                      className={`flex items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-semibold transition-all ${
                        active ? accent.modeActive : 'border-stone-200 bg-stone-50 text-stone-400 hover:bg-stone-100'
                      }`}
                    >
                      <Icon size={16} strokeWidth={active ? 2.5 : 1.8} />
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* More details */}
            <button
              type="button" onClick={() => setShowMore(v => !v)}
              className="w-full flex items-center justify-between rounded-2xl border border-dashed border-stone-200 px-4 py-2.5 text-xs font-medium text-stone-400 hover:border-stone-300 hover:text-stone-500 transition-colors"
            >
              <span>{isIncome ? 'More details & Savings' : 'More details'}</span>
              {showMore ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {showMore && (
              <div className="space-y-4 pt-0.5">
                {/* Savings toggle — inside More details, only for income */}
                {isIncome && (
                  <button
                    type="button"
                    onClick={() => setIsSavings(v => !v)}
                    className={`w-full flex items-center justify-between rounded-2xl border px-4 py-3 transition-all ${
                      isSavings
                        ? 'border-violet-300 bg-violet-50'
                        : 'border-stone-200 bg-stone-50 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`rounded-xl p-1.5 ${isSavings ? 'bg-violet-100' : 'bg-stone-100'}`}>
                        <PiggyBank size={14} className={isSavings ? 'text-violet-600' : 'text-stone-400'} />
                      </div>
                      <div className="text-left">
                        <p className={`text-xs font-semibold ${isSavings ? 'text-violet-700' : 'text-stone-600'}`}>
                          Mark as Savings
                        </p>
                        <p className="text-[10px] text-stone-400 mt-0.5">
                          Excluded from spending analytics
                        </p>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSavings ? 'border-violet-500 bg-violet-500' : 'border-stone-300 bg-white'
                    }`}>
                      {isSavings && <Check size={11} className="text-white" strokeWidth={3} />}
                    </div>
                  </button>
                )}

                <div>
                  <label className="flex items-center gap-1.5 text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1.5">
                    <User size={10} /> Entered By
                  </label>
                  <input
                    value={enteredBy}
                    onChange={e => setEnteredBy(e.target.value)}
                    placeholder="Your name (optional)"
                    className={`w-full rounded-2xl border bg-stone-50 px-4 py-2.5 text-sm text-stone-800 placeholder-stone-400 focus:bg-white outline-none transition-colors border-stone-200 ${accent.ring}`}
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1.5">
                    <FileText size={10} /> Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Any additional notes…"
                    className={`w-full rounded-2xl border bg-stone-50 px-4 py-2.5 text-sm text-stone-800 placeholder-stone-400 focus:bg-white outline-none transition-colors resize-none border-stone-200 ${accent.ring}`}
                    rows={2}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 px-5 pb-5 pt-3 bg-white flex gap-2.5">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-2xl border border-stone-200 py-3 text-sm font-semibold text-stone-500 hover:bg-stone-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className={`flex-[2] rounded-2xl py-3 text-sm font-bold text-white transition-colors shadow-md disabled:opacity-50 ${
                isSavings ? 'bg-violet-600 hover:bg-violet-700' : accent.btn
              }`}>
              {submitting
                ? 'Saving…'
                : initial
                  ? 'Update Entry'
                  : isSavings
                    ? '🐷 Save to Savings'
                    : isIncome ? '+ Record Income' : '− Record Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
