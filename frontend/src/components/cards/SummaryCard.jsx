import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Scale } from 'lucide-react'

const toneConfig = {
  neutral: {
    gradient: 'from-amber-50 to-orange-50',
    border: 'border-amber-100',
    text: 'text-stone-800',
    sub: 'text-stone-500',
    icon: Scale,
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-100',
  },
  income: {
    gradient: 'from-emerald-50 to-teal-50',
    border: 'border-emerald-100',
    text: 'text-emerald-800',
    sub: 'text-emerald-600',
    icon: TrendingUp,
    iconColor: 'text-emerald-600',
    iconBg: 'bg-emerald-100',
  },
  expense: {
    gradient: 'from-rose-50 to-red-50',
    border: 'border-rose-100',
    text: 'text-red-700',
    sub: 'text-red-500',
    icon: TrendingDown,
    iconColor: 'text-red-500',
    iconBg: 'bg-red-100',
  },
}

export default function SummaryCard({ title, value, tone = 'neutral', delay = 0 }) {
  const cfg = toneConfig[tone]
  const Icon = cfg.icon
  // Read currency symbol from localStorage (set in Settings)
  const currencyMap = { INR: '₹', USD: '$', EUR: '€', GBP: '£', JPY: '¥', AED: 'د.إ', SGD: 'S$' }
  const currencyCode = typeof window !== 'undefined' ? (localStorage.getItem('sl_currency') || 'INR') : 'INR'
  const symbol = currencyMap[currencyCode] || '₹'

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
      className={`rounded-2xl sm:rounded-3xl border bg-gradient-to-br p-4 sm:p-5 shadow-sm ${cfg.gradient} ${cfg.border}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`text-[10px] sm:text-xs uppercase tracking-[0.15em] font-medium ${cfg.sub}`}>{title}</p>
          <h3 className={`mt-1.5 text-xl sm:text-2xl font-semibold font-serif truncate ${cfg.text}`}>
            {symbol}{value}
          </h3>
        </div>
        <div className={`flex-shrink-0 rounded-xl p-2 ${cfg.iconBg}`}>
          <Icon size={16} className={cfg.iconColor} />
        </div>
      </div>
    </motion.article>
  )
}
