import { motion } from 'framer-motion'
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { formatAmount, getCurrencySymbol } from '../../lib/format'

export default function SummaryStrip({ net, totalIn, totalOut, delay = 0 }) {
  const symbol = getCurrencySymbol()
  // Round to paise so tiny float drift never flips the sign or shows "-0.00".
  const netRounded = Math.round((Number(net) || 0) * 100) / 100
  const netPositive = netRounded >= 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.25 }}
      className="rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)]"
    >
      <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-subtle)]">Net balance</p>
          <p className={`mt-0.5 truncate text-[22px] leading-tight font-bold tracking-tight tabular-nums ${
            netPositive ? 'text-[var(--text-main)]' : 'text-rose-600 dark:text-rose-400'
          }`}>
            {netPositive ? '' : '−'}{symbol}{formatAmount(Math.abs(netRounded))}
          </p>
        </div>
        <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
          netPositive
            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
            : 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
        }`}>
          {netPositive ? 'Surplus' : 'Deficit'}
        </span>
      </div>

      <div className="grid grid-cols-2 divide-x divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
        <div className="flex items-center gap-2 px-4 py-2.5 min-w-0">
          <ArrowDownLeft size={14} strokeWidth={2.4} className="flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div className="min-w-0">
            <p className="text-[10px] text-[var(--text-subtle)]">Cash in</p>
            <p className="truncate text-[13px] font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
              {symbol}{formatAmount(totalIn)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 min-w-0">
          <ArrowUpRight size={14} strokeWidth={2.4} className="flex-shrink-0 text-rose-600 dark:text-rose-400" />
          <div className="min-w-0">
            <p className="text-[10px] text-[var(--text-subtle)]">Cash out</p>
            <p className="truncate text-[13px] font-semibold tabular-nums text-rose-700 dark:text-rose-400">
              {symbol}{formatAmount(totalOut)}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
