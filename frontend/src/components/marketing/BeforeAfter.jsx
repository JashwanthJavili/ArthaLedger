import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, animate, useInView, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform } from 'framer-motion'
import { ChevronsLeftRight, Smartphone, Receipt, StickyNote, Wallet, ArrowDownLeft, ArrowUpRight, Check } from 'lucide-react'
import { Donut } from './Charts'
import { EASE } from './constants'
import { useI18n } from '../../i18n/core'
import { Trans } from '../../i18n/Trans'

// `id` picks the label from landing.cats
const AFTER_DATA = [
  { id: 'rent', value: 15000, color: '#C5A059' },
  { id: 'groceries', value: 8400, color: '#059669' },
  { id: 'bills', value: 5260, color: '#2563EB' },
  { id: 'other', value: 12600, color: '#E11D48' },
]

function Scrap({ children, className = '', rotate = 0, style }) {
  return (
    <div className={`rounded-xl px-3 py-2.5 shadow-[0_10px_24px_-14px_rgba(0,0,0,0.35)] ${className}`} style={{ transform: `rotate(${rotate}deg)`, ...style }}>
      {children}
    </div>
  )
}

function BeforeScene() {
  const { t } = useI18n()
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: '#EFE9DF' }}>
      <span className="absolute left-4 top-4 z-10 rounded-full bg-[#3A2F22]/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F6EFE2]">{t('landing.sorted.before.badge')}</span>
      {/* ruled paper */}
      <div className="absolute inset-0 opacity-60" style={{ backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0 27px, rgba(120,100,70,0.16) 27px 28px)' }} aria-hidden="true" />
      <div className="relative grid h-full grid-cols-2 content-start gap-3 p-4 pt-14 sm:grid-cols-3 sm:gap-5 sm:p-8 sm:pt-16">
        <Scrap rotate={-4} style={{ background: '#FDE68A', color: '#5B4A1E' }}>
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider opacity-70"><StickyNote size={11} /> {t('landing.sorted.before.note')}</p>
          <p className="mt-1 font-serif-luxury text-[14px] italic leading-snug"><Trans k="landing.sorted.before.noteText" components={{ s: <span className="line-through opacity-60" /> }} /></p>
        </Scrap>
        <Scrap rotate={3} className="mt-4" style={{ background: '#fff', color: '#334155' }}>
          <p className="flex items-center gap-1.5 text-[10px] font-semibold opacity-60"><Smartphone size={11} /> UPI</p>
          <p className="mt-1 text-[12px] font-semibold">{t('landing.sorted.before.paidRamesh')}</p>
          <p className="text-[10.5px] opacity-60">{t('landing.sorted.before.whatFor')}</p>
        </Scrap>
        <Scrap rotate={-2} className="hidden sm:block" style={{ background: '#fff', color: '#334155', borderTop: '3px dashed #CBD5E1' }}>
          <p className="flex items-center gap-1.5 text-[10px] font-semibold opacity-60"><Receipt size={11} /> {t('landing.sorted.before.receipt')}</p>
          <p className="mt-1 text-[12px] font-semibold">{t('landing.sorted.before.medical')}</p>
          <p className="text-[11px] tabular-nums opacity-70">{t('landing.sorted.before.receiptTotal')}</p>
        </Scrap>
        <Scrap rotate={2} style={{ background: '#fff', color: '#334155' }}>
          <p className="flex items-center gap-1.5 text-[10px] font-semibold opacity-60"><Smartphone size={11} /> UPI</p>
          <p className="mt-1 text-[12px] font-semibold">{t('landing.sorted.before.paid')}</p>
          <p className="text-[10.5px] opacity-60">{t('landing.sorted.before.rentOrGas')}</p>
        </Scrap>
        <Scrap rotate={-3} className="mt-2" style={{ background: '#FBCFE8', color: '#6B2147' }}>
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider opacity-70"><Wallet size={11} /> {t('landing.sorted.before.reminder')}</p>
          <p className="mt-1 font-serif-luxury text-[14px] italic leading-snug">{t('landing.sorted.before.gaveRavi')}</p>
        </Scrap>
        <Scrap rotate={4} className="hidden sm:block" style={{ background: '#FDE68A', color: '#5B4A1E' }}>
          <p className="font-serif-luxury text-[14px] italic leading-snug"><Trans k="landing.sorted.before.groceries" /></p>
        </Scrap>
      </div>
      <div className="absolute inset-x-0 bottom-0 px-4 pb-5 pt-12 text-center sm:pb-7" style={{ background: 'linear-gradient(to top, #EFE9DF 55%, transparent)' }}>
        <p className="font-serif-luxury text-[1.45rem] font-semibold leading-tight text-[#3A2F22] sm:text-[1.9rem]">{t('landing.sorted.before.where')}</p>
        <p className="mt-1 text-[12.5px] text-[#6B5B45]">{t('landing.sorted.before.guesses')}</p>
      </div>
    </div>
  )
}

function AfterScene() {
  const { t } = useI18n()
  const rows = [
    [t('landing.cats.groceries'), t('landing.sorted.after.groceries'), '− ₹480', false],
    [t('landing.sorted.after.freelance'), t('landing.sorted.after.freelanceMeta'), '+ ₹8,500', true],
    [t('landing.sorted.after.gas'), t('landing.sorted.after.gasMeta'), '− ₹1,200', false],
  ]
  const data = AFTER_DATA.map(d => ({ ...d, label: t(`landing.cats.${d.id}`) }))
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: 'var(--bg-page)' }}>
      <span className="absolute right-4 top-4 z-10 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ background: 'var(--gold-primary)', color: '#1F1A14' }}>{t('landing.sorted.after.badge')}</span>
      <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(var(--border-card) 1px, transparent 1px)', backgroundSize: '20px 20px' }} aria-hidden="true" />
      <div className="relative flex h-full flex-col gap-3 p-4 pt-14 sm:flex-row sm:items-center sm:gap-6 sm:p-8 sm:pt-16">
        <div className="flex-1 space-y-3">
          <div className="rounded-2xl p-4 text-[#F6EFE2]" style={{ background: 'linear-gradient(140deg, #2B2620, #17140F)' }}>
            <p className="text-[10px] uppercase tracking-[0.2em] opacity-70">{t('landing.sorted.after.monthLeft')}</p>
            <p className="font-serif-luxury mt-1 text-[1.7rem] font-semibold leading-none tabular-nums">₹29,240</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
              <span className="rounded-lg bg-white/10 px-2.5 py-1.5"><span className="opacity-60">{t('landing.sorted.after.in')} </span><span className="font-semibold text-emerald-300">₹70,500</span></span>
              <span className="rounded-lg bg-white/10 px-2.5 py-1.5"><span className="opacity-60">{t('landing.sorted.after.out')} </span><span className="font-semibold text-rose-300">₹41,260</span></span>
            </div>
          </div>
          {rows.map(([title, c, a, isIn]) => (
            <div key={a} className="flex items-center gap-2.5 rounded-xl px-3 py-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${isIn ? 'bg-emerald-500/12 text-emerald-600' : 'bg-rose-500/12 text-rose-600'}`}>
                {isIn ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-semibold" style={{ color: 'var(--text-main)' }}>{title}</span>
                <span className="block truncate text-[10.5px]" style={{ color: 'var(--text-subtle)' }}>{c}</span>
              </span>
              <span className={`text-[12.5px] font-semibold tabular-nums ${isIn ? 'text-emerald-600' : 'text-rose-600'}`}>{a}</span>
            </div>
          ))}
        </div>
        <div className="hidden flex-col items-center gap-2 rounded-2xl p-5 sm:flex" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
          <Donut data={data} size={150} thickness={20} legend={false} />
          <p className="flex items-center gap-1.5 text-[12px] font-semibold text-emerald-600"><Check size={14} /> {t('landing.sorted.after.accounted')}</p>
        </div>
      </div>
    </div>
  )
}

/** Drag the handle to compare money kept on scraps with money kept in ArthaLedger. */
export default function BeforeAfter() {
  const { t } = useI18n()
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-120px' })
  const reduce = useReducedMotion()
  const pos = useMotionValue(100)
  const [ariaPos, setAriaPos] = useState(100)
  useMotionValueEvent(pos, 'change', (v) => setAriaPos(Math.round(v)))
  const clip = useTransform(pos, v => `inset(0 0 0 ${v}%)`)
  const left = useTransform(pos, v => `${v}%`)
  const dragging = useRef(false)

  const [touched, setTouched] = useState(false)
  const [introDone, setIntroDone] = useState(false)

  // Swing left and right a few times, like someone testing it, so people see it moves
  useEffect(() => {
    if (!inView) return undefined
    if (reduce) { pos.set(50); return undefined }
    const c = animate(pos, [100, 18, 78, 30, 64, 42, 50], {
      duration: 4.2, times: [0, 0.22, 0.42, 0.6, 0.75, 0.88, 1], ease: 'easeInOut', delay: 0.3,
      onComplete: () => setIntroDone(true),
    })
    return () => c.stop()
  }, [inView, reduce, pos])

  // Until someone tries it, give it a small nudge every few seconds
  useEffect(() => {
    if (!introDone || touched || reduce) return undefined
    const id = setInterval(() => {
      const v = pos.get()
      animate(pos, [v, v - 7, v + 7, v], { duration: 1.1, ease: 'easeInOut' })
    }, 4200)
    return () => clearInterval(id)
  }, [introDone, touched, reduce, pos])

  const setFromX = (clientX, smooth) => {
    const r = ref.current.getBoundingClientRect()
    const v = Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100))
    if (smooth) animate(pos, v, { duration: 0.45, ease: EASE })
    else pos.set(v)
  }

  return (
    <div ref={ref} className="relative h-[380px] select-none overflow-hidden rounded-[1.75rem] sm:h-[380px]"
      style={{ border: '1px solid var(--border-card)', boxShadow: '0 40px 90px -50px rgba(0,0,0,0.45)' }}
      onClick={(e) => { setTouched(true); if (!dragging.current) setFromX(e.clientX, true) }}>
      <BeforeScene />
      <motion.div className="absolute inset-0" style={{ clipPath: clip, WebkitClipPath: clip }}>
        <AfterScene />
      </motion.div>


      <motion.div className="absolute bottom-0 top-0 z-20 w-0" style={{ left }}>
        <span className="absolute bottom-0 top-0 -left-px w-[2px] bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.08)]" aria-hidden="true" />
        <button type="button" role="slider" aria-label={t('landing.sorted.slider')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={ariaPos}
          onKeyDown={(e) => {
            setTouched(true)
            if (e.key === 'ArrowLeft') { e.preventDefault(); animate(pos, Math.max(0, pos.get() - 10), { duration: 0.25 }) }
            if (e.key === 'ArrowRight') { e.preventDefault(); animate(pos, Math.min(100, pos.get() + 10), { duration: 0.25 }) }
          }}
          onPointerDown={(e) => { e.stopPropagation(); setTouched(true); pos.stop(); dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId) }}
          onPointerMove={(e) => { if (dragging.current) setFromX(e.clientX, false) }}
          onPointerUp={(e) => { e.currentTarget.releasePointerCapture(e.pointerId); setTimeout(() => { dragging.current = false }, 0) }}
          onClick={(e) => e.stopPropagation()}
          className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full bg-white text-[#1F1A14] shadow-[0_10px_30px_-8px_rgba(0,0,0,0.45)] outline-none ring-[var(--gold-primary)] focus-visible:ring-2"
          style={{ touchAction: 'none' }}>
          {!touched && introDone && !reduce && (
            <motion.span className="absolute inset-0 rounded-full" style={{ border: '2px solid var(--gold-primary)' }} aria-hidden="true"
              animate={{ scale: [1, 1.6], opacity: [0.7, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }} />
          )}
          <ChevronsLeftRight size={20} />
        </button>
        <AnimatePresence>
          {!touched && introDone && (
            <motion.span initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.3 }}
              className="pointer-events-none absolute left-1/2 top-[calc(50%+34px)] -translate-x-1/2 whitespace-nowrap rounded-full bg-[#1F1A14]/85 px-3 py-1 text-[11.5px] font-semibold text-white">
              {t('landing.sorted.drag')}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
