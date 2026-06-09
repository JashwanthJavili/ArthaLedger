import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, BarChart3, TrendingUp, TrendingDown, Scale,
  Eye, EyeOff, AlertTriangle, Lightbulb,
  X, Calendar, Tag, Wallet, FileText, User,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import LayoutShell from '../components/LayoutShell'
import { useAppData } from '../context/AppDataContext'

const PALETTE = ['#d7a95a', '#95b38f', '#de8776', '#7fb3a8', '#c9a0dc', '#f4a261', '#a8916f', '#f0c78d']

const fmt = (n) => {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000)   return `₹${(n / 1000).toFixed(1)}K`
  return `₹${Number(n).toFixed(0)}`
}

function buildInsights(entries) {
  const expenses = entries.filter(e => e.type === 'expense')
  if (expenses.length < 3) return []

  const insights = []

  const catMap = new Map()
  expenses.forEach(e => {
    const cat = e.category || 'General'
    catMap.set(cat, (catMap.get(cat) || 0) + Number(e.amount))
  })
  const sorted = [...catMap.entries()].sort((a, b) => b[1] - a[1])
  const totalSpend = sorted.reduce((s, [, v]) => s + v, 0)

  if (sorted.length > 0) {
    const [topCat, topAmt] = sorted[0]
    const pct = ((topAmt / totalSpend) * 100).toFixed(0)
    insights.push({
      type: pct > 40 ? 'warning' : 'info',
      title: `${topCat} is your biggest spend`,
      body: `${pct}% of total expenses (${fmt(topAmt)}). ${pct > 40 ? 'Consider setting a budget for this.' : 'Looks balanced.'}`,
    })
  }

  const monthMap = new Map()
  expenses.forEach(e => {
    const d = new Date(e.timestamp)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthMap.set(key, (monthMap.get(key) || 0) + Number(e.amount))
  })
  const months = [...monthMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  if (months.length >= 2) {
    const prev = months[months.length - 2][1]
    const curr = months[months.length - 1][1]
    const delta = ((curr - prev) / prev * 100).toFixed(0)
    if (Math.abs(delta) > 10) {
      insights.push({
        type: delta > 0 ? 'warning' : 'good',
        title: delta > 0 ? `Spending up ${delta}% this month` : `Spending down ${Math.abs(delta)}% this month`,
        body: delta > 0
          ? `You spent ${fmt(curr)} vs ${fmt(prev)} last month.`
          : `You reduced spending from ${fmt(prev)} to ${fmt(curr)}.`,
      })
    }
  }

  const income  = entries.filter(e => e.type === 'income').reduce((s, e) => s + Number(e.amount), 0)
  const expense = entries.filter(e => e.type === 'expense').reduce((s, e) => s + Number(e.amount), 0)
  if (income > 0) {
    const rate = ((income - expense) / income * 100).toFixed(0)
    insights.push({
      type: rate >= 20 ? 'good' : rate >= 0 ? 'info' : 'warning',
      title: `Savings rate: ${rate}%`,
      body: rate >= 20
        ? "You're saving more than 20% of income. Excellent!"
        : rate >= 0
        ? 'Try to save at least 20% of income for financial security.'
        : "You're spending more than you earn. Review your expenses.",
    })
  }

  if (sorted.length >= 2) {
    const [cat2, amt2] = sorted[1]
    const pct2 = ((amt2 / totalSpend) * 100).toFixed(0)
    insights.push({
      type: 'tip',
      title: `Reduce ${cat2} to save more`,
      body: `${cat2} is ${pct2}% of spending (${fmt(amt2)}). Cutting it by 20% saves ${fmt(amt2 * 0.2)}.`,
    })
  }

  return insights
}

const insightStyle = {
  warning: { bg: 'bg-red-50 border-red-100',        icon: <AlertTriangle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />,    title: 'text-red-700' },
  good:    { bg: 'bg-emerald-50 border-emerald-100', icon: <TrendingDown size={14} className="text-emerald-600 flex-shrink-0 mt-0.5" />, title: 'text-emerald-700' },
  info:    { bg: 'bg-amber-50 border-amber-100',     icon: <BarChart3 size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />,      title: 'text-amber-700' },
  tip:     { bg: 'bg-blue-50 border-blue-100',       icon: <Lightbulb size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />,       title: 'text-blue-700' },
}

export default function AnalyticsPage() {
  const { entriesByBook, booksByProject, projects } = useAppData()
  const navigate = useNavigate()
  const [hideBalance, setHideBalance] = useState(() => localStorage.getItem('al_hide_balance') === 'true')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
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

  // All entries with bookId and projectId attached
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
    return spendingEntries.filter(e => e.type === 'expense').reduce((s, e) => s + Number(e.amount), 0)
  }, [spendingEntries])

  // Expense by category — top 8
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

  // Get all transactions for a specific category
  const getCategoryTransactions = (categoryName) => {
    return spendingEntries
      .filter(e => e.type === 'expense' && (e.category || 'General') === categoryName)
      .sort((a, b) => b.timestamp - a.timestamp)
  }

  const categoryTransactions = selectedCategory ? getCategoryTransactions(selectedCategory) : []

  // Handle context menu

  // Daily average spend — last 30 days
  const dailyAvg = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
    const total  = spendingEntries
      .filter(e => e.type === 'expense' && e.timestamp >= cutoff)
      .reduce((s, e) => s + Number(e.amount), 0)
    return total / 30
  }, [spendingEntries])

  const insights = useMemo(() => buildInsights(spendingEntries), [spendingEntries])
  const isEmpty  = allEntries.length === 0

  return (
    <LayoutShell>
      <div className="space-y-3 pb-6">

        {/* Header */}
        <div className="flex items-center gap-2">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1 rounded-xl border border-amber-100 px-2.5 py-1.5 text-xs text-stone-600 hover:bg-amber-50 transition-colors"
          >
            <ArrowLeft size={13} /> Back
          </Link>
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-amber-100 p-2">
              <BarChart3 size={14} className="text-amber-700" />
            </div>
            <h1 className="font-serif text-xl sm:text-2xl font-semibold text-stone-800">Analytics</h1>
          </div>
        </div>

        {isEmpty ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center gap-4 py-16 text-center"
          >
            <div className="rounded-2xl bg-amber-50 p-5">
              <BarChart3 size={32} className="text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-stone-600">No data yet</p>
              <p className="mt-1 text-xs text-stone-400">Add entries to your books to see analytics</p>
            </div>
          </motion.div>
        ) : (
          <>
            {/* ── Total Spent — single number, clean ── */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl border overflow-hidden shadow-sm ${
                'border-red-100 bg-gradient-to-br from-red-50 to-white'
              }`}
            >
              <div className="px-4 py-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`rounded-lg p-1.5 bg-red-100`}>
                      <Scale size={13} className="text-red-500" />
                    </div>
                    <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                      Total Spent
                    </span>
                  </div>
                  <button
                    onClick={toggleHideBalance}
                    className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 transition-colors"
                    title={hideBalance ? 'Show' : 'Hide'}
                  >
                    {hideBalance ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>

                {hideBalance ? (
                  <span className="text-3xl font-bold text-stone-300 tracking-widest">••••••</span>
                ) : (
                  <span className={`text-3xl font-bold font-serif text-red-600`}>
                    {fmt(Math.abs(totalSpent))}
                  </span>
                )}

                {dailyAvg > 0 && (
                  <p className="text-[11px] text-stone-400 mt-2">
                    Avg daily spend: <span className="font-semibold text-stone-600">{fmt(dailyAvg)}/day</span>
                  </p>
                )}
              </div>
            </motion.div>

            {/* ── Spending Insights ── */}
            {insights.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="rounded-2xl border border-amber-100/80 bg-white/85 p-4 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb size={14} className="text-amber-600" />
                  <h2 className="text-sm font-semibold text-stone-700">Spending Insights</h2>
                </div>
                <div className="space-y-2">
                  {insights.map((ins, i) => {
                    const s = insightStyle[ins.type] || insightStyle.info
                    return (
                      <div key={i} className={`rounded-xl border p-3 flex gap-2.5 ${s.bg}`}>
                        {s.icon}
                        <div>
                          <p className={`text-xs font-semibold ${s.title}`}>{ins.title}</p>
                          <p className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">{ins.body}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </motion.section>
            )}

            {/* ── Spending breakdown ── */}
            {byCategory.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-2xl border border-amber-100/80 bg-white/85 p-4 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-4">
                  <TrendingDown size={14} className="text-red-400" />
                  <h2 className="text-sm font-semibold text-stone-700">How Your Spending Breaks Down</h2>
                  <span className="ml-auto text-[10px] text-stone-400">All spending categories</span>
                </div>

                <div className="space-y-3 mb-3">
                  {byCategory.map((cat, idx) => {
                    const total = byCategory.reduce((s, c) => s + c.value, 0)
                    const pct = total > 0 ? (cat.value / total) * 100 : 0
                    return (
                      <button
                        key={cat.name}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(cat.name)
                          setShowCategoryModal(true)
                        }}
                        className="w-full rounded-xl border border-amber-50 bg-amber-50/20 px-3 py-2.5 text-left hover:border-amber-200 hover:bg-amber-50/60 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-3 mb-1.5">
                          <span className="min-w-0 text-xs font-medium text-stone-700 truncate">{cat.name}</span>
                          <span className="flex-shrink-0 text-xs font-bold text-red-600">{fmt(cat.value)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ delay: idx * 0.03, duration: 0.45 }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: PALETTE[idx % PALETTE.length] }}
                          />
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[10px] text-stone-400">
                          <span>{pct.toFixed(1)}% of total</span>
                          <span>Tap to view transactions</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </motion.section>
            )}
          </>
        )}
      </div>

      {/* ── Category Transactions Modal ── */}
      <AnimatePresence>
        {showCategoryModal && selectedCategory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0 bg-black/40 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowCategoryModal(false)
              }
            }}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', damping: 22, stiffness: 300 }}
              className="w-full max-w-2xl rounded-3xl border border-amber-100 bg-white shadow-2xl max-h-[80vh] overflow-x-hidden overflow-y-auto p-6"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-amber-50">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-amber-100 p-2.5">
                    <Tag size={16} className="text-amber-700" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-semibold text-stone-800">{selectedCategory}</h3>
                    <p className="text-xs text-stone-400 mt-0.5">{categoryTransactions.length} transaction{categoryTransactions.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCategoryModal(false)}
                  className="rounded-xl p-1.5 text-stone-400 hover:bg-stone-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Transactions List */}
              {categoryTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                  <div className="rounded-2xl bg-amber-50 p-4">
                    <FileText size={24} className="text-amber-400" />
                  </div>
                  <p className="text-sm text-stone-600">No transactions in this category</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {categoryTransactions.map((txn, idx) => {
                    const date = new Date(txn.timestamp)
                    const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                    const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                    const bookInfo = bookIdMap[txn.bookId]
                    const bookName = bookInfo?.bookName || 'Unknown'
                    const projectId = bookInfo?.projectId

                    return (
                      <motion.button
                        key={idx}
                        type="button"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        onClick={() => {
                          setShowCategoryModal(false)
                          navigate(`/projects/${projectId}/books/${txn.bookId}?focusedEntryId=${txn.id}`)
                        }}
                        className="w-full text-left rounded-xl border border-amber-100 bg-gradient-to-r from-amber-50/50 to-white p-3.5 hover:border-amber-200 transition-colors group cursor-pointer block"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2.5">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-stone-800 group-hover:text-amber-800 transition-colors truncate">{txn.description || 'Untitled'}</p>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 rounded-lg bg-stone-100 px-2 py-1 text-[10px] text-stone-600">
                                <Calendar size={10} />
                                {dateStr}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-[10px] text-blue-600">
                                <Wallet size={10} />
                                {txn.mode || 'Cash'}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-lg bg-purple-50 px-2 py-1 text-[10px] text-purple-600">
                                <FileText size={10} />
                                {bookName}
                              </span>
                              {txn.enteredBy && (
                                <span className="inline-flex items-center gap-1 rounded-lg bg-orange-50 px-2 py-1 text-[10px] text-orange-600">
                                  <User size={10} />
                                  {txn.enteredBy}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex-shrink-0 flex items-start gap-2">
                            <div className="text-right">
                              <p className="text-lg font-semibold text-red-600">−{fmt(Number(txn.amount))}</p>
                              <p className="text-[11px] text-stone-400 mt-0.5">{timeStr}</p>
                            </div>
                          </div>
                        </div>
                        {txn.notes && (
                          <div className="mt-2.5 rounded-lg bg-white border border-stone-100 px-2.5 py-2 text-xs text-stone-600">
                            <p className="font-medium text-stone-700 mb-1">Note:</p>
                            <p className="text-stone-500 leading-relaxed">{txn.notes}</p>
                          </div>
                        )}
                      </motion.button>
                    )
                  })}
                </div>
              )}

              {/* Summary Footer */}
              {categoryTransactions.length > 0 && (
                <div className="mt-6 pt-4 border-t border-amber-50">
                  <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-center">
                    <p className="text-[10px] text-red-600 font-medium uppercase mb-1">Total Spent</p>
                    <p className="text-lg font-bold text-red-600">
                      {fmt(categoryTransactions.reduce((s, t) => s + Number(t.amount), 0))}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </LayoutShell>
  )
}
