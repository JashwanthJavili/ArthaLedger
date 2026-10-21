import { useMemo } from 'react'
import { format } from 'date-fns'
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, PiggyBank, Compass, User } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { useAppData } from '../../context/AppDataContext'
import { formatAmount, getCurrencySymbol } from '../../lib/format'

// One transaction row; BookPage places rows inside a per-day card.
export default function EntryCard({ entry, balance }) {
  const { projectId, bookId } = useParams()
  const { trips } = useAppData()

  const linkedTrips = useMemo(() => {
    if (!projectId || !bookId || !trips) return []
    return trips.filter(trip =>
      trip.entries && trip.entries[`${projectId}_${bookId}_${entry.id}`]
    )
  }, [trips, projectId, bookId, entry.id])

  const isIncome = entry.type === 'income'
  const isTransferIn = entry.type === 'transfer_in'
  const isTransferOut = entry.type === 'transfer_out'
  const isTransfer = isTransferIn || isTransferOut
  const isCredit = isIncome || isTransferIn
  const symbol = getCurrencySymbol()

  const visual = entry.isSavings
    ? { Icon: PiggyBank,      chip: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',   amount: 'text-violet-600 dark:text-violet-400' }
    : isTransfer
      ? { Icon: ArrowLeftRight, chip: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',          amount: 'text-sky-600 dark:text-sky-400' }
      : isIncome
        ? { Icon: ArrowDownLeft, chip: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', amount: 'text-emerald-600 dark:text-emerald-400' }
        : { Icon: ArrowUpRight,  chip: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',       amount: 'text-[var(--text-main)]' }

  const meta = [
    entry.category || 'General',
    entry.subcategory,
    entry.mode || 'UPI',
    format(new Date(entry.timestamp), 'h:mm a'),
  ].filter(Boolean).join(' · ')

  const tags = [
    entry.isSavings && { key: 'savings', label: 'Savings', Icon: PiggyBank, cls: 'text-violet-600 dark:text-violet-400 bg-violet-500/10' },
    isTransfer && {
      key: 'transfer',
      label: `${isTransferIn ? 'Transfer in' : 'Transfer out'} · ${entry.transferScope === 'cross_project' ? 'Cross-project' : 'Internal'}`,
      Icon: ArrowLeftRight,
      cls: 'text-sky-600 dark:text-sky-400 bg-sky-500/10',
    },
    ...linkedTrips.map(t => ({ key: t.id, label: t.name, Icon: Compass, cls: 'text-[var(--gold-primary)] bg-[var(--gold-light)]' })),
    entry.enteredBy && { key: 'by', label: entry.enteredBy, Icon: User, cls: 'text-[var(--text-muted)] bg-[var(--border-subtle)]' },
  ].filter(Boolean)

  return (
    <div className="flex items-start gap-3 py-3">
      <span className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${visual.chip}`}>
        <visual.Icon size={16} strokeWidth={2.2} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="truncate text-[14px] font-medium text-[var(--text-main)]">
            {entry.description || (isCredit ? 'Money in' : 'Money out')}
          </p>
          <p className={`flex-shrink-0 text-[14px] font-semibold tabular-nums ${visual.amount}`}>
            {isCredit ? '+' : '−'}{symbol}{formatAmount(entry.amount)}
          </p>
        </div>

        <div className="mt-0.5 flex items-baseline justify-between gap-3 text-[11px] text-[var(--text-subtle)]">
          <p className="truncate">{meta}</p>
          <p className="flex-shrink-0 tabular-nums">Bal {(balance ?? entry.balanceAfter ?? 0) < 0 ? '−' : ''}{symbol}{formatAmount(balance ?? entry.balanceAfter ?? 0)}</p>
        </div>

        {tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {tags.map(({ key, label, Icon, cls }) => (
              <span key={key} className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${cls}`}>
                <Icon size={10} /> {label}
              </span>
            ))}
          </div>
        )}

        {entry.notes && (
          <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-[var(--text-muted)]">
            {entry.notes}
          </p>
        )}
      </div>
    </div>
  )
}
