import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const SHOW_MS = 1300

/**
 * Launch screen for the installed app: logo, name and tagline together.
 * The Android app shows /icons/launch-1024.png while it starts, index.html
 * paints the identical picture before any JS loads (#boot-splash), and this
 * takes over without a flicker: the gold line fills, then the screen fades
 * into the app. Uses the theme colours, so it matches
 * light and dark mode.
 */
export default function SplashScreen({ onDone }) {
  const [visible, setVisible] = useState(true)
  const [dark] = useState(() => document.documentElement.classList.contains('dark'))

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
          {/* The same picture Android shows while the app starts, then a gold line fills under it */}
          <div className="relative h-[300px] w-[300px]">
            <img src={dark ? '/icons/launch-dark-1024.png' : '/icons/launch-1024.png'} alt="" draggable="false" className="h-full w-full" />
            <div className="absolute left-1/2 top-[250px] h-[2px] w-16 -translate-x-1/2 overflow-hidden rounded-full bg-[var(--border-subtle)]">
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
