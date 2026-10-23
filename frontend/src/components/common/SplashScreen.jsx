import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const SHOW_MS = 1500
// Android's own launch screen: the round app icon (about 160dp) dead centre
// on the manifest background colour. We start from exactly that frame so the
// hand-off is invisible, then turn it into the branded screen.
const SYSTEM_BG = '#FAF8F5'
const ICON = 160
const ease = [0.16, 1, 0.3, 1]

/**
 * Launch screen for the installed app: the round logo glides up and settles,
 * the name and tagline rise in beneath it, a thin gold line fills, and the
 * screen fades into the app. In dark mode the light system frame melts into
 * the dark theme as the logo moves.
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
          className="fixed inset-0 z-[9999] overflow-hidden bg-[var(--bg-page)]"
        >
          {/* Same colour as Android's launch frame, fading into the theme */}
          <motion.div
            className="absolute inset-0"
            style={{ background: SYSTEM_BG }}
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: 'easeOut' }}
          />

          {/* The logo starts exactly where Android drew it */}
          <motion.img
            src="/icons/maskable-512.png"
            alt=""
            draggable="false"
            className="absolute left-1/2 top-1/2 rounded-full"
            style={{ width: ICON, height: ICON, marginLeft: -ICON / 2, marginTop: -ICON / 2 }}
            initial={{ scale: 1, y: 0, boxShadow: '0 0 0 0 rgba(0,0,0,0)' }}
            animate={{ scale: 0.6, y: -58, boxShadow: '0 18px 40px -18px rgba(0,0,0,0.35)' }}
            transition={{ duration: 0.75, delay: 0.1, ease }}
          />

          <div className="absolute inset-x-0 top-1/2 flex flex-col items-center" style={{ marginTop: 6 }}>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.42, ease }}
              className="font-serif-luxury text-[27px] font-semibold tracking-[-0.01em] text-[var(--text-main)]"
            >
              ArthaLedger
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.56, ease }}
              className="mt-1 font-serif-luxury text-[13.5px] italic text-[var(--text-muted)]"
            >
              Where every rupee has meaning
            </motion.p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.65, duration: 0.3 }}
              className="mt-6 h-[2px] w-16 overflow-hidden rounded-full bg-[var(--border-subtle)]"
            >
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: (SHOW_MS - 700) / 1000, delay: 0.65, ease: [0.4, 0, 0.2, 1] }}
                className="h-full origin-left rounded-full bg-[var(--gold-primary)]"
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
