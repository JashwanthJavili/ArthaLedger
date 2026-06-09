import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Lock, Unlock, Eye, EyeOff, TrendingUp,
  AlertTriangle, Check, ShieldAlert, KeyRound, Globe, Smartphone,
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
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [showCategoryModal, setShowCategoryModal] = useState(false)

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
      showToast('Vault unlocked successfully ✓')
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── States & calculations for unlocked state ──

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

  const incomeCategoryBreakdown = useMemo(() => {
    return aggregateAndSortCategories(allEntries, new Set(), 'income')
  }, [allEntries])

  const totalIncome = useMemo(() => {
    return incomeCategoryBreakdown.reduce((sum, item) => sum + item.value, 0)
  }, [incomeCategoryBreakdown])

  const bookDetailsMap = useMemo(() => {
    const map = {}
    projects.forEach(project => {
      (booksByProject[project.id] || []).forEach(book => {
        map[book.id] = { bookName: book.name, projectName: project.name }
      })
    })
    return map
  }, [projects, booksByProject])

  const categoryTransactions = useMemo(() => {
    if (!selectedCategory) return []
    return allEntries
      .filter(e => e.type === 'income' && !e.isTransfer && (e.category || 'General') === selectedCategory)
      .sort((a, b) => b.timestamp - a.timestamp)
  }, [allEntries, selectedCategory])

  return (
    <LayoutShell>
      <div className="space-y-4 pb-6 max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/settings')}
            className="inline-flex items-center gap-1 rounded-xl border border-amber-100 px-2.5 py-1.5 text-xs text-stone-600 hover:bg-amber-50 transition-colors bg-white shadow-sm"
          >
            <ArrowLeft size={13} /> Back to Settings
          </button>
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
              className="rounded-3xl border border-amber-100 bg-white p-6 shadow-xl space-y-6 text-center"
            >
              {/* Lock Icon */}
              <div className="flex justify-center">
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                  className="rounded-full bg-amber-50 border border-amber-100 p-5 text-amber-700 shadow-sm"
                >
                  <Lock size={36} className="text-amber-700" />
                </motion.div>
              </div>

              <div>
                <h1 className="font-serif text-2xl font-bold text-stone-800">Secure Income Vault</h1>
                <p className="text-xs text-stone-400 mt-2 leading-relaxed px-4">
                  For your security, please confirm your identity to view private income statistics.
                </p>
              </div>

              <form onSubmit={handleUnlock} className="space-y-4 text-left">
                {isPasswordUser ? (
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
                      Account Password
                    </label>
                    <div className="relative">
                      <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError('') }}
                        placeholder="••••••••"
                        className="w-full rounded-2xl border border-amber-100 bg-amber-50/20 pl-10 pr-10 py-3 text-sm focus:border-amber-400 focus:bg-white outline-none transition-colors"
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
                  <div className="rounded-2xl border border-amber-100 bg-amber-50/30 p-4 text-center space-y-3">
                    <Globe size={24} className="text-amber-600 mx-auto" />
                    <p className="text-xs text-stone-600 leading-relaxed">
                      You are signed in via Google. Re-verify your active session to unlock the secure vault.
                    </p>
                  </div>
                )}

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl bg-red-50 border border-red-100 p-3.5 flex gap-2"
                  >
                    <ShieldAlert size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700 leading-relaxed font-medium">{error}</p>
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-amber-600 py-3.5 text-sm font-bold text-white hover:bg-amber-700 transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Unlock size={14} />
                  {loading ? 'Verifying...' : isPasswordUser ? 'Unlock Vault' : 'Verify with Google'}
                </button>
              </form>
            </motion.div>
          ) : (
            /* ── Unlocked Vault Dashboard ── */
            <motion.div
              key="unlocked-vault"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="space-y-4"
            >
              {/* Unlocked Announcement */}
              <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-white p-5 shadow-sm flex items-center gap-3">
                <div className="rounded-2xl bg-emerald-100 p-3.5 text-emerald-700">
                  <Unlock size={22} />
                </div>
                <div>
                  <h2 className="font-serif text-lg font-bold text-stone-800">Vault Session Unlocked</h2>
                  <p className="text-[10px] text-stone-400 mt-0.5">Secure dashboard is active. Settings are editable.</p>
                </div>
              </div>

              {/* Total Income Display */}
              <div className="rounded-3xl border border-amber-100 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <div className="rounded-xl bg-emerald-50 p-2">
                    <TrendingUp size={15} className="text-emerald-600" />
                  </div>
                  <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                    Total Private Income
                  </h3>
                </div>

                <div className="space-y-1">
                  <p className="text-4xl font-bold font-serif text-emerald-600">
                    {getCurrencySymbol()}{formatAmount(totalIncome, 2)}
                  </p>
                  <p className="text-[10px] text-stone-400">
                    Aggregated from all projects & cashbooks (transfers excluded).
                  </p>
                </div>

                {/* Progress Bars */}
                {incomeCategoryBreakdown.length > 0 ? (
                  <div className="space-y-3 pt-2">
                    <p className="text-xs font-semibold text-stone-600 border-t border-stone-100 pt-3">
                      Income Distribution
                    </p>
                    <div className="space-y-2.5">
                      {incomeCategoryBreakdown.map((cat, idx) => {
                        const pct = totalIncome > 0 ? (cat.value / totalIncome) * 100 : 0
                        const palette = ['#d7a95a', '#95b38f', '#de8776', '#7fb3a8', '#c9a0dc', '#f4a261', '#a8916f', '#f0c78d']
                        const color = palette[idx % palette.length]
                        return (
                          <button
                            key={cat.name}
                            type="button"
                            onClick={() => {
                              setSelectedCategory(cat.name)
                              setShowCategoryModal(true)
                            }}
                            className="w-full text-left rounded-2xl border border-stone-100 bg-stone-50/40 p-3 hover:border-amber-200 hover:bg-amber-50/10 transition-all cursor-pointer block group"
                          >
                            <div className="flex items-center justify-between text-xs mb-1.5">
                              <span className="font-semibold text-stone-700">{cat.name}</span>
                              <span className="font-bold text-emerald-600">
                                {getCurrencySymbol()}{formatAmount(cat.value, 2)}
                              </span>
                            </div>
                            <div className="h-2 rounded-full bg-stone-200 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ delay: idx * 0.05, duration: 0.5, ease: 'easeOut' }}
                                className="h-full rounded-full"
                                style={{ backgroundColor: color }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[9px] text-stone-400 mt-1.5">
                              <span>{pct.toFixed(1)}% of total income</span>
                              <span className="text-[8px] text-stone-300 group-hover:text-amber-600 transition-colors">Tap to view transactions</span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-stone-400 italic text-xs">
                    No income data available, or all categories have been hidden.
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
              className="w-full max-w-lg rounded-3xl border border-amber-100 bg-white shadow-2xl max-h-[80vh] overflow-x-hidden overflow-y-auto p-6"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-stone-100">
                <div>
                  <h3 className="font-serif text-lg font-bold text-stone-800">{selectedCategory}</h3>
                  <p className="text-[10px] text-stone-400 mt-0.5">
                    {categoryTransactions.length} transaction{categoryTransactions.length !== 1 ? 's' : ''} under this category
                  </p>
                </div>
                <button
                  onClick={() => setShowCategoryModal(false)}
                  className="rounded-xl p-1.5 text-stone-400 hover:bg-stone-100 transition-colors"
                >
                  Close
                </button>
              </div>

              {/* Transactions List */}
              {categoryTransactions.length === 0 ? (
                <p className="text-xs text-stone-400 italic text-center py-6">No income records found.</p>
              ) : (
                <div className="space-y-2.5">
                  {categoryTransactions.map((txn, idx) => {
                    const date = new Date(txn.timestamp)
                    const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                    const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                    const details = bookDetailsMap[txn.bookId]

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
                        className="w-full text-left rounded-2xl border border-stone-100 hover:border-amber-200 bg-stone-50/20 hover:bg-amber-50/10 p-3.5 transition-all flex justify-between items-start gap-3 group cursor-pointer"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-stone-800 group-hover:text-amber-800 transition-colors truncate">
                            {txn.description || 'Untitled Income'}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5 text-[9px] text-stone-400 flex-wrap">
                            <span className="bg-stone-100 px-1.5 py-0.5 rounded-md">{dateStr}</span>
                            <span className="bg-stone-100 px-1.5 py-0.5 rounded-md">{txn.mode || 'Cash'}</span>
                            {details && (
                              <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-md font-medium max-w-[120px] truncate">
                                {details.bookName}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-emerald-600">+{getCurrencySymbol()}{formatAmount(txn.amount, 2)}</p>
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
