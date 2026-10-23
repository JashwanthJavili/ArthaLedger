import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const SHOW_MS = 1300
const ease = [0.16, 1, 0.3, 1]

/**
 * Launch screen for the installed app: the logo, name and tagline appear
 * together as one composition (no logo-only zoom), a thin gold line fills,
 * then the screen fades into the app. Uses the theme colours, so it matches
 * light and dark mode.
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
          <motion.div
            className="flex flex-col items-center"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease }}
          >
            <img
              src="/icons/maskable-192.png"
              alt=""
              draggable="false"
              className="h-[84px] w-[84px] rounded-full shadow-[0_14px_34px_-16px_rgba(0,0,0,0.4)]"
            />
            <p className="mt-5 font-serif-luxury text-[27px] font-semibold tracking-[-0.01em] text-[var(--text-main)]">
              ArthaLedger
            </p>
            <p className="mt-1 font-serif-luxury text-[13.5px] italic text-[var(--text-muted)]">
              Where every rupee has meaning
            </p>
            <div className="mt-6 h-[2px] w-16 overflow-hidden rounded-full bg-[var(--border-subtle)]">
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: (SHOW_MS - 200) / 1000, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
                className="h-full origin-left rounded-full bg-[var(--gold-primary)]"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
