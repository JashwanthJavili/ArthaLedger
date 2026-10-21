import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import { toMonthKey, offsetMonth, monthLabel, monthBounds } from '../../lib/budgets'

const PALETTE = ['#C5A059', '#7FA58A', '#D88A7A', '#6FA3B5', '#B39BD0', '#E0A166', '#9C8B73', '#8FB8A2']
const VIEWS = [{ id: 'month', label: 'Monthly' }, { id: 'year', label: 'Yearly' }]
const COLLAPSED_CATS = 6

const sumAmounts = (list) => list.reduce((s, e) => s + Number(e.amount || 0), 0)
const subTitle = 'text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-subtle)]'

/** Category → { value, count, subs: [{ name, value, count }] }, largest first */
function classify(list) {
  const map = new Map()
  list.forEach(e => {
    const name = e.category || 'General'
    const amt = Number(e.amount || 0)
    if (!map.has(name)) map.set(name, { name, value: 0, count: 0, subs: new Map() })
    const c = map.get(name)
    c.value += amt
    c.count += 1
    const sub = e.subcategory || 'Other'
    const s = c.subs.get(sub) || { name: sub, value: 0, count: 0 }
    s.value += amt
    s.count += 1
    c.subs.set(sub, s)
  })
  return [...map.values()]
    .map(c => ({ ...c, subs: [...c.subs.values()].sort((a, b) => b.value - a.value) }))
    .sort((a, b) => b.value - a.value)
}

function ShareBar({ pct, color, delay = 0 }) {
  return (
    <div className="h-1 overflow-hidden rounded-full bg-[var(--border-subtle)]">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(pct, 100)}%` }}
        transition={{ duration: 0.5, delay, ease: 'easeOut' }}
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
      />
    </div>
  )
}

/**
 * Spending summary: totals for a month (defaults to last month) or a year,
 * classified by category → subcategory, and by month in the yearly view.
 */
export default function SpendingTrends({ expenses = [], money, onOpenCategory }) {
  const [now] = useState(() => new Date())
  const currentKey = toMonthKey(now)
  const [view, setView] = useState('month')
  const [monthKey, setMonthKey] = useState(() => offsetMonth(currentKey, -1))
  const [year, setYear] = useState(now.getFullYear())
  const [openCat, setOpenCat] = useState(null)
  const [showAll, setShowAll] = useState(false)

  const earliest = useMemo(() => {
    let min = now.getTime()
    expenses.forEach(e => { if (e.timestamp && e.timestamp < min) min = e.timestamp })
    return new Date(min)
  }, [expenses, now])
  const earliestKey = toMonthKey(earliest)

  const data = useMemo(() => {
    if (view === 'month') {
      const { start, end, daysInMonth } = monthBounds(monthKey)
      const list = expenses.filter(e => e.timestamp >= start && e.timestamp <= end)
      const prev = monthBounds(offsetMonth(monthKey, -1))
      const prevTotal = sumAmounts(expenses.filter(e => e.timestamp >= prev.start && e.timestamp <= prev.end))
      const days = new Map()
      list.forEach(e => { const d = new Date(e.timestamp).getDate(); days.set(d, (days.get(d) || 0) + Number(e.amount || 0)) })
      const [peakDay, peakValue] = [...days.entries()].sort((a, b) => b[1] - a[1])[0] || []
      const [y, m] = monthKey.split('-').map(Number)
      const daysCounted = monthKey === currentKey ? now.getDate() : daysInMonth
      return {
        list, prevTotal, months: null,
        compareLabel: monthLabel(offsetMonth(monthKey, -1), { month: 'short' }),
        stats: [
          { label: 'Daily average', value: money(sumAmounts(list) / daysCounted) },
          { label: 'Transactions', value: String(list.length) },
          {
            label: 'Highest day',
            value: peakDay ? money(peakValue) : '—',
            hint: peakDay ? new Date(y, m - 1, peakDay).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '',
          },
        ],
      }
    }
    const start = new Date(year, 0, 1).getTime()
    const end = new Date(year + 1, 0, 1).getTime() - 1
    const list = expenses.filter(e => e.timestamp >= start && e.timestamp <= end)
    const prevTotal = sumAmounts(expenses.filter(e => new Date(e.timestamp).getFullYear() === year - 1))
    const lastMonth = year === now.getFullYear() ? now.getMonth() : 11
    const months = Array.from({ length: lastMonth + 1 }, (_, i) => ({ index: i, value: 0, count: 0 }))
    list.forEach(e => {
      const mm = months[new Date(e.timestamp).getMonth()]
      if (mm) { mm.value += Number(e.amount || 0); mm.count += 1 }
    })
    const peak = [...months].sort((a, b) => b.value - a.value)[0]
    return {
      list, prevTotal, months,
      compareLabel: String(year - 1),
      stats: [
        { label: 'Monthly average', value: money(sumAmounts(list) / (lastMonth + 1)) },
        { label: 'Transactions', value: String(list.length) },
        {
          label: 'Highest month',
          value: peak?.value ? money(peak.value) : '—',
          hint: peak?.value ? new Date(year, peak.index, 1).toLocaleDateString('en-IN', { month: 'long' }) : '',
        },
      ],
    }
  }, [view, monthKey, year, expenses, currentKey, now, money])

  const total = sumAmounts(data.list)
  const delta = data.prevTotal > 0 ? Math.round(((total - data.prevTotal) / data.prevTotal) * 100) : null
  const cats = useMemo(() => classify(data.list), [data.list])
  const shownCats = showAll ? cats : cats.slice(0, COLLAPSED_CATS)
  const maxMonth = data.months ? Math.max(...data.months.map(m => m.value), 0) : 0

  const periodLabel = view === 'month' ? monthLabel(monthKey) : String(year)
  const canPrev = view === 'month' ? monthKey > earliestKey : year > earliest.getFullYear()
  const canNext = view === 'month' ? monthKey < currentKey : year < now.getFullYear()
  const reset = () => { setOpenCat(null); setShowAll(false) }
  const step = (dir) => {
    reset()
    if (view === 'month') setMonthKey(k => offsetMonth(k, dir))
    else setYear(y => y + dir)
  }
  const openMonth = (index) => { reset(); setMonthKey(toMonthKey(new Date(year, index, 1))); setView('month') }

  const navBtn = 'flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--border-subtle)] hover:text-[var(--text-main)] transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer'

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-subtle)]">Spending summary</h2>
        <div className="relative isolate grid grid-cols-2 rounded-lg bg-[var(--border-subtle)] p-0.5">
          <motion.span
            aria-hidden initial={false}
            animate={{ x: view === 'month' ? '0%' : '100%' }}
            transition={{ type: 'spring', stiffness: 500, damping: 40 }}
            className="absolute inset-y-0.5 left-0.5 -z-10 w-[calc(50%-2px)] rounded-md bg-[var(--bg-card)] shadow-sm"
          />
          {VIEWS.map(v => (
            <button key={v.id} type="button" onClick={() => { reset(); setView(v.id) }}
              className={`px-3 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${view === v.id ? 'text-[var(--text-main)]' : 'text-[var(--text-subtle)] hover:text-[var(--text-main)]'}`}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)]">
        {/* Period */}
        <div className="flex items-center justify-between px-4 pt-3.5">
          <button type="button" className={navBtn} disabled={!canPrev} onClick={() => step(-1)} aria-label="Previous">
            <ChevronLeft size={15} />
          </button>
          <span className="text-[13px] font-semibold text-[var(--text-main)]">{periodLabel}</span>
          <button type="button" className={navBtn} disabled={!canNext} onClick={() => step(1)} aria-label="Next">
            <ChevronRight size={15} />
          </button>
        </div>

        {/* Total */}
        <div className="flex items-end justify-between gap-3 px-5 pt-3">
          <div className="min-w-0">
            <p className="text-[11px] text-[var(--text-subtle)]">Total spent</p>
            <p className="truncate text-[26px] font-bold leading-tight tabular-nums tracking-tight text-[var(--text-main)]">{money(total)}</p>
          </div>
          {delta !== null && (
            <span className={`mb-1.5 flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums ${
              delta > 0 ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            }`}>
              {delta > 0 ? '▲' : '▼'} {Math.abs(delta)}% vs {data.compareLabel}
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="mt-3.5 grid grid-cols-3 divide-x divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
          {data.stats.map(s => (
            <div key={s.label} className="min-w-0 px-3.5 py-2.5">
              <p className="truncate text-[10px] text-[var(--text-subtle)]">{s.label}</p>
              <p className="mt-0.5 truncate text-[13px] font-semibold tabular-nums text-[var(--text-main)]">{s.value}</p>
              {s.hint && <p className="truncate text-[10px] text-[var(--text-subtle)]">{s.hint}</p>}
            </div>
          ))}
        </div>

        {total === 0 ? (
          <p className="px-5 py-8 text-center text-[12px] text-[var(--text-subtle)]">No spending in {periodLabel}.</p>
        ) : (
          <>
            {/* By month (yearly view) */}
            {data.months && (
              <div className="border-b border-[var(--border-subtle)] px-5 pt-3.5 pb-2">
                <p className={subTitle}>By month</p>
                <ul className="mt-1.5">
                  {data.months.map((mm, i) => (
                    <li key={mm.index}>
                      <button type="button" onClick={() => openMonth(mm.index)} disabled={!mm.value}
                        className="group grid w-full grid-cols-[44px_1fr_auto] items-center gap-3 rounded-lg py-1.5 text-left disabled:cursor-default cursor-pointer">
                        <span className={`text-[12px] font-medium ${mm.value ? 'text-[var(--text-main)]' : 'text-[var(--text-subtle)]'}`}>
                          {new Date(year, mm.index, 1).toLocaleDateString('en-IN', { month: 'short' })}
                        </span>
                        <ShareBar pct={maxMonth ? (mm.value / maxMonth) * 100 : 0} color="var(--gold-primary)" delay={i * 0.02} />
                        <span className={`w-20 text-right text-[12px] font-semibold tabular-nums ${mm.value ? 'text-[var(--text-main)] group-hover:text-[var(--gold-primary)]' : 'text-[var(--text-subtle)]'}`}>
                          {mm.value ? money(mm.value) : '—'}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* By category → subcategory */}
            <div className="px-5 pt-3.5 pb-2">
              <div className="flex items-baseline justify-between">
                <p className={subTitle}>By category</p>
                <span className="text-[11px] text-[var(--text-subtle)]">{cats.length} {cats.length === 1 ? 'category' : 'categories'}</span>
              </div>
              <ul className="mt-1 divide-y divide-[var(--border-subtle)]">
                {shownCats.map((c, i) => {
                  const color = PALETTE[i % PALETTE.length]
                  const pct = (c.value / total) * 100
                  const expanded = openCat === c.name
                  return (
                    <li key={c.name} className="py-1">
                      <button type="button" onClick={() => setOpenCat(expanded ? null : c.name)} aria-expanded={expanded}
                        className="w-full space-y-1.5 rounded-lg py-2 text-left cursor-pointer">
                        <span className="flex items-center gap-2.5">
                          <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: color }} />
                          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--text-main)]">{c.name}</span>
                          <span className="flex-shrink-0 text-[11px] tabular-nums text-[var(--text-subtle)]">{pct.toFixed(0)}%</span>
                          <span className="w-20 flex-shrink-0 text-right text-[13px] font-semibold tabular-nums text-[var(--text-main)]">{money(c.value)}</span>
                          <ChevronDown size={14} className={`flex-shrink-0 text-[var(--text-subtle)] transition-transform ${expanded ? 'rotate-180' : ''}`} />
                        </span>
                        <span className="block pl-[18px] pr-6"><ShareBar pct={pct} color={color} delay={i * 0.03} /></span>
                      </button>

                      <AnimatePresence initial={false}>
                        {expanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }} className="overflow-hidden"
                          >
                            <div className="mb-2 ml-[18px] rounded-xl bg-[var(--border-subtle)]/60 px-3 py-2">
                              {c.subs.map(s => (
                                <div key={s.name} className="flex items-center gap-2 py-1 text-[12px]">
                                  <span className="min-w-0 flex-1 truncate text-[var(--text-muted)]">{s.name}</span>
                                  <span className="flex-shrink-0 text-[11px] tabular-nums text-[var(--text-subtle)]">{s.count}×</span>
                                  <span className="w-20 flex-shrink-0 text-right font-medium tabular-nums text-[var(--text-main)]">{money(s.value)}</span>
                                </div>
                              ))}
                              <button type="button" onClick={() => onOpenCategory?.(c.name)}
                                className="mt-1 text-[11px] font-semibold text-[var(--gold-primary)] cursor-pointer">
                                View {c.count} transaction{c.count === 1 ? '' : 's'} →
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </li>
                  )
                })}
              </ul>
              {cats.length > COLLAPSED_CATS && (
                <button type="button" onClick={() => setShowAll(v => !v)}
                  className="w-full py-2 text-center text-[12px] font-semibold text-[var(--gold-primary)] cursor-pointer">
                  {showAll ? 'Show less' : `Show all ${cats.length}`}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
