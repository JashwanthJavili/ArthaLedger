import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, animate, useInView, useMotionValue, useReducedMotion, useTransform } from 'framer-motion'
import { Landmark, ShieldCheck, Smartphone, Plus, Minus, X } from 'lucide-react'
import { EASE, card } from './constants'

/*
 * "What is ArthaLedger?" told as three small animated scenes:
 *   1. a red bahi-khata whose lines fly into a phone,
 *   2. entries dropping in while the total works itself out,
 *   3. a bank trying to connect and being stopped by a shield.
 * Each scene loops only while it is on screen and stays still for people who
 * prefer reduced motion.
 */

const INK = '#17130F'
const PAPER = '#F6EFE2'
const GOLD = 'var(--gold-primary)'
const MAIN = 'var(--text-main)'
const SUBTLE = 'var(--text-subtle)'

/** steps 0..count-1, advancing every `ms` while the element is in view */
function useLoop(count, ms) {
  const ref = useRef(null)
  const inView = useInView(ref, { margin: '-80px' })
  const reduce = useReducedMotion()
  const [step, setStep] = useState(0)
  const running = inView && !reduce
  useEffect(() => {
    if (!running) return undefined
    const id = setInterval(() => setStep((s) => (s + 1) % count), ms)
    return () => clearInterval(id)
  }, [running, count, ms])
  return { ref, step: reduce ? count - 1 : step, reduce }
}

const inr = (v) => Math.round(v).toLocaleString('en-IN')

function Rolling({ value }) {
  const mv = useMotionValue(value)
  const text = useTransform(mv, (v) => `₹${inr(v)}`)
  useEffect(() => {
    const c = animate(mv, value, { duration: 0.9, ease: EASE })
    return () => c.stop()
  }, [value, mv])
  return <motion.span className="tabular-nums">{text}</motion.span>
}

/* ── scene 1: khata to phone ── */

const LINES = [
  ['Milk', '₹60'],
  ['Rent', '₹15,000'],
  ['Salary', '₹42,000'],
]

function KhataScene() {
  const { ref, step } = useLoop(4, 1400)
  return (
    <div ref={ref} className="relative flex h-full items-center justify-between px-5 sm:px-7">
      {/* the red cloth khata with its gold border and tie */}
      <motion.div className="relative h-[124px] w-[96px] shrink-0 rounded-[10px] sm:h-[138px] sm:w-[106px]"
        style={{ background: 'linear-gradient(150deg, #B42334, #7E1626)', boxShadow: '0 18px 30px -16px rgba(80,20,30,0.55), inset 0 0 0 4px rgba(212,178,110,0.55), inset 0 0 0 6px #8E1A2B' }}
        animate={{ rotate: step === 0 ? -6 : -3 }} transition={{ duration: 0.8, ease: EASE }}>
        <span className="absolute inset-y-0 left-2 w-[3px] rounded-full bg-black/25" />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-serif-luxury text-[13px] font-semibold italic text-[#E0C084]">Khata</span>
        <span className="absolute -right-1 top-1/2 h-[3px] w-5 -translate-y-1/2 rounded-full bg-[#E0C084]" />
      </motion.div>

      {/* lines flying across */}
      <div className="pointer-events-none absolute inset-x-[34%] top-1/2 z-10 h-0" aria-hidden="true">
        <AnimatePresence>
          {step > 0 && (
            <motion.span key={step} className="absolute left-0 top-0 -translate-y-1/2 whitespace-nowrap rounded-md px-2 py-1 font-serif-luxury text-[11.5px] italic shadow-[0_8px_18px_-10px_rgba(0,0,0,0.4)]"
              style={{ background: '#FFFDF8', border: '1px solid rgba(197,160,89,0.35)', color: '#5B4A1E' }}
              initial={{ x: '-30%', opacity: 0, rotate: -8, y: 10 }}
              animate={{ x: ['-30%', '60%', '130%'], opacity: [0, 1, 0], rotate: [-8, 0, 0], y: [10, -18, 0] }}
              transition={{ duration: 1.1, ease: 'easeInOut' }}>
              {LINES[step - 1][0]} {LINES[step - 1][1]}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* the phone receiving neat rows */}
      <div className="relative h-[150px] w-[90px] shrink-0 rounded-[18px] p-1.5 sm:h-[164px] sm:w-[98px]" style={{ background: '#2A241D', boxShadow: '0 20px 34px -18px rgba(43,38,32,0.6)' }}>
        <div className="flex h-full flex-col gap-1.5 rounded-[13px] p-2" style={{ background: PAPER }}>
          <span className="mx-auto mb-1 h-1 w-6 rounded-full bg-black/15" />
          {LINES.map(([l, a], i) => (
            <motion.div key={l} className="flex items-center justify-between rounded-md bg-white px-1.5 py-1 text-[8.5px] font-semibold text-[#3A2F22] shadow-sm"
              initial={false} animate={{ opacity: step > i ? 1 : 0, y: step > i ? 0 : 6 }} transition={{ duration: 0.4, delay: step > i ? 0.75 : 0 }}>
              <span>{l}</span><span className={i === 2 ? 'text-emerald-600' : 'text-rose-600'}>{a}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── scene 2: you add, it adds up ── */

const ADDS = [
  { label: 'Salary', amount: 42000, in: true },
  { label: 'Rent', amount: -15000 },
  { label: 'Groceries', amount: -3400 },
]

function SumScene() {
  const { ref, step } = useLoop(5, 1300)
  const shown = Math.min(step, ADDS.length)
  const total = ADDS.slice(0, shown).reduce((s, a) => s + a.amount, 0)
  return (
    <div ref={ref} className="flex h-full flex-col justify-center px-5 sm:px-7">
      <div className="space-y-1.5">
        {ADDS.map((a, i) => (
          <motion.div key={a.label} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] shadow-[0_6px_14px_-12px_rgba(0,0,0,0.35)]"
            style={{ ...card, color: MAIN }}
            initial={false} animate={{ opacity: i < shown ? 1 : 0.3, x: i < shown ? 0 : -10 }} transition={{ duration: 0.45, ease: EASE }}>
            <span className={`flex h-5 w-5 items-center justify-center rounded-full ${a.in ? 'bg-emerald-500/12 text-emerald-600' : 'bg-rose-500/12 text-rose-600'}`}>
              {a.in ? <Plus size={11} strokeWidth={3} /> : <Minus size={11} strokeWidth={3} />}
            </span>
            <span className="flex-1">{a.label}</span>
            <span className={`tabular-nums font-semibold ${a.in ? 'text-emerald-600' : 'text-rose-600'}`}>₹{inr(Math.abs(a.amount))}</span>
          </motion.div>
        ))}
      </div>
      <motion.div className="mt-2.5 h-px origin-left" style={{ background: GOLD }} initial={false} animate={{ scaleX: shown ? 1 : 0.1 }} transition={{ duration: 0.6, ease: EASE }} />
      <div className="mt-2.5 flex items-baseline justify-between px-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: SUBTLE }}>Balance</span>
        <span className="font-serif-luxury text-[26px] font-semibold leading-none" style={{ color: GOLD }}><Rolling value={total} /></span>
      </div>
    </div>
  )
}

/* ── scene 3: never touches your bank ── */

function BankScene() {
  const { ref, step } = useLoop(3, 1600)
  const blocked = step === 2
  return (
    <div ref={ref} className="relative flex h-full items-center justify-between px-6 sm:px-9">
      <div className="flex flex-col items-center gap-2">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-[0_10px_22px_-14px_rgba(0,0,0,0.35)]" style={{ ...card, color: MAIN }}><Landmark size={24} /></span>
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: SUBTLE }}>Bank</span>
      </div>

      {/* the connection that never completes */}
      <div className="relative mx-3 h-14 flex-1">
        <svg className="absolute inset-x-0 top-1/2 h-2 w-full -translate-y-1/2 overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 2" aria-hidden="true">
          <motion.line x1="0" y1="1" x2="100" y2="1" stroke="rgba(43,38,32,0.4)" strokeWidth="1.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke"
            initial={false} animate={{ pathLength: step === 0 ? 0.15 : 0.5, opacity: blocked ? 0.25 : 1 }} transition={{ duration: 1.2, ease: EASE }} />
        </svg>
        <motion.span className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
          style={{ background: 'linear-gradient(135deg, #E0C084, #C5A059)', color: INK, boxShadow: '0 0 0 6px rgba(197,160,89,0.18)' }}
          initial={false} animate={{ scale: blocked ? 1 : 0.6, opacity: blocked ? 1 : 0 }} transition={{ type: 'spring', stiffness: 320, damping: 18 }}>
          <ShieldCheck size={22} />
        </motion.span>
        <motion.span className="absolute left-[42%] top-[calc(50%-34px)] flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white"
          initial={false} animate={{ scale: blocked ? 1 : 0, opacity: blocked ? 1 : 0 }} transition={{ delay: blocked ? 0.25 : 0, type: 'spring', stiffness: 400, damping: 16 }}>
          <X size={11} strokeWidth={3} />
        </motion.span>
        <motion.span className="absolute inset-x-0 -bottom-5 text-center text-[11px] font-semibold" style={{ color: GOLD }}
          initial={false} animate={{ opacity: blocked ? 1 : 0, y: blocked ? 0 : 4 }} transition={{ duration: 0.4 }}>
          No link, ever
        </motion.span>
      </div>

      <div className="flex flex-col items-center gap-2">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'linear-gradient(135deg, #E0C084, #C5A059)', color: INK }}><Smartphone size={24} /></span>
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: SUBTLE }}>You</span>
      </div>
    </div>
  )
}

const CHAPTERS = [
  { n: '01', Scene: KhataScene, title: 'Like a khata, but on your phone', text: 'The same idea as the notebook many families use for household accounts, neatly organised into projects and books.' },
  { n: '02', Scene: SumScene, title: 'You add, it adds up', text: 'Totals, balances and monthly summaries are worked out for you. No spreadsheets, no formulas.' },
  { n: '03', Scene: BankScene, title: 'Never touches your bank', text: 'ArthaLedger does not connect to your bank, cards or UPI. You decide what to write. Nothing moves your money.' },
]

export default function WhatIsArtha() {
  const reduce = useReducedMotion()
  return (
    <div className="relative overflow-hidden rounded-[2rem] px-4 py-12 sm:rounded-[2.6rem] sm:px-10 sm:py-16"
      style={{ background: 'radial-gradient(120% 80% at 50% 0%, color-mix(in srgb, var(--gold-primary) 12%, var(--bg-page)) 0%, color-mix(in srgb, var(--gold-primary) 4%, var(--bg-page)) 65%)', border: '1px solid var(--border-card)' }}>
      {/* faint gold grid and a warm glow */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.12]" aria-hidden="true"
        style={{ backgroundImage: 'linear-gradient(var(--gold-primary) 1px, transparent 1px), linear-gradient(90deg, var(--gold-primary) 1px, transparent 1px)', backgroundSize: '44px 44px', maskImage: 'radial-gradient(ellipse at 50% 0%, black, transparent 75%)', WebkitMaskImage: 'radial-gradient(ellipse at 50% 0%, black, transparent 75%)' }} />
      <div className="pointer-events-none absolute -top-32 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full blur-3xl" style={{ background: 'rgba(255,255,255,0.8)' }} aria-hidden="true" />

      <motion.div className="relative mx-auto max-w-2xl text-center"
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.7, ease: EASE }}>
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: GOLD }}>New here?</span>
        <h2 className="font-serif-luxury mt-3 text-[1.85rem] font-semibold leading-[1.12] tracking-tight sm:text-[2.6rem]" style={{ color: MAIN }}>
          What is <em className="italic" style={{ color: GOLD }}>ArthaLedger?</em>
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed sm:text-base" style={{ color: 'var(--text-muted)' }}>An easy way to keep track of your money, made for everyday life in India.</p>
      </motion.div>

      <div className="relative mt-10 grid gap-4 md:grid-cols-3 md:gap-5">
        {CHAPTERS.map(({ n, Scene, title, text }, i) => (
          <motion.article key={n} className="overflow-hidden rounded-3xl shadow-[0_24px_48px_-36px_rgba(43,38,32,0.45)]"
            style={card}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 40, rotateX: 12 }} whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
            viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.8, delay: i * 0.12, ease: EASE }}>
            <div className="h-[200px] border-b sm:h-[210px]" style={{ borderColor: 'var(--border-card)', background: 'radial-gradient(90% 90% at 50% 40%, color-mix(in srgb, var(--gold-primary) 12%, transparent), transparent 70%)' }}>
              <Scene />
            </div>
            <div className="p-6">
              <span className="font-serif-luxury text-[13px] italic" style={{ color: GOLD }}>{n}</span>
              <h3 className="mt-1 text-[17px] font-semibold" style={{ color: MAIN }}>{title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{text}</p>
            </div>
          </motion.article>
        ))}
      </div>
    </div>
  )
}
