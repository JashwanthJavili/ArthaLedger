import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const SHOW_MS = 1200

/**
 * Launch screen for the installed app. Android first shows the bare app
 * icon; this picks up from it (the icon is already in place, no fade-in),
 * then the name and tagline rise in beneath it, a thin gold line fills, and
 * the whole screen fades into the app. Uses the theme colours, so it
 * matches light and dark mode.
 */
export default function SplashScreen({ onDone }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), SHOW_MS)
    return () => clearTimeout(t)
  }, [])

  return (
    <AnimatePresence onExitComplete={onDone}>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[var(--bg-page)]"
        >
          <div className="flex flex-col items-center">
            <motion.img
              src="/icons/icon-192.png"
              alt=""
              initial={{ scale: 1.08, y: 22 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="h-20 w-20 rounded-[22px] shadow-[0_12px_32px_-12px_rgba(0,0,0,0.35)]"
              draggable="false"
            />
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
              className="mt-5 font-serif-luxury text-[26px] font-semibold tracking-[-0.01em] text-[var(--text-main)]"
            >
              ArthaLedger
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.36, ease: 'easeOut' }}
              className="mt-1 font-serif-luxury text-[13.5px] italic text-[var(--text-muted)]"
            >
              Where every rupee has meaning
            </motion.p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45, duration: 0.3 }}
              className="mt-6 h-[2px] w-16 overflow-hidden rounded-full bg-[var(--border-subtle)]"
            >
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: (SHOW_MS - 450) / 1000, delay: 0.45, ease: [0.4, 0, 0.2, 1] }}
                className="h-full origin-left rounded-full bg-[var(--gold-primary)]"
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
