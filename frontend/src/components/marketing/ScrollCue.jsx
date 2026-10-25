import { useState } from 'react'
import { motion, AnimatePresence, useMotionValueEvent, useReducedMotion, useScroll } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { useI18n } from '../../i18n/core'
import { scrollToSection } from './constants'

/*
 * A downward arrow at the bottom of the first screen that bobs gently.
 * Tapping it glides to the next section; it fades away on the first scroll.
 */
export default function ScrollCue({ target }) {
  const { t } = useI18n()
  const reduce = useReducedMotion()
  const { scrollY } = useScroll()
  const [atTop, setAtTop] = useState(true)
  useMotionValueEvent(scrollY, 'change', (y) => setAtTop(y < 40))

  return (
    <AnimatePresence>
      {atTop && (
        <motion.a
          href={`#${target}`}
          onClick={(e) => scrollToSection(e, target)}
          aria-label={t('landing.hero.scrollCue')}
          className="fixed left-1/2 z-30 flex h-11 w-11 items-center justify-center"
          style={{ x: '-50%', bottom: 'calc(env(safe-area-inset-bottom) + 10px)', color: 'var(--gold-primary)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
          transition={{ delay: 1, duration: 0.5 }}
        >
          <motion.span
            animate={reduce ? undefined : { y: [0, 6, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ChevronDown size={28} strokeWidth={2.2} />
          </motion.span>
        </motion.a>
      )}
    </AnimatePresence>
  )
}
