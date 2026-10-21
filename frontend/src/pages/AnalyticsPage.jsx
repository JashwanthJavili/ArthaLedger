import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import {
  BarChart3, TrendingUp, TrendingDown, Eye, EyeOff, X, ChevronRight, PiggyBank,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import LayoutShell from '../components/LayoutShell'
import BudgetSection from '../components/common/BudgetSection'
import { useAppData } from '../context/AppDataContext'
import { useBudgets } from '../hooks/useBudgets'
import { getCurrencySymbol, formatAmount } from '../lib/format'
import SpendingTrends from '../components/common/SpendingTrends'
import { compareNewestFirst } from '../lib/entryOrder'

const PALETTE = ['#C5A059', '#7FA58A', '#D88A7A', '#6FA3B5', '#B39BD0', '#E0A166', '#9C8B73', '#8FB8A2']

// Compact amount: ₹1.2L / ₹4.5K / ₹320 (uses the user's currency symbol)
const makeFmt = (sym) => (n) => {
  const v = Math.abs(Number(n) || 0)
  if (v >= 100000) return `${sym}${(v / 100000).toFixed(1)}L`
  if (v >= 1000) return `${sym}${(v / 1000).toFixed(1)}K`
  return `${sym}${v.toFixed(0)}`
}

const TOP_LIMITS = [5, 10, 20]
export default function AnalyticsPage() {
  const { entriesByBook, booksByProject, projects, categories = [] } = useAppData()
  const navigate = useNavigate()
  const [hideBalance, setHideBalance] = useState(() => localStorage.getItem('al_hide_balance') === 'true')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedSubcatFilter, setSelectedSubcatFilter] = useState('all')
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [topLimit, setTopLimit] = useState(5)
  const [now] = useState(() => Date.now())

  // ── Budgets ──────────────────────────────────────────────────────────────
  const { budgets, setBudget } = useBudgets()
  const sym = getCurrencySymbol()
  const fmt = useMemo(() => makeFmt(sym), [sym])
  const money = (n) => (hideBalance ? '••••' : fmt(n))

  const toggleHideBalance = () => {
    setHideBalance(v => {
      const next = !v
      localStorage.setItem('al_hide_balance', String(next))
      return next
    })
  }

  // Create map of bookId -> { bookName, projectId }
  const bookIdMap = useMemo(() => {
    const map = {}
    projects.forEach(project => {
      (booksByProject[project.id] || []).forEach(book => {
        map[book.id] = { bookName: book.name, projectId: project.id }
      })
    })
    return map
  }, [projects, booksByProject])

  // All entries (every book, including PIN-locked ones) with bookId and projectId attached
  const allEntries = useMemo(() => {
    const entries = []
    projects.forEach(project => {
      (booksByProject[project.id] || []).forEach(book => {
        (entriesByBook[book.id] || []).forEach(entry => {
          entries.push({ ...entry, bookId: book.id, projectId: project.id })
        })
      })
    })
    return entries
  }, [projects, booksByProject, entriesByBook])

  // Spending entries = exclude savings-tagged income entries and all transfers.
  // Savings expenses (spending from savings) ARE included — that's real spending.
  const spendingEntries = useMemo(
    () => allEntries.filter(e => {
      if (e.isTransfer) return false
      if (e.isSavings === true) return false  // savings deposits excluded
      return true
    }),
    [allEntries]
  )

  // Total spent = sum of expense entries (transfers excluded)
  const totalSpent = useMemo(() => {
    return spendingEntries.filter(e => e.type === 'expense').reduce((s, e) => s + Number(e.amount || 0), 0)
  }, [spendingEntries])

  const totalIncome = useMemo(() => {
    return spendingEntries.filter(e => e.type === 'income').reduce((s, e) => s + Number(e.amount || 0), 0)
  }, [spendingEntries])

  const totalSaved = useMemo(() => {
    return allEntries.filter(e => e.isSavings === true && e.type === 'income').reduce((s, e) => s + Number(e.amount || 0), 0)
  }, [allEntries])

  const thisMonthSpent = useMemo(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    return spendingEntries
      .filter(e => e.type === 'expense' && e.timestamp >= start)
      .reduce((s, e) => s + Number(e.amount || 0), 0)
  }, [spendingEntries])

  // Expense by Main Category — clean breakdown
  const byCategory = useMemo(() => {
    const map = new Map()
    spendingEntries.filter(e => e.type === 'expense').forEach(e => {
      const cat = e.category || 'General'
      map.set(cat, (map.get(cat) || 0) + Number(e.amount))
    })
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [spendingEntries])
  const categoryTotal = byCategory.reduce((s, c) => s + c.value, 0)

  // Top highest expense entries
  const topExpenses = useMemo(() => {
    return spendingEntries
      .filter(e => e.type === 'expense')
      .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))
      .slice(0, topLimit)
  }, [spendingEntries, topLimit])

  // Get available subcategories for the currently selected main category
  const availableSubcatFilters = useMemo(() => {
    if (!selectedCategory) return []
    const set = new Set()
    spendingEntries.forEach(e => {
      if (e.type === 'expense' && (e.category || 'General') === selectedCategory && e.subcategory) {
        set.add(e.subcategory)
      }
    })
    return Array.from(set).sort()
  }, [spendingEntries, selectedCategory])

  // Get filtered transactions for the selected category & subcategory filter
  const categoryTransactions = useMemo(() => {
    if (!selectedCategory) return []
    return spendingEntries
      .filter(e => {
        if (e.type !== 'expense') return false
        const cat = e.category || 'General'
        if (cat !== selectedCategory) return false
        if (selectedSubcatFilter !== 'all' && (e.subcategory || '') !== selectedSubcatFilter) return false
        return true
      })
      .sort(compareNewestFirst)
  }, [spendingEntries, selectedCategory, selectedSubcatFilter])

  // Daily average spend — last 30 days
  const dailyAvg = useMemo(() => {
    const cutoff = now - 30 * 24 * 60 * 60 * 1000
    const total = spendingEntries
      .filter(e => e.type === 'expense' && e.timestamp >= cutoff)
      .reduce((s, e) => s + Number(e.amount || 0), 0)
    return total / 30
  }, [spendingEntries, now])

  const isEmpty  = allEntries.length === 0
  const sectionTitle = 'text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-subtle)]'
  const card = 'rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)]'
  const openCategory = (name) => { setSelectedCategory(name); setSelectedSubcatFilter('all'); setShowCategoryModal(true) }
  const openEntry = (entry) => {
    const projectId = entry.projectId || bookIdMap[entry.bookId]?.projectId
    if (projectId && entry.bookId) navigate(`/projects/${projectId}/books/${entry.bookId}?focusedEntryId=${entry.id}`)
  }


  return (
    <LayoutShell>
      <div className="mx-auto max-w-2xl space-y-6">
        {/* ── Header ── */}
        <header className="flex items-center gap-3 pt-1">
          <div className="min-w-0 flex-1">
            <h1 className="font-serif-luxury text-[28px] font-semibold leading-tight tracking-[-0.01em] text-[var(--text-main)]">Analytics</h1>
            <p className="font-serif-luxury mt-0.5 text-[14px] italic text-[var(--text-muted)]">Where your money goes</p>
          </div>
          <button
            onClick={toggleHideBalance}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-[var(--border-card)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
            aria-label={hideBalance ? 'Show amounts' : 'Hide amounts'}
          >
            {hideBalance ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </header>

        {isEmpty ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--border-card)] py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--gold-light)] text-[var(--gold-primary)]">
              <BarChart3 size={22} />
            </span>
            <div>
              <p className="text-sm font-semibold text-[var(--text-main)]">No data yet</p>
              <p className="mt-1 text-xs text-[var(--text-subtle)]">Add transactions to your books to see your trends here.</p>
            </div>
          </motion.div>
        ) : (
          <>
            {/* ── Overview ── */}
            <motion.section initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={card}>
              <div className="px-5 pt-4 pb-4">
                <p className={sectionTitle}>Total spent</p>
                <p className="mt-1 text-[30px] font-bold leading-tight tracking-tight tabular-nums text-[var(--text-main)]">
                  {hideBalance ? '••••••' : `${sym}${formatAmount(totalSpent)}`}
                </p>
              </div>
              <div className="grid grid-cols-3 divide-x divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
                {[
                  { label: 'This month', value: money(thisMonthSpent), Icon: TrendingDown, cls: 'text-rose-600 dark:text-rose-400' },
                  { label: 'Daily avg · 30d', value: money(dailyAvg), Icon: BarChart3, cls: 'text-[var(--gold-primary)]' },
                  totalSaved > 0
                    ? { label: 'Saved', value: money(totalSaved), Icon: PiggyBank, cls: 'text-violet-600 dark:text-violet-400' }
                    : { label: 'Income', value: money(totalIncome), Icon: TrendingUp, cls: 'text-emerald-600 dark:text-emerald-400' },
                ].map(({ label, value, Icon, cls }) => (
                  <div key={label} className="min-w-0 px-3.5 py-3">
                    <p className="flex items-center gap-1 truncate text-[10px] text-[var(--text-subtle)]">
                      <Icon size={11} className={cls} /> {label}
                    </p>
                    <p className="mt-0.5 truncate text-[14px] font-semibold tabular-nums text-[var(--text-main)]">{value}</p>
                  </div>
                ))}
              </div>
            </motion.section>

            {/* ── Spending trend ── */}
            <SpendingTrends
              expenses={spendingEntries.filter(e => e.type === 'expense' && e.timestamp)}
              money={money}
              onOpenCategory={openCategory}
            />

            {/* ── Monthly Budgets ── */}
            <BudgetSection
              budgets={budgets}
              allExpenseEntries={allEntries.filter(e => !e.isTransfer && e.type === 'expense')}
              categories={categories}
              sym={sym}
              money={money}
              onOpenEntry={openEntry}
              onSetBudget={(cat, config) => setBudget(cat, config)}
              onDeleteBudget={(cat) => setBudget(cat, { soft: 0 })}
              bookIdMap={bookIdMap}
            />

            {/* ── Category breakdown ── */}
            {byCategory.length > 0 && (
              <section className="space-y-2">
                <div className="flex items-baseline justify-between px-1">
                  <h2 className={sectionTitle}>Spending by category</h2>
                  <span className="text-[11px] text-[var(--text-subtle)]">{byCategory.length} categories</span>
                </div>
                <div className={card}>
                  {/* Stacked share bar */}
                  <div className="px-4 pt-4">
                    <div className="flex h-2.5 overflow-hidden rounded-full bg-[var(--border-subtle)]">
                      {byCategory.map((c, idx) => (
                        <motion.div
                          key={c.name}
                          initial={{ width: 0 }}
                          animate={{ width: `${categoryTotal > 0 ? (c.value / categoryTotal) * 100 : 0}%` }}
                          transition={{ delay: idx * 0.03, duration: 0.5, ease: 'easeOut' }}
                          style={{ backgroundColor: PALETTE[idx % PALETTE.length] }}
                          className="h-full first:rounded-l-full last:rounded-r-full"
                          title={c.name}
                        />
                      ))}
                    </div>
                  </div>
                  <ul className="mt-2 divide-y divide-[var(--border-subtle)]">
                    {byCategory.map((cat, idx) => {
                      const pct = categoryTotal > 0 ? (cat.value / categoryTotal) * 100 : 0
                      return (
                        <li key={cat.name}>
                          <button
                            type="button"
                            onClick={() => openCategory(cat.name)}
                            className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--border-subtle)]/60 cursor-pointer last:rounded-b-2xl"
                          >
                            <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: PALETTE[idx % PALETTE.length] }} />
                            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--text-main)]">{cat.name}</span>
                            <span className="flex-shrink-0 text-[11px] tabular-nums text-[var(--text-subtle)]">{pct.toFixed(0)}%</span>
                            <span className="w-20 flex-shrink-0 text-right text-[13px] font-semibold tabular-nums text-[var(--text-main)]">{money(cat.value)}</span>
                            <ChevronRight size={15} className="flex-shrink-0 text-[var(--text-subtle)] transition-transform group-hover:translate-x-0.5" />
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </section>
            )}

            {/* ── Largest expenses ── */}
            {topExpenses.length > 0 && (
              <section className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <h2 className={sectionTitle}>Largest expenses</h2>
                  <div className="grid grid-cols-3 gap-0.5 rounded-lg bg-[var(--border-subtle)] p-0.5">
                    {TOP_LIMITS.map(n => (
                      <button key={n} type="button" onClick={() => setTopLimit(n)}
                        className={`rounded-md px-2.5 py-1 text-[11px] font-semibold tabular-nums transition-colors cursor-pointer ${
                          topLimit === n ? 'bg-[var(--bg-card)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-subtle)] hover:text-[var(--text-main)]'
                        }`}>
                        Top {n}
                      </button>
                    ))}
                  </div>
                </div>
                <ul className={`${card} divide-y divide-[var(--border-subtle)]`}>
                  {topExpenses.map((item, idx) => {
                    const bookInfo = bookIdMap[item.bookId]
                    const d = item.timestamp ? new Date(item.timestamp) : null
                    const dateStr = d ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
                    const meta = [item.category, bookInfo?.bookName, dateStr].filter(Boolean).join(' · ')
                    return (
                      <li key={item.id || idx}>
                        <button
                          type="button"
                          onClick={() => {
                            if (item.projectId && item.bookId) navigate(`/projects/${item.projectId}/books/${item.bookId}?focusedEntryId=${item.id}`)
                          }}
                          className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--border-subtle)]/60 cursor-pointer first:rounded-t-2xl last:rounded-b-2xl"
                        >
                          <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--border-subtle)] text-[11px] font-semibold tabular-nums text-[var(--text-muted)]">
                            {idx + 1}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-medium text-[var(--text-main)]">{item.description || 'Expense'}</span>
                            <span className="block truncate text-[11px] text-[var(--text-subtle)]">{meta}</span>
                          </span>
                          <span className="flex-shrink-0 text-[13px] font-semibold tabular-nums text-[var(--text-main)]">
                            {hideBalance ? '••••' : `−${sym}${formatAmount(item.amount)}`}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}
          </>
        )}
      </div>

      {/* ── Category transactions ── */}
      {createPortal(
        <AnimatePresence>
          {showCategoryModal && selectedCategory && (
            <motion.div
              key="category-sheet"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4"
              onKeyDown={(e) => { if (e.key === 'Escape') setShowCategoryModal(false) }}
            >
              <div className="absolute inset-0 bg-black/50" onClick={() => setShowCategoryModal(false)} />
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-label={selectedCategory}
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 24, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="relative flex w-full sm:max-w-[480px] flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl border border-[var(--border-card)] bg-[var(--bg-page)] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45)]"
                style={{ maxHeight: '85vh' }}
              >
                <div className="flex items-start justify-between gap-3 border-b border-[var(--border-subtle)] px-5 pt-5 pb-4">
                  <div className="min-w-0">
                    <h3 className="truncate text-[15px] font-semibold text-[var(--text-main)]">{selectedCategory}</h3>
                    <p className="mt-0.5 text-[11px] text-[var(--text-subtle)]">
                      {categoryTransactions.length} transaction{categoryTransactions.length !== 1 ? 's' : ''} · {money(categoryTransactions.reduce((s, t) => s + Number(t.amount), 0))}
                    </p>
                  </div>
                  <button type="button" onClick={() => setShowCategoryModal(false)} aria-label="Close"
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer">
                    <X size={15} />
                  </button>
                </div>

                {availableSubcatFilters.length > 0 && (
                  <div className="flex gap-1.5 overflow-x-auto px-5 pt-3 pb-1">
                    {['all', ...availableSubcatFilters].map((sub) => {
                      const active = selectedSubcatFilter === sub
                      return (
                        <button key={sub} type="button" onClick={() => setSelectedSubcatFilter(sub)}
                          className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors cursor-pointer ${
                            active
                              ? 'border-[var(--text-main)] bg-[var(--text-main)] font-semibold text-[var(--bg-page)]'
                              : 'border-[var(--border-card)] bg-[var(--bg-card)] font-medium text-[var(--text-muted)] hover:text-[var(--text-main)]'
                          }`}>
                          {sub === 'all' ? 'All' : sub}
                        </button>
                      )
                    })}
                  </div>
                )}

                <div className="flex-1 overflow-y-auto px-5 py-4">
                  {categoryTransactions.length === 0 ? (
                    <p className="py-10 text-center text-xs text-[var(--text-subtle)]">No transactions here.</p>
                  ) : (
                    <ul className={`${card} divide-y divide-[var(--border-subtle)]`}>
                      {categoryTransactions.map((txn, idx) => {
                        const date = new Date(txn.timestamp)
                        const bookInfo = bookIdMap[txn.bookId]
                        const meta = [
                          date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
                          txn.subcategory,
                          txn.mode || 'Cash',
                          bookInfo?.bookName,
                          txn.enteredBy,
                        ].filter(Boolean).join(' · ')
                        return (
                          <li key={txn.id || idx}>
                            <button
                              type="button"
                              onClick={() => {
                                setShowCategoryModal(false)
                                navigate(`/projects/${bookInfo?.projectId}/books/${txn.bookId}?focusedEntryId=${txn.id}`)
                              }}
                              className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--border-subtle)]/60 cursor-pointer first:rounded-t-2xl last:rounded-b-2xl"
                            >
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13px] font-medium text-[var(--text-main)]">{txn.description || 'Untitled'}</span>
                                <span className="block truncate text-[11px] text-[var(--text-subtle)]">{meta}</span>
                                {txn.notes && <span className="mt-1 block line-clamp-2 text-[11px] text-[var(--text-muted)]">{txn.notes}</span>}
                              </span>
                              <span className="flex-shrink-0 text-[13px] font-semibold tabular-nums text-[var(--text-main)]">
                                {hideBalance ? '••••' : `−${sym}${formatAmount(txn.amount)}`}
                              </span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </LayoutShell>
  )
}
