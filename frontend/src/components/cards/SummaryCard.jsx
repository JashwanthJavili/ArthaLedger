import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Scale } from 'lucide-react'
import { formatAmount, getCurrencySymbol } from '../../lib/format'

export default function SummaryStrip({ net, totalIn, totalOut, delay = 0 }) {
  const symbol = getCurrencySymbol()
  const netPositive = net >= 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: 'easeOut' }}
      className="rounded-2xl border border-amber-100/80 bg-white/88 shadow-sm overflow-hidden"
    >
      {/* Net balance — full-width top row */}
      <div className={`px-4 py-3 flex items-center justify-between ${netPositive ? 'bg-gradient-to-r from-amber-50 to-orange-50' : 'bg-gradient-to-r from-red-50 to-rose-50'}`}>
        <div className="flex items-center gap-2">
          <div className={`rounded-lg p-1.5 ${netPositive ? 'bg-amber-100' : 'bg-red-100'}`}>
            <Scale size={13} className={netPositive ? 'text-amber-600' : 'text-red-500'} />
          </div>
          <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">Net Balance</span>
        </div>
        <span className={`text-lg font-bold font-serif ${netPositive ? 'text-stone-800' : 'text-red-600'}`}>
          {netPositive ? '' : '-'}{symbol}{formatAmount(Math.abs(net))}
        </span>
      </div>

      {/* Divider */}
      <div className="h-px bg-amber-100/60" />

      {/* Cash In + Cash Out — two columns */}
      <div className="grid grid-cols-2 divide-x divide-amber-100/60">
        <div className="px-4 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <TrendingUp size={12} className="flex-shrink-0 text-emerald-500" />
            <span className="text-[11px] text-stone-400 truncate">Cash In</span>
          </div>
          <span className="text-sm font-semibold text-emerald-700 flex-shrink-0">
            {symbol}{formatAmount(totalIn)}
          </span>
        </div>
        <div className="px-4 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <TrendingDown size={12} className="flex-shrink-0 text-red-400" />
            <span className="text-[11px] text-stone-400 truncate">Cash Out</span>
          </div>
          <span className="text-sm font-semibold text-red-600 flex-shrink-0">
            {symbol}{formatAmount(totalOut)}
          </span>
        </div>
      </div>
    </motion.div>
  )
}
