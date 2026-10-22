import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Lock, Unlock, Eye, EyeOff, ShieldAlert, ShieldCheck, KeyRound, Globe,
  ChevronLeft, ChevronRight, ChevronDown, TrendingUp, TrendingDown, ArrowDownLeft, ArrowUpRight,
  PieChart, Receipt,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import LayoutShell from '../components/LayoutShell'
import Toast from '../components/common/Toast'
import Segmented from '../components/vault/Segmented'
import CategoryTransactionsSheet from '../components/vault/CategoryTransactionsSheet'
import { useAuth } from '../context/AuthContext'
import { useAppData } from '../context/AppDataContext'
import { aggregateAndSortCategories } from '../lib/dsa'
import { formatAmount, getCurrencySymbol } from '../lib/format'
import { compareNewestFirst } from '../lib/entryOrder'

const PALETTE = ['#C5A059', '#7FA58A', '#D88A7A', '#6FA3B5', '#B39BD0', '#E0A166', '#9C8B73', '#8FB8A2']
const PERIODS = [
  { id: 'overall', label: 'Overall' },
  { id: 'month', label: 'Monthly' },
  { id: 'custom', label: 'Custom' },
]
const BREAKDOWN_TABS = [
  { id: 'expense', label: 'Spending' },
  { id: 'income', label: 'Income' },
]
const LEDGER_PAGE = 10

const sectionTitle = 'text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-subtle)]'
const card = 'rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)]'
const roundBtn = 'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-[var(--border-card)] bg-[var(--bg-card)] text-[var(--text-main)] hover:border-[var(--text-subtle)] transition-colors cursor-pointer'
const navBtn = 'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--border-subtle)] hover:text-[var(--text-main)] transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer'
const fieldCls = 'w-full rounded-xl border border-[var(--border-card)] bg-[var(--bg-page)] px-3 py-2.5 text-[13px] text-[var(--text-main)] outline-none transition-colors focus:border-[var(--gold-primary)]'

// "YYYY-MM-DD" from <input type="date"> → local-time Date (new Date(str) would parse it as UTC)
const parseLocalDate = (str) => {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const shortDate = (d) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

function ShareBar({ pct, color, delay = 0 }) {
  return (
    <div className="h-1 overflow-hidden rounded-full bg-[var(--border-subtle)]">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }}
        transition={{ duration: 0.5, delay, ease: 'easeOut' }}
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
      />
    </div>
  )
}

function EmptyState({ icon: Icon, title, hint }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--gold-light)] text-[var(--gold-primary)]">
        <Icon size={19} />
      </span>
      <div>
        <p className="text-sm font-semibold text-[var(--text-main)]">{title}</p>
        <p className="mt-1 text-xs text-[var(--text-subtle)]">{hint}</p>
      </div>
    </div>
  )
}

export default function VaultPage() {
  const { user, verifyPassword, googleSignIn } = useAuth()
  const { projects, booksByProject, entriesByBook } = useAppData()
  const navigate = useNavigate()

  const [now] = useState(() => new Date())
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState({ msg: '', type: 'success', visible: false })
  const [selectedCategory, setSelectedCategory] = useState(null) // holds { name: string, type: 'income' | 'expense' }
  const [showCategoryModal, setShowCategoryModal] = useState(false)

  // Period filter
  const [filterType, setFilterType] = useState('month') // 'overall' | 'month' | 'custom'
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const [breakdownTab, setBreakdownTab] = useState('expense') // 'expense' | 'income'
  const [ledgerLimit, setLedgerLimit] = useState(LEDGER_PAGE)

  const sym = getCurrencySymbol()
  const money = (n) => `${sym}${formatAmount(n, 0)}`

  const isPasswordUser = useMemo(() => {
    return user?.providerData?.some(p => p.providerId === 'password')
  }, [user])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type, visible: true })
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 2000)
  }

  const handleUnlock = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isPasswordUser) {
        if (!password) {
          setError('Password is required.')
          setLoading(false)
          return
        }
        await verifyPassword(password)
      } else {
        // OAuth user (e.g. Google)
        await googleSignIn()
      }
      setIsUnlocked(true)
      setPassword('')
      showToast('Vault unlocked')
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const lockVault = () => {
    setIsUnlocked(false)
    setShowCategoryModal(false)
    setShowPassword(false)
    setError('')
  }

  // Load all entries for calculations
  const allEntries = useMemo(() => {
    const entries = []
    projects.forEach(project => {
      (booksByProject[project.id] || []).forEach(book => {
        const bookEntries = entriesByBook[book.id] || []
        bookEntries.forEach(entry => {
          entries.push({
            ...entry,
            bookId: book.id,
            projectId: project.id,
          })
        })
      })
    })
    return entries
  }, [projects, booksByProject, entriesByBook])

  // Months present in the transaction history (plus the current month), newest first
  const availableMonths = useMemo(() => {
    const monthsMap = {}
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const currentLabel = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    monthsMap[currentKey] = { key: currentKey, label: currentLabel, year: now.getFullYear(), month: now.getMonth() }

    allEntries.forEach(entry => {
      if (!entry.timestamp) return
      const date = new Date(entry.timestamp)
      const year = date.getFullYear()
      const month = date.getMonth()
      const key = `${year}-${String(month + 1).padStart(2, '0')}`
      const label = date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
      monthsMap[key] = { key, label, year, month }
    })

    return Object.values(monthsMap).sort((a, b) => b.key.localeCompare(a.key))
  }, [allEntries, now])

  const customInvalid = filterType === 'custom' && customStart && customEnd && customStart > customEnd

  // Filter entries based on selected filter option
  const filteredEntries = useMemo(() => {
    return allEntries.filter(entry => {
      // Exclude transfers to avoid double-counting in calculations
      if (entry.isTransfer) return false
      if (!entry.timestamp) return false

      const date = new Date(entry.timestamp)

      if (filterType === 'month') {
        const year = date.getFullYear()
        const month = date.getMonth()
        const [selYear, selMonth] = selectedMonth.split('-').map(Number)
        return year === selYear && (month + 1) === selMonth
      }

      if (filterType === 'custom') {
        if (customStart) {
          const start = parseLocalDate(customStart)
          start.setHours(0, 0, 0, 0)
          if (date < start) return false
        }
        if (customEnd) {
          const end = parseLocalDate(customEnd)
          end.setHours(23, 59, 59, 999)
          if (date > end) return false
        }
        return true
      }

      return true // overall
    })
  }, [allEntries, filterType, selectedMonth, customStart, customEnd])

  const incomeCategoryBreakdown = useMemo(() => {
    return aggregateAndSortCategories(filteredEntries, new Set(), 'income')
  }, [filteredEntries])

  const expenseCategoryBreakdown = useMemo(() => {
    return aggregateAndSortCategories(filteredEntries, new Set(), 'expense')
  }, [filteredEntries])

  const totalIncome = useMemo(() => {
    return incomeCategoryBreakdown.reduce((sum, item) => sum + item.value, 0)
  }, [incomeCategoryBreakdown])

  const totalSpending = useMemo(() => {
    return expenseCategoryBreakdown.reduce((sum, item) => sum + item.value, 0)
  }, [expenseCategoryBreakdown])

  const netSavings = useMemo(() => {
    return totalIncome - totalSpending
  }, [totalIncome, totalSpending])

  const savingsRate = useMemo(() => {
    if (totalIncome <= 0) return 0
    return (netSavings / totalIncome) * 100
  }, [totalIncome, netSavings])

  const bookDetailsMap = useMemo(() => {
    const map = {}
    projects.forEach(project => {
      (booksByProject[project.id] || []).forEach(book => {
        map[book.id] = { bookName: book.name, projectName: project.name }
      })
    })
    return map
  }, [projects, booksByProject])

  // Period's transactions, latest-added first
  const ledgerEntries = useMemo(() => [...filteredEntries].sort(compareNewestFirst), [filteredEntries])

  // Transactions of the selected category within the active period only
  const categoryTransactions = useMemo(() => {
    if (!selectedCategory) return []
    return filteredEntries
      .filter(e => e.type === selectedCategory.type && (e.category || 'General') === selectedCategory.name)
      .sort(compareNewestFirst)
  }, [filteredEntries, selectedCategory])

  // ── Period helpers ─────────────────────────────────────────────────────────
  const monthIndex = availableMonths.findIndex(m => m.key === selectedMonth)
  const periodLabel = (() => {
    if (filterType === 'overall') return 'All time'
    if (filterType === 'month') return availableMonths[monthIndex]?.label || selectedMonth
    if (customStart && customEnd) return `${shortDate(parseLocalDate(customStart))} – ${shortDate(parseLocalDate(customEnd))}`
    if (customStart) return `From ${shortDate(parseLocalDate(customStart))}`
    if (customEnd) return `Until ${shortDate(parseLocalDate(customEnd))}`
    return 'All dates'
  })()

  const changePeriod = (type) => { setFilterType(type); setLedgerLimit(LEDGER_PAGE) }
  const changeMonth = (key) => { if (key) { setSelectedMonth(key); setLedgerLimit(LEDGER_PAGE) } }

  const openEntry = (txn) => {
    if (!txn.projectId || !txn.bookId) return
    navigate(`/projects/${txn.projectId}/books/${txn.bookId}${txn.id ? `?focusedEntryId=${txn.id}` : ''}`)
  }
  const closeSheet = useCallback(() => setShowCategoryModal(false), [])

  const breakdown = breakdownTab === 'expense' ? expenseCategoryBreakdown : incomeCategoryBreakdown
  const breakdownTotal = breakdownTab === 'expense' ? totalSpending : totalIncome
  const spentShare = totalIncome > 0 ? (totalSpending / totalIncome) * 100 : 0

  return (
    <LayoutShell>
      <div className="mx-auto max-w-2xl space-y-6">
        {/* ── Header ── */}
        <header className="flex items-center gap-3 pt-1">
          <button type="button" onClick={() => navigate('/settings')} className={roundBtn} aria-label="Back to settings">
            <ArrowLeft size={17} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="font-serif-luxury text-[28px] font-semibold leading-tight tracking-[-0.01em] text-[var(--text-main)]">Vault</h1>
            <p className="font-serif-luxury mt-0.5 truncate text-[14px] italic text-[var(--text-muted)]">
              {isUnlocked ? 'Private analytics, verified' : 'Deep analytics, kept private'}
            </p>
          </div>
          {isUnlocked && (
            <button type="button" onClick={lockVault} className={`${roundBtn} text-[var(--text-muted)] hover:text-[var(--text-main)]`} aria-label="Lock vault">
              <Lock size={16} />
            </button>
          )}
        </header>

        <AnimatePresence mode="wait" initial={false}>
          {!isUnlocked ? (
            /* ── Lock screen ── */
            <motion.section
              key="lock-screen"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className={card}
            >
              <div className="flex flex-col items-center px-5 pt-8 pb-5 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--gold-light)] text-[var(--gold-primary)]">
                  <Lock size={24} />
                </span>
                <h2 className="mt-4 text-[17px] font-semibold text-[var(--text-main)]">Your vault is locked</h2>
                <p className="mt-1 max-w-xs text-[12px] leading-relaxed text-[var(--text-muted)]">
                  Confirm it&apos;s you to view private income, spending and savings across all your books.
                </p>
              </div>

              <form onSubmit={handleUnlock} className="space-y-3 border-t border-[var(--border-subtle)] px-5 pt-5 pb-5">
                {isPasswordUser ? (
                  <div>
                    <label htmlFor="vault-password" className={`${sectionTitle} mb-1.5 block`}>Account password</label>
                    <div className="relative">
                      <KeyRound size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]" />
                      <input
                        id="vault-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        autoComplete="current-password"
                        onChange={(e) => { setPassword(e.target.value); setError('') }}
                        placeholder="Enter your password"
                        className={`${fieldCls} py-3 pl-10 pr-11 placeholder:text-[var(--text-subtle)]`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[var(--text-subtle)] transition-colors hover:text-[var(--text-main)] cursor-pointer"
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 rounded-xl bg-[var(--border-subtle)]/60 px-3.5 py-3">
                    <Globe size={16} className="flex-shrink-0 text-[var(--gold-primary)]" />
                    <p className="text-[12px] leading-snug text-[var(--text-muted)]">
                      You signed in with Google. Re-verify your Google session to continue.
                    </p>
                  </div>
                )}

                <AnimatePresence initial={false}>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div role="alert" className="flex gap-2 rounded-xl bg-rose-500/10 px-3 py-2.5 text-rose-600 dark:text-rose-400">
                        <ShieldAlert size={15} className="mt-px flex-shrink-0" />
                        <p className="text-[12px] font-medium leading-snug">{error}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--gold-primary)] py-3 text-[13px] font-semibold text-white transition-colors hover:bg-[var(--gold-hover)] disabled:opacity-60 cursor-pointer"
                >
                  {isPasswordUser ? <Unlock size={15} /> : <Globe size={15} />}
                  {loading ? 'Verifying…' : isPasswordUser ? 'Unlock vault' : 'Verify with Google'}
                </button>
                <p className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-[var(--text-subtle)]">
                  <ShieldCheck size={12} /> Verification is required every time you open the vault
                </p>
              </form>
            </motion.section>
          ) : (
            /* ── Unlocked ── */
            <motion.div
              key="unlocked"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* ── Period ── */}
              <section className="space-y-2">
                <div className="flex items-center justify-between gap-3 px-1">
                  <h2 className={sectionTitle}>Period</h2>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck size={11} /> Verified
                  </span>
                </div>
                <div className={`${card} space-y-3 p-3`}>
                  <Segmented options={PERIODS} value={filterType} onChange={changePeriod} full ariaLabel="Period" />

                  {filterType === 'overall' && (
                    <p className="px-1 pb-0.5 text-center text-[12px] text-[var(--text-muted)]">Every transaction across all books</p>
                  )}

                  {filterType === 'month' && (
                    <div className="flex items-center justify-between gap-2">
                      <button type="button" className={navBtn} aria-label="Previous month"
                        disabled={monthIndex < 0 || monthIndex >= availableMonths.length - 1}
                        onClick={() => changeMonth(availableMonths[monthIndex + 1]?.key)}>
                        <ChevronLeft size={16} />
                      </button>
                      <label className="relative flex min-w-0 items-center gap-1 rounded-lg px-2 py-1 transition-colors hover:bg-[var(--border-subtle)]/60 cursor-pointer">
                        <span className="truncate text-[13px] font-semibold text-[var(--text-main)]">{periodLabel}</span>
                        <ChevronDown size={14} className="flex-shrink-0 text-[var(--text-subtle)]" />
                        <select
                          value={selectedMonth}
                          onChange={(e) => changeMonth(e.target.value)}
                          aria-label="Select month"
                          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        >
                          {availableMonths.map(m => (
                            <option key={m.key} value={m.key}>{m.label}</option>
                          ))}
                        </select>
                      </label>
                      <button type="button" className={navBtn} aria-label="Next month"
                        disabled={monthIndex <= 0}
                        onClick={() => changeMonth(availableMonths[monthIndex - 1]?.key)}>
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  )}

                  {filterType === 'custom' && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <label className="block min-w-0">
                          <span className="mb-1 block px-0.5 text-[10px] font-medium text-[var(--text-subtle)]">From</span>
                          <input type="date" value={customStart} max={customEnd || undefined}
                            onChange={(e) => { setCustomStart(e.target.value); setLedgerLimit(LEDGER_PAGE) }}
                            className={`${fieldCls} min-w-0 appearance-none`} />
                        </label>
                        <label className="block min-w-0">
                          <span className="mb-1 block px-0.5 text-[10px] font-medium text-[var(--text-subtle)]">To</span>
                          <input type="date" value={customEnd} min={customStart || undefined}
                            onChange={(e) => { setCustomEnd(e.target.value); setLedgerLimit(LEDGER_PAGE) }}
                            className={`${fieldCls} min-w-0 appearance-none`} />
                        </label>
                      </div>
                      {customInvalid ? (
                        <p className="px-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">The start date is after the end date.</p>
                      ) : (customStart || customEnd) ? (
                        <div className="flex items-center justify-between px-1">
                          <span className="truncate text-[11px] text-[var(--text-muted)]">{periodLabel}</span>
                          <button type="button" onClick={() => { setCustomStart(''); setCustomEnd('') }}
                            className="flex-shrink-0 text-[11px] font-semibold text-[var(--gold-primary)] cursor-pointer">
                            Clear
                          </button>
                        </div>
                      ) : (
                        <p className="px-1 text-[11px] text-[var(--text-subtle)]">Pick one or both dates to narrow the range.</p>
                      )}
                    </div>
                  )}
                </div>
              </section>

              {/* ── Overview ── */}
              <section className={card}>
                <div className="flex items-end justify-between gap-3 px-5 pt-4 pb-4">
                  <div className="min-w-0">
                    <p className={sectionTitle}>Net savings</p>
                    <p className={`mt-1 truncate text-[30px] font-bold leading-tight tracking-tight tabular-nums ${
                      netSavings < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-[var(--text-main)]'
                    }`}>
                      {netSavings < 0 ? '−' : ''}{money(Math.abs(netSavings))}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-[var(--text-subtle)]">{periodLabel}</p>
                  </div>
                  {totalIncome > 0 && (
                    <span className={`mb-1.5 flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums ${
                      savingsRate >= 0
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    }`}>
                      {savingsRate.toFixed(0)}% saved
                    </span>
                  )}
                </div>

                {totalIncome > 0 && (
                  <div className="px-5 pb-4">
                    <div className="h-1.5 overflow-hidden rounded-full bg-emerald-500/15">
                      <motion.div
                        initial={false}
                        animate={{ width: `${Math.min(spentShare, 100)}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className="h-full rounded-full bg-rose-500/70"
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] tabular-nums text-[var(--text-subtle)]">
                      Spent {spentShare.toFixed(0)}% of income
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 divide-x divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
                  {[
                    { label: 'Income', value: totalIncome, Icon: TrendingUp, cls: 'text-emerald-600 dark:text-emerald-400' },
                    { label: 'Spent', value: totalSpending, Icon: TrendingDown, cls: 'text-rose-600 dark:text-rose-400' },
                  ].map(({ label, value, Icon, cls }) => (
                    <div key={label} className="min-w-0 px-4 py-3">
                      <p className="flex items-center gap-1 truncate text-[10px] text-[var(--text-subtle)]">
                        <Icon size={11} className={cls} /> {label}
                      </p>
                      <p className="mt-0.5 truncate text-[15px] font-semibold tabular-nums text-[var(--text-main)]">{money(value)}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* ── By category ── */}
              <section className="space-y-2">
                <div className="flex items-center justify-between gap-3 px-1">
                  <h2 className={sectionTitle}>By category</h2>
                  <Segmented options={BREAKDOWN_TABS} value={breakdownTab} onChange={setBreakdownTab} ariaLabel="Breakdown type" />
                </div>
                <div className={card}>
                  {breakdown.length === 0 ? (
                    <EmptyState
                      icon={PieChart}
                      title={breakdownTab === 'expense' ? 'No spending' : 'No income'}
                      hint={filterType === 'overall' ? 'Nothing recorded yet.' : `Nothing recorded in ${periodLabel}.`}
                    />
                  ) : (
                    <ul className="divide-y divide-[var(--border-subtle)]">
                      {breakdown.map((cat, idx) => {
                        const pct = breakdownTotal > 0 ? (cat.value / breakdownTotal) * 100 : 0
                        const color = PALETTE[idx % PALETTE.length]
                        return (
                          <li key={cat.name}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCategory({ name: cat.name, type: breakdownTab })
                                setShowCategoryModal(true)
                              }}
                              className="group block w-full space-y-1.5 px-4 py-3 text-left transition-colors hover:bg-[var(--border-subtle)]/60 cursor-pointer first:rounded-t-2xl last:rounded-b-2xl"
                            >
                              <span className="flex items-center gap-2.5">
                                <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: color }} />
                                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--text-main)]">{cat.name}</span>
                                <span className="flex-shrink-0 text-[11px] tabular-nums text-[var(--text-subtle)]">{pct.toFixed(0)}%</span>
                                <span className="flex-shrink-0 text-right text-[13px] font-semibold tabular-nums text-[var(--text-main)]">{money(cat.value)}</span>
                                <ChevronRight size={15} className="flex-shrink-0 text-[var(--text-subtle)] transition-transform group-hover:translate-x-0.5" />
                              </span>
                              <span className="block pl-[18px] pr-6"><ShareBar pct={pct} color={color} delay={idx * 0.03} /></span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              </section>

              {/* ── Transactions ── */}
              <section className="space-y-2">
                <div className="flex items-baseline justify-between px-1">
                  <h2 className={sectionTitle}>Transactions</h2>
                  <span className="text-[11px] tabular-nums text-[var(--text-subtle)]">{ledgerEntries.length}</span>
                </div>
                <div className={card}>
                  {ledgerEntries.length === 0 ? (
                    <EmptyState icon={Receipt} title="No transactions" hint="Try a different period." />
                  ) : (
                    <>
                      <ul className="divide-y divide-[var(--border-subtle)]">
                        {ledgerEntries.slice(0, ledgerLimit).map((txn, idx) => {
                          const dateStr = new Date(txn.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                          const details = bookDetailsMap[txn.bookId]
                          const isInc = txn.type === 'income'
                          const meta = [dateStr, txn.category || 'General', details?.bookName].filter(Boolean).join(' · ')
                          return (
                            <li key={txn.id || idx}>
                              <button
                                type="button"
                                onClick={() => openEntry(txn)}
                                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--border-subtle)]/60 cursor-pointer first:rounded-t-2xl"
                              >
                                <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                                  isInc
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                }`}>
                                  {isInc ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-[13px] font-medium text-[var(--text-main)]">
                                    {txn.description || 'Untitled transaction'}
                                  </span>
                                  <span className="block truncate text-[11px] text-[var(--text-subtle)]">{meta}</span>
                                </span>
                                <span className={`flex-shrink-0 text-[13px] font-semibold tabular-nums ${
                                  isInc ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--text-main)]'
                                }`}>
                                  {isInc ? '+' : '−'}{money(txn.amount)}
                                </span>
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                      <div className="flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] px-4 py-2.5">
                        <span className="text-[11px] tabular-nums text-[var(--text-subtle)]">
                          Latest {Math.min(ledgerLimit, ledgerEntries.length)} of {ledgerEntries.length}
                        </span>
                        {ledgerEntries.length > ledgerLimit && (
                          <button type="button" onClick={() => setLedgerLimit(l => l + 20)}
                            className="text-[12px] font-semibold text-[var(--gold-primary)] cursor-pointer">
                            Show more
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Category transactions ── */}
      <CategoryTransactionsSheet
        open={showCategoryModal && isUnlocked}
        category={selectedCategory}
        transactions={categoryTransactions}
        bookDetailsMap={bookDetailsMap}
        periodLabel={periodLabel}
        formatMoney={money}
        onClose={closeSheet}
        onOpenEntry={(txn) => { setShowCategoryModal(false); openEntry(txn) }}
      />

      <Toast message={toast.msg} type={toast.type} visible={toast.visible} />
    </LayoutShell>
  )
}
