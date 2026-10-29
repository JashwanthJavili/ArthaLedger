import { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, ChevronDown, ChevronLeft, ChevronRight, Wallet, Smartphone, Trash2, Calendar, User, FileText,
  PiggyBank, Check, Compass, Repeat, Zap, AlertTriangle, ShieldAlert, Layers,
  ArrowDownLeft, ArrowUpRight, Clock,
} from 'lucide-react'
import CategoryManager from './CategoryManager'
import { triggerBudgetAlertNotification } from '../../lib/notifications'
import { useI18n } from '../../i18n/core'

// Labels are looked up at render (`labelKey`); `id` is the stored value.
const MODES = [
  { id: 'Cash', labelKey: 'entry.mode.cash', icon: Wallet },
  { id: 'UPI',  label: 'UPI',  icon: Smartphone },
]

const TYPES = [
  { id: 'income',  labelKey: 'entry.type.income',  icon: ArrowDownLeft },
  { id: 'expense', labelKey: 'entry.type.expense', icon: ArrowUpRight },
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
  const { t } = useI18n()
  // The entry type lives inside the modal so users can flip between
  // Cash In / Cash Out without losing anything they've typed.
  const [entryType,   setEntryType]   = useState(type || 'income')
  const [amount,      setAmount]      = useState('')
  const [description, setDesc]        = useState('')
  const [category,    setCategory]    = useState('')
  const [mode,        setMode]        = useState('UPI')
  const [enteredBy,   setEnteredBy]   = useState('')
  const [notes,       setNotes]       = useState('')
  const [timestamp,   setTimestamp]   = useState('')
  const [timeTouched, setTimeTouched] = useState(false)
  const [isSavings,   setIsSavings]   = useState(false)
  const [tripId,      setTripId]      = useState('')
  const [subcategory, setSubcategory] = useState('')

  const [localCats,    setLocalCats]    = useState([])
  const [submitting,   setSubmitting]   = useState(false)
  const [errors,       setErrors]       = useState({})
  const [showMore,     setShowMore]     = useState(false)
  const [showCatPanel, setShowCatPanel] = useState(false)
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
  const [descFocused, setDescFocused] = useState(false)
  const [activeSugg, setActiveSugg] = useState(-1)

  const loadLastEntryDefaults = () => {
    try {
      return JSON.parse(localStorage.getItem(LAST_ENTRY_KEY) || '{}') || {}
    } catch {
      return {}
    }
  }

  // Layout effect: the form is filled before the first paint, so the sheet
  // opens at its final height instead of growing (and jumping) a frame later.
  useLayoutEffect(() => {
    if (open && !isOpenRef.current) {
      isOpenRef.current = true
      setValidationAlert(null)
      const cats = categories?.length ? categories : ['General']
      const saved = initial ? {} : loadLastEntryDefaults()
      setEntryType(initial?.type || type || 'income')
      setLocalCats(cats)
      setAmount(initial?.amount != null ? String(initial.amount) : '')
      setDesc(initial?.description || '')
      setCategory(initial?.category || saved.category || (typeof cats[0] === 'string' ? cats[0] : cats[0]?.name) || 'General')
      setSubcategory(initial?.subcategory || '')
      setMode(initial?.mode || saved.mode || 'UPI')
      setEnteredBy(initial?.enteredBy || saved.enteredBy || '')
      setNotes(initial?.notes || '')
      setIsSavings(Boolean(initial?.isSavings ?? saved.isSavings))
      setTimeTouched(false)
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
  }, [open, initial, categories, trips, projectId, bookId, type])

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

  // Phone back button / back gesture closes this page instead of leaving the book
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])
  useEffect(() => {
    if (!open) return
    window.history.pushState({ ...(window.history.state || {}), entryPage: true }, '')
    // Still on one of our own history entries (dev double-mount): ignore
    const onPop = () => { if (!window.history.state?.entryPage) onCloseRef.current?.() }
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      if (window.history.state?.entryPage) window.history.back()
    }
  }, [open])

  if (!open) return null

  const symbol   = currencyMap[localStorage.getItem('sl_currency') || 'INR'] || '₹'
  const isIncome = entryType === 'income'
  // Savings only applies to Cash In; the toggle value is kept if the user flips back.
  const savingsOn = isIncome && isSavings
  const matchingTemplates = templates.filter(tpl => tpl.type === entryType)

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

    const pctAfter = soft > 0 ? (totalAfterEntry / soft) * 100 : 0

    const overHard = hard > 0 && totalAfterEntry > hard
    const overSoft = totalAfterEntry > soft
    const isWarn = pctAfter >= warnAt && !overSoft
    const fmt = n => `${symbol}${Math.abs(n).toLocaleString('en-IN')}`

    let barColor, textClass, icon, title, message

    if (overHard) {
      barColor = '#dc2626'
      textClass = 'text-red-600 dark:text-red-400'
      icon = <ShieldAlert size={14} className="flex-shrink-0" />
      title = t('entry.budget.hardTitle', { amount: fmt(totalAfterEntry - hard) })
      message = currentAmount > 0
        ? t('entry.budget.hardMsgEntry', { total: fmt(totalAfterEntry), over: fmt(totalAfterEntry - hard), hard: fmt(hard) })
        : t('entry.budget.hardMsg', { amount: fmt(spent - hard) })
    } else if (overSoft) {
      barColor = '#ea580c'
      textClass = 'text-orange-600 dark:text-orange-400'
      icon = <AlertTriangle size={14} className="flex-shrink-0" />
      title = t('entry.budget.overTitle', { amount: fmt(totalAfterEntry - soft) })
      message = currentAmount > 0
        ? t('entry.budget.overMsgEntry', { remaining: fmt(remainingBefore), over: fmt(remainingAfter) })
        : t('entry.budget.overMsg', { amount: fmt(remainingBefore) })
    } else if (isWarn) {
      barColor = '#d97706'
      textClass = 'text-amber-600 dark:text-amber-400'
      icon = <AlertTriangle size={14} className="flex-shrink-0" />
      title = t(currentAmount > 0 ? 'entry.budget.nearTitleAfter' : 'entry.budget.nearTitle', { left: fmt(remainingAfter) })
      message = currentAmount > 0
        ? t('entry.budget.nearMsgEntry', { remaining: fmt(remainingBefore), left: fmt(remainingAfter) })
        : t('entry.budget.nearMsg', { remaining: fmt(remainingBefore) })
    } else {
      barColor = '#059669'
      textClass = 'text-emerald-600 dark:text-emerald-400'
      icon = <Check size={14} className="flex-shrink-0" />
      title = t(currentAmount > 0 ? 'entry.budget.okTitleAfter' : 'entry.budget.okTitle', { left: fmt(remainingAfter) })
      message = currentAmount > 0
        ? t('entry.budget.okMsgEntry', { soft: fmt(soft), spent: fmt(spent), left: fmt(remainingAfter) })
        : t('entry.budget.okMsg', { soft: fmt(soft), spent: fmt(spent) })
    }

    return {
      softLimit: soft,
      totalAfter: totalAfterEntry,
      pctAfter,
      barColor,
      textClass,
      icon,
      title,
      message,
    }
  })()

  const tone = savingsOn
    ? {
        text: 'text-violet-600 dark:text-violet-400',
        hero: 'bg-violet-500/[0.07] border-violet-500/25',
        btn: 'bg-violet-600 hover:bg-violet-700 shadow-violet-600/25',
        caption: t('entry.caption.savings'),
      }
    : isIncome
      ? {
          text: 'text-emerald-600 dark:text-emerald-400',
          hero: 'bg-emerald-500/[0.07] border-emerald-500/25',
          btn: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25',
          caption: t('entry.caption.received'),
        }
      : {
          text: 'text-rose-600 dark:text-rose-400',
          hero: 'bg-rose-500/[0.07] border-rose-500/25',
          btn: 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25',
          caption: t('entry.caption.paid'),
        }

  const labelCls = 'flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-muted)] mb-2'
  const fieldCls = 'w-full rounded-xl border border-[var(--border-card)] bg-[var(--bg-card)] px-3.5 py-2.5 text-[13px] text-[var(--text-main)] placeholder-[var(--text-subtle)] outline-none transition-colors focus:border-[var(--gold-primary)]'

  const clearErr = key => {
    setErrors(e => ({ ...e, [key]: '' }))
    setValidationAlert(null)
  }

  const switchType = (next) => {
    if (next === entryType) return
    setEntryType(next)
  }

  const validate = () => {
    const e = {}

    if (!amount || Number(amount) <= 0) e.amount = t('entry.validation.amount')
    if (!description.trim()) e.description = t('entry.validation.description')
    setErrors(e)

    if (e.amount || e.description) {
      const msg = e.amount && e.description
        ? t('entry.validation.missingBoth')
        : t(e.amount ? 'entry.validation.missingAmount' : 'entry.validation.missingDescription')
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
        type: entryType,
        isSavings: savingsOn,
        // Untouched date/time on a new entry = right now, to the millisecond,
        // so it always sorts above entries added earlier in the same minute.
        timestamp: !initial && !timeTouched ? Date.now() : new Date(timestamp).getTime(),
        _localCategories: localCats,
        tripId,
      })
      if (!initial) {
        localStorage.setItem(LAST_ENTRY_KEY, JSON.stringify({ category, mode, enteredBy, isSavings: savingsOn }))
        if (saveAsTemplate && onSaveTemplate) {
          await onSaveTemplate({
            label: templateLabel.trim() || description,
            amount: Number(amount),
            description,
            category,
            subcategory,
            mode,
            type: entryType,
            isSavings: savingsOn,
          })
        }
      }
      if (!isIncome && budgetHint && budgetHint.pctAfter >= 80) {
        triggerBudgetAlertNotification({
          categoryName: category,
          percentage: budgetHint.pctAfter,
          spent: budgetHint.totalAfter,
          limit: budgetHint.softLimit,
        })
      }
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  const applyTemplate = async (tpl) => {
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
        type: entryType,
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

  // Autocomplete: filter by what's typed, prefer same-type and prefix matches.
  const descQuery = description.trim().toLowerCase()
  const filteredSuggestions = initial ? [] : descriptionSuggestions
    .filter(item => {
      const d = String(item.description || '').toLowerCase()
      return d && d !== descQuery && (!descQuery || d.includes(descQuery))
    })
    .map((item, i) => ({ item, i }))
    .sort((a, b) =>
      ((b.item.type === entryType) - (a.item.type === entryType)) ||
      ((b.item.description.toLowerCase().startsWith(descQuery)) - (a.item.description.toLowerCase().startsWith(descQuery))) ||
      a.i - b.i)
    .slice(0, 4)
    .map(({ item }) => item)
  const showSuggestions = descFocused && filteredSuggestions.length > 0

  const applyDescriptionSuggestion = (item) => {
    setDesc(item.description)
    if (item.category && catList.some(c => c.name === item.category)) {
      setCategory(item.category)
      const subs = catList.find(c => c.name === item.category)?.subcategories || []
      setSubcategory(item.subcategory && subs.includes(item.subcategory) ? item.subcategory : '')
    }
    if (MODES.some(m => m.id === item.mode)) setMode(item.mode)
    if (!amount && Number(item.amount) > 0 && item.type === entryType) setAmount(String(item.amount))
    setErrors({})
    setValidationAlert(null)
    setDescFocused(false)
    setActiveSugg(-1)
  }

  const handleDescKeyDown = (e) => {
    // Keyboard "Done" with nothing highlighted: close the keyboard so the
    // categories below are reachable, instead of submitting the form.
    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !(showSuggestions && activeSugg >= 0)) {
      e.preventDefault()
      setDescFocused(false)
      e.currentTarget.blur()
      return
    }
    if (!showSuggestions) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveSugg(i => (i + 1) % filteredSuggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveSugg(i => (i <= 0 ? filteredSuggestions.length - 1 : i - 1))
    } else if (e.key === 'Enter' && activeSugg >= 0) {
      e.preventDefault()
      applyDescriptionSuggestion(filteredSuggestions[activeSugg])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      setDescFocused(false)
    }
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

  return createPortal(
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={initial ? t('entry.editTitle') : t('entry.newTitle')}
      initial={{ x: '8%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ x: { duration: 0.32, ease: [0.16, 1, 0.3, 1] }, opacity: { duration: 0.16 } }}
      className="fixed inset-0 z-50 flex flex-col bg-[var(--bg-page)] will-change-transform"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="mx-auto flex h-full w-full max-w-[560px] flex-col overflow-hidden">
        {/* Top bar: back + Cash In / Cash Out switch */}
        <div className="flex flex-shrink-0 items-center gap-3 px-4 pt-3 pb-1">
          <button
            type="button" onClick={onClose} aria-label={t('common.back')}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-[var(--border-card)] bg-[var(--bg-card)] text-[var(--text-main)] active:scale-95 transition-transform cursor-pointer"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="min-w-0 flex-1">
          <div role="tablist" aria-label={t('entry.type.tabs')} className="relative isolate grid grid-cols-2 rounded-2xl bg-[var(--border-subtle)] p-1">
            {/* Sliding pill — plain x transform, so nothing flies in when the sheet opens */}
            <motion.span
              aria-hidden
              initial={false}
              animate={{ x: entryType === 'income' ? '0%' : '100%' }}
              transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              className="absolute inset-y-1 left-1 -z-10 w-[calc(50%-4px)] rounded-xl bg-[var(--bg-card)] shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
            />
            {TYPES.map(({ id, labelKey, icon: Icon }) => {
              const active = entryType === id
              const activeText = id === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => switchType(id)}
                  className={`relative flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13px] font-semibold transition-colors cursor-pointer ${
                    active ? activeText : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <Icon size={15} strokeWidth={2.2} />
                  {t(labelKey)}
                </button>
              )
            })}
          </div>
          </div>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-5 pt-4 pb-5 space-y-5">

            {/* Amount */}
            <div>
              <label
                htmlFor="entry-amount"
                className={`flex items-center gap-3 rounded-2xl border px-4 py-2.5 transition-colors duration-300 cursor-text ${tone.hero} ${
                  errors.amount ? '!border-rose-500' : ''
                }`}
              >
                <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--bg-card)] text-lg font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.06)] ${tone.text}`}>
                  {symbol}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-[10px] font-semibold uppercase tracking-[0.12em] ${tone.text}`}>
                    {tone.caption}
                  </span>
                  <input
                    id="entry-amount"
                    ref={amountRef}
                    type="number" inputMode="decimal" min="0.01" step="0.01"
                    value={amount}
                    onChange={e => { setAmount(e.target.value); clearErr('amount') }}
                    onKeyDown={e => {
                      // Enter moves to the description instead of submitting
                      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
                        e.preventDefault()
                        descRef.current?.focus()
                      }
                    }}
                    enterKeyHint="next"
                    placeholder="0.00"
                    className="no-spin block w-full bg-transparent text-[24px] leading-tight font-bold tracking-tight tabular-nums text-[var(--text-main)] placeholder-[var(--text-subtle)]/50 outline-none"
                  />
                </span>
              </label>
              {errors.amount && <p className="mt-1.5 text-[11px] text-rose-500">{errors.amount}</p>}
            </div>

            {/* Validation alert */}
            <AnimatePresence>
              {validationAlert && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="rounded-xl border border-rose-500/30 bg-rose-500/[0.06] px-3.5 py-3 flex items-start gap-2.5"
                >
                  <AlertTriangle size={15} className="text-rose-600 dark:text-rose-400 flex-shrink-0 mt-px" />
                  <p className="flex-1 text-xs leading-relaxed text-rose-700 dark:text-rose-300">{validationAlert}</p>
                  <button
                    type="button"
                    onClick={() => setValidationAlert(null)}
                    aria-label={t('entry.dismiss')}
                    className="text-rose-400 hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick Add — one-tap recurring templates (new entries only) */}
            {!initial && matchingTemplates.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={labelCls + ' !mb-0'}>
                    <Zap size={11} /> {t('entry.quickAdd')}
                  </span>
                  <button
                    type="button" onClick={() => setManageTemplates(v => !v)}
                    className="text-[11px] font-medium text-[var(--text-subtle)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                  >
                    {manageTemplates ? t('common.done') : t('entry.manage')}
                  </button>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory">
                  {matchingTemplates.map(tpl => (
                    <div
                      key={tpl.id}
                      className="snap-start inline-flex items-stretch rounded-xl border border-[var(--border-card)] bg-[var(--bg-card)] flex-shrink-0 overflow-hidden hover:border-[var(--gold-primary)] transition-colors"
                    >
                      <button
                        type="button"
                        disabled={submitting || Boolean(quickAdding)}
                        onClick={() => applyTemplate(tpl)}
                        className="px-3 py-2 text-left disabled:opacity-50 cursor-pointer"
                      >
                        <span className="block text-xs font-medium text-[var(--text-main)] leading-tight">
                          {quickAdding === tpl.id ? t('entry.adding') : (tpl.label || tpl.description)}
                        </span>
                        <span className="block mt-0.5 text-[11px] tabular-nums text-[var(--text-subtle)] leading-tight">
                          {symbol}{Number(tpl.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}{tpl.subcategory ? ` · ${tpl.subcategory}` : ''}
                        </span>
                      </button>
                      {manageTemplates && (
                        <button
                          type="button"
                          onClick={() => onDeleteTemplate?.(tpl.id)}
                          className="px-2.5 border-l border-[var(--border-subtle)] text-[var(--text-subtle)] hover:text-rose-500 transition-colors cursor-pointer"
                          title={t('entry.removeTemplate', { name: tpl.label || tpl.description })}
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description with autocomplete (suggestions float over the form, so its height never changes) */}
            <div className="relative z-30">
              <label htmlFor="entry-desc" className={labelCls}>{t('entry.description')}</label>
              <input
                id="entry-desc"
                ref={descRef}
                value={description}
                autoComplete="off"
                onChange={e => { setDesc(e.target.value); clearErr('description'); setDescFocused(true); setActiveSugg(-1) }}
                onFocus={() => setDescFocused(true)}
                onBlur={() => { setDescFocused(false); setActiveSugg(-1) }}
                onKeyDown={handleDescKeyDown}
                enterKeyHint="done"
                placeholder={isIncome ? t('entry.descPlaceholderIncome') : t('entry.descPlaceholderExpense')}
                role="combobox"
                aria-expanded={showSuggestions}
                aria-controls="entry-desc-suggestions"
                className={`${fieldCls} ${errors.description ? '!border-rose-500' : ''} ${showSuggestions ? '!border-[var(--gold-primary)]' : ''}`}
              />
              {errors.description && <p className="mt-1.5 text-[11px] text-rose-500">{errors.description}</p>}

              <AnimatePresence initial={false}>
                {showSuggestions && (
                  <motion.div
                    key="desc-suggestions"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.14 }}
                    className="absolute inset-x-0 top-full"
                  >
                    <ul
                      id="entry-desc-suggestions"
                      role="listbox"
                      className="mt-1.5 rounded-xl border border-[var(--border-card)] bg-[var(--bg-page)] py-1 shadow-[0_14px_36px_-12px_rgba(0,0,0,0.35)]"
                    >
                      {filteredSuggestions.map((item, idx) => (
                        <li key={item.description} role="option" aria-selected={idx === activeSugg}>
                          <button
                            type="button"
                            onPointerDown={e => e.preventDefault()}
                            onMouseDown={e => e.preventDefault()}
                            onMouseEnter={() => setActiveSugg(idx)}
                            onClick={() => applyDescriptionSuggestion(item)}
                            className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors cursor-pointer ${
                              idx === activeSugg ? 'bg-[var(--gold-light)]' : ''
                            }`}
                          >
                            <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${item.type === 'income' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--text-main)]">
                              <HighlightMatch text={item.description} query={descQuery} />
                              {item.category && <span className="ml-1.5 text-[11px] text-[var(--text-subtle)]">· {item.category}</span>}
                            </span>
                            {Number(item.amount) > 0 && (
                              <span className="flex-shrink-0 text-[11px] font-medium tabular-nums text-[var(--text-muted)]">
                                {symbol}{Number(item.amount).toLocaleString('en-IN')}
                              </span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Category & Subcategory */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={labelCls + ' !mb-0'}>{t('common.category')}</span>
                <button
                  type="button" onClick={() => setShowCatPanel(true)}
                  className="text-[11px] font-medium text-[var(--gold-primary)] hover:text-[var(--gold-hover)] transition-colors cursor-pointer"
                >
                  {t('entry.manage')}
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {catList.map(cat => {
                  const active = category === cat.name
                  const subs = cat.subcategories.length
                  return (
                    <button
                      key={cat.name} type="button"
                      onClick={() => {
                        if (active) return
                        setCategory(cat.name)
                        setSubcategory('')
                      }}
                      aria-pressed={active}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs transition-all cursor-pointer ${
                        active
                          ? 'border-[var(--gold-primary)] bg-[var(--gold-light)] text-[var(--text-main)] font-semibold shadow-[0_0_0_3px_rgba(197,160,89,0.12)]'
                          : 'border-[var(--border-card)] bg-[var(--bg-card)] text-[var(--text-muted)] font-medium hover:border-[var(--text-subtle)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      {active && <Check size={12} strokeWidth={3} className="text-[var(--gold-primary)]" />}
                      {cat.name}
                      {subs > 0 && (
                        <span className={`rounded-md px-1 text-[10px] font-semibold tabular-nums ${
                          active ? 'bg-[var(--gold-primary)]/15 text-[var(--gold-primary)]' : 'bg-[var(--border-subtle)] text-[var(--text-subtle)]'
                        }`}>
                          {subs}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Subcategories — fixed one-line strip; content cross-fades so the sheet never resizes */}
              <div className="relative mt-2.5 h-9">
                <AnimatePresence initial={false} mode="popLayout">
                  <motion.div
                    key={category || 'none'}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.14 }}
                    className="absolute inset-0 flex items-center gap-1.5 overflow-x-auto overflow-y-hidden whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  >
                    <Layers size={12} className="flex-shrink-0 text-[var(--gold-primary)]" />
                    {availableSubcats.length > 0 ? (
                      availableSubcats.map(sub => {
                        const active = subcategory === sub
                        return (
                          <button
                            key={sub}
                            type="button"
                            onClick={() => setSubcategory(active ? '' : sub)}
                            aria-pressed={active}
                            className={`inline-flex flex-shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-[11px] transition-colors cursor-pointer ${
                              active
                                ? 'border-[var(--gold-primary)] bg-[var(--gold-light)] text-[var(--gold-primary)] font-semibold'
                                : 'border-[var(--border-card)] bg-[var(--bg-card)] text-[var(--text-muted)] font-medium hover:text-[var(--text-main)]'
                            }`}
                          >
                            {active && <Check size={11} strokeWidth={3} />}
                            {sub}
                          </button>
                        )
                      })
                    ) : (
                      <span className="text-[11px] text-[var(--text-subtle)]">
                        {category ? t('entry.noSubcatsFor', { category }) : t('entry.noSubcats')} ·{' '}
                        <button type="button" onClick={() => setShowCatPanel(true)} className="font-medium text-[var(--gold-primary)] cursor-pointer">{t('common.add')}</button>
                      </span>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Budget line, only for a category that has a budget */}
              {!isIncome && budgetHint && (
                <div className="mt-2 h-[52px] rounded-xl border border-[var(--border-card)] bg-[var(--bg-card)] px-3.5 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`flex min-w-0 items-center gap-1.5 truncate text-[12px] font-semibold ${budgetHint.textClass}`}>
                      {budgetHint.icon}
                      <span className="truncate" title={budgetHint.message}>{budgetHint.title}</span>
                    </span>
                    <span className="flex-shrink-0 text-[11px] font-medium tabular-nums text-[var(--text-muted)]">
                      {t('entry.budget.used', { pct: Math.round(budgetHint.pctAfter) })}
                    </span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--border-subtle)]">
                    <motion.div
                      initial={false}
                      animate={{ width: `${Math.min(budgetHint.pctAfter, 100)}%` }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: budgetHint.barColor }}
                    />
                  </div>
                </div>
              )}

              <CategoryManager
                open={showCatPanel}
                categories={localCats}
                onClose={() => setShowCatPanel(false)}
                onSave={async (updated) => {
                  setLocalCats(updated)
                  // Keep the selection valid if the chosen category was renamed or removed
                  if (!updated.some(c => (typeof c === 'string' ? c : c.name) === category)) {
                    const first = updated[0]
                    setCategory(typeof first === 'string' ? first : first?.name || '')
                    setSubcategory('')
                  }
                  setShowCatPanel(false)
                  setCatSavedToast(true)
                  setTimeout(() => setCatSavedToast(false), 3000)
                  await onSaveCategories?.(updated)
                }}
              />
              {catSavedToast && (
                <p className="mt-2 flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  <Check size={12} /> {t('entry.categoriesSaved')}
                </p>
              )}
            </div>

            {/* Payment mode */}
            <div>
              <span className={labelCls}>{t('entry.mode.label')}</span>
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-[var(--border-subtle)] p-1">
                {MODES.map(({ id, label, labelKey, icon: Icon }) => {
                  const active = mode === id
                  return (
                    <button key={id} type="button" onClick={() => setMode(id)}
                      className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs transition-all cursor-pointer ${
                        active
                          ? 'bg-[var(--bg-card)] text-[var(--text-main)] font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.1)]'
                          : 'text-[var(--text-muted)] font-medium hover:text-[var(--text-main)]'
                      }`}
                    >
                      <Icon size={14} strokeWidth={active ? 2.2 : 1.8} />
                      {labelKey ? t(labelKey) : label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Date & time */}
            <DateTimeField value={timestamp} onChange={(v) => { setTimestamp(v); setTimeTouched(true) }} />

            {/* Additional details */}
            <div className="rounded-xl border border-[var(--border-card)] bg-[var(--bg-card)]">
              <button
                type="button" onClick={() => setShowMore(v => !v)}
                aria-expanded={showMore}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left cursor-pointer"
              >
                <span className="text-xs font-semibold text-[var(--text-main)]">{t('entry.more.title')}</span>
                <span className="flex items-center gap-2 text-[11px] text-[var(--text-subtle)]">
                  {!showMore && (savingsOn ? t('entry.more.savingsOn') : isIncome ? t('entry.more.incomeHint') : t('entry.more.expenseHint'))}
                  <ChevronDown size={16} className={`transition-transform ${showMore ? 'rotate-180' : ''}`} />
                </span>
              </button>

              {showMore && (
                <div className="px-4 pb-4 pt-3 space-y-4 border-t border-[var(--border-subtle)]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="entry-group" className={labelCls}><Compass size={11} /> {t('entry.more.group')}</label>
                      <select
                        id="entry-group"
                        value={tripId}
                        onChange={e => setTripId(e.target.value)}
                        className={fieldCls + ' bg-[var(--bg-page)] cursor-pointer'}
                      >
                        <option value="">{t('common.none')}</option>
                        {trips.map(g => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="entry-by" className={labelCls}><User size={11} /> {t('entry.more.enteredBy')}</label>
                      <input
                        id="entry-by"
                        value={enteredBy}
                        onChange={e => setEnteredBy(e.target.value)}
                        placeholder={t('common.optional')}
                        className={fieldCls + ' bg-[var(--bg-page)]'}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="entry-notes" className={labelCls}><FileText size={11} /> {t('entry.more.notes')}</label>
                    <textarea
                      id="entry-notes"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder={t('common.optional')}
                      className={fieldCls + ' bg-[var(--bg-page)] resize-none'}
                      rows={2}
                    />
                  </div>

                  {isIncome && (
                    <ToggleRow
                      icon={PiggyBank}
                      title={t('entry.more.savingsTitle')}
                      hint={t('entry.more.savingsHint')}
                      checked={isSavings}
                      onChange={() => setIsSavings(v => !v)}
                      activeClass="bg-violet-600"
                    />
                  )}

                  {!initial && onSaveTemplate && (
                    <div>
                      <ToggleRow
                        icon={Repeat}
                        title={t('entry.more.templateTitle')}
                        hint={t('entry.more.templateHint')}
                        checked={saveAsTemplate}
                        onChange={() => setSaveAsTemplate(v => !v)}
                        activeClass="bg-[var(--gold-primary)]"
                      />
                      {saveAsTemplate && (
                        <input
                          value={templateLabel}
                          onChange={e => setTemplateLabel(e.target.value)}
                          placeholder={description ? t('entry.more.templateLabelDefault', { description }) : t('entry.more.templateLabel')}
                          className={fieldCls + ' bg-[var(--bg-page)] mt-3'}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 px-5 pt-3 border-t border-[var(--border-subtle)] bg-[var(--bg-page)]" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
            <button type="submit" disabled={submitting}
                className={`w-full rounded-2xl py-3.5 text-[13px] font-semibold text-white shadow-lg transition-colors disabled:opacity-60 cursor-pointer ${tone.btn}`}>
                {submitting
                  ? t('common.saving')
                  : initial
                    ? t('entry.submit.update')
                    : savingsOn ? t('entry.submit.savings') : isIncome ? t('entry.submit.income') : t('entry.submit.expense')}
              </button>
          </div>
        </form>
      </div>
    </motion.div>,
    document.body,
  )
}

function ToggleRow({ icon: Icon, title, hint, checked, onChange, activeClass }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className="w-full flex items-center justify-between gap-3 text-left cursor-pointer"
    >
      <span className="flex items-center gap-3 min-w-0">
        <span className="rounded-lg bg-[var(--border-subtle)] p-1.5 text-[var(--text-muted)]">
          <Icon size={15} />
        </span>
        <span className="min-w-0">
          <span className="block text-xs font-semibold text-[var(--text-main)]">{title}</span>
          <span className="block mt-0.5 text-[11px] text-[var(--text-subtle)]">{hint}</span>
        </span>
      </span>
      <span className={`relative h-[22px] w-10 flex-shrink-0 rounded-full transition-colors ${checked ? activeClass : 'bg-[var(--text-subtle)]/35'}`}>
        <span className={`absolute top-[3px] left-[3px] h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-[18px]' : ''}`} />
      </span>
    </button>
  )
}

const pad2 = n => String(n).padStart(2, '0')
// Narrow weekday names (Sunday first) in the active locale; 7 Jan 2024 was a Sunday.
const weekdayNames = intl => Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 7 + i).toLocaleDateString(intl, { weekday: 'narrow' }))

function parseLocal(value) {
  const [datePart = '', timePart = '00:00'] = String(value || '').split('T')
  const [y, m, d] = datePart.split('-').map(Number)
  const [hh, mm] = timePart.split(':').map(Number)
  if (!y || !m || !d) return new Date()
  return new Date(y, m - 1, d, hh || 0, mm || 0)
}

function toLocalValue(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

// Separate Date and Time fields; each opens its own inline picker panel.
function DateTimeField({ value, onChange }) {
  const { t, intl } = useI18n()
  const selected = parseLocal(value)
  const [panel, setPanel] = useState(null) // 'date' | 'time' | null
  const today = new Date()
  const commit = date => onChange(toLocalValue(date))

  const hours12 = selected.getHours() % 12 || 12
  const isPM = selected.getHours() >= 12
  const minutes = selected.getMinutes()

  const dateLabel = sameDay(selected, today)
    ? t('common.today')
    : selected.toLocaleDateString(intl, {
        weekday: 'short', day: 'numeric', month: 'short',
        ...(selected.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}),
      })
  const timeLabel = `${hours12}:${pad2(minutes)} ${isPM ? 'PM' : 'AM'}`

  const trigger = (id, Icon, caption, text) => {
    const active = panel === id
    return (
      <button
        type="button"
        onClick={() => setPanel(p => (p === id ? null : id))}
        aria-expanded={active}
        className={`flex items-center gap-2.5 rounded-xl border bg-[var(--bg-card)] px-3 py-2 text-left transition-colors cursor-pointer ${
          active ? 'border-[var(--gold-primary)] ring-2 ring-[var(--gold-primary)]/15' : 'border-[var(--border-card)] hover:border-[var(--text-subtle)]'
        }`}
      >
        <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors ${
          active ? 'bg-[var(--gold-primary)] text-white' : 'bg-[var(--gold-light)] text-[var(--gold-primary)]'
        }`}>
          <Icon size={15} />
        </span>
        <span className="min-w-0">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-subtle)]">{caption}</span>
          <span className="block truncate text-[13px] font-semibold tabular-nums text-[var(--text-main)]">{text}</span>
        </span>
      </button>
    )
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        {trigger('date', Calendar, t('common.date'), dateLabel)}
        {trigger('time', Clock, t('common.time'), timeLabel)}
      </div>

      <PickerPopup
        open={Boolean(panel)}
        title={panel === 'date' ? t('entry.picker.selectDate') : t('entry.picker.selectTime')}
        onClose={() => setPanel(null)}
      >
        {panel === 'date'
          ? <CalendarPanel selected={selected} onPick={commit} onDone={() => setPanel(null)} />
          : <TimePanel selected={selected} onPick={commit} onDone={() => setPanel(null)} />}
      </PickerPopup>
    </div>
  )
}

// Rendered in a portal: the entry sheet is transformed by framer-motion,
// which would otherwise trap `position: fixed` inside it.
function PickerPopup({ open, title, onClose, children }) {
  const { t } = useI18n()
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="picker"
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-3 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onKeyDown={e => {
            if (e.key === 'Escape') {
              e.preventDefault()
              e.stopPropagation()
              onClose()
            }
          }}
        >
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[340px] rounded-3xl border border-[var(--border-card)] bg-[var(--bg-page)] p-4 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.45)]"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--text-main)]">{title}</h3>
              <button
                type="button"
                onClick={onClose}
                aria-label={t('common.close')}
                autoFocus
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

function PanelFooter({ onNow, nowLabel, onDone }) {
  const { t } = useI18n()
  return (
    <div className="mt-3 flex items-center justify-between border-t border-[var(--border-subtle)] pt-3">
      <button type="button" onClick={onNow}
        className="rounded-lg px-2 py-1.5 -ml-2 text-xs font-semibold text-[var(--gold-primary)] hover:bg-[var(--gold-light)] transition-colors cursor-pointer">
        {nowLabel}
      </button>
      {onDone && (
        <button type="button" onClick={onDone}
          className="rounded-xl bg-[var(--text-main)] px-5 py-2 text-xs font-semibold text-[var(--bg-page)] hover:opacity-90 transition-opacity cursor-pointer">
          {t('common.done')}
        </button>
      )}
    </div>
  )
}

function CalendarPanel({ selected, onPick, onDone }) {
  const { t, intl } = useI18n()
  const [viewMonth, setViewMonth] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1))
  const today = new Date()

  const firstWeekday = viewMonth.getDay()
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate()
  const cells = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  const shiftMonth = delta => setViewMonth(v => new Date(v.getFullYear(), v.getMonth() + delta, 1))
  const pickDay = (day) => {
    const next = new Date(selected)
    next.setFullYear(viewMonth.getFullYear(), viewMonth.getMonth(), day)
    onPick(next)
    onDone()
  }
  const pickToday = () => {
    const next = new Date(selected)
    next.setFullYear(today.getFullYear(), today.getMonth(), today.getDate())
    onPick(next)
    onDone()
  }

  const navBtn = 'rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--border-subtle)] hover:text-[var(--text-main)] transition-colors cursor-pointer'

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <button type="button" onClick={() => shiftMonth(-1)} aria-label={t('entry.picker.prevMonth')} className={navBtn}>
          <ChevronLeft size={16} />
        </button>
        <span className="text-[13px] font-semibold text-[var(--text-main)]">
          {viewMonth.toLocaleDateString(intl, { month: 'long', year: 'numeric' })}
        </span>
        <button type="button" onClick={() => shiftMonth(1)} aria-label={t('entry.picker.nextMonth')} className={navBtn}>
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 text-center">
        {weekdayNames(intl).map((w, i) => (
          <span key={i} className="py-1 text-[10px] font-semibold text-[var(--text-subtle)]">{w}</span>
        ))}
        {cells.map((day, i) => {
          if (!day) return <span key={`e${i}`} />
          const cellDate = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day)
          const isSelected = sameDay(cellDate, selected)
          const isToday = sameDay(cellDate, today)
          return (
            <button
              key={day}
              type="button"
              onClick={() => pickDay(day)}
              className={`mx-auto my-0.5 flex h-9 w-9 items-center justify-center rounded-full text-xs tabular-nums transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-[var(--gold-primary)] text-white font-semibold shadow-sm'
                  : isToday
                    ? 'text-[var(--gold-primary)] font-semibold ring-1 ring-inset ring-[var(--gold-primary)]/50'
                    : 'text-[var(--text-main)] hover:bg-[var(--border-subtle)]'
              }`}
            >
              {day}
            </button>
          )
        })}
      </div>

      <PanelFooter onNow={pickToday} nowLabel={t('common.today')} />
    </>
  )
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1)
const MINUTES = Array.from({ length: 60 }, (_, i) => i)
const MERIDIEMS = ['AM', 'PM']
const WHEEL_ITEM_H = 40
const WHEEL_VISIBLE = 5

function TimePanel({ selected, onPick, onDone }) {
  const { t } = useI18n()
  const hours12 = selected.getHours() % 12 || 12
  const isPM = selected.getHours() >= 12
  const minutes = selected.getMinutes()

  const setTime = (h12, min, pm) => {
    const next = new Date(selected)
    next.setHours((h12 % 12) + (pm ? 12 : 0), min)
    onPick(next)
  }
  const setNow = () => {
    const now = new Date()
    const next = new Date(selected)
    next.setHours(now.getHours(), now.getMinutes())
    onPick(next)
  }

  return (
    <>
      <p className="text-center text-[28px] font-bold tabular-nums tracking-tight text-[var(--text-main)]">
        {hours12}:{pad2(minutes)} <span className="text-base font-semibold text-[var(--text-muted)]">{isPM ? 'PM' : 'AM'}</span>
      </p>

      <div className="relative mt-2 flex justify-center gap-1" style={{ height: WHEEL_ITEM_H * WHEEL_VISIBLE }}>
        {/* Selection band */}
        <div
          className="pointer-events-none absolute inset-x-2 rounded-xl bg-[var(--gold-light)] border border-[var(--gold-primary)]/30"
          style={{ top: WHEEL_ITEM_H * Math.floor(WHEEL_VISIBLE / 2), height: WHEEL_ITEM_H }}
        />
        <WheelColumn
          items={HOURS}
          value={hours12}
          format={h => String(h)}
          onChange={h => setTime(h, minutes, isPM)}
          label={t('entry.picker.hour')}
        />
        <span className="relative z-10 self-center text-xl font-bold text-[var(--text-subtle)]">:</span>
        <WheelColumn
          items={MINUTES}
          value={minutes}
          format={pad2}
          onChange={m => setTime(hours12, m, isPM)}
          label={t('entry.picker.minute')}
        />
        <WheelColumn
          items={MERIDIEMS}
          value={isPM ? 'PM' : 'AM'}
          format={v => v}
          onChange={v => setTime(hours12, minutes, v === 'PM')}
          label={t('entry.picker.meridiem')}
        />
      </div>

      <PanelFooter onNow={setNow} nowLabel={t('entry.picker.now')} onDone={onDone} />
    </>
  )
}

// Scroll-snapping wheel column. The item centred in the band is the value.
function WheelColumn({ items, value, format, onChange, label }) {
  const ref = useRef(null)
  const settleTimer = useRef(null)
  const index = Math.max(0, items.indexOf(value))
  const pad = WHEEL_ITEM_H * Math.floor(WHEEL_VISIBLE / 2)

  // Keep the scroll position in sync when the value changes from outside (e.g. "Now").
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const target = index * WHEEL_ITEM_H
    if (Math.abs(el.scrollTop - target) > 2 && !settleTimer.current) el.scrollTop = target
  }, [index])

  useEffect(() => () => clearTimeout(settleTimer.current), [])

  const handleScroll = () => {
    clearTimeout(settleTimer.current)
    settleTimer.current = setTimeout(() => {
      settleTimer.current = null
      const el = ref.current
      if (!el) return
      const i = Math.min(items.length - 1, Math.max(0, Math.round(el.scrollTop / WHEEL_ITEM_H)))
      if (items[i] !== value) onChange(items[i])
    }, 90)
  }

  const scrollToIndex = (i) => ref.current?.scrollTo({ top: i * WHEEL_ITEM_H, behavior: 'smooth' })

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      scrollToIndex(Math.min(items.length - 1, Math.max(0, index + (e.key === 'ArrowDown' ? 1 : -1))))
    }
  }

  return (
    <div
      ref={ref}
      role="listbox"
      aria-label={label}
      tabIndex={0}
      onScroll={handleScroll}
      onKeyDown={handleKeyDown}
      className="wheel-scroll relative z-10 w-16 overflow-y-scroll snap-y snap-mandatory outline-none"
      style={{
        paddingTop: pad,
        paddingBottom: pad,
        maskImage: 'linear-gradient(to bottom, transparent, #000 35%, #000 65%, transparent)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent, #000 35%, #000 65%, transparent)',
      }}
    >
      {items.map((item, i) => {
        const active = i === index
        return (
          <button
            key={item}
            type="button"
            role="option"
            aria-selected={active}
            tabIndex={-1}
            onClick={() => scrollToIndex(i)}
            className={`flex w-full snap-center items-center justify-center tabular-nums transition-colors cursor-pointer ${
              active ? 'text-lg font-bold text-[var(--text-main)]' : 'text-[15px] font-medium text-[var(--text-subtle)]'
            }`}
            style={{ height: WHEEL_ITEM_H }}
          >
            {format(item)}
          </button>
        )
      })}
    </div>
  )
}

function HighlightMatch({ text, query }) {
  const idx = query ? text.toLowerCase().indexOf(query) : -1
  if (idx < 0) return text
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-semibold text-[var(--gold-primary)]">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  )
}
