import { motion } from 'framer-motion'

// Full-screen brand loader (app start, auth checks, first data load).
export default function Loader({ text = 'Loading…' }) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-[var(--bg-page)] px-4">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <motion.span
          className="absolute inset-0 rounded-2xl bg-[var(--gold-primary)]/25"
          animate={{ scale: [1, 1.35], opacity: [0.6, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
        />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 font-serif-luxury text-2xl font-bold text-white shadow-lg shadow-amber-600/25">
          अ
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-[13px] font-medium text-[var(--text-muted)]"
        >
          {text}
        </motion.p>
        <div className="h-1 w-32 overflow-hidden rounded-full bg-[var(--border-subtle)]">
          <motion.div
            className="h-full w-1/3 rounded-full bg-[var(--gold-primary)]"
            animate={{ x: ['-100%', '300%'] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      </div>
    </div>
  )
}
