import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Lock, Unlock, Eye, EyeOff, ShieldAlert, KeyRound, Globe, Calendar,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import LayoutShell from '../components/LayoutShell'
import Toast from '../components/common/Toast'
import { useAuth } from '../context/AuthContext'
import { useAppData } from '../context/AppDataContext'
import { aggregateAndSortCategories } from '../lib/dsa'
import { formatAmount, getCurrencySymbol } from '../lib/format'

export default function VaultPage() {
  const { user, verifyPassword, googleSignIn } = useAuth()
  const { projects, booksByProject, entriesByBook } = useAppData()
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState({ msg: '', type: 'success', visible: false })
  const [selectedCategory, setSelectedCategory] = useState(null) // holds { name: string, type: 'income' | 'expense' }
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  
  // Minimalist Filtering States
  const [filterType, setFilterType] = useState('month') // 'overall' | 'month' | 'custom'
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const [breakdownTab, setBreakdownTab] = useState('expense') // 'expense' | 'income'

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
      showToast('Analytics unlocked successfully ✓')
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.')
    } finally {
      setLoading(false)
    }
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

  // Extract list of months dynamically from transaction history
  const availableMonths = useMemo(() => {
    const monthsMap = {}
    
    // Add current month as default fallback
    const now = new Date()
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
  }, [allEntries])

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
          const start = new Date(customStart)
          start.setHours(0, 0, 0, 0)
          if (date < start) return false
        }
        if (customEnd) {
          const end = new Date(customEnd)
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

  // Filter transactions in modal dynamically by active filtered subset only
  const categoryTransactions = useMemo(() => {
    if (!selectedCategory) return []
    return filteredEntries
      .filter(e => e.type === selectedCategory.type && (e.category || 'General') === selectedCategory.name)
      .sort((a, b) => b.timestamp - a.timestamp)
  }, [filteredEntries, selectedCategory])

  return (
    <LayoutShell>
      <div className="space-y-4 pb-6 max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/settings')}
            className="inline-flex items-center gap-1 rounded-xl border border-stone-100 dark:border-stone-800 px-2.5 py-1.5 text-xs text-stone-600 hover:bg-stone-50 transition-colors bg-white shadow-sm dark:bg-stone-900 dark:text-stone-300"
          >
            <ArrowLeft size={13} /> Back to Settings
          </button>
          {isUnlocked && (
            <span className="text-[10px] text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full font-semibold dark:text-emerald-400">
              Verified Session
            </span>
          )}
        </div>

        <AnimatePresence mode="wait">
          {!isUnlocked ? (
            /* ── Lock Screen ── */
            <motion.div
              key="lock-screen"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="rounded-3xl border border-amber-100 bg-white p-6 shadow-xl space-y-6 text-center dark:bg-stone-900 dark:border-amber-950"
            >
              {/* Lock Icon */}
              <div className="flex justify-center">
                <div className="rounded-full bg-amber-50 border border-amber-100 p-5 text-amber-700 shadow-sm dark:bg-amber-950/20 dark:border-amber-950/40">
                  <Lock size={32} className="text-amber-750 dark:text-amber-500" />
                </div>
              </div>

              <div>
                <h1 className="font-serif text-xl font-bold text-stone-850 dark:text-stone-100">Deep Analytics & Vault</h1>
                <p className="text-xs text-stone-400 mt-2 leading-relaxed px-4 dark:text-stone-400">
                  Please verify your credentials to unlock private statistics.
                </p>
              </div>

              <form onSubmit={handleUnlock} className="space-y-4 text-left">
                {isPasswordUser ? (
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2 dark:text-stone-400">
                      Account Password
                    </label>
                    <div className="relative">
                      <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError('') }}
                        placeholder="••••••••"
                        className="w-full rounded-2xl border border-amber-100 bg-amber-50/20 pl-10 pr-10 py-3 text-sm focus:border-amber-400 focus:bg-white outline-none transition-colors dark:border-amber-950 dark:bg-amber-950/10 dark:focus:bg-stone-950"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-amber-100 bg-amber-50/30 p-4 text-center space-y-3 dark:border-amber-950 dark:bg-amber-950/10">
                    <Globe size={20} className="text-amber-600 mx-auto" />
                    <p className="text-xs text-stone-600 leading-relaxed dark:text-stone-300">
                      Re-verify Google session to unlock.
                    </p>
                  </div>
                )}

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl bg-red-50 border border-red-100 p-3 flex gap-2 dark:bg-rose-955/20 dark:border-rose-955/40"
                  >
                    <ShieldAlert size={14} className="text-red-500 flex-shrink-0 mt-0.5 dark:text-rose-500" />
                    <p className="text-xs text-red-705 leading-relaxed font-medium dark:text-rose-400">{error}</p>
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-amber-600 py-3 text-sm font-bold text-white hover:bg-amber-700 transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Unlock size={14} />
                  {loading ? 'Verifying...' : 'Unlock Vault'}
                </button>
              </form>
            </motion.div>
          ) : (
            /* ── Streamlined Unlocked Dashboard (Unified Canvas Card) ── */
            <motion.div
              key="unlocked-dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-amber-100 bg-white p-5 shadow-sm space-y-4 dark:bg-stone-900 dark:border-amber-950"
            >
              {/* Header Title */}
              <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
                <h1 className="font-serif text-lg font-bold text-stone-850 dark:text-stone-100">Deep Analytics</h1>
                <span className="text-[10px] text-stone-400 font-semibold">{filteredEntries.length} items</span>
              </div>

              {/* Minimalist Date Filters */}
              <div className="space-y-2.5">
                <div className="flex bg-stone-50 p-0.5 rounded-xl dark:bg-stone-955 border border-stone-100 dark:border-stone-850">
                  {[
                    { id: 'overall', label: 'Overall' },
                    { id: 'month', label: 'Monthly' },
                    { id: 'custom', label: 'Custom Range' }
                  ].map(btn => (
                    <button
                      key={btn.id}
                      onClick={() => setFilterType(btn.id)}
                      className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                        filterType === btn.id
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-300'
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>

                {/* Sub filter control panel */}
                <AnimatePresence mode="wait">
                  {filterType === 'month' && (
                    <motion.div
                      key="ctrl-month"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden flex items-center gap-3 bg-stone-50/50 p-2 rounded-xl dark:bg-stone-950/20"
                    >
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Select Month:</span>
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="flex-1 rounded-lg border border-amber-100 bg-white px-2 py-1 text-xs text-stone-750 focus:border-amber-300 dark:border-amber-955 dark:bg-stone-950 dark:text-stone-300 outline-none"
                      >
                        {availableMonths.map(m => (
                          <option key={m.key} value={m.key}>{m.label}</option>
                        ))}
                      </select>
                    </motion.div>
                  )}

                  {filterType === 'custom' && (
                    <motion.div
                      key="ctrl-custom"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden grid grid-cols-2 gap-2 bg-stone-50/50 p-2 rounded-xl dark:bg-stone-955/20 text-[10px]"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-stone-400 font-bold uppercase tracking-wider">Start:</span>
                        <input
                          type="date"
                          value={customStart}
                          onChange={(e) => setCustomStart(e.target.value)}
                          className="flex-1 rounded-lg border border-amber-100 bg-white px-1 py-0.5 text-xs text-stone-700 dark:border-amber-950 dark:bg-stone-950 dark:text-stone-300 outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-stone-400 font-bold uppercase tracking-wider">End:</span>
                        <input
                          type="date"
                          value={customEnd}
                          onChange={(e) => setCustomEnd(e.target.value)}
                          className="flex-1 rounded-lg border border-amber-100 bg-white px-1 py-0.5 text-xs text-stone-700 dark:border-amber-950 dark:bg-stone-950 dark:text-stone-300 outline-none"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Minimalist 3-Column Stats Row */}
              <div className="grid grid-cols-3 gap-1 divide-x divide-stone-100 dark:divide-stone-800 text-center py-2 border-y border-stone-100 dark:border-stone-850">
                <div>
                  <span className="text-[10px] text-stone-400 font-medium uppercase tracking-wider block mb-0.5">Income</span>
                  <p className="text-base font-bold text-emerald-600 font-serif">
                    {getCurrencySymbol()}{formatAmount(totalIncome, 0)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 font-medium uppercase tracking-wider block mb-0.5">Spent</span>
                  <p className="text-base font-bold text-rose-505 font-serif">
                    {getCurrencySymbol()}{formatAmount(totalSpending, 0)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 font-medium uppercase tracking-wider block mb-0.5">Savings</span>
                  <p className={`text-base font-bold font-serif ${netSavings >= 0 ? 'text-amber-600' : 'text-rose-600'}`}>
                    {netSavings < 0 ? '-' : ''}{getCurrencySymbol()}{formatAmount(Math.abs(netSavings), 0)}
                  </p>
                  <span className="text-[9px] text-stone-400 block mt-0.5">Rate: {savingsRate.toFixed(0)}%</span>
                </div>
              </div>

              {/* Category Breakdown list */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                    Category distribution
                  </h2>
                  
                  {/* Selector Segment */}
                  <div className="flex bg-stone-50 p-0.5 rounded-lg text-[9.5px] border border-stone-100 dark:bg-stone-955 dark:border-stone-800">
                    <button
                      onClick={() => setBreakdownTab('expense')}
                      className={`px-2 py-0.5 font-semibold rounded-md transition-all cursor-pointer ${
                        breakdownTab === 'expense' ? 'bg-white text-rose-600 shadow-sm dark:bg-stone-900' : 'text-stone-400'
                      }`}
                    >
                      Spendings
                    </button>
                    <button
                      onClick={() => setBreakdownTab('income')}
                      className={`px-2 py-0.5 font-semibold rounded-md transition-all cursor-pointer ${
                        breakdownTab === 'income' ? 'bg-white text-emerald-600 shadow-sm dark:bg-stone-900' : 'text-stone-400'
                      }`}
                    >
                      Incomes
                    </button>
                  </div>
                </div>

                {/* Categories progress bars */}
                {breakdownTab === 'expense' ? (
                  expenseCategoryBreakdown.length > 0 ? (
                    <div className="space-y-2.5">
                      {expenseCategoryBreakdown.map((cat, idx) => {
                        const pct = totalSpending > 0 ? (cat.value / totalSpending) * 100 : 0
                        const palette = ['#de8776', '#f4a261', '#e76f51', '#cd6a62', '#e5989b', '#b5838d']
                        const color = palette[idx % palette.length]
                        return (
                          <button
                            key={cat.name}
                            type="button"
                            onClick={() => {
                              setSelectedCategory({ name: cat.name, type: 'expense' })
                              setShowCategoryModal(true)
                            }}
                            className="w-full text-left bg-stone-50/10 p-2 border border-stone-100/50 hover:border-amber-200 rounded-xl transition-all block group dark:border-stone-850 dark:bg-stone-950/10"
                          >
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-semibold text-stone-700 dark:text-stone-200">{cat.name}</span>
                              <span className="font-bold text-rose-500">
                                {getCurrencySymbol()}{formatAmount(cat.value, 0)}
                              </span>
                            </div>
                            <div className="h-1 rounded-full bg-stone-100 overflow-hidden dark:bg-stone-800">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                            </div>
                            <div className="flex items-center justify-between text-[8px] text-stone-400 mt-1">
                              <span>{pct.toFixed(0)}% of expenses</span>
                              <span className="text-stone-300 group-hover:text-amber-600 transition-colors">Tap for transactions</span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-center py-4 text-stone-400 italic text-xs">No spending recorded in this period.</p>
                  )
                ) : (
                  incomeCategoryBreakdown.length > 0 ? (
                    <div className="space-y-2.5">
                      {incomeCategoryBreakdown.map((cat, idx) => {
                        const pct = totalIncome > 0 ? (cat.value / totalIncome) * 100 : 0
                        const palette = ['#95b38f', '#7fb3a8', '#d7a95a', '#a8dadc', '#457b9d']
                        const color = palette[idx % palette.length]
                        return (
                          <button
                            key={cat.name}
                            type="button"
                            onClick={() => {
                              setSelectedCategory({ name: cat.name, type: 'income' })
                              setShowCategoryModal(true)
                            }}
                            className="w-full text-left bg-stone-50/10 p-2 border border-stone-100/50 hover:border-amber-200 rounded-xl transition-all block group dark:border-stone-850 dark:bg-stone-955/10"
                          >
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-semibold text-stone-700 dark:text-stone-200">{cat.name}</span>
                              <span className="font-bold text-emerald-600">
                                {getCurrencySymbol()}{formatAmount(cat.value, 0)}
                              </span>
                            </div>
                            <div className="h-1 rounded-full bg-stone-100 overflow-hidden dark:bg-stone-800">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                            </div>
                            <div className="flex items-center justify-between text-[8px] text-stone-400 mt-1">
                              <span>{pct.toFixed(0)}% of income</span>
                              <span className="text-stone-300 group-hover:text-amber-600 transition-colors">Tap for transactions</span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-center py-4 text-stone-400 italic text-xs">No income recorded in this period.</p>
                  )
                )}
              </div>

              {/* Minimalist Chronological Transactions list */}
              <div className="space-y-2.5 pt-2 border-t border-stone-100 dark:border-stone-800">
                <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block">
                  Chronological Ledger ({filteredEntries.length})
                </span>

                {filteredEntries.length === 0 ? (
                  <p className="text-xs text-stone-400 italic text-center py-3">No transactions found in this period.</p>
                ) : (
                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                    {filteredEntries.slice(0, 10).map((txn, idx) => {
                      const date = new Date(txn.timestamp)
                      const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                      const details = bookDetailsMap[txn.bookId]
                      const isInc = txn.type === 'income'

                      return (
                        <button
                          key={txn.id || idx}
                          type="button"
                          onClick={() => navigate(`/projects/${txn.projectId}/books/${txn.bookId}?focusedEntryId=${txn.id}`)}
                          className="w-full text-left rounded-lg bg-stone-50/20 p-2 hover:bg-amber-50/5 hover:border-amber-100/50 border border-transparent transition-all flex justify-between items-center gap-2 group dark:bg-stone-950/10"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-stone-750 truncate dark:text-stone-250 group-hover:text-amber-850 transition-colors">
                              {txn.description || 'Untitled Transaction'}
                            </p>
                            <p className="text-[9px] text-stone-400 mt-0.5">
                              {dateStr} · {txn.category || 'General'} {details && `· ${details.bookName}`}
                            </p>
                          </div>
                          <span className={`text-xs font-bold ${isInc ? 'text-emerald-600' : 'text-rose-500'}`}>
                            {isInc ? '+' : '-'}{getCurrencySymbol()}{formatAmount(txn.amount, 0)}
                          </span>
                        </button>
                      )
                    })}
                    {filteredEntries.length > 10 && (
                      <p className="text-[9px] text-stone-400 text-center pt-1 italic">
                        Showing latest 10 of {filteredEntries.length} items.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
              className="w-full max-w-lg rounded-3xl border border-amber-100 bg-white shadow-2xl max-h-[80vh] overflow-x-hidden overflow-y-auto p-6 dark:bg-stone-900 dark:border-amber-950"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-stone-100 dark:border-stone-800">
                <div>
                  <h3 className="font-serif text-lg font-bold text-stone-850 dark:text-stone-100">{selectedCategory.name}</h3>
                  <p className="text-[10px] text-stone-400 mt-0.5">
                    {categoryTransactions.length} {selectedCategory.type}{categoryTransactions.length !== 1 ? 's' : ''} under this category
                  </p>
                </div>
                <button
                  onClick={() => setShowCategoryModal(false)}
                  className="rounded-xl px-2.5 py-1.5 border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-55 transition-colors dark:border-stone-800 dark:text-stone-300 dark:hover:bg-stone-800"
                >
                  Close
                </button>
              </div>

              {/* Transactions List */}
              {categoryTransactions.length === 0 ? (
                <p className="text-xs text-stone-400 italic text-center py-6">No records found.</p>
              ) : (
                <div className="space-y-2.5">
                  {categoryTransactions.map((txn, idx) => {
                    const date = new Date(txn.timestamp)
                    const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                    const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                    const details = bookDetailsMap[txn.bookId]
                    const isInc = txn.type === 'income'

                    return (
                      <motion.button
                        key={txn.id || idx}
                        type="button"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(idx * 0.04, 0.2) }}
                        onClick={() => {
                          setShowCategoryModal(false)
                          navigate(`/projects/${txn.projectId}/books/${txn.bookId}?focusedEntryId=${txn.id}`)
                        }}
                        className="w-full text-left rounded-2xl border border-stone-105 hover:border-amber-200 bg-stone-50/20 hover:bg-amber-50/5 p-3 transition-all flex justify-between items-start gap-3 group cursor-pointer dark:border-stone-850 dark:bg-stone-950/20"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-stone-800 group-hover:text-amber-805 transition-colors truncate dark:text-stone-200 dark:group-hover:text-amber-500">
                            {txn.description || `Untitled ${isInc ? 'Income' : 'Spending'}`}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5 text-[9px] text-stone-400 flex-wrap">
                            <span className="bg-stone-100 px-1.5 py-0.5 rounded-md dark:bg-stone-800">{dateStr}</span>
                            <span className="bg-stone-100 px-1.5 py-0.5 rounded-md dark:bg-stone-800">{txn.mode || 'Cash'}</span>
                            {details && (
                              <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-md font-medium max-w-[120px] truncate dark:bg-amber-950/20 dark:text-amber-400">
                                {details.bookName}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`text-sm font-bold ${isInc ? 'text-emerald-600' : 'text-rose-500'}`}>
                            {isInc ? '+' : '-'}{getCurrencySymbol()}{formatAmount(txn.amount, 0)}
                          </p>
                          <p className="text-[9px] text-stone-400 mt-1">{timeStr}</p>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Toast message={toast.msg} type={toast.type} visible={toast.visible} />
    </LayoutShell>
  )
}
