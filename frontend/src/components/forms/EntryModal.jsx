import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, TrendingUp, TrendingDown, ChevronDown, ChevronUp,
  Wallet, Smartphone, Plus, Trash2, Tag, Calendar, User, FileText,
  PiggyBank, Check, Compass, Repeat, Zap, AlertTriangle, ShieldAlert, Layers,
} from 'lucide-react'
import CategoryManager from './CategoryManager'
import { triggerBudgetAlertNotification } from '../../lib/notifications'

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

export default function EntryModal({
  open, type, onClose, onSubmit, categories, descriptionSuggestions = [], initial,
  onSaveCategories, trips = [], projectId, bookId,
  templates = [], onSaveTemplate, onDeleteTemplate,
  budgets = {}, spentByCategory = {},
}) {
  const [amount,      setAmount]      = useState('')
  const [description, setDesc]        = useState('')
  const [category,    setCategory]    = useState('')
  const [mode,        setMode]        = useState('UPI')
  const [enteredBy,   setEnteredBy]   = useState('')
  const [notes,       setNotes]       = useState('')
  const [timestamp,   setTimestamp]   = useState('')
  const [isSavings,   setIsSavings]   = useState(false)
  const [tripId,      setTripId]      = useState('')
  const [subcategory, setSubcategory] = useState('')

  const [localCats,    setLocalCats]    = useState([])
  const [submitting,   setSubmitting]   = useState(false)
  const [errors,       setErrors]       = useState({})
  const [showMore,     setShowMore]     = useState(false)
  const [showCatPanel, setShowCatPanel] = useState(false)
  const [newCatInput,  setNewCatInput]  = useState('')
  const [saveAsTemplate,   setSaveAsTemplate]   = useState(false)
  const [templateLabel,   setTemplateLabel]     = useState('')
  const [manageTemplates, setManageTemplates]   = useState(false)
  const [quickAdding,      setQuickAdding]       = useState(null)

  const isOpenRef   = useRef(false)
  const amountRef   = useRef(null)
  const descRef     = useRef(null)
  const formRef     = useRef(null)
  const [validationAlert, setValidationAlert] = useState(null)
  const [catSavedToast, setCatSavedToast] = useState(false)

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
      setValidationAlert(null)
      const cats = categories?.length ? categories : ['General']
      const saved = initial ? {} : loadLastEntryDefaults()
      setLocalCats(cats)
      setAmount(initial?.amount != null ? String(initial.amount) : '')
      setDesc(initial?.description || '')
      setCategory(initial?.category || saved.category || (typeof cats[0] === 'string' ? cats[0] : cats[0]?.name) || 'General')
      setSubcategory(initial?.subcategory || '')
      setMode(initial?.mode || saved.mode || 'UPI')
      setEnteredBy(initial?.enteredBy || saved.enteredBy || '')
      setNotes(initial?.notes || '')
      setIsSavings(Boolean(initial?.isSavings ?? saved.isSavings))
      setTimestamp(
        initial?.timestamp
          ? localDatetimeValue(new Date(initial.timestamp))
          : localDatetimeValue()
      )
      let initialTripId = ''
      if (initial && trips) {
        const found = trips.find(t => t.entries && t.entries[`${projectId}_${bookId}_${initial.id}`])
        if (found) initialTripId = found.id
      }
      setTripId(initialTripId)
      setErrors({})
      setShowMore(Boolean(initial?.notes || initial?.enteredBy || initial?.isSavings || initialTripId))
      setShowCatPanel(false)
      setNewCatInput('')
      setSaveAsTemplate(false)
      setTemplateLabel('')
      setManageTemplates(false)
      setQuickAdding(null)
      setTimeout(() => amountRef.current?.focus(), 80)
    }

    if (!open) {
      isOpenRef.current = false
      setValidationAlert(null)
    }
  }, [open, initial, categories, trips, projectId, bookId])

  useEffect(() => {
    if (open && isOpenRef.current && categories?.length) {
      setLocalCats(categories)
    }
  }, [categories])

  const catList = useMemo(() => {
    return (localCats || []).map((c) => {
      if (typeof c === 'string') return { name: c, subcategories: [] }
      return {
        name: String(c.name || '').trim(),
        subcategories: Array.isArray(c.subcategories) ? c.subcategories : [],
      }
    }).filter((c) => c.name)
  }, [localCats])

  const selectedCatObj = useMemo(() => {
    return catList.find((c) => c.name === category)
  }, [catList, category])

  const availableSubcats = selectedCatObj?.subcategories || []

  if (!open) return null

  const symbol   = currencyMap[localStorage.getItem('sl_currency') || 'INR'] || '₹'
  const isIncome = type === 'income'
  const matchingTemplates = templates.filter(t => t.type === type)

  const budgetHint = (() => {
    if (isIncome || !category) return null
    const cfg = budgets[category]
    if (!cfg || !cfg.soft) return null

    const spent = Number(spentByCategory[category] || 0)
    const soft = Number(cfg.soft)
    const hard = Number(cfg.hard || 0)
    const warnAt = Number(cfg.warnAt ?? 80)
    const currentAmount = Number(amount || 0)

    const remainingBefore = soft - spent
    const totalAfterEntry = spent + currentAmount
    const remainingAfter = soft - totalAfterEntry

    const pctBefore = soft > 0 ? (spent / soft) * 100 : 0
    const pctAfter = soft > 0 ? (totalAfterEntry / soft) * 100 : 0

    const overHard = hard > 0 && totalAfterEntry > hard
    const overSoft = totalAfterEntry > soft
    const isWarn = pctAfter >= warnAt && !overSoft

    let barColor, bgClass, borderClass, textClass, icon, title, message

    if (overHard) {
      barColor = '#ef4444'
      bgClass = 'bg-red-50'
      borderClass = 'border-red-300'
      textClass = 'text-red-700'
      icon = <ShieldAlert size={14} className="text-red-500 flex-shrink-0" />
      title = 'Hard limit hit!'
      message = currentAmount > 0
        ? `This entry brings total spent to ${symbol}${totalAfterEntry.toLocaleString('en-IN')}, exceeding hard limit of ${symbol}${hard.toLocaleString('en-IN')} by ${symbol}${Math.abs(totalAfterEntry - hard).toLocaleString('en-IN')}!`
        : `Already at hard limit! ${symbol}${Math.abs(spent - hard).toLocaleString('en-IN')} over limit`
    } else if (overSoft) {
      barColor = '#f97316'
      bgClass = 'bg-orange-50'
      borderClass = 'border-orange-300'
      textClass = 'text-orange-700'
      icon = <AlertTriangle size={14} className="text-orange-500 flex-shrink-0" />
      title = 'Over budget!'
      message = currentAmount > 0
        ? `Remaining before: ${symbol}${remainingBefore.toLocaleString('en-IN')}. This entry will exceed budget by ${symbol}${Math.abs(remainingAfter).toLocaleString('en-IN')}`
        : `Already over budget by ${symbol}${Math.abs(remainingBefore).toLocaleString('en-IN')}`
    } else if (isWarn) {
      barColor = '#f59e0b'
      bgClass = 'bg-amber-50'
      borderClass = 'border-amber-200'
      textClass = 'text-amber-700'
      icon = <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />
      title = `Near limit (${Math.round(pctAfter)}% used)`
      message = currentAmount > 0
        ? `${symbol}${remainingBefore.toLocaleString('en-IN')} remaining (${symbol}${remainingAfter.toLocaleString('en-IN')} left after entry)`
        : `${symbol}${remainingBefore.toLocaleString('en-IN')} remaining this month (${Math.round(pctBefore)}% used)`
    } else {
      barColor = '#22c55e'
      bgClass = 'bg-emerald-50'
      borderClass = 'border-emerald-200'
      textClass = 'text-emerald-700'
      icon = <Check size={14} className="text-emerald-600 flex-shrink-0" />
      title = `${symbol}${remainingBefore.toLocaleString('en-IN')} remaining this month`
      message = currentAmount > 0
        ? `Budget: ${symbol}${soft.toLocaleString('en-IN')} · Spent: ${symbol}${spent.toLocaleString('en-IN')} · After entry: ${symbol}${remainingAfter.toLocaleString('en-IN')} left`
        : `Budget: ${symbol}${soft.toLocaleString('en-IN')} · Already spent: ${symbol}${spent.toLocaleString('en-IN')}`
    }

    return {
      spent,
      soft,
      hard,
      remainingBefore,
      remainingAfter,
      pctBefore,
      pctAfter,
      overHard,
      overSoft,
      isWarn,
      barColor,
      bgClass,
      borderClass,
      textClass,
      icon,
      title,
      message,
    }
  })()

  const accent = isIncome
    ? { ring: 'focus:border-emerald-400', chip: 'border-emerald-400 bg-emerald-50 text-emerald-800', btn: 'bg-emerald-600 hover:bg-emerald-700', modeActive: 'border-emerald-400 bg-emerald-50 text-emerald-800' }
    : { ring: 'focus:border-rose-400',    chip: 'border-rose-400 bg-rose-50 text-rose-800',          btn: 'bg-rose-500 hover:bg-rose-600',       modeActive: 'border-rose-400 bg-rose-50 text-rose-800' }

  const clearErr = key => {
    setErrors(e => ({ ...e, [key]: '' }))
    setValidationAlert(null)
  }

  const validate = () => {
    const e = {}
    const missing = []

    if (!amount || Number(amount) <= 0) {
      e.amount = 'Enter valid amount'
      missing.push('Amount')
    }
    if (!description.trim()) {
      e.description = 'Enter description'
      missing.push('Description')
    }
    setErrors(e)

    if (missing.length > 0) {
      const msg = `Please fill in the required ${missing.length > 1 ? 'fields' : 'field'}: ${missing.join(' & ')}.`
      setValidationAlert(msg)

      if (e.amount) {
        amountRef.current?.focus()
        amountRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } else if (e.description) {
        descRef.current?.focus()
        descRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return false
    }

    setValidationAlert(null)
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (showCatPanel) return
    if (!validate()) return
    setSubmitting(true)
    try {
      await onSubmit({
        amount: Number(amount),
        description,
        category,
        subcategory,
        mode,
        enteredBy,
        notes,
        type,
        isSavings,
        timestamp: new Date(timestamp).getTime(),
        _localCategories: localCats,
        tripId,
      })
      if (!initial) {
        localStorage.setItem(LAST_ENTRY_KEY, JSON.stringify({ category, mode, enteredBy, isSavings }))
        if (saveAsTemplate && onSaveTemplate) {
          await onSaveTemplate({
            label: templateLabel.trim() || description,
            amount: Number(amount),
            description,
            category,
            subcategory,
            mode,
            type,
            isSavings,
          })
        }
      }
      if (!isIncome && budgetHint && budgetHint.pctAfter >= 80) {
        triggerBudgetAlertNotification({
          category,
          pct: budgetHint.pctAfter,
          spent: budgetHint.totalAfter,
          soft: budgetHint.softLimit,
          symbol,
        })
      }
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  const useTemplate = async (tpl) => {
    if (quickAdding) return
    setQuickAdding(tpl.id)
    try {
      await onSubmit({
        amount: Number(tpl.amount),
        description: tpl.description,
        category: tpl.category || category,
        subcategory: tpl.subcategory || '',
        mode: tpl.mode || mode,
        enteredBy,
        notes,
        type,
        isSavings: Boolean(tpl.isSavings),
        timestamp: Date.now(),
        _localCategories: localCats,
        tripId: '',
      })
      onClose()
    } finally {
      setQuickAdding(null)
    }
  }

  const applyDescriptionSuggestion = (description) => {
    setDesc(description)
    setErrors({})
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      if (showCatPanel) {
        setShowCatPanel(false)
        return
      }
      onClose()
      return
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      if (!showCatPanel) {
        formRef.current?.requestSubmit()
      }
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

            {/* Validation Popup Alert */}
            <AnimatePresence>
              {validationAlert && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  className="rounded-2xl border border-red-200 bg-red-50 p-3.5 flex items-start gap-3 shadow-sm"
                >
                  <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-red-800">Please complete required fields</p>
                    <p className="text-xs text-red-600 mt-0.5 font-medium leading-relaxed">{validationAlert}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setValidationAlert(null)}
                    className="p-1 text-red-400 hover:text-red-600 rounded-lg transition-colors"
                  >
                    <X size={14} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick Add strip — one-tap recurring templates (new entries only) */}
            {!initial && matchingTemplates.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="flex items-center gap-1.5 text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
                    <Zap size={10} /> Quick Add
                  </label>
                  <button
                    type="button" onClick={() => setManageTemplates(v => !v)}
                    className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg transition-colors ${
                      manageTemplates ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                    }`}
                  >
                    {manageTemplates ? (<><Check size={9} strokeWidth={3} /> Done</>) : 'Manage'}
                  </button>
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-1.5 snap-x snap-mandatory">
                  {matchingTemplates.map(tpl => (
                    <div
                      key={tpl.id}
                      className={`snap-start inline-flex items-center rounded-2xl border text-xs font-medium flex-shrink-0 overflow-hidden ${accent.chip}`}
                    >
                      <button
                        type="button"
                        disabled={submitting || Boolean(quickAdding)}
                        onClick={() => useTemplate(tpl)}
                        className="pl-3 pr-2 py-2 text-left disabled:opacity-50"
                      >
                        <span className="block leading-tight">{tpl.label || tpl.description}</span>
                        <span className="block text-[10px] opacity-70 leading-tight">
                          {symbol}{Number(tpl.amount).toFixed(2)}{tpl.subcategory ? ` · ${tpl.subcategory}` : ''}
                        </span>
                      </button>
                      {manageTemplates && (
                        <button
                          type="button"
                          onClick={() => onDeleteTemplate?.(tpl.id)}
                          className="pr-2.5 pl-1 py-2 text-stone-400 hover:text-red-500 transition-colors self-stretch"
                          title={`Remove ${tpl.label || tpl.description}`}
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                ref={descRef}
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
                  <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Suggestions</span>
                  <div className="flex gap-1.5 overflow-x-auto pb-1.5 snap-x snap-mandatory">
                    {descriptionSuggestions.slice(0, 6).map((item) => (
                      <button
                        key={item.description}
                        type="button"
                        onClick={() => applyDescriptionSuggestion(item.description)}
                        className="snap-start rounded-full border border-amber-100 bg-amber-50/20 px-3 py-1 text-xs text-stone-600 font-medium hover:border-amber-200 hover:bg-amber-50/40 transition-all flex-shrink-0 cursor-pointer whitespace-nowrap dark:border-amber-900/40 dark:bg-amber-950/15 dark:text-stone-300"
                      >
                        {item.description}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Category & Subcategory */}
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

              {/* Category Saved Popup Toast */}
              <AnimatePresence>
                {catSavedToast && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.96 }}
                    className="mb-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white flex items-center justify-between shadow-sm"
                  >
                    <span className="flex items-center gap-1.5">
                      <Check size={14} /> Categories & subcategories saved!
                    </span>
                    <button type="button" onClick={() => setCatSavedToast(false)} className="text-white/80 hover:text-white">
                      <X size={12} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Category chips — always visible */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {catList.map(cat => (
                  <button
                    key={cat.name} type="button"
                    onClick={() => {
                      setCategory(cat.name)
                      setSubcategory('')
                    }}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                      category === cat.name
                        ? accent.chip
                        : 'border-stone-200 bg-stone-50 text-stone-500 hover:border-stone-300 hover:bg-stone-100'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Subcategory chips (if available for selected main category) */}
              {availableSubcats.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-stone-100 space-y-1.5">
                  <label className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-700 uppercase tracking-wider">
                    <Layers size={10} /> Subcategory
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSubcategory('')}
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                        !subcategory
                          ? 'border-amber-400 bg-amber-50 text-amber-800 font-bold'
                          : 'border-stone-200 bg-stone-50 text-stone-500 hover:bg-stone-100'
                      }`}
                    >
                      None
                    </button>
                    {availableSubcats.map(sub => (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => setSubcategory(sub)}
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                          subcategory === sub
                            ? 'border-amber-500 bg-amber-100 text-amber-900 font-bold shadow-2xs'
                            : 'border-amber-200/80 bg-amber-50/30 text-stone-600 hover:bg-amber-50'
                        }`}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Budget threshold hint card ── */}
              <AnimatePresence>
                {!isIncome && budgetHint && (
                  <motion.div
                    key={category}
                    initial={{ opacity: 0, y: -4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.18 }}
                    className={`mt-2.5 rounded-2xl border p-3 space-y-2 ${budgetHint.bgClass} ${budgetHint.borderClass}`}
                  >
                    {/* Title & Icon row */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {budgetHint.icon}
                        <span className={`text-xs font-bold ${budgetHint.textClass} truncate`}>
                          {budgetHint.title}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/70 border border-current ${budgetHint.textClass}`}>
                        {Math.round(Math.min(budgetHint.pctAfter, 100))}% used
                      </span>
                    </div>

                    {/* Threshold progress bar */}
                    <div className="h-2 rounded-full bg-black/10 overflow-hidden relative">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(budgetHint.pctAfter, 100)}%` }}
                        transition={{ duration: 0.45, ease: 'easeOut' }}
                        className={`h-full rounded-full ${budgetHint.overHard ? 'animate-pulse' : ''}`}
                        style={{ backgroundColor: budgetHint.barColor }}
                      />
                    </div>

                    {/* Explanatory detail */}
                    <p className={`text-[11px] leading-relaxed font-medium ${budgetHint.textClass}`}>
                      {budgetHint.message}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Manage panel — slides in below hint */}
              {showCatPanel && (
                <div className="mt-2.5">
                  <CategoryManager
                    categories={localCats}
                    onSave={(updated) => {
                      setLocalCats(updated)
                      onSaveCategories?.(updated)
                      setShowCatPanel(false)
                      setCatSavedToast(true)
                      setTimeout(() => setCatSavedToast(false), 3000)
                    }}
                  />
                </div>
              )}
            </div>

            {/* Payment Mode & Date hidden under More Details to keep primary form ultra-clean */}

            {/* More details toggle button */}
            <button
              type="button" onClick={() => setShowMore(v => !v)}
              className="w-full flex items-center justify-between rounded-2xl border border-dashed border-stone-200 px-4 py-2.5 text-xs font-semibold text-stone-500 hover:border-amber-300 hover:text-amber-700 hover:bg-amber-50/20 transition-all cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Compass size={13} className="text-amber-600" />
                {isIncome ? 'More Options (Payment Mode, Date, Notes & Savings)' : 'More Options (Payment Mode, Date, Notes & Group)'}
              </span>
              {showMore ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {showMore && (
              <div className="space-y-4 pt-1 border-t border-stone-100">
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
                          className={`flex items-center justify-center gap-2 rounded-2xl border py-2.5 text-xs font-semibold transition-all cursor-pointer ${
                            active ? accent.modeActive : 'border-stone-200 bg-stone-50 text-stone-500 hover:bg-stone-100'
                          }`}
                        >
                          <Icon size={14} strokeWidth={active ? 2.5 : 1.8} />
                          {label}
                        </button>
                      )
                    })}
                  </div>
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
                    className={`w-full rounded-2xl border bg-stone-50 px-4 py-2.5 text-xs font-medium text-stone-800 focus:bg-white outline-none transition-colors border-stone-200 ${accent.ring}`}
                  />
                </div>
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

                {!initial && onSaveTemplate && (
                  <div className="rounded-2xl border border-stone-200 bg-stone-50 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setSaveAsTemplate(v => !v)}
                      className={`w-full flex items-center justify-between px-4 py-3 transition-all ${
                        saveAsTemplate ? 'bg-sky-50' : 'hover:bg-stone-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`rounded-xl p-1.5 ${saveAsTemplate ? 'bg-sky-100' : 'bg-stone-100'}`}>
                          <Repeat size={14} className={saveAsTemplate ? 'text-sky-600' : 'text-stone-400'} />
                        </div>
                        <div className="text-left">
                          <p className={`text-xs font-semibold ${saveAsTemplate ? 'text-sky-700' : 'text-stone-600'}`}>
                            Save as recurring template
                          </p>
                          <p className="text-[10px] text-stone-400 mt-0.5">
                            Adds this to Quick Add for next time (rent, salary, EMI…)
                          </p>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                        saveAsTemplate ? 'border-sky-500 bg-sky-500' : 'border-stone-300 bg-white'
                      }`}>
                        {saveAsTemplate && <Check size={11} className="text-white" strokeWidth={3} />}
                      </div>
                    </button>
                    {saveAsTemplate && (
                      <div className="px-4 pb-3">
                        <input
                          value={templateLabel}
                          onChange={e => setTemplateLabel(e.target.value)}
                          placeholder={description ? `Label (default: "${description}")` : 'Label for this template'}
                          className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-700 placeholder-stone-400 focus:border-sky-400 outline-none"
                        />
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="flex items-center gap-1.5 text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1.5">
                    <Compass size={10} /> Expense Group
                  </label>
                  <select
                    value={tripId}
                    onChange={e => setTripId(e.target.value)}
                    className={`w-full rounded-2xl border bg-stone-50 px-4 py-2.5 text-sm text-stone-800 focus:bg-white outline-none transition-colors border-stone-200 ${accent.ring}`}
                  >
                    <option value="">None</option>
                    {trips.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>

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
            {showCatPanel ? (
              <div className="w-full flex items-center justify-between rounded-2xl bg-amber-50 border border-amber-200 p-3">
                <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                  <Tag size={14} className="text-amber-600" /> Currently managing categories
                </span>
                <button
                  type="button"
                  onClick={() => setShowCatPanel(false)}
                  className="rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition-colors cursor-pointer"
                >
                  Done Managing
                </button>
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
