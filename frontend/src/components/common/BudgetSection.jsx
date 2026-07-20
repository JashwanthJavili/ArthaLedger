import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Target, Plus, Pencil, Trash2, X, Check,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  AlertTriangle, ShieldAlert, BookOpen, Calendar, ArrowRight, Info,
} from 'lucide-react'
import { format } from 'date-fns'
import ConfirmDialog from './ConfirmDialog'

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtShort(n, sym = '₹') {
  if (n >= 100000) return `${sym}${(n / 100000).toFixed(1)}L`
  if (n >= 1000)   return `${sym}${(n / 1000).toFixed(1)}K`
  return `${sym}${Number(n).toFixed(0)}`
}

function fmtFull(n, sym = '₹') {
  return `${sym}${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function toMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

function offsetMonth(key, delta) {
  const [y, m] = key.split('-').map(Number)
  return toMonthKey(new Date(y, m - 1 + delta, 1))
}

/**
 * Zone logic:
 *   0 – warnAt%  of soft  → Safe     (emerald)
 *   warnAt – 100% of soft  → Warning  (amber)
 *   100% – hard (if set)   → Over soft (orange-red)
 *   > hard (if set)        → Over hard (red, pulse)
 *   > soft (no hard)       → Over soft (red)
 */
function getZone(spent, soft, hard, warnAt = 80) {
  const hasHard = hard > 0
  const softPct = soft > 0 ? (spent / soft) * 100 : 0

  if (hasHard && spent > hard)       return 'over_hard'
  if (spent > soft)                  return 'over_soft'
  if (softPct >= warnAt)             return 'warning'
  return 'safe'
}

const ZONE_CONFIG = {
  safe:      { bar: '#22c55e', bg: 'bg-emerald-50',  border: 'border-emerald-200', text: 'text-emerald-700',  label: 'On track' },
  warning:   { bar: '#f59e0b', bg: 'bg-amber-50',    border: 'border-amber-200',   text: 'text-amber-700',    label: 'Near limit' },
  over_soft: { bar: '#f97316', bg: 'bg-orange-50',   border: 'border-orange-300',  text: 'text-orange-700',   label: 'Over budget' },
  over_hard: { bar: '#ef4444', bg: 'bg-red-50',      border: 'border-red-300',     text: 'text-red-700',      label: 'Hard limit hit!' },
}

// ── Segmented progress bar ─────────────────────────────────────────────────
function ProgressBar({ spent, soft, hard, warnAt = 80 }) {
  const hasHard  = hard > 0
  const limit    = hasHard ? Math.max(hard, spent) : Math.max(soft, spent)
  const softPct  = limit > 0 ? Math.min((soft / limit) * 100, 100) : 100
  const hardPct  = hasHard && limit > 0 ? Math.min((hard / limit) * 100, 100) : null
  const fillPct  = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0
  const zone     = getZone(spent, soft, hard, warnAt)
  const barColor = ZONE_CONFIG[zone].bar

  // warn marker position on the bar (warnAt% of softPct)
  const warnMarkerPct = (warnAt / 100) * softPct

  return (
    <div className="relative">
      {/* Track */}
      <div className="h-3 rounded-full bg-stone-100 overflow-visible relative">
        {/* Fill */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${fillPct}%` }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className={`h-full rounded-full absolute left-0 top-0 ${zone === 'over_hard' ? 'animate-pulse' : ''}`}
          style={{ backgroundColor: barColor }}
        />
        {/* Soft limit marker */}
        <div
          className="absolute top-0 h-full w-px bg-stone-400/60 z-10"
          style={{ left: `${softPct}%` }}
          title={`Monthly budget: ${fmtFull(soft)}`}
        />
        {/* Hard limit marker */}
        {hardPct !== null && (
          <div
            className="absolute top-0 h-full w-0.5 bg-red-500/80 z-10"
            style={{ left: `${hardPct}%` }}
            title={`Hard limit: ${fmtFull(hard)}`}
          />
        )}
        {/* Warn threshold marker */}
        <div
          className="absolute top-0 h-full w-px bg-amber-400/50 z-10"
          style={{ left: `${warnMarkerPct}%` }}
          title={`Warning at ${warnAt}%`}
        />
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-[8px] text-stone-400 mt-1 px-0.5">
        <span>0</span>
        <span className="text-amber-600" style={{ marginLeft: `${warnMarkerPct - 4}%` }}>▲{warnAt}%</span>
        <span className="text-stone-500">Budget</span>
        {hardPct !== null && <span className="text-red-500">Hard</span>}
      </div>
    </div>
  )
}

// ── Budget row card ────────────────────────────────────────────────────────
function BudgetRow({ category, cfg, spent, sym, onEdit, onDelete, onClick, isPast }) {
  const { soft, hard = 0, warnAt = 80 } = cfg
  const zone      = getZone(spent, soft, hard, warnAt)
  const zc        = ZONE_CONFIG[zone]
  const remaining = soft - spent
  const overHard  = hard > 0 && spent > hard

  return (
    <div
      onClick={onClick}
      role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick?.()}
      className={`rounded-xl border px-3 py-2.5 space-y-2 cursor-pointer transition-all hover:shadow-sm ${zc.bg} ${zc.border}`}
    >
      {/* Top row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold text-stone-800 truncate">{category}</span>
          <span className={`flex-shrink-0 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${zc.bg} ${zc.border} border ${zc.text}`}>
            {overHard
              ? <><ShieldAlert size={8} /> {zc.label}</>
              : zone === 'over_soft'
              ? <><AlertTriangle size={8} /> {zc.label}</>
              : zone === 'warning'
              ? <><AlertTriangle size={8} /> {zc.label}</>
              : zc.label}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
          {!isPast && (
            <>
              <button onClick={onEdit} className="rounded-lg p-1 text-stone-400 hover:bg-white/60 hover:text-amber-700 transition-colors" aria-label="Edit">
                <Pencil size={11} />
              </button>
              <button onClick={onDelete} className="rounded-lg p-1 text-stone-400 hover:bg-white/60 hover:text-red-500 transition-colors" aria-label="Delete">
                <Trash2 size={11} />
              </button>
            </>
          )}
          <ArrowRight size={11} className="text-stone-300 ml-0.5" />
        </div>
      </div>

      {/* Progress bar */}
      <ProgressBar spent={spent} soft={soft} hard={hard} warnAt={warnAt} />

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-1 text-center">
        <div>
          <p className="text-[9px] text-stone-500 uppercase tracking-wider">Spent</p>
          <p className={`text-xs font-bold ${zone !== 'safe' ? zc.text : 'text-stone-700'}`}>{fmtShort(spent, sym)}</p>
        </div>
        <div>
          <p className="text-[9px] text-stone-500 uppercase tracking-wider">Budget</p>
          <p className="text-xs font-bold text-stone-700">{fmtShort(soft, sym)}</p>
        </div>
        <div>
          <p className="text-[9px] text-stone-500 uppercase tracking-wider">{remaining < 0 ? 'Over' : 'Left'}</p>
          <p className={`text-xs font-bold ${remaining < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {fmtShort(Math.abs(remaining), sym)}
          </p>
        </div>
      </div>

      {/* Hard limit row */}
      {hard > 0 && (
        <div className={`flex items-center justify-between rounded-lg px-2 py-1 text-[10px] ${overHard ? 'bg-red-100 border border-red-200' : 'bg-white/50 border border-stone-100'}`}>
          <span className="flex items-center gap-1 text-stone-500"><ShieldAlert size={9} /> Hard limit</span>
          <span className={`font-bold ${overHard ? 'text-red-600' : 'text-stone-600'}`}>{fmtShort(hard, sym)}</span>
          {overHard && <span className="text-red-600 font-bold">+{fmtShort(spent - hard, sym)} over!</span>}
        </div>
      )}
    </div>
  )
}

// ── Add / Edit form ────────────────────────────────────────────────────────
function BudgetForm({ categories, existingCategory, existingCfg, usedCategories, sym, onSave, onCancel }) {
  const [category, setCategory] = useState(existingCategory || '')
  const [soft,     setSoft]     = useState(existingCfg?.soft   ? String(existingCfg.soft)   : '')
  const [hard,     setHard]     = useState(existingCfg?.hard   ? String(existingCfg.hard)   : '')
  const [warnAt,   setWarnAt]   = useState(existingCfg?.warnAt != null ? String(existingCfg.warnAt) : '80')
  const [err,      setErr]      = useState('')
  const [showAdvanced, setShowAdvanced] = useState(Boolean(existingCfg?.hard))

  const availableCategories = useMemo(() => {
    const list = []
    if (Array.isArray(categories)) {
      categories.forEach(c => {
        if (typeof c === 'string') {
          if (c) list.push(c)
        } else if (typeof c === 'object' && c.name) {
          list.push(c.name)
          if (Array.isArray(c.subcategories)) {
            c.subcategories.forEach(sub => {
              if (sub) list.push(`${c.name} · ${sub}`)
            })
          }
        }
      })
    }
    const uniqueList = Array.from(new Set(list))
    if (existingCategory) return [existingCategory, ...uniqueList.filter(c => c !== existingCategory && !usedCategories.includes(c))]
    return uniqueList.filter(c => !usedCategories.includes(c))
  }, [categories, existingCategory, usedCategories])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!category.trim()) { setErr('Select or enter a category.'); return }
    const softNum = Number(soft)
    if (!softNum || softNum <= 0) { setErr('Enter a valid monthly budget.'); return }
    const hardNum = Number(hard) || 0
    if (hardNum > 0 && hardNum <= softNum) { setErr('Hard limit must be greater than the monthly budget.'); return }
    const warnNum = Math.min(Math.max(Number(warnAt) || 80, 1), 99)
    onSave(category.trim(), { soft: softNum, hard: hardNum, warnAt: warnNum })
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-amber-200 bg-amber-50/40 p-3 space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
        {existingCategory ? `Edit — ${existingCategory}` : 'New Budget'}
      </p>

      {/* Category */}
      {!existingCategory && (
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-stone-500 mb-1">Category</label>
          {availableCategories.length > 0 ? (
            <select value={category} onChange={e => { setCategory(e.target.value); setErr('') }}
              className="w-full rounded-xl border border-amber-100 bg-white px-3 py-2 text-sm text-stone-700 focus:border-amber-300 transition-colors">
              <option value="">Choose a category...</option>
              {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
              <option value="__custom__">+ Custom category</option>
            </select>
          ) : null}
          {(category === '__custom__' || availableCategories.length === 0) && (
            <input type="text" value={category === '__custom__' ? '' : category}
              onChange={e => { setCategory(e.target.value); setErr('') }}
              placeholder="e.g. Food, Transport, Rent..." autoFocus
              className="w-full rounded-xl border border-amber-100 bg-white px-3 py-2 text-sm text-stone-700 focus:border-amber-300 transition-colors mt-1" />
          )}
        </div>
      )}

      {/* Monthly Budget (Soft) */}
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-stone-500 mb-1">
          Monthly Budget <span className="text-stone-400 normal-case font-normal">(soft goal)</span>
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400 select-none">{sym}</span>
          <input type="number" value={soft} onChange={e => { setSoft(e.target.value); setErr('') }}
            placeholder="5000" min="1" step="1"
            className="w-full rounded-xl border border-amber-100 bg-white pl-7 pr-3 py-2 text-sm text-stone-700 focus:border-amber-300 transition-colors" />
        </div>
        <p className="text-[10px] text-stone-400 mt-1">Target spending limit — bar turns amber/red as you approach it.</p>
      </div>

      {/* Advanced toggle */}
      <button type="button" onClick={() => setShowAdvanced(v => !v)}
        className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-700 hover:text-amber-800 transition-colors">
        {showAdvanced ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        {showAdvanced ? 'Hide advanced settings' : 'Advanced: Hard limit & warning threshold'}
      </button>

      <AnimatePresence>
        {showAdvanced && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }}
            className="overflow-hidden space-y-3">

            {/* Hard Limit */}
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-stone-500 mb-1">
                Hard Limit <span className="text-stone-400 normal-case font-normal">(optional — absolute max)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400 select-none">{sym}</span>
                <input type="number" value={hard} onChange={e => { setHard(e.target.value); setErr('') }}
                  placeholder={soft ? `e.g. ${Math.round(Number(soft) * 1.2)}` : '6000'} min="0" step="1"
                  className="w-full rounded-xl border border-red-100 bg-white pl-7 pr-3 py-2 text-sm text-stone-700 focus:border-red-300 transition-colors" />
              </div>
              <p className="text-[10px] text-stone-400 mt-1">Bar turns <span className="text-red-500 font-semibold">red + pulses</span> if you exceed this. Leave blank for none.</p>
            </div>

            {/* Warning threshold */}
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-stone-500 mb-1">
                Warn at <span className="text-amber-600 font-bold">{warnAt || 80}%</span> of budget
              </label>
              <input type="range" min="10" max="99" step="5" value={warnAt || 80}
                onChange={e => setWarnAt(e.target.value)}
                className="w-full accent-amber-500" />
              <div className="flex justify-between text-[9px] text-stone-400 mt-0.5">
                <span>10%</span>
                <span className="text-amber-600 font-semibold">Bar turns amber at {warnAt || 80}% ({soft ? fmtShort(Number(soft) * (Number(warnAt) || 80) / 100, sym) : '—'})</span>
                <span>99%</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {err && <p className="text-[11px] text-red-500 rounded-lg bg-red-50 border border-red-100 px-2.5 py-1.5">{err}</p>}

      <div className="flex gap-2">
        <button type="submit"
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 py-2 text-xs font-semibold text-white hover:bg-amber-700 transition-colors">
          <Check size={13} /> {existingCategory ? 'Update' : 'Add Budget'}
        </button>
        <button type="button" onClick={onCancel}
          className="flex-1 rounded-xl border border-stone-200 py-2 text-xs text-stone-600 hover:bg-stone-50 transition-colors">
          Cancel
        </button>
      </div>
    </form>
  )
}

// ── Detail modal ───────────────────────────────────────────────────────────
function BudgetDetailModal({ category, cfg, spent, sym, transactions, bookIdMap, label, onClose }) {
  const { soft, hard = 0, warnAt = 80 } = cfg
  const zone      = getZone(spent, soft, hard, warnAt)
  const zc        = ZONE_CONFIG[zone]
  const remaining = soft - spent

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0 bg-black/40 backdrop-blur-sm"
        onClick={e => { if (e.target === e.currentTarget) onClose() }}>
        <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
          transition={{ type: 'spring', damping: 24, stiffness: 300 }}
          className="w-full max-w-sm rounded-3xl border border-amber-100 bg-white shadow-2xl max-h-[88vh] flex flex-col overflow-hidden">

          {/* Header */}
          <div className={`flex items-center justify-between px-5 pt-5 pb-3 border-b flex-shrink-0 ${zc.bg} ${zc.border} border-b`}>
            <div className="flex items-center gap-2.5">
              <div className={`rounded-xl p-2 ${zc.bg} border ${zc.border}`}>
                <Target size={15} className={zc.text} />
              </div>
              <div>
                <h3 className="font-serif text-base font-semibold text-stone-800">{category}</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Calendar size={10} className="text-stone-400" />
                  <span className="text-[10px] text-stone-500">{label}</span>
                  <span className={`text-[9px] font-bold rounded-full px-1.5 py-0.5 border ${zc.bg} ${zc.border} ${zc.text}`}>{zc.label}</span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="rounded-xl p-1.5 text-stone-400 hover:bg-white/60 transition-colors"><X size={15} /></button>
          </div>

          <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

            {/* Summary card */}
            <div className="rounded-2xl border border-stone-100 bg-stone-50/60 p-4 space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[9px] text-stone-400 uppercase tracking-wider mb-0.5">Spent</p>
                  <p className={`text-sm font-bold ${zone !== 'safe' ? zc.text : 'text-stone-800'}`}>{fmtShort(spent, sym)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-stone-400 uppercase tracking-wider mb-0.5">Monthly Budget</p>
                  <p className="text-sm font-bold text-stone-700">{fmtShort(soft, sym)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-stone-400 uppercase tracking-wider mb-0.5">{remaining < 0 ? 'Over' : 'Left'}</p>
                  <p className={`text-sm font-bold ${remaining < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{fmtShort(Math.abs(remaining), sym)}</p>
                </div>
              </div>

              <ProgressBar spent={spent} soft={soft} hard={hard} warnAt={warnAt} />

              {/* Threshold legend */}
              <div className="grid grid-cols-3 gap-1.5 text-center text-[9px]">
                <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-2 py-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 mx-auto mb-0.5" />
                  <p className="text-emerald-700 font-semibold">Safe</p>
                  <p className="text-stone-400">0 – {warnAt}%</p>
                </div>
                <div className="rounded-lg bg-amber-50 border border-amber-100 px-2 py-1.5">
                  <div className="w-2 h-2 rounded-full bg-amber-500 mx-auto mb-0.5" />
                  <p className="text-amber-700 font-semibold">Warning</p>
                  <p className="text-stone-400">{warnAt} – 100%</p>
                </div>
                <div className="rounded-lg bg-red-50 border border-red-100 px-2 py-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500 mx-auto mb-0.5" />
                  <p className="text-red-700 font-semibold">Over</p>
                  <p className="text-stone-400">&gt; budget</p>
                </div>
              </div>

              {hard > 0 && (
                <div className="flex items-center justify-between rounded-xl bg-red-50 border border-red-100 px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <ShieldAlert size={12} className="text-red-500" />
                    <span className="text-xs font-semibold text-red-700">Hard Limit</span>
                  </div>
                  <span className="text-xs font-bold text-red-600">{fmtFull(hard, sym)}</span>
                  {spent > hard && (
                    <span className="text-[10px] font-bold text-red-600 bg-red-100 rounded-full px-1.5 py-0.5">
                      +{fmtShort(spent - hard, sym)} over!
                    </span>
                  )}
                </div>
              )}

              {transactions.length > 0 && (
                <p className="text-[10px] text-stone-400 text-center">
                  {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} · avg {fmtShort(spent / transactions.length, sym)} each
                </p>
              )}
            </div>

            {/* Transactions */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 mb-2">Transactions in {label}</p>
              {transactions.length === 0 ? (
                <p className="text-center py-6 text-xs text-stone-400">No transactions this month</p>
              ) : (
                <div className="space-y-2">
                  {transactions.map((txn, idx) => {
                    const bookInfo = bookIdMap?.[txn.bookId]
                    return (
                      <motion.div key={txn.id || idx} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        className="flex items-start gap-3 rounded-xl border border-stone-100 bg-stone-50/60 px-3 py-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-stone-700 truncate">{txn.description || 'No description'}</p>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className="text-[10px] text-stone-400">{format(new Date(txn.timestamp), 'dd MMM, hh:mm a')}</span>
                            {txn.mode && <span className="inline-flex rounded-md bg-blue-50 px-1.5 py-0.5 text-[9px] font-medium text-blue-600">{txn.mode}</span>}
                            {bookInfo && (
                              <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium text-amber-700">
                                <BookOpen size={8} /> {bookInfo.bookName}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="flex-shrink-0 text-sm font-bold text-red-500">-{fmtFull(txn.amount, sym)}</span>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="px-5 pb-5 pt-3 border-t border-stone-100 flex-shrink-0 flex items-center justify-between">
            <span className="text-xs text-stone-500">Total spent in {label}</span>
            <span className={`text-base font-bold ${zone !== 'safe' ? zc.text : 'text-stone-800'}`}>{fmtFull(spent, sym)}</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function BudgetSection({
  budgets, allExpenseEntries = [], categories, sym = '₹',
  onSetBudget, onDeleteBudget, bookIdMap = {},
}) {
  const currentMonthKey = toMonthKey(new Date())
  const [expanded,        setExpanded]       = useState(true)
  const [showForm,        setShowForm]        = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [detailCategory,  setDetailCategory]  = useState(null)
  const [selectedMonth,   setSelectedMonth]   = useState(currentMonthKey)
  const [deleteTargetCategory, setDeleteTargetCategory] = useState(null)

  const isPast = selectedMonth !== currentMonthKey

  const availableMonths = useMemo(() => {
    const keys = new Set([currentMonthKey])
    allExpenseEntries.forEach(e => { if (e.timestamp) keys.add(toMonthKey(new Date(e.timestamp))) })
    return Array.from(keys).sort()
  }, [allExpenseEntries, currentMonthKey])

  const canGoPrev = availableMonths.indexOf(selectedMonth) > 0
  const canGoNext = selectedMonth < currentMonthKey

  const goPrev = () => { const i = availableMonths.indexOf(selectedMonth); if (i > 0) setSelectedMonth(availableMonths[i - 1]) }
  const goNext = () => { const n = offsetMonth(selectedMonth, 1); if (n <= currentMonthKey) setSelectedMonth(n) }

  const spentByCategory = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number)
    const start = new Date(y, m - 1, 1).getTime()
    const end   = new Date(y, m, 0, 23, 59, 59, 999).getTime()
    const result = {}
    allExpenseEntries.forEach(e => {
      if (e.timestamp < start || e.timestamp > end) return
      const cat = e.category || 'General'
      const sub = e.subcategory
      const amt = Number(e.amount || 0)
      result[cat] = (result[cat] || 0) + amt
      if (sub) {
        const combo = `${cat} · ${sub}`
        result[combo] = (result[combo] || 0) + amt
      }
    })
    return result
  }, [allExpenseEntries, selectedMonth])

  const monthEntries = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number)
    const start = new Date(y, m - 1, 1).getTime()
    const end   = new Date(y, m, 0, 23, 59, 59, 999).getTime()
    return allExpenseEntries.filter(e => e.timestamp >= start && e.timestamp <= end)
  }, [allExpenseEntries, selectedMonth])

  const label = monthLabel(selectedMonth)

  const validCategoryNamesSet = useMemo(() => {
    const set = new Set(['General'])
    if (Array.isArray(categories)) {
      categories.forEach(c => {
        if (typeof c === 'string') {
          if (c) set.add(c)
        } else if (typeof c === 'object' && c.name) {
          set.add(c.name)
          if (Array.isArray(c.subcategories)) {
            c.subcategories.forEach(sub => {
              if (sub) {
                set.add(sub)
                set.add(`${c.name} · ${sub}`)
              }
            })
          }
        }
      })
    }
    allExpenseEntries.forEach(e => {
      const cat = e.category || 'General'
      const sub = e.subcategory
      set.add(cat)
      if (sub) {
        set.add(sub)
        set.add(`${cat} · ${sub}`)
      }
    })
    return set
  }, [categories, allExpenseEntries])

  const budgetEntries = useMemo(() => {
    return Object.entries(budgets).filter(([cat, cfg]) => {
      const spent = spentByCategory[cat] || 0
      if (!validCategoryNamesSet.has(cat) && spent <= 0) return false
      return cfg && cfg.soft > 0
    })
  }, [budgets, spentByCategory, validCategoryNamesSet])

  const usedCategories = budgetEntries.map(([c]) => c)

  // Overall health
  const totalBudgeted = budgetEntries.reduce((s, [, v]) => s + (v.soft || 0), 0)
  const totalSpent    = budgetEntries.reduce((s, [cat]) => s + (spentByCategory[cat] || 0), 0)
  const overCount     = budgetEntries.filter(([cat, cfg]) => (spentByCategory[cat] || 0) > (cfg.soft || 0)).length
  const hardHitCount  = budgetEntries.filter(([cat, cfg]) => cfg.hard > 0 && (spentByCategory[cat] || 0) > cfg.hard).length

  const overallPct   = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0
  const overallZone  = overallPct >= 100 ? 'over_soft' : overallPct >= 80 ? 'warning' : 'safe'

  const handleSave = (cat, config) => { onSetBudget(cat, config); setShowForm(false); setEditingCategory(null) }
  const startEdit  = (cat) => { setEditingCategory(cat); setShowForm(true) }
  const cancelForm = () => { setShowForm(false); setEditingCategory(null) }

  return (
    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
      className="rounded-2xl border border-amber-100/80 bg-white/85 shadow-sm overflow-hidden">

      {/* Header */}
      <button type="button" onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-amber-50/40 transition-colors">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-amber-100 p-1.5"><Target size={14} className="text-amber-700" /></div>
          <div className="text-left">
            <p className="text-sm font-semibold text-stone-700 leading-tight">Monthly Budgets</p>
            <p className="text-[10px] text-stone-400 mt-0.5">
              {hardHitCount > 0 && <span className="text-red-600 font-bold">{hardHitCount} hard limit hit · </span>}
              {overCount > 0 && !hardHitCount && <span className="text-orange-600 font-semibold">{overCount} over budget · </span>}
              {budgetEntries.length > 0
                ? `${sym}${totalSpent.toLocaleString('en-IN', { maximumFractionDigits: 0 })} of ${sym}${totalBudgeted.toLocaleString('en-IN', { maximumFractionDigits: 0 })} used`
                : 'No budgets set'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {budgetEntries.length > 0 && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${ZONE_CONFIG[overallZone].bg} border ${ZONE_CONFIG[overallZone].border} ${ZONE_CONFIG[overallZone].text}`}>
              {totalBudgeted > 0 ? `${Math.round(overallPct)}%` : '—'}
            </span>
          )}
          {expanded ? <ChevronUp size={14} className="text-stone-400" /> : <ChevronDown size={14} className="text-stone-400" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="px-4 pb-4 space-y-2.5 border-t border-amber-50">

              {/* Month navigator */}
              <div className="flex items-center justify-between pt-2.5">
                <button type="button" onClick={goPrev} disabled={!canGoPrev}
                  className="rounded-lg p-1.5 text-stone-400 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft size={14} />
                </button>
                <div className="flex items-center gap-1.5">
                  <Calendar size={11} className="text-amber-600" />
                  <span className="text-xs font-semibold text-stone-700">{label}</span>
                  {isPast && <span className="text-[9px] bg-stone-100 text-stone-500 rounded-full px-1.5 py-0.5 font-medium">Past</span>}
                </div>
                <button type="button" onClick={goNext} disabled={!canGoNext}
                  className="rounded-lg p-1.5 text-stone-400 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronRight size={14} />
                </button>
              </div>

              {/* Legend */}
              {budgetEntries.length > 0 && (
                <div className="flex items-center gap-3 rounded-xl bg-stone-50 border border-stone-100 px-3 py-2">
                  <Info size={11} className="text-stone-400 flex-shrink-0" />
                  <div className="flex items-center gap-2 flex-wrap text-[9px] text-stone-500">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Safe</span>
                    <span className="flex items-center gap-1"><span className="w-px h-3 bg-amber-400/60 inline-block" /> Warn</span>
                    <span className="flex items-center gap-1"><span className="w-px h-3 bg-stone-400/60 inline-block" /> Budget</span>
                    <span className="flex items-center gap-1"><span className="w-0.5 h-3 bg-red-500/80 inline-block" /> Hard</span>
                  </div>
                </div>
              )}

              {/* Budget rows */}
              <div className="space-y-2">
                {budgetEntries.length === 0 && !showForm && (
                  <div className="flex flex-col items-center gap-2 py-5 text-center">
                    <div className="rounded-2xl bg-amber-50 p-3"><Target size={22} className="text-amber-400" /></div>
                    <p className="text-xs text-stone-500 font-medium">No budgets yet</p>
                    <p className="text-[10px] text-stone-400 max-w-[200px] leading-relaxed">Set a monthly budget + optional hard limit per category.</p>
                  </div>
                )}

                {budgetEntries.map(([cat, cfg]) => {
                  const spent = spentByCategory[cat] || 0
                  if (editingCategory === cat && showForm) {
                    return <BudgetForm key={cat} categories={categories} existingCategory={cat}
                      existingCfg={cfg} usedCategories={usedCategories.filter(c => c !== cat)}
                      sym={sym} onSave={handleSave} onCancel={cancelForm} />
                  }
                  return <BudgetRow key={cat} category={cat} cfg={cfg} spent={spent} sym={sym}
                    isPast={isPast} onEdit={() => startEdit(cat)} onDelete={() => setDeleteTargetCategory(cat)}
                    onClick={() => setDetailCategory(cat)} />
                })}

                {showForm && !editingCategory && (
                  <BudgetForm categories={categories} existingCategory={null} existingCfg={null}
                    usedCategories={usedCategories} sym={sym} onSave={handleSave} onCancel={cancelForm} />
                )}
              </div>

              {!showForm && !isPast && (
                <button type="button" onClick={() => { setEditingCategory(null); setShowForm(true) }}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-amber-300 bg-amber-50/40 py-2.5 text-xs font-semibold text-amber-700 hover:bg-amber-100/50 transition-colors">
                  <Plus size={13} /> Set Budget for a Category
                </button>
              )}

              <p className="text-[10px] text-stone-400 text-center">
                {isPast ? `Historical view for ${label}.` : 'Use ‹ › to browse past months.'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {detailCategory && (
        <BudgetDetailModal category={detailCategory} cfg={budgets[detailCategory] || { soft: 0, hard: 0, warnAt: 80 }}
          spent={spentByCategory[detailCategory] || 0} sym={sym}
          transactions={monthEntries.filter(e => (e.category || 'General') === detailCategory).sort((a, b) => b.timestamp - a.timestamp)}
          bookIdMap={bookIdMap} label={label} onClose={() => setDetailCategory(null)} />
      )}

      {/* Delete Monthly Budget Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTargetCategory)}
        onClose={() => setDeleteTargetCategory(null)}
        onConfirm={async () => {
          await onDeleteBudget(deleteTargetCategory)
          setDeleteTargetCategory(null)
        }}
        title={`Delete Budget for "${deleteTargetCategory}"?`}
        message={`Are you sure you want to remove the monthly budget configuration for category "${deleteTargetCategory}"?`}
        danger
      />
    </motion.section>
  )
}
