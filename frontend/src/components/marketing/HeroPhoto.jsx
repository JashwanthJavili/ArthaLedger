import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Check, ArrowUpRight } from 'lucide-react'
import { EASE, card } from './constants'
import { useI18n } from '../../i18n/core'

/*
 * Hero photo: two friends sharing ArthaLedger on a phone. The photo is a
 * cut-out (transparent background) set in an arched window glowing with
 * golden-hour light; their heads rise above it and its rounded bottom corners
 * cut the photo. The photo starts close on their faces and pulls back; then
 * the speech bubbles and money chips fade in and stay still.
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

// warm string lights, out of focus behind them: [left %, top %, size px, twinkle s]
const BOKEH = [[7, 62, 18, 3.2], [14, 80, 11, 2.6], [22, 54, 8, 3.8], [84, 58, 14, 2.9], [92, 74, 20, 3.5], [76, 84, 9, 2.4], [63, 47, 7, 4.1], [33, 44, 6, 3.4]]

// an arched window (a jharokha) in golden-hour light
const ARCH = '50% 50% 2.4rem 2.4rem / 42% 42% 2.4rem 2.4rem'

export default function HeroPhoto() {
  const { t } = useI18n()
  const reduce = useReducedMotion()
  // the photo starts close on their faces and pulls back once it has loaded
  const [loaded, setLoaded] = useState(false)
  const imgRef = useRef(null)
  useEffect(() => { if (imgRef.current?.complete) setLoaded(true) }, [])
  return (
    <motion.div className="relative mx-auto w-full max-w-[560px] pt-12 sm:pt-14"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.1 }}>
      <motion.div className="pointer-events-none absolute inset-x-0 bottom-0 top-[8%] overflow-hidden" aria-hidden="true"
        style={{ borderRadius: ARCH, background: 'linear-gradient(180deg, #FFF3DA 0%, #FAD6A4 32%, #EFB08C 68%, #D98F78 100%)', boxShadow: '0 40px 80px -48px rgba(43,38,32,0.6), inset 0 0 0 1px rgba(197,160,89,0.25)' }}
        initial={reduce ? false : { scale: 0.94, opacity: 0 }} animate={loaded || reduce ? { scale: 1, opacity: 1 } : undefined} transition={{ duration: 1.2, ease: EASE }}>
        {/* the low sun right behind their heads, and its rays */}
        <div className="absolute left-1/2 top-[-22%] h-[85%] w-[90%] -translate-x-1/2 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,252,240,0.95) 0%, rgba(255,240,205,0.55) 35%, transparent 68%)' }} />
        <div className="absolute inset-0 opacity-60" style={{ background: 'repeating-conic-gradient(from 0deg at 50% 6%, rgba(255,255,255,0.22) 0deg 4deg, transparent 4deg 13deg)', maskImage: 'radial-gradient(70% 75% at 50% 6%, black, transparent 80%)', WebkitMaskImage: 'radial-gradient(70% 75% at 50% 6%, black, transparent 80%)' }} />
        {BOKEH.map(([x, y, size, dur], i) => (
          <motion.span key={i} className="absolute rounded-full" style={{ left: `${x}%`, top: `${y}%`, width: size, height: size, background: 'radial-gradient(circle, rgba(255,236,180,0.95), rgba(255,200,120,0.35) 55%, transparent 72%)', filter: 'blur(1.5px)' }}
            animate={reduce ? undefined : { opacity: [0.45, 1, 0.45] }} transition={{ duration: dur, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }} />
        ))}
        {/* the window's inner frame */}
        <div className="absolute inset-[10px] sm:inset-[12px]" style={{ borderRadius: ARCH, border: '1px solid rgba(255,255,255,0.6)' }} />
        {/* where they sit */}
        <div className="absolute -bottom-[18%] left-1/2 h-[40%] w-[90%] -translate-x-1/2 rounded-[50%]" style={{ background: 'radial-gradient(closest-side, rgba(110,52,30,0.28), transparent)' }} />
        <div className="hero-grain absolute inset-0 opacity-25" />
      </motion.div>

      {/* clipped to the window's sides and bottom; their heads may rise above it */}
      <div style={{ clipPath: 'inset(-40% 0 0 0 round 0 0 2.4rem 2.4rem)', WebkitClipPath: 'inset(-40% 0 0 0 round 0 0 2.4rem 2.4rem)' }}>
        <motion.img
          ref={imgRef}
          src="/hero/couple-900.webp"
          srcSet="/hero/couple-900.webp 900w, /hero/couple-1536.webp 1536w"
          sizes="(min-width: 1024px) 560px, 92vw"
          width="1536" height="1024"
          alt={t('landing.hero.photo.alt')}
          draggable="false"
          fetchPriority="high"
          onLoad={() => setLoaded(true)}
          className="relative block h-auto w-full select-none"
          style={{ transformOrigin: '52% 30%' }}
          initial={reduce ? false : { scale: 1.7, opacity: 0 }}
          animate={loaded ? { scale: 1, opacity: 1 } : undefined}
          transition={{ scale: { duration: 2.8, ease: [0.45, 0, 0.15, 1] }, opacity: { duration: 0.6 } }}
        />
      </div>

      <div className="absolute inset-x-[2%] top-[2%] z-10 flex items-start justify-between gap-3">
        <Bubble className="mt-6 sm:mt-8" delay={2.3} tail="right-6">
          <span className="flex items-center gap-1.5"><Check size={15} className="shrink-0 text-emerald-600" /> {t('landing.hero.photo.sorted')}</span>
        </Bubble>
        <Bubble delay={2.0} tail="left-6">{t('landing.hero.photo.easy')}</Bubble>
      </div>

      <Chip className="bottom-[-2%] right-[0%] max-w-[49%] sm:max-w-none sm:bottom-auto sm:-right-[4%] sm:top-[50%]" delay={2.6}>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-500/12 text-rose-600"><ArrowUpRight size={14} /></span>
        <span>
          <span className="block font-semibold">{t('landing.cats.vegetables')}</span>
          <span className="flex flex-wrap items-center gap-x-1 text-[11px]"><span className="whitespace-nowrap text-rose-600">− ₹480</span><span className="hidden sm:inline" style={{ color: 'var(--text-subtle)' }}>{t('landing.hero.photo.saved')}</span></span>
        </span>
      </Chip>
      <Chip className="bottom-[-2%] left-[0%] max-w-[49%] sm:max-w-none sm:-left-[4%] sm:bottom-[10%]" delay={2.9}>
        <svg width="28" height="28" viewBox="0 0 36 36" className="shrink-0 -rotate-90" aria-hidden="true">
          <circle cx="18" cy="18" r="14" fill="none" stroke="var(--border-subtle)" strokeWidth="5" />
          <circle cx="18" cy="18" r="14" fill="none" stroke="#059669" strokeWidth="5" strokeLinecap="round" strokeDasharray="53 88" />
        </svg>
        <span><span className="block font-semibold">{t('landing.hero.photo.savedMonth')}</span><span className="block text-[11px]" style={{ color: 'var(--text-subtle)' }}>{t('landing.hero.photo.goal')}</span></span>
      </Chip>
    </motion.div>
  )
}
