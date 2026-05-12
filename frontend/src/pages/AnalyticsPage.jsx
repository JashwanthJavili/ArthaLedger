import { useMemo, useState } from 'react'
import {
  Bar, BarChart, Cell, Pie, PieChart, LineChart, Line,
  ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, BarChart3, TrendingUp, TrendingDown, Scale,
  Eye, EyeOff, AlertTriangle, Lightbulb, ArrowUpRight,
} from 'lucide-react'
import { motion } from 'framer-motion'
import LayoutShell from '../components/LayoutShell'
import { useAppData } from '../context/AppDataContext'

const PALETTE = ['#d7a95a', '#95b38f', '#de8776', '#7fb3a8', '#c9a0dc', '#f4a261', '#a8916f', '#f0c78d']

const fmt = (n) => {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000)   return `₹${(n / 1000).toFixed(1)}K`
  return `₹${Number(n).toFixed(0)}`
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-amber-100 bg-white/98 px-3 py-2 shadow-lg text-xs">
      {label && <p className="font-semibold text-stone-600 mb-1">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  )
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
  const { entriesByBook } = useAppData()
  const [hideBalance, setHideBalance] = useState(() => localStorage.getItem('al_hide_balance') === 'true')

  const toggleHideBalance = () => {
    setHideBalance(v => {
      const next = !v
      localStorage.setItem('al_hide_balance', String(next))
      return next
    })
  }

  // All entries, memoized
  const allEntries = useMemo(
    () => Object.values(entriesByBook).flat(),
    [entriesByBook]
  )

  // Spending entries = exclude savings-tagged income entries.
  // Savings expenses (spending from savings) ARE included — that's real spending.
  // Transfers are excluded entirely (they're internal moves, not real income/expense).
  const spendingEntries = useMemo(
    () => allEntries.filter(e => {
      if (e.isTransfer) return false          // internal transfers never count
      if (e.isSavings === true) return false  // savings deposits excluded
      return true
    }),
    [allEntries]
  )

  // Total spent = sum of expense entries (transfers excluded by spendingEntries)
  const totalSpent = useMemo(() => {
    return spendingEntries.filter(e => e.type === 'expense').reduce((s, e) => s + Number(e.amount), 0)
  }, [spendingEntries])

  // Monthly income vs expense — last 6 months
  const monthly = useMemo(() => {
    const map = new Map()
    spendingEntries.forEach(e => {
      const d = new Date(e.timestamp)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' })
      const cur = map.get(key) || { month: key, label, income: 0, expense: 0 }
      if (e.type === 'income')  cur.income  += Number(e.amount)
      if (e.type === 'expense') cur.expense += Number(e.amount)
      map.set(key, cur)
    })
    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month)).slice(-6)
  }, [spendingEntries])

  // Running balance trend — last 30 data points
  const balanceTrend = useMemo(() => {
    const sorted = [...spendingEntries].sort((a, b) => a.timestamp - b.timestamp)
    let running = 0
    return sorted.map(e => {
      running += e.type === 'income' ? Number(e.amount) : -Number(e.amount)
      const d = new Date(e.timestamp)
      return { label: `${d.getDate()}/${d.getMonth() + 1}`, balance: running }
    }).slice(-30)
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
      .slice(0, 8)
  }, [spendingEntries])

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

            {/* ── Monthly bar chart ── */}
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-amber-100/80 bg-white/85 p-4 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={14} className="text-amber-600" />
                <h2 className="text-sm font-semibold text-stone-700">Monthly Overview</h2>
                <span className="ml-auto text-[10px] text-stone-400">Last 6 months</span>
              </div>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barGap={3}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f5e8d0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#78716c' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#78716c' }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v).replace('₹', '')} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#fef3c7', radius: 6 }} />
                    <Bar dataKey="income"  name="In"  fill="#3b9f74" radius={[5, 5, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="expense" name="Out" fill="#e07070" radius={[5, 5, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-4 mt-2 justify-center">
                <span className="flex items-center gap-1.5 text-[10px] text-stone-500">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#3b9f74] inline-block" /> Income
                </span>
                <span className="flex items-center gap-1.5 text-[10px] text-stone-500">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#e07070] inline-block" /> Expense
                </span>
              </div>
            </motion.section>

            {/* ── Balance trend ── */}
            {balanceTrend.length > 2 && (
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="rounded-2xl border border-amber-100/80 bg-white/85 p-4 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-4">
                  <ArrowUpRight size={14} className="text-amber-600" />
                  <h2 className="text-sm font-semibold text-stone-700">Balance Trend</h2>
                  <span className="ml-auto text-[10px] text-stone-400">Last 30 entries</span>
                </div>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={balanceTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f5e8d0" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#a8a29e' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 9, fill: '#a8a29e' }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v).replace('₹', '')} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        type="monotone" dataKey="balance" name="Balance"
                        stroke="#d7a95a" strokeWidth={2} dot={false}
                        activeDot={{ r: 4, fill: '#d7a95a' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </motion.section>
            )}

            {/* ── Where your money goes ── */}
            {byCategory.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-2xl border border-amber-100/80 bg-white/85 p-4 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-4">
                  <TrendingDown size={14} className="text-red-400" />
                  <h2 className="text-sm font-semibold text-stone-700">Where Your Money Goes</h2>
                </div>

                <div className="h-44 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={byCategory} dataKey="value" nameKey="name"
                        cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={2}
                      >
                        {byCategory.map((item, idx) => (
                          <Cell key={item.name} fill={PALETTE[idx % PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2.5">
                  {byCategory.map((cat, idx) => {
                    const total = byCategory.reduce((s, c) => s + c.value, 0)
                    const pct   = total > 0 ? (cat.value / total) * 100 : 0
                    return (
                      <div key={cat.name} className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: PALETTE[idx % PALETTE.length] }} />
                        <span className="w-24 text-xs text-stone-600 truncate">{cat.name}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-stone-100 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ delay: 0.25 + idx * 0.04, duration: 0.5 }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: PALETTE[idx % PALETTE.length] }}
                          />
                        </div>
                        <span className="w-16 text-right text-xs font-semibold text-stone-700">{fmt(cat.value)}</span>
                        <span className="w-8 text-right text-[10px] text-stone-400">{pct.toFixed(0)}%</span>
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
