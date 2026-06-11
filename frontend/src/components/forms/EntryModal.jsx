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
  const [localType,    setLocalType]    = useState('income')
  const [amount,       setAmount]       = useState('')
  const [description,  setDesc]         = useState('')
  const [category,     setCategory]     = useState('')
  const [mode,         setMode]         = useState('UPI')
  const [enteredBy,    setEnteredBy]    = useState('')
  const [notes,        setNotes]        = useState('')
  const [timestamp,    setTimestamp]    = useState('')
  const [isSavings,    setIsSavings]    = useState(false)

  const [localCats,    setLocalCats]    = useState([])
  const [submitting,   setSubmitting]   = useState(false)
  const [errors,       setErrors]       = useState({})
  const [showMore,     setShowMore]     = useState(false)
  const [showCatPanel, setShowCatPanel] = useState(false)
  const [newCatInput,  setNewCatInput]  = useState('')

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
      isOpenRef.current = true
      const cats = categories?.length ? categories : ['General']
      const saved = initial ? {} : loadLastEntryDefaults()
      setLocalCats(cats)
      setLocalType(initial ? initial.type : (type || 'income'))
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
      isOpenRef.current = false
    }
  }, [open, initial, categories, type])

  useEffect(() => {
    if (open && isOpenRef.current && categories?.length) {
      setLocalCats(categories)
    }
  }, [categories, open])

  if (!open) return null

  const symbol = currencyMap[localStorage.getItem('sl_currency') || 'INR'] || '₹'
  const currentType = localType

  // Dynamic colors based on Cash In (income) or Cash Out (expense)
  const isInc = currentType === 'income'
  const themeAccent = isInc
    ? {
        headerBg: isSavings ? 'bg-violet-600' : 'bg-emerald-600',
        text: 'text-emerald-600 dark:text-emerald-400',
        focusRing: 'focus:border-emerald-500',
        btn: isSavings ? 'bg-violet-600 hover:bg-violet-700' : 'bg-emerald-600 hover:bg-emerald-700',
        activePill: 'bg-emerald-50 text-emerald-800 border-emerald-500 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-500',
        activeTab: 'bg-emerald-600 text-white shadow-sm'
      }
    : {
        headerBg: 'bg-rose-500',
        text: 'text-rose-500 dark:text-rose-450',
        focusRing: 'focus:border-rose-550',
        btn: 'bg-rose-500 hover:bg-rose-600',
        activePill: 'bg-rose-50 text-rose-800 border-rose-500 dark:bg-rose-955/20 dark:text-rose-400 dark:border-rose-500',
        activeTab: 'bg-rose-500 text-white shadow-sm'
      }

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
        type: localType,
        isSavings: isInc ? isSavings : false,
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

  const applyDescriptionSuggestion = (descVal) => {
    setDesc(descVal)
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
        className="relative w-full sm:max-w-sm sm:rounded-3xl rounded-t-3xl bg-white shadow-2xl flex flex-col overflow-hidden dark:bg-stone-900 border border-amber-100/10"
        style={{ maxHeight: '92vh' }}
      >
        {/* Dynamic Header: switcher & amount preview */}
        <div className={`flex-shrink-0 px-5 pt-5 pb-5 ${themeAccent.headerBg} transition-colors duration-300`}>
          <div className="w-8 h-1 rounded-full bg-white/30 mx-auto mb-4 sm:hidden" />
          <div className="space-y-4">
            {/* Header Switcher Row */}
            <div className="flex items-center justify-between">
              <div className="flex bg-white/10 p-0.5 rounded-lg border border-white/10 text-[10px]">
                <button
                  type="button"
                  disabled={Boolean(initial)}
                  onClick={() => setLocalType('income')}
                  className={`px-3 py-1 font-bold rounded-md transition-all cursor-pointer disabled:opacity-50 ${
                    isInc ? 'bg-white text-emerald-800' : 'text-white/80 hover:text-white'
                  }`}
                >
                  Cash In
                </button>
                <button
                  type="button"
                  disabled={Boolean(initial)}
                  onClick={() => setLocalType('expense')}
                  className={`px-3 py-1 font-bold rounded-md transition-all cursor-pointer disabled:opacity-50 ${
                    !isInc ? 'bg-white text-rose-800' : 'text-white/80 hover:text-white'
                  }`}
                >
                  Cash Out
                </button>
              </div>
              <button
                type="button" onClick={onClose}
                className="rounded-xl p-2 bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Giant Calculator Amount input */}
            <div className="text-center py-2">
              <div className="inline-flex items-baseline justify-center gap-1.5 w-full">
                <span className="text-2xl font-light text-white/60 select-none">{symbol}</span>
                <input
                  ref={amountRef}
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={e => { setAmount(e.target.value); clearErr('amount') }}
                  placeholder="0.00"
                  className="bg-transparent text-4xl font-bold text-white placeholder-white/20 text-center outline-none w-full max-w-[240px] border-b border-transparent focus:border-white/20 transition-all font-sans"
                />
              </div>
              {errors.amount && (
                <p className="mt-1 text-[10px] text-white bg-black/20 px-2.5 py-0.5 rounded-full inline-block">
                  {errors.amount}
                </p>
              )}
            </div>
          </div>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="flex flex-col flex-1 overflow-hidden bg-white dark:bg-stone-900">
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            
            {/* Description */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                Description
              </label>
              <input
                value={description}
                onChange={e => { setDesc(e.target.value); clearErr('description') }}
                placeholder={isInc ? "e.g. Salary, Dividend, Gift..." : "e.g. Groceries, Rent, Coffee..."}
                className={`w-full rounded-xl border border-stone-150 bg-stone-50/50 px-3.5 py-2 text-xs text-stone-800 placeholder-stone-400 focus:bg-white dark:border-stone-800 dark:bg-stone-950 dark:text-stone-200 outline-none transition-all ${
                  errors.description ? 'border-red-300' : themeAccent.focusRing
                }`}
              />
              {errors.description && <p className="text-[10px] text-red-500">{errors.description}</p>}

              {/* suggestions list */}
              {!initial && descriptionSuggestions?.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto pb-1 mt-1 scrollbar-none">
                  {descriptionSuggestions.slice(0, 5).map((item) => (
                    <button
                      key={item.description}
                      type="button"
                      onClick={() => applyDescriptionSuggestion(item.description)}
                      className="text-[9px] bg-stone-50 text-stone-500 px-2 py-0.5 rounded-full border border-stone-150/60 hover:bg-stone-100 dark:bg-stone-955 dark:border-stone-850 dark:text-stone-400 whitespace-nowrap cursor-pointer transition-colors"
                    >
                      {item.description}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Category chips */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                  <Tag size={10} /> Category
                </label>
                <button
                  type="button" onClick={() => setShowCatPanel(v => !v)}
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                    showCatPanel ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-500'
                  }`}
                >
                  {showCatPanel ? 'Done' : 'Manage'}
                </button>
              </div>

              {/* Horizontal scroll selector */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {localCats.map(cat => (
                  <button
                    key={cat} type="button"
                    onClick={() => setCategory(cat)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold border transition-all whitespace-nowrap cursor-pointer ${
                      category === cat
                        ? themeAccent.activePill
                        : 'border-stone-150 bg-stone-50/20 text-stone-500 dark:border-stone-850 dark:bg-stone-950/20 dark:text-stone-400'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Category manager drawer */}
              {showCatPanel && (
                <div className="rounded-xl border border-stone-150/50 bg-stone-55/20 p-2.5 space-y-2 dark:border-stone-800 dark:bg-stone-950/10">
                  <div className="flex flex-wrap gap-1">
                    {localCats.map(cat => (
                      <div key={cat}
                        className={`inline-flex items-center rounded-full border text-[10px] font-medium overflow-hidden bg-white dark:bg-stone-900 border-stone-150 dark:border-stone-800 ${
                          category === cat ? 'text-amber-700 border-amber-300 bg-amber-50/10' : 'text-stone-600 dark:text-stone-400'
                        }`}
                      >
                        <span className="pl-2 py-0.5">{cat}</span>
                        <button
                          type="button" onClick={() => removeCat(cat)}
                          className="px-1.5 py-0.5 text-stone-300 hover:text-red-400 transition-colors cursor-pointer"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      value={newCatInput}
                      onChange={e => setNewCatInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCat())}
                      placeholder="Add Category..."
                      className="flex-1 rounded-lg border border-stone-150 bg-white px-2 py-1 text-[11px] text-stone-700 dark:border-stone-850 dark:bg-stone-950 dark:text-stone-350 outline-none"
                    />
                    <button
                      type="button" onClick={addCat}
                      disabled={!newCatInput.trim()}
                      className="rounded-lg bg-stone-800 text-white px-2.5 py-1 text-[11px] font-bold disabled:opacity-40 cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Date & Time */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                <Calendar size={10} /> Date & Time
              </label>
              <input
                type="datetime-local"
                value={timestamp}
                onChange={e => setTimestamp(e.target.value)}
                className={`w-full rounded-xl border border-stone-150 bg-stone-50/50 px-3 py-2 text-xs text-stone-700 dark:border-stone-800 dark:bg-stone-955 dark:text-stone-300 outline-none transition-all ${themeAccent.focusRing}`}
              />
            </div>

            {/* Payment Mode */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                Payment Mode
              </label>
              <div className="flex bg-stone-50 p-0.5 rounded-xl border border-stone-150/40 dark:bg-stone-955 dark:border-stone-850 w-full">
                {MODES.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMode(id)}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      mode === id
                        ? themeAccent.activeTab
                        : 'text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* More Details accordion */}
            <button
              type="button" onClick={() => setShowMore(v => !v)}
              className="w-full flex items-center justify-between rounded-xl border border-dashed border-stone-200 px-3 py-2 text-[10px] font-bold text-stone-450 hover:text-stone-600 transition-colors"
            >
              <span>{isInc ? 'More options & Savings' : 'More options'}</span>
              {showMore ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>

            {showMore && (
              <div className="space-y-3 pt-1">
                {/* Savings toggle */}
                {isInc && (
                  <button
                    type="button"
                    onClick={() => setIsSavings(v => !v)}
                    className={`w-full flex items-center justify-between rounded-xl border px-3 py-2 transition-all ${
                      isSavings
                        ? 'border-violet-300 bg-violet-50/40 dark:border-violet-950 dark:bg-violet-955/20'
                        : 'border-stone-150 bg-stone-50/20'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <PiggyBank size={13} className={isSavings ? 'text-violet-600' : 'text-stone-400'} />
                      <div className="text-left text-[11px]">
                        <p className={`font-semibold ${isSavings ? 'text-violet-700' : 'text-stone-605'}`}>
                          Mark as Savings
                        </p>
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                      isSavings ? 'border-violet-500 bg-violet-500' : 'border-stone-300 bg-white'
                    }`}>
                      {isSavings && <Check size={9} className="text-white" strokeWidth={3} />}
                    </div>
                  </button>
                )}

                <div className="space-y-1.5">
                  <label className="flex items-center gap-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                    <User size={10} /> Entered By
                  </label>
                  <input
                    value={enteredBy}
                    onChange={e => setEnteredBy(e.target.value)}
                    placeholder="Your name (optional)"
                    className={`w-full rounded-xl border border-stone-150 bg-stone-50/50 px-3 py-2 text-xs text-stone-800 dark:border-stone-800 dark:bg-stone-955 dark:text-stone-200 outline-none transition-all ${themeAccent.focusRing}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                    <FileText size={10} /> Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Optional notes..."
                    className={`w-full rounded-xl border border-stone-150 bg-stone-50/50 px-3 py-2 text-xs text-stone-805 dark:border-stone-800 dark:bg-stone-955 dark:text-stone-200 outline-none transition-all resize-none ${themeAccent.focusRing}`}
                    rows={2}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer buttons */}
          <div className="flex-shrink-0 px-5 pb-5 pt-2 bg-white dark:bg-stone-900 border-t border-stone-50/40 dark:border-stone-800 flex gap-2">
            <button
              type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-stone-200 py-2.5 text-xs font-bold text-stone-500 hover:bg-stone-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={submitting}
              className={`flex-[2] rounded-xl py-2.5 text-xs font-bold text-white transition-all shadow-sm disabled:opacity-50 cursor-pointer ${themeAccent.btn}`}
            >
              {submitting
                ? 'Saving...'
                : initial
                  ? 'Update'
                  : isSavings
                    ? '🐷 Save Savings'
                    : isInc ? '+ Record Cash In' : '− Record Cash Out'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
