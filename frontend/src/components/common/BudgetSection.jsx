import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Target, Plus, X, ChevronLeft, ChevronRight, Pencil, Trash2, ShieldAlert, Loader2, Check } from 'lucide-react'
import { format } from 'date-fns'
import ConfirmDialog from './ConfirmDialog'
import {
  SUB_SEP, INVALID_KEY_RE, toMonthKey, offsetMonth, monthLabel, monthProgress, monthBounds,
  splitBudgetKey, entryMatchesBudget, spentInMonth, averageMonthlySpend, projectSpend,
  budgetZone, ZONE_META, ZONE_RANK, topLevelBudgetKeys,
} from '../../lib/budgets'
import { compareNewestFirst } from '../../lib/entryOrder'
import { useI18n } from '../../i18n/core'
import { Trans } from '../../i18n/Trans'

const card = 'rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)]'
const sectionTitle = 'text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-subtle)]'
const ALERT_STEPS = [70, 80, 90]

const roundSuggestion = (v) => (v >= 1000 ? Math.ceil(v / 100) * 100 : Math.ceil(v / 10) * 10)

const zoneLabel = (t, zone) => ({
  safe: t('budget.zone.safe'),
  pace: t('budget.zone.pace'),
  warning: t('budget.zone.warning'),
  over: t('budget.zone.over'),
  hard: t('budget.zone.hard'),
})[zone]

// ── Small pieces ───────────────────────────────────────────────────────────
function Ring({ pct, color, size = 58 }) {
  const stroke = 5
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const shown = Math.min(Math.max(pct, 0), 100)
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border-subtle)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - shown / 100) }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[12px] font-semibold tabular-nums text-[var(--text-main)]">
        {Math.round(pct)}%
      </span>
    </div>
  )
}

function Bar({ spent, soft, warnAt, color, projected }) {
  const fill = soft > 0 ? Math.min((spent / soft) * 100, 100) : 0
  const pace = projected && soft > 0 ? Math.min((projected / soft) * 100, 100) : null
  return (
    <div className="relative h-1.5 overflow-hidden rounded-full bg-[var(--border-subtle)]">
      {pace !== null && pace > fill && (
        <div className="absolute inset-y-0 left-0 rounded-full opacity-25" style={{ width: `${pace}%`, backgroundColor: color }} />
      )}
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${fill}%` }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      />
      {warnAt < 100 && fill < warnAt && (
        <span className="absolute inset-y-0 w-px bg-[var(--text-subtle)]/40" style={{ left: `${warnAt}%` }} />
      )}
    </div>
  )
}

function KeyLabel({ budgetKey, className = '' }) {
  const { category, sub } = splitBudgetKey(budgetKey)
  return (
    <span className={`flex min-w-0 items-center gap-1.5 ${className}`}>
      <span className="truncate">{category}</span>
      {sub && (
        <span className="flex-shrink-0 rounded-md bg-[var(--border-subtle)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">{sub}</span>
      )}
    </span>
  )
}

function Sheet({ onClose, label, children, wide = false }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4"
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.div
        role="dialog" aria-modal="true" aria-label={label}
        initial={{ y: 28, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 28, opacity: 0 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        className={`relative flex w-full ${wide ? 'sm:max-w-[480px]' : 'sm:max-w-[440px]'} flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl border border-[var(--border-card)] bg-[var(--bg-page)] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45)]`}
        style={{ maxHeight: '88vh', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

function SheetHeader({ title, subtitle, onClose }) {
  const { t } = useI18n()
  return (
    <div className="flex flex-shrink-0 items-start justify-between gap-3 border-b border-[var(--border-subtle)] px-5 pt-5 pb-4">
      <div className="min-w-0">
        <h3 className="truncate text-[15px] font-semibold text-[var(--text-main)]">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[11px] text-[var(--text-subtle)]">{subtitle}</p>}
      </div>
      <button type="button" onClick={onClose} aria-label={t('common.close')}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer">
        <X size={15} />
      </button>
    </div>
  )
}

// ── Add / edit dialog ──────────────────────────────────────────────────────
function BudgetForm({ editingKey, initialCfg, options, usedKeys, expenses, sym, onSave, onClose }) {
  const { t } = useI18n()
  const [now] = useState(() => new Date())
  const initial = editingKey ? splitBudgetKey(editingKey) : { category: '', sub: null }
  const [category, setCategory] = useState(initial.category)
  const [sub, setSub] = useState(initial.sub)
  const [amount, setAmount] = useState(initialCfg?.soft ? String(initialCfg.soft) : '')
  const [hard, setHard] = useState(initialCfg?.hard ? String(initialCfg.hard) : '')
  const [warnAt, setWarnAt] = useState(initialCfg?.warnAt ?? 80)
  const [useHard, setUseHard] = useState(Boolean(initialCfg?.hard))
  const [query, setQuery] = useState('')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  const key = category ? (sub ? `${category}${SUB_SEP}${sub}` : category) : ''
  const subs = options.find(o => o.name === category)?.subs || []
  const lastMonthKey = offsetMonth(toMonthKey(now), -1)
  const spentLastMonthLabel = t('budget.spentIn', { month: monthLabel(lastMonthKey, { month: 'short' }) })

  // Last month's spend per category, shown next to each option
  const lastMonthByCat = useMemo(() => {
    const out = {}
    options.forEach(o => { out[o.name] = spentInMonth(expenses, o.name, lastMonthKey) })
    return out
  }, [options, expenses, lastMonthKey])

  const suggestion = useMemo(() => (key ? roundSuggestion(averageMonthlySpend(expenses, key, now)) : 0), [expenses, key, now])
  const softNum = Number(amount) || 0
  const hardNum = useHard ? Number(hard) || 0 : 0
  const daysInMonth = monthBounds(toMonthKey(now)).daysInMonth

  const q = query.trim().toLowerCase()
  const filtered = q ? options.filter(o => o.name.toLowerCase().includes(q)) : options
  const isTaken = (o) => usedKeys.includes(o.name) && o.subs.every(s => usedKeys.includes(`${o.name}${SUB_SEP}${s}`))

  const submit = async (e) => {
    e.preventDefault()
    if (!key) return setErr(t('budget.errors.chooseCategory'))
    if (INVALID_KEY_RE.test(key)) return setErr(t('budget.errors.invalidChars'))
    if (!editingKey && usedKeys.includes(key)) return setErr(t('budget.errors.exists', { name: key }))
    if (softNum <= 0) return setErr(t('budget.errors.enterAmount'))
    if (useHard && hardNum > 0 && hardNum <= softNum) return setErr(t('budget.errors.hardTooLow'))
    setSaving(true)
    try {
      await onSave(key, { soft: Math.round(softNum * 100) / 100, hard: hardNum, warnAt: Number(warnAt) || 80 })
      onClose()
    } catch {
      setErr(t('budget.errors.saveFailed'))
      setSaving(false)
    }
  }

  return (
    <Sheet onClose={onClose} label={editingKey ? t('budget.edit') : t('budget.new')}>
      <SheetHeader
        title={editingKey ? t('budget.edit') : t('budget.new')}
        subtitle={t('budget.form.subtitle')}
        onClose={onClose}
      />
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">

          {/* ── Amount ── */}
          <div className="text-center">
            <p className="truncate text-[11px] font-medium text-[var(--text-subtle)]">
              {key ? <Trans k="budget.form.monthlyBudgetFor" vars={{ name: key }} components={{ b: <span className="font-semibold text-[var(--text-main)]" /> }} /> : t('budget.form.monthlyBudget')}
            </p>
            <label className="mt-1.5 flex items-baseline justify-center gap-1">
              <span className="text-[24px] font-semibold text-[var(--text-subtle)]">{sym}</span>
              <input
                type="number" inputMode="decimal" min="0" step="any" value={amount} placeholder="0"
                onChange={e => { setAmount(e.target.value); setErr('') }}
                autoFocus={Boolean(editingKey)}
                aria-label={t('budget.form.amountLabel')}
                style={{ width: `${Math.max(String(amount || '0').length, 1) + 0.6}ch` }}
                className="no-spin max-w-[70vw] bg-transparent text-center text-[40px] font-bold leading-none tracking-tight tabular-nums text-[var(--text-main)] placeholder:text-[var(--text-subtle)]/50 outline-none"
              />
            </label>
            <div className="mt-2.5 flex min-h-[26px] flex-wrap items-center justify-center gap-2">
              {softNum > 0 && (
                <span className="text-[12px] text-[var(--text-muted)]">
                  <Trans k="budget.form.perDay" vars={{ amount: `${sym}${Math.round(softNum / daysInMonth).toLocaleString('en-IN')}` }} components={{ b: <span className="font-semibold text-[var(--text-main)]" /> }} />
                </span>
              )}
              {suggestion > 0 && softNum !== suggestion && (
                <button type="button" onClick={() => { setAmount(String(suggestion)); setErr('') }}
                  className="rounded-full border border-[var(--border-card)] bg-[var(--bg-card)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-muted)] hover:border-[var(--gold-primary)] hover:text-[var(--text-main)] transition-colors cursor-pointer">
                  <Trans k="budget.form.usually" vars={{ amount: `${sym}${suggestion.toLocaleString('en-IN')}` }} components={{ b: <span className="font-semibold text-[var(--gold-primary)]" /> }} />
                </button>
              )}
            </div>
          </div>

          {/* ── Category ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <p className={sectionTitle}>{t('common.category')}</p>
              {!editingKey && options.length > 0 && <span className="text-[11px] text-[var(--text-subtle)]">{spentLastMonthLabel}</span>}
            </div>

            {editingKey ? (
              <div className={`${card} flex items-center gap-3 px-4 py-3`}>
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--gold-light)] text-[12px] font-semibold text-[var(--gold-primary)]">
                  {initial.category.charAt(0).toUpperCase()}
                </span>
                <KeyLabel budgetKey={editingKey} className="text-[13px] font-medium text-[var(--text-main)]" />
              </div>
            ) : options.length === 0 ? (
              <p className={`${card} px-4 py-4 text-center text-[12px] text-[var(--text-subtle)]`}>{t('budget.form.noCategories')}</p>
            ) : (
              <div className={card}>
                {options.length > 7 && (
                  <div className="border-b border-[var(--border-subtle)] px-4 py-2.5">
                    <input
                      value={query} onChange={e => setQuery(e.target.value)} placeholder={t('budget.form.searchCategories')}
                      className="w-full bg-transparent text-[13px] text-[var(--text-main)] placeholder:text-[var(--text-subtle)] outline-none"
                    />
                  </div>
                )}
                <ul className="max-h-[232px] divide-y divide-[var(--border-subtle)] overflow-y-auto">
                  {filtered.map(o => {
                    const active = category === o.name
                    const taken = isTaken(o)
                    const last = lastMonthByCat[o.name] || 0
                    return (
                      <li key={o.name}>
                        <button
                          type="button" disabled={taken}
                          onClick={() => { setCategory(o.name); setSub(null); setErr('') }}
                          className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
                            active ? 'bg-[var(--gold-light)]' : 'hover:bg-[var(--border-subtle)]/60'
                          }`}
                        >
                          <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[12px] font-semibold transition-colors ${
                            active ? 'bg-[var(--gold-primary)] text-white' : 'bg-[var(--border-subtle)] text-[var(--text-muted)]'
                          }`}>
                            {active ? <Check size={14} strokeWidth={3} /> : o.name.charAt(0).toUpperCase()}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-medium text-[var(--text-main)]">{o.name}</span>
                            <span className="block truncate text-[11px] text-[var(--text-subtle)]">
                              {taken ? t('budget.form.alreadyBudgeted') : o.subs.length ? t('budget.form.subCount', { count: o.subs.length }) : t('budget.form.noSubs')}
                            </span>
                          </span>
                          <span className="flex-shrink-0 text-[12px] font-medium tabular-nums text-[var(--text-muted)]">
                            {last > 0 ? `${sym}${Math.round(last).toLocaleString('en-IN')}` : '—'}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                  {filtered.length === 0 && (
                    <li className="px-4 py-4 text-center text-[12px] text-[var(--text-subtle)]">{t('budget.form.noMatch', { query })}</li>
                  )}
                </ul>
              </div>
            )}

            <AnimatePresence initial={false}>
              {!editingKey && subs.length > 0 && (
                <motion.div
                  key={category}
                  initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }} className="overflow-hidden"
                >
                  <p className="px-1 pt-1 text-[11px] text-[var(--text-subtle)]">{t('budget.form.limitToSub')}</p>
                  <div className="flex gap-1.5 overflow-x-auto pt-1.5 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {[null, ...subs].map(s => {
                      const k = s ? `${category}${SUB_SEP}${s}` : category
                      const active = sub === s
                      return (
                        <button key={s ?? '__all'} type="button" disabled={usedKeys.includes(k)}
                          onClick={() => { setSub(s); setErr('') }}
                          className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-[12px] transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
                            active
                              ? 'border-[var(--gold-primary)] bg-[var(--gold-light)] font-semibold text-[var(--text-main)]'
                              : 'border-[var(--border-card)] bg-[var(--bg-card)] font-medium text-[var(--text-muted)] hover:text-[var(--text-main)]'
                          }`}>
                          {s ?? t('budget.form.allOf', { category })}
                        </button>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Alerts ── */}
          <div className="space-y-2">
            <p className={`${sectionTitle} px-1`}>{t('budget.form.alerts')}</p>
            <div className={`${card} divide-y divide-[var(--border-subtle)]`}>
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-[var(--text-main)]">{t('budget.form.warnAt')}</p>
                  <p className="truncate text-[11px] text-[var(--text-subtle)]">
                    {softNum > 0 ? t('budget.form.warnAfter', { amount: `${sym}${Math.round(softNum * Number(warnAt) / 100).toLocaleString('en-IN')}` }) : t('budget.form.warnShare')}
                  </p>
                </div>
                <div className="relative isolate grid flex-shrink-0 grid-cols-3 rounded-lg bg-[var(--border-subtle)] p-0.5">
                  <motion.span
                    aria-hidden initial={false}
                    animate={{ x: `${Math.max(ALERT_STEPS.indexOf(Number(warnAt)), 0) * 100}%` }}
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                    className="absolute inset-y-0.5 left-0.5 -z-10 w-[calc((100%-4px)/3)] rounded-md bg-[var(--bg-card)] shadow-sm"
                  />
                  {ALERT_STEPS.map(n => (
                    <button key={n} type="button" onClick={() => setWarnAt(n)}
                      className={`px-2.5 py-1 text-[12px] font-semibold tabular-nums transition-colors cursor-pointer ${
                        Number(warnAt) === n ? 'text-[var(--text-main)]' : 'text-[var(--text-subtle)] hover:text-[var(--text-main)]'
                      }`}>
                      {n}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="px-4 py-3">
                <button type="button" role="switch" aria-checked={useHard} onClick={() => { setUseHard(v => !v); setErr('') }}
                  className="flex w-full items-center justify-between gap-3 text-left cursor-pointer">
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--text-main)]">
                      <ShieldAlert size={13} className="text-[var(--text-subtle)]" /> {t('budget.form.hardLimit')}
                    </span>
                    <span className="block truncate text-[11px] text-[var(--text-subtle)]">{t('budget.form.hardHint')}</span>
                  </span>
                  <span className={`relative h-6 w-10 flex-shrink-0 rounded-full transition-colors ${useHard ? 'bg-[var(--gold-primary)]' : 'bg-[var(--border-card)]'}`}>
                    <motion.span
                      initial={false} animate={{ x: useHard ? 16 : 0 }}
                      transition={{ type: 'spring', stiffness: 600, damping: 35 }}
                      className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow"
                    />
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {useHard && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }} className="overflow-hidden">
                      <div className="mt-3 flex items-center gap-2 rounded-xl border border-[var(--border-card)] bg-[var(--bg-page)] px-3 py-2.5 focus-within:border-[var(--gold-primary)] transition-colors">
                        <span className="text-[13px] text-[var(--text-subtle)]">{sym}</span>
                        <input
                          type="number" inputMode="decimal" min="0" step="any" value={hard}
                          placeholder={softNum ? t('budget.form.example', { amount: Math.round(softNum * 1.2) }) : t('common.amount')}
                          onChange={e => { setHard(e.target.value); setErr('') }}
                          className="no-spin w-full bg-transparent text-[14px] font-medium tabular-nums text-[var(--text-main)] placeholder:text-[var(--text-subtle)] outline-none"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {err && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="rounded-xl bg-rose-500/10 px-3 py-2 text-[12px] text-rose-600 dark:text-rose-400">
                {err}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-shrink-0 border-t border-[var(--border-subtle)] px-5 py-4">
          <button type="submit" disabled={saving || !key || softNum <= 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--gold-primary)] py-3 text-[14px] font-semibold text-white hover:bg-[var(--gold-hover)] transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed">
            {saving && <Loader2 size={15} className="animate-spin" />}
            {editingKey
              ? t('budget.form.saveChanges')
              : key && softNum > 0 ? t('budget.form.setAmount', { amount: `${sym}${softNum.toLocaleString('en-IN')}` }) : t('budget.create')}
          </button>
        </div>
      </form>
    </Sheet>
  )
}

// ── Detail sheet ───────────────────────────────────────────────────────────
function BudgetDetail({ state, monthKey, progress, transactions, money, bookIdMap, onEdit, onDelete, onOpenEntry, onClose }) {
  const { t, locale } = useI18n()
  const { key, cfg, spent, projected, zone } = state
  const meta = ZONE_META[zone]
  const left = cfg.soft - spent
  const perDay = progress.isCurrent && progress.daysLeft > 0 && left > 0 ? left / progress.daysLeft : null

  const facts = [
    { id: 'left', label: left >= 0 ? t('budget.detail.left') : t('budget.detail.over'), value: money(Math.abs(left)), tone: left >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400' },
    perDay !== null
      ? { id: 'perDay', label: t('budget.detail.perDayLeft'), value: money(perDay) }
      : { id: 'count', label: t('budget.detail.transactions'), value: String(transactions.length) },
    projected !== null
      ? { id: 'pace', label: t('budget.detail.monthEndPace'), value: money(projected), tone: projected > cfg.soft ? 'text-amber-600 dark:text-amber-400' : '' }
      : { id: 'avg', label: t('budget.detail.avgEach'), value: transactions.length ? money(spent / transactions.length) : '—' },
  ]

  return (
    <Sheet onClose={onClose} label={key} wide>
      <SheetHeader title={<KeyLabel budgetKey={key} />} subtitle={monthLabel(monthKey)} onClose={onClose} />
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <div className={`${card} p-4`}>
          <div className="flex items-center gap-4">
            <Ring pct={cfg.soft > 0 ? (spent / cfg.soft) * 100 : 0} color={meta.color} />
            <div className="min-w-0 flex-1">
              <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.pill}`}>{zoneLabel(t, zone)}</span>
              <p className="mt-1 text-[22px] font-bold leading-tight tabular-nums text-[var(--text-main)]">{money(spent)}</p>
              <p className="text-[12px] text-[var(--text-subtle)]">{t('budget.detail.ofBudget', { amount: money(cfg.soft) })}</p>
            </div>
          </div>
          <div className="mt-4"><Bar spent={spent} soft={cfg.soft} warnAt={cfg.warnAt} color={meta.color} projected={projected} /></div>
          <div className="mt-4 grid grid-cols-3 divide-x divide-[var(--border-subtle)] text-center">
            {facts.map(f => (
              <div key={f.id} className="px-1">
                <p className="text-[10px] text-[var(--text-subtle)]">{f.label}</p>
                <p className={`mt-0.5 truncate text-[13px] font-semibold tabular-nums ${f.tone || 'text-[var(--text-main)]'}`}>{f.value}</p>
              </div>
            ))}
          </div>
          {cfg.hard > 0 && (
            <div className="mt-4 flex items-center justify-between rounded-xl bg-[var(--border-subtle)] px-3 py-2 text-[12px]">
              <span className="flex items-center gap-1.5 text-[var(--text-muted)]"><ShieldAlert size={13} /> {t('budget.form.hardLimit')}</span>
              <span className={`font-semibold tabular-nums ${spent > cfg.hard ? 'text-rose-600 dark:text-rose-400' : 'text-[var(--text-main)]'}`}>
                {money(cfg.hard)}{spent > cfg.hard ? ` · ${t('budget.detail.hardOver', { amount: money(spent - cfg.hard) })}` : ''}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <p className={`${sectionTitle} px-1`}>{t('budget.detail.transactions')}</p>
          {transactions.length === 0 ? (
            <p className="py-8 text-center text-[12px] text-[var(--text-subtle)]">{t('budget.detail.nothingSpent', { month: monthLabel(monthKey, { month: 'long' }) })}</p>
          ) : (
            <ul className={`${card} divide-y divide-[var(--border-subtle)]`}>
              {transactions.map(txn => {
                const book = bookIdMap[txn.bookId]
                const sub = [format(new Date(txn.timestamp), 'd MMM', { locale }), txn.subcategory, book?.bookName].filter(Boolean).join(' · ')
                return (
                  <li key={txn.id}>
                    <button type="button" onClick={() => onOpenEntry(txn)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--border-subtle)]/60 cursor-pointer first:rounded-t-2xl last:rounded-b-2xl">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-[var(--text-main)]">{txn.description || t('budget.detail.expenseFallback')}</span>
                        <span className="block truncate text-[11px] text-[var(--text-subtle)]">{sub}</span>
                      </span>
                      <span className="flex-shrink-0 text-[13px] font-semibold tabular-nums text-[var(--text-main)]">−{money(txn.amount)}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
      <div className="grid flex-shrink-0 grid-cols-2 gap-2 border-t border-[var(--border-subtle)] px-5 py-4">
        <button type="button" onClick={onDelete}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border-card)] py-2.5 text-[13px] font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer">
          <Trash2 size={14} /> {t('common.remove')}
        </button>
        <button type="button" onClick={onEdit}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-[var(--gold-primary)] py-2.5 text-[13px] font-semibold text-white hover:bg-[var(--gold-hover)] transition-colors cursor-pointer">
          <Pencil size={14} /> {t('budget.edit')}
        </button>
      </div>
    </Sheet>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function BudgetSection({
  budgets, allExpenseEntries = [], categories = [], sym = '₹', money,
  onSetBudget, onDeleteBudget, onOpenEntry, bookIdMap = {},
}) {
  const { t } = useI18n()
  const [now] = useState(() => new Date())
  const currentKey = toMonthKey(now)
  const [monthKey, setMonthKey] = useState(currentKey)
  const [form, setForm] = useState(null)          // { key: string|null }
  const [detailKey, setDetailKey] = useState(null)
  const [deleteKey, setDeleteKey] = useState(null)
  const fmt = money || ((n) => `${sym}${Math.round(Number(n) || 0).toLocaleString('en-IN')}`)

  const expenses = allExpenseEntries
  const earliestKey = useMemo(() => {
    let min = currentKey
    expenses.forEach(e => { if (e.timestamp) { const k = toMonthKey(new Date(e.timestamp)); if (k < min) min = k } })
    return min
  }, [expenses, currentKey])

  // Category options = configured categories + any seen on expenses
  const options = useMemo(() => {
    const map = new Map()
    const add = (name, sub) => {
      if (!name) return
      if (!map.has(name)) map.set(name, new Set())
      if (sub) map.get(name).add(sub)
    }
    categories.forEach(c => {
      if (typeof c === 'string') add(c)
      else if (c?.name) { add(c.name); (c.subcategories || []).forEach(s => add(c.name, s)) }
    })
    expenses.forEach(e => add(e.category || 'General', e.subcategory))
    return [...map.entries()].map(([name, subs]) => ({ name, subs: [...subs].sort() })).sort((a, b) => a.name.localeCompare(b.name))
  }, [categories, expenses])

  const progress = useMemo(() => monthProgress(monthKey, now), [monthKey, now])
  const states = useMemo(() => Object.entries(budgets)
    .filter(([, cfg]) => cfg?.soft > 0)
    .map(([key, cfg]) => {
      const spent = spentInMonth(expenses, key, monthKey)
      const projected = projectSpend(spent, progress)
      return { key, cfg, spent, projected, zone: budgetZone({ spent, ...cfg, projected }) }
    })
    .sort((a, b) => ZONE_RANK[a.zone] - ZONE_RANK[b.zone] || b.spent / b.cfg.soft - a.spent / a.cfg.soft),
  [budgets, expenses, monthKey, progress])

  const usedKeys = useMemo(() => states.map(s => s.key), [states])

  // Overall — subcategory budgets are not double counted under a budgeted parent
  const overall = useMemo(() => {
    const top = new Set(topLevelBudgetKeys(usedKeys))
    const list = states.filter(s => top.has(s.key))
    const budget = list.reduce((s, b) => s + b.cfg.soft, 0)
    const spent = list.reduce((s, b) => s + b.spent, 0)
    const projected = projectSpend(spent, progress)
    const zone = budgetZone({ spent, soft: budget, warnAt: 80, projected })
    return { budget, spent, projected, zone, left: budget - spent }
  }, [states, usedKeys, progress])

  const attention = states.filter(s => s.zone !== 'safe').length
  const detailState = states.find(s => s.key === detailKey)
  const detailTxns = useMemo(() => {
    if (!detailKey) return []
    const { start, end } = monthBounds(monthKey)
    return expenses
      .filter(e => e.timestamp >= start && e.timestamp <= end && entryMatchesBudget(e, detailKey))
      .sort(compareNewestFirst)
  }, [expenses, detailKey, monthKey])

  const perDay = progress.isCurrent && progress.daysLeft > 0 && overall.left > 0 ? overall.left / progress.daysLeft : null
  const navBtn = 'flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--border-subtle)] hover:text-[var(--text-main)] transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer'

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 className={sectionTitle}>{t('budget.title')}</h2>
        <div className="flex items-center gap-0.5 rounded-full border border-[var(--border-card)] bg-[var(--bg-card)] px-1 py-0.5">
          <button type="button" className={navBtn} disabled={monthKey <= earliestKey} onClick={() => setMonthKey(k => offsetMonth(k, -1))} aria-label={t('budget.prevMonth')}>
            <ChevronLeft size={14} />
          </button>
          <span className="min-w-[72px] text-center text-[12px] font-semibold text-[var(--text-main)]">
            {monthLabel(monthKey, { month: 'short', year: 'numeric' })}
          </span>
          <button type="button" className={navBtn} disabled={monthKey >= currentKey} onClick={() => setMonthKey(k => offsetMonth(k, 1))} aria-label={t('budget.nextMonth')}>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className={card}>
        {states.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--gold-light)] text-[var(--gold-primary)]">
              <Target size={20} />
            </span>
            <div>
              <p className="text-[14px] font-semibold text-[var(--text-main)]">{t('budget.empty.title')}</p>
              <p className="mx-auto mt-1 max-w-[260px] text-[12px] leading-relaxed text-[var(--text-subtle)]">
                {t('budget.empty.text')}
              </p>
            </div>
            <button type="button" onClick={() => setForm({ key: null })}
              className="mt-1 flex items-center gap-1.5 rounded-full bg-[var(--gold-primary)] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[var(--gold-hover)] transition-colors cursor-pointer">
              <Plus size={14} /> {t('budget.create')}
            </button>
          </div>
        ) : (
          <>
            {/* Overall */}
            <div className="flex items-center gap-4 px-5 pt-4 pb-4">
              <Ring pct={overall.budget > 0 ? (overall.spent / overall.budget) * 100 : 0} color={ZONE_META[overall.zone].color} />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-[var(--text-subtle)]">{progress.isCurrent ? t('budget.spentThisMonth') : t('budget.spentIn', { month: monthLabel(monthKey, { month: 'long' }) })}</p>
                <p className="truncate text-[20px] font-bold leading-tight tabular-nums text-[var(--text-main)]">
                  <Trans k="budget.spentOf" vars={{ spent: fmt(overall.spent), budget: fmt(overall.budget) }} components={{ muted: <span className="text-[13px] font-medium text-[var(--text-subtle)]" /> }} />
                </p>
                <p className="mt-0.5 truncate text-[12px] text-[var(--text-muted)]">
                  {overall.left < 0
                    ? <span className="text-rose-600 dark:text-rose-400">{t('budget.overBudget', { amount: fmt(-overall.left) })}</span>
                    : perDay !== null
                      ? <Trans k="budget.leftPerDay" vars={{ left: fmt(overall.left), perDay: fmt(perDay), count: progress.daysLeft }} components={{ hl: <span className="text-[var(--text-main)]" /> }} />
                      : t('budget.leftUnspent', { amount: fmt(overall.left) })}
                </p>
              </div>
            </div>
            {attention > 0 && (
              <p className="mx-5 mb-3 rounded-xl bg-amber-500/10 px-3 py-2 text-[12px] text-amber-700 dark:text-amber-400">
                {t('budget.attention', { count: attention })}
              </p>
            )}

            {/* Rows */}
            <ul className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
              {states.map(s => {
                const meta = ZONE_META[s.zone]
                const left = s.cfg.soft - s.spent
                return (
                  <li key={s.key}>
                    <button type="button" onClick={() => setDetailKey(s.key)}
                      className="group w-full space-y-2 px-5 py-3.5 text-left transition-colors hover:bg-[var(--border-subtle)]/60 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <KeyLabel budgetKey={s.key} className="flex-1 text-[13px] font-medium text-[var(--text-main)]" />
                        <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.pill}`}>{zoneLabel(t, s.zone)}</span>
                      </div>
                      <Bar spent={s.spent} soft={s.cfg.soft} warnAt={s.cfg.warnAt} color={meta.color} projected={s.projected} />
                      <div className="flex items-center justify-between text-[11px] tabular-nums">
                        <span className="text-[var(--text-muted)]">
                          <Trans k="budget.rowSpent" vars={{ spent: fmt(s.spent), budget: fmt(s.cfg.soft) }} components={{ b: <span className="font-semibold text-[var(--text-main)]" /> }} />
                        </span>
                        <span className={left < 0 ? 'font-medium text-rose-600 dark:text-rose-400' : 'text-[var(--text-subtle)]'}>
                          {left < 0 ? t('budget.rowOver', { amount: fmt(-left) }) : s.zone === 'pace' ? t('budget.rowPace', { amount: fmt(s.projected) }) : t('budget.rowLeft', { amount: fmt(left) })}
                        </span>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>

            <button type="button" onClick={() => setForm({ key: null })}
              className="flex w-full items-center justify-center gap-1.5 rounded-b-2xl border-t border-[var(--border-subtle)] py-3 text-[13px] font-semibold text-[var(--gold-primary)] hover:bg-[var(--gold-light)] transition-colors cursor-pointer">
              <Plus size={14} /> {t('budget.new')}
            </button>
          </>
        )}
      </div>

      {createPortal(
        <AnimatePresence>
          {detailState && !form && (
            <BudgetDetail
              key="detail"
              state={detailState} monthKey={monthKey} progress={progress} transactions={detailTxns}
              money={fmt} bookIdMap={bookIdMap}
              onEdit={() => setForm({ key: detailState.key })}
              onDelete={() => setDeleteKey(detailState.key)}
              onOpenEntry={(e) => { setDetailKey(null); onOpenEntry?.(e) }}
              onClose={() => setDetailKey(null)}
            />
          )}
          {form && (
            <BudgetForm
              key={`form-${form.key || 'new'}`}
              editingKey={form.key} initialCfg={form.key ? budgets[form.key] : null}
              options={options} usedKeys={usedKeys} expenses={expenses} sym={sym}
              onSave={onSetBudget}
              onClose={() => setForm(null)}
            />
          )}
        </AnimatePresence>,
        document.body,
      )}

      <ConfirmDialog
        open={Boolean(deleteKey)}
        onClose={() => setDeleteKey(null)}
        onConfirm={async () => {
          await onDeleteBudget(deleteKey)
          setDetailKey(null)
        }}
        title={t('budget.remove.title')}
        message={t('budget.remove.message', { name: deleteKey })}
        danger
      />
    </section>
  )
}
