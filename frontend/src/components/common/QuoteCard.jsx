import { motion } from 'framer-motion'

/** Quote of the day: a quiet, editorial card with a large gold quotation mark. */
export default function QuoteCard({ quote }) {
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <motion.figure
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-3xl border border-[var(--border-card)] bg-[var(--bg-card)] px-6 pt-5 pb-6"
    >
      {/* Soft gold glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-60 blur-2xl"
        style={{ background: 'radial-gradient(circle, rgba(197,160,89,0.28), transparent 70%)' }}
      />
      {/* Oversized quotation mark */}
      <span
        aria-hidden="true"
        className="font-serif-luxury pointer-events-none absolute -top-3 left-4 select-none text-[96px] leading-none text-[var(--gold-primary)]/25"
      >
        &ldquo;
      </span>

      <blockquote className="relative pt-7">
        <p className="font-serif-luxury text-[19px] sm:text-[21px] leading-snug text-[var(--text-main)]">
          {quote}
        </p>
      </blockquote>

      <figcaption className="relative mt-4 flex items-center gap-2.5">
        <span className="h-px w-6 bg-[var(--gold-primary)]" />
        <span className="text-[11px] font-medium tracking-wide text-[var(--text-subtle)]">{today}</span>
      </figcaption>
    </motion.figure>
  )
}
