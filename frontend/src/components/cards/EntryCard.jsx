import { format } from 'date-fns'
import { HandCoins, Landmark, Smartphone, Wallet, User } from 'lucide-react'
import { motion } from 'framer-motion'

const modeIcon = {
  Cash: Wallet,
  UPI: Smartphone,
  Online: HandCoins,
  'Bank Transfer': Landmark,
}

const modeColor = {
  Cash: 'bg-amber-50 text-amber-700 border-amber-100',
  UPI: 'bg-blue-50 text-blue-700 border-blue-100',
  Online: 'bg-purple-50 text-purple-700 border-purple-100',
  'Bank Transfer': 'bg-teal-50 text-teal-700 border-teal-100',
}

export default function EntryCard({ entry }) {
  const ModeIcon = modeIcon[entry.mode] || Wallet
  const isIncome = entry.type === 'income'
  const modeStyle = modeColor[entry.mode] || 'bg-stone-50 text-stone-600 border-stone-100'
  const currencyMap = { INR: '₹', USD: '$', EUR: '€', GBP: '£', JPY: '¥', AED: 'د.إ', SGD: 'S$' }
  const symbol = currencyMap[localStorage.getItem('sl_currency') || 'INR'] || '₹'

  return (
    <motion.div
      whileTap={{ scale: 0.99 }}
      whileHover={{ y: -1, boxShadow: '0 4px 20px rgba(185,147,78,0.12)' }}
      transition={{ duration: 0.15 }}
      className="rounded-2xl border border-amber-100/80 bg-white/88 p-3.5 sm:p-4 shadow-sm"
    >
      {/* Main row */}
      <div className="flex items-start justify-between gap-3">
        {/* Left: icon + description */}
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <div className={`flex-shrink-0 mt-0.5 rounded-xl p-2 ${isIncome ? 'bg-emerald-50' : 'bg-red-50'}`}>
            <ModeIcon size={14} className={isIncome ? 'text-emerald-600' : 'text-red-500'} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-stone-800 leading-tight truncate">{entry.description}</p>
            <p className="text-xs text-stone-400 mt-0.5 truncate">{entry.category}</p>
          </div>
        </div>

        {/* Right: amount */}
        <div className="flex-shrink-0 text-right">
          <p className={`text-sm sm:text-base font-bold ${isIncome ? 'text-emerald-700' : 'text-red-600'}`}>
            {isIncome ? '+' : '-'}{symbol}{Number(entry.amount).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Middle row: mode badge + date */}
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${modeStyle}`}>
          <ModeIcon size={10} />
          {entry.mode}
        </span>
        <span className="text-[10px] text-stone-400">
          {format(new Date(entry.timestamp), 'dd MMM yyyy, h:mm a')}
        </span>
      </div>

      {/* Bottom row: balance + entered by */}
      <div className="mt-2 flex items-center justify-between border-t border-amber-50 pt-2 gap-2">
        <span className="text-[10px] text-stone-500">
          Balance: <span className="font-semibold text-stone-700">{symbol}{Number(entry.balanceAfter || 0).toFixed(2)}</span>
        </span>
        {entry.enteredBy && (
          <span className="inline-flex items-center gap-1 text-[10px] text-stone-400">
            <User size={9} /> {entry.enteredBy}
          </span>
        )}
      </div>

      {/* Notes */}
      {entry.notes && (
        <p className="mt-1.5 text-[10px] italic text-stone-400 leading-relaxed line-clamp-2">{entry.notes}</p>
      )}
    </motion.div>
  )
}
