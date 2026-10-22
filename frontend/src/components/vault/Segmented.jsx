import { motion } from 'framer-motion'

/**
 * Segmented control with a sliding pill (same feel as SpendingTrends' Monthly/Yearly switch).
 * options: [{ id, label }]
 */
export default function Segmented({ options, value, onChange, full = false, ariaLabel }) {
  const index = Math.max(0, options.findIndex(o => o.id === value))
  const n = options.length

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`relative isolate grid rounded-lg bg-[var(--border-subtle)] p-0.5 ${full ? 'w-full' : ''}`}
      style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
    >
      <motion.span
        aria-hidden
        initial={false}
        animate={{ x: `${index * 100}%` }}
        transition={{ type: 'spring', stiffness: 500, damping: 40 }}
        className="absolute inset-y-0.5 left-0.5 -z-10 rounded-md bg-[var(--bg-card)] shadow-sm"
        style={{ width: `calc((100% - 4px) / ${n})` }}
      />
      {options.map(o => {
        const active = o.id === value
        return (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.id)}
            className={`truncate px-3 text-[11px] font-semibold transition-colors cursor-pointer ${full ? 'py-1.5' : 'py-1'} ${
              active ? 'text-[var(--text-main)]' : 'text-[var(--text-subtle)] hover:text-[var(--text-main)]'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
