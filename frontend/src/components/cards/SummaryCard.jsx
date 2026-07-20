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
        <div className="flex items-center">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Net Balance</span>
        </div>
        <span className={`text-lg font-bold font-serif ${netPositive ? 'text-stone-800' : 'text-red-600'}`}>
          {netPositive ? '' : '-'}{symbol}{formatAmount(Math.abs(net))}
        </span>
      </div>

      {/* Divider */}
      <div className="h-px bg-amber-100/60" />

      {/* Cash In + Cash Out — two columns stacked */}
      <div className="grid grid-cols-2 divide-x divide-amber-100/60 text-center py-2.5 bg-stone-50/20 dark:bg-stone-950/10">
        <div className="flex flex-col items-center justify-center px-4 py-1">
          <span className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider mb-0.5">Cash In</span>
          <div className="flex items-center justify-center gap-1">
            <TrendingUp size={12} className="text-emerald-600 flex-shrink-0" />
            <span className="text-sm font-bold text-emerald-600 font-serif">
              {symbol}{formatAmount(totalIn)}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center px-4 py-1">
          <span className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider mb-0.5">Cash Out</span>
          <div className="flex items-center justify-center gap-1">
            <TrendingDown size={12} className="text-rose-500 flex-shrink-0" />
            <span className="text-sm font-bold text-rose-500 font-serif">
              {symbol}{formatAmount(totalOut)}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
