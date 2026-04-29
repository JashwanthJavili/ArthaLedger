import { useMemo } from 'react'
import {
  Bar, BarChart, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts'
import { Link } from 'react-router-dom'
import { ArrowLeft, BarChart3, PieChart as PieIcon, TrendingUp } from 'lucide-react'
import { motion } from 'framer-motion'
import LayoutShell from '../components/LayoutShell'
import { useAppData } from '../context/AppDataContext'

const COLORS = ['#d7a95a', '#95b38f', '#de8776', '#a8916f', '#f0c78d', '#7fb3a8', '#c9a0dc', '#f4a261']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-amber-100 bg-white/95 px-3 py-2 shadow-lg text-xs">
      {label && <p className="font-semibold text-stone-700 mb-1">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name}: ₹{Number(p.value).toFixed(2)}
        </p>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const { entriesByBook } = useAppData()
  const allEntries = Object.values(entriesByBook).flat()

  const monthly = useMemo(() => {
    const map = new Map()
    allEntries.forEach((entry) => {
      const d = new Date(entry.timestamp)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' })
      const current = map.get(key) || { month: key, label, income: 0, expense: 0 }
      if (entry.type === 'income') current.income += Number(entry.amount)
      if (entry.type === 'expense') current.expense += Number(entry.amount)
      map.set(key, current)
    })
    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month)).slice(-12)
  }, [allEntries])

  const byCategory = useMemo(() => {
    const map = new Map()
    allEntries.forEach((entry) => {
      if (!entry.category) return
      map.set(entry.category, (map.get(entry.category) || 0) + Number(entry.amount))
    })
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [allEntries])

  const byMode = useMemo(() => {
    const map = new Map()
    allEntries.forEach((entry) => {
      if (!entry.mode) return
      map.set(entry.mode, (map.get(entry.mode) || 0) + Number(entry.amount))
    })
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  }, [allEntries])

  const totals = useMemo(() => {
    const income = allEntries.filter((e) => e.type === 'income').reduce((s, e) => s + Number(e.amount), 0)
    const expense = allEntries.filter((e) => e.type === 'expense').reduce((s, e) => s + Number(e.amount), 0)
    return { income, expense, net: income - expense }
  }, [allEntries])

  const isEmpty = allEntries.length === 0

  return (
    <LayoutShell>
      <div className="space-y-3 sm:space-y-4">
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
            {/* Summary totals */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Total In', value: totals.income, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100' },
                { label: 'Total Out', value: totals.expense, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
                { label: 'Net', value: totals.net, color: totals.net >= 0 ? 'text-amber-700' : 'text-red-600', bg: 'bg-amber-50', border: 'border-amber-100' },
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className={`rounded-2xl border p-3 text-center ${item.bg} ${item.border}`}
                >
                  <p className="text-[10px] text-stone-500 mb-1">{item.label}</p>
                  <p className={`text-sm sm:text-base font-bold font-serif truncate ${item.color}`}>
                    ₹{Math.abs(item.value).toFixed(0)}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Monthly bar chart */}
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl sm:rounded-3xl border border-amber-100/80 bg-white/85 p-4 sm:p-5 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={14} className="text-amber-600" />
                <h2 className="text-sm font-semibold text-stone-700">Monthly Income vs Expense</h2>
              </div>
              <div className="h-52 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f5e8d0" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#78716c' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#78716c' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="income" name="Income" fill="#3b9f74" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="expense" name="Expense" fill="#d26f5f" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.section>

            {/* Category + Mode charts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Category breakdown */}
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-2xl sm:rounded-3xl border border-amber-100/80 bg-white/85 p-4 sm:p-5 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-4">
                  <PieIcon size={14} className="text-amber-600" />
                  <h2 className="text-sm font-semibold text-stone-700">Category Breakdown</h2>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={byCategory}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {byCategory.map((item, idx) => (
                          <Cell key={item.name} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </motion.section>

              {/* Payment mode */}
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="rounded-2xl sm:rounded-3xl border border-amber-100/80 bg-white/85 p-4 sm:p-5 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-4">
                  <PieIcon size={14} className="text-amber-600" />
                  <h2 className="text-sm font-semibold text-stone-700">Payment Modes</h2>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={byMode}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {byMode.map((item, idx) => (
                          <Cell key={item.name} fill={['#a7c4a0', '#d6ae63', '#d98978', '#9f8f74'][idx % 4]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </motion.section>
            </div>

            {/* Category list */}
            {byCategory.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="rounded-2xl sm:rounded-3xl border border-amber-100/80 bg-white/85 p-4 sm:p-5 shadow-sm"
              >
                <h2 className="text-sm font-semibold text-stone-700 mb-3">Top Categories</h2>
                <div className="space-y-2">
                  {byCategory.map((cat, idx) => {
                    const max = byCategory[0].value
                    const pct = (cat.value / max) * 100
                    return (
                      <div key={cat.name} className="flex items-center gap-3">
                        <span className="w-20 text-xs text-stone-600 truncate">{cat.name}</span>
                        <div className="flex-1 h-2 rounded-full bg-amber-50 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ delay: 0.3 + idx * 0.05, duration: 0.5 }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                          />
                        </div>
                        <span className="w-20 text-right text-xs font-medium text-stone-700">₹{cat.value.toFixed(0)}</span>
                      </div>
                    )
                  })}
                </div>
              </motion.section>
            )}
          </>
        )}
      </div>
    </LayoutShell>
  )
}
