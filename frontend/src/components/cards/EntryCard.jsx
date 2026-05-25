import { format } from 'date-fns'
import { HandCoins, Landmark, Smartphone, Wallet, User, ArrowRight, ArrowLeft, PiggyBank } from 'lucide-react'
import { motion } from 'framer-motion'
import { formatAmount, getCurrencySymbol } from '../../lib/format'

const modeIcon = {
  Cash: Wallet,
  UPI: Smartphone,
  Online: HandCoins,
  'Bank Transfer': Landmark,
  Internal: ArrowRight,
}

const modeColor = {
  Cash: 'bg-amber-50 text-amber-700 border-amber-100',
  UPI: 'bg-blue-50 text-blue-700 border-blue-100',
  Online: 'bg-purple-50 text-purple-700 border-purple-100',
  'Bank Transfer': 'bg-teal-50 text-teal-700 border-teal-100',
  Internal: 'bg-blue-50 text-blue-700 border-blue-100',
}

export default function EntryCard({ entry }) {
  const ModeIcon = modeIcon[entry.mode] || Wallet
  const isIncome = entry.type === 'income'
  const isTransferIn = entry.type === 'transfer_in'
  const isTransferOut = entry.type === 'transfer_out'
  const isTransfer = isTransferIn || isTransferOut
  const modeStyle = modeColor[entry.mode] || 'bg-stone-50 text-stone-600 border-stone-100'
  const symbol = getCurrencySymbol()

  const amountColor = entry.isSavings
    ? 'text-violet-600'
    : isTransferIn
    ? 'text-blue-600'
    : isTransferOut
    ? 'text-blue-500'
    : isIncome
    ? 'text-emerald-700'
    : 'text-red-600'

  const iconBg    = entry.isSavings ? 'bg-violet-50' : isTransfer ? 'bg-blue-50' : isIncome ? 'bg-emerald-50' : 'bg-red-50'
  const iconColor = entry.isSavings ? 'text-violet-500' : isTransfer ? 'text-blue-500' : isIncome ? 'text-emerald-600' : 'text-red-500'
  const TransferIcon = isTransferIn ? ArrowLeft : ArrowRight

  return (
    <motion.div
      whileTap={{ scale: 0.99 }}
      whileHover={{ y: -1, boxShadow: '0 4px 20px rgba(185,147,78,0.12)' }}
      transition={{ duration: 0.15 }}
      className={`rounded-2xl border bg-white/88 p-3.5 sm:p-4 shadow-sm ${
        entry.isSavings ? 'border-violet-100/80' : isTransfer ? 'border-blue-100/80' : 'border-amber-100/80'
      }`}
    >
      {/* Savings badge */}
      {entry.isSavings && (
        <div className="flex items-center gap-1.5 mb-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 border border-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-600">
            <PiggyBank size={9} /> Savings
          </span>
          <span className="text-[10px] text-stone-400">· Not counted in analytics</span>
        </div>
      )}
      {/* Transfer badge */}
      {isTransfer && (
        <div className="flex items-center gap-1.5 mb-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
            <ArrowRight size={9} />
            {isTransferIn ? 'Transfer In' : 'Transfer Out'}
          </span>
          <span className="text-[10px] text-stone-400">
            · {entry.transferScope === 'cross_project' ? 'Cross-project transfer' : 'Internal transfer'}
          </span>
        </div>
      )}

      {/* Main row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <div className={`flex-shrink-0 mt-0.5 rounded-xl p-2 ${iconBg}`}>
            {isTransfer
              ? <TransferIcon size={14} className={iconColor} />
              : <ModeIcon size={14} className={iconColor} />
            }
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-stone-800 leading-tight truncate">{entry.description}</p>
            <p className="text-xs text-stone-400 mt-0.5 truncate">{entry.category}</p>
          </div>
        </div>

        <div className="flex-shrink-0 text-right">
          <p className={`text-sm sm:text-base font-bold ${amountColor}`}>
            {isTransferIn ? '+' : isTransferOut ? '-' : isIncome ? '+' : '-'}{symbol}{formatAmount(entry.amount)}
          </p>
        </div>
      </div>

      {/* Middle row */}
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${modeStyle}`}>
          <ModeIcon size={10} />
          {entry.mode}
        </span>
        <span className="text-[10px] text-stone-400">
          {format(new Date(entry.timestamp), 'dd MMM yyyy, h:mm a')}
        </span>
      </div>

      {/* Bottom row */}
      <div className="mt-2 flex items-center justify-between border-t border-amber-50 pt-2 gap-2">
        <span className="text-[10px] text-stone-500">
          Balance: <span className="font-semibold text-stone-700">{symbol}{formatAmount(entry.balanceAfter || 0)}</span>
        </span>
        {entry.enteredBy && (
          <span className="inline-flex items-center gap-1 text-[10px] text-stone-400">
            <User size={9} /> {entry.enteredBy}
          </span>
        )}
      </div>

      {entry.notes && (
        <p className="mt-1.5 text-[10px] italic text-stone-400 leading-relaxed line-clamp-2">{entry.notes}</p>
      )}
    </motion.div>
  )
}
