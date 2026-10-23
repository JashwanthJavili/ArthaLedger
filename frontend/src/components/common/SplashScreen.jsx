import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const SHOW_MS = 1300

/**
 * Launch screen for the installed app: logo, name and tagline together.
 * index.html paints the identical screen before any JS loads (#boot-splash),
 * so this takes over without a flicker: the gold line fills, then the
 * screen fades into the app. Uses the theme colours, so it matches
 * light and dark mode.
 */
export default function SplashScreen({ onDone }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    document.documentElement.classList.remove('boot-splash')
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
            <img
              src="/icons/maskable-192.png"
              alt=""
              draggable="false"
              className="h-[84px] w-[84px] rounded-full shadow-[0_14px_34px_-16px_rgba(0,0,0,0.4)]"
            />
            <p className="mt-5 font-serif-luxury text-[27px] font-semibold leading-normal tracking-[-0.01em] text-[var(--text-main)]">
              ArthaLedger
            </p>
            <p className="mt-1 font-serif-luxury text-[13.5px] italic leading-normal text-[var(--text-muted)]">
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
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
