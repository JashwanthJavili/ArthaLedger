/**
 * Simple pill selector for choosing 4 or 6 digit PIN length.
 *
 * Props:
 *   value    — 4 or 6
 *   onChange — called with 4 or 6
 */
export default function PinLengthSelector({ value, onChange }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {[4, 6].map(len => (
        <button
          key={len}
          type="button"
          onClick={() => onChange?.(len)}
          className={[
            'px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-150',
            value === len
              ? 'bg-amber-500 text-white shadow-sm'
              : 'bg-stone-100 text-stone-500 hover:bg-stone-200',
          ].join(' ')}
        >
          {len} digits
        </button>
      ))}
    </div>
  )
}
