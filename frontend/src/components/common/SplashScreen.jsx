import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const SHOW_MS = 1100

/**
 * Short launch screen for the installed app: the icon settles in, the name
 * fades up under it, a thin gold line fills, then everything fades away.
 * Uses the theme colours, so it matches light and dark mode.
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
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[var(--bg-page)]"
        >
          <div className="flex flex-col items-center">
            <motion.img
              src="/icons/icon-192.png"
              alt=""
              initial={{ opacity: 0, scale: 0.86 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="h-20 w-20 rounded-[22px] shadow-[0_12px_32px_-12px_rgba(0,0,0,0.35)]"
              draggable="false"
            />
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.18, ease: 'easeOut' }}
              className="mt-5 font-serif-luxury text-[24px] font-semibold tracking-[-0.01em] text-[var(--text-main)]"
            >
              ArthaLedger
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.45, delay: 0.32 }}
              className="mt-1 font-serif-luxury text-[13px] italic text-[var(--text-muted)]"
            >
              Where every rupee has meaning
            </motion.p>
            <div className="mt-6 h-[2px] w-16 overflow-hidden rounded-full bg-[var(--border-subtle)]">
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: SHOW_MS / 1000, ease: [0.4, 0, 0.2, 1] }}
                className="h-full origin-left rounded-full bg-[var(--gold-primary)]"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
