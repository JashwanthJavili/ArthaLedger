import { motion, useReducedMotion } from 'framer-motion'
import { Check, ArrowUpRight } from 'lucide-react'
import { EASE, card } from './constants'
import { useI18n } from '../../i18n/core'

/*
 * Hero photo: two friends sharing ArthaLedger on a phone. The photo is a
 * cut-out (transparent background) set on a warm sand card; their heads rise
 * above it and the bottom is cut by its rounded corners. Speech bubbles and
 * money chips fade in once and then stay still.
 */

function Appear({ children, className, delay }) {
  return (
    <motion.div className={`absolute z-10 ${className}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay, duration: 0.6 }}>
      {children}
    </motion.div>
  )
}

// Bubbles sit side by side in one row, so however long the text, they never overlap
function Bubble({ children, className = '', delay, tail }) {
  return (
    <motion.div className={`min-w-0 ${className}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay, duration: 0.6 }}>
      <div className="relative rounded-2xl px-3.5 py-2 text-[12.5px] font-semibold shadow-[0_14px_30px_-16px_rgba(0,0,0,0.4)] sm:text-[14px]"
        style={{ ...card, color: 'var(--text-main)' }}>
        {children}
        <span className={`absolute -bottom-[7px] h-3.5 w-3.5 rotate-45 ${tail}`}
          style={{ background: 'var(--bg-card)', borderRight: '1px solid var(--border-card)', borderBottom: '1px solid var(--border-card)' }} aria-hidden="true" />
      </div>
    </motion.div>
  )
}

function Chip({ children, className, delay }) {
  return (
    <Appear className={className} delay={delay}>
      <div className="flex items-center gap-2 rounded-2xl px-3 py-2 text-[12px] sm:whitespace-nowrap shadow-[0_16px_32px_-18px_rgba(0,0,0,0.45)]"
        style={{ ...card, color: 'var(--text-main)' }}>
        {children}
      </div>
    </Appear>
  )
}

export default function HeroPhoto() {
  const { t } = useI18n()
  const reduce = useReducedMotion()
  return (
    <motion.div className="relative mx-auto w-full max-w-[560px] pt-12 sm:pt-14"
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.2, ease: EASE }}>
      {/* a warm sand card; their heads rise above its top edge */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 top-[30%] overflow-hidden rounded-[2rem] sm:rounded-[2.4rem]" aria-hidden="true"
        style={{ background: 'linear-gradient(165deg, #FBF3E3 0%, #F3E2C2 55%, #EBD2A4 100%)', boxShadow: '0 40px 80px -48px rgba(43,38,32,0.55), inset 0 0 0 1px rgba(197,160,89,0.22)' }}>
        <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.75), transparent 70%)' }} />
        <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full" style={{ background: 'radial-gradient(circle, rgba(197,160,89,0.28), transparent 70%)' }} />
        <div className="absolute inset-0 opacity-50" style={{ backgroundImage: 'radial-gradient(rgba(138,106,38,0.18) 1px, transparent 1px)', backgroundSize: '16px 16px', maskImage: 'linear-gradient(to bottom, black, transparent 70%)', WebkitMaskImage: 'linear-gradient(to bottom, black, transparent 70%)' }} />
      </div>

      <motion.img
        src="/hero/couple-900.webp"
        srcSet="/hero/couple-900.webp 900w, /hero/couple-1536.webp 1536w"
        sizes="(min-width: 1024px) 560px, 92vw"
        width="1536" height="1024"
        alt={t('landing.hero.photo.alt')}
        draggable="false"
        fetchPriority="high"
        className="relative block h-auto w-full select-none"
        style={{ clipPath: 'inset(-40% 0 0 0 round 0 0 2.4rem 2.4rem)', WebkitClipPath: 'inset(-40% 0 0 0 round 0 0 2.4rem 2.4rem)' }}
        initial={reduce ? false : { scale: 1.04 }} animate={{ scale: 1 }} transition={{ duration: 1.4, delay: 0.2, ease: EASE }}
      />

      <div className="absolute inset-x-[2%] top-[2%] z-10 flex items-start justify-between gap-3">
        <Bubble className="mt-6 sm:mt-8" delay={1.3} tail="right-6">
          <span className="flex items-center gap-1.5"><Check size={15} className="shrink-0 text-emerald-600" /> {t('landing.hero.photo.sorted')}</span>
        </Bubble>
        <Bubble delay={0.9} tail="left-6">{t('landing.hero.photo.easy')}</Bubble>
      </div>

      <Chip className="bottom-[-2%] right-[0%] max-w-[49%] sm:max-w-none sm:bottom-auto sm:-right-[4%] sm:top-[50%]" delay={1.7}>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-500/12 text-rose-600"><ArrowUpRight size={14} /></span>
        <span>
          <span className="block font-semibold">{t('landing.cats.vegetables')}</span>
          <span className="flex flex-wrap items-center gap-x-1 text-[11px]"><span className="whitespace-nowrap text-rose-600">− ₹480</span><span className="hidden sm:inline" style={{ color: 'var(--text-subtle)' }}>{t('landing.hero.photo.saved')}</span></span>
        </span>
      </Chip>
      <Chip className="bottom-[-2%] left-[0%] max-w-[49%] sm:max-w-none sm:-left-[4%] sm:bottom-[10%]" delay={2.1}>
        <svg width="28" height="28" viewBox="0 0 36 36" className="shrink-0 -rotate-90" aria-hidden="true">
          <circle cx="18" cy="18" r="14" fill="none" stroke="var(--border-subtle)" strokeWidth="5" />
          <circle cx="18" cy="18" r="14" fill="none" stroke="#059669" strokeWidth="5" strokeLinecap="round" strokeDasharray="53 88" />
        </svg>
        <span><span className="block font-semibold">{t('landing.hero.photo.savedMonth')}</span><span className="block text-[11px]" style={{ color: 'var(--text-subtle)' }}>{t('landing.hero.photo.goal')}</span></span>
      </Chip>
    </motion.div>
  )
}
