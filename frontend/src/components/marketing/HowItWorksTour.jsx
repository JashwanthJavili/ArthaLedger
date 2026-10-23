import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, animate, useInView, useMotionValue, useReducedMotion, useTransform } from 'framer-motion'
import {
  Plus, User, Users, Briefcase, ShoppingBasket, Home as HomeIcon, GraduationCap, ArrowUpRight, ArrowDownLeft,
  Check, Bell, FolderOpen, BookOpen, PenLine, PieChart,
} from 'lucide-react'
import { EASE, GOLD_TINT, card } from './constants'

const STEP_MS = 6000

const STEPS = [
  { Icon: FolderOpen, title: 'Create a project', text: 'A folder for one part of life: Personal, Family or Business.' },
  { Icon: BookOpen, title: 'Add books inside', text: 'One book for each purpose, each with its own balance.' },
  { Icon: PenLine, title: 'Record money', text: 'Tap Cash In or Cash Out, type the amount. Done.' },
  { Icon: PieChart, title: 'See the picture', text: 'Charts and budget alerts, worked out for you.' },
]

const inr = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`

/* ─────────────── small animated pieces ─────────────── */

/** A finger tap: a ring that grows and fades at `delay` seconds. */
function Tap({ delay, className = '' }) {
  return (
    <motion.span aria-hidden="true" className={`pointer-events-none absolute rounded-full ${className}`}
      style={{ border: '2px solid var(--gold-primary)', background: 'color-mix(in srgb, var(--gold-primary) 22%, transparent)' }}
      initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 1, 1.6], opacity: [0, 0.9, 0] }}
      transition={{ delay, duration: 0.7, times: [0, 0.35, 1] }} />
  )
}

/** A number that rolls from `from` to `to` after `delay` seconds. */
function Roll({ from, to, delay = 0, className = '' }) {
  const mv = useMotionValue(from)
  const text = useTransform(mv, inr)
  useEffect(() => {
    const c = animate(mv, to, { delay, duration: 0.9, ease: EASE })
    return () => c.stop()
  }, [mv, to, delay])
  return <motion.span className={`tabular-nums ${className}`}>{text}</motion.span>
}

const rise = (delay) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.45, ease: EASE } })

function ScreenHeader({ over, title }) {
  return (
    <div className="px-4 pb-3 pt-1">
      <p className="text-[9.5px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-subtle)' }}>{over}</p>
      <p className="font-serif-luxury text-[17px] font-semibold" style={{ color: 'var(--text-main)' }}>{title}</p>
    </div>
  )
}

/* ─────────────── the four scenes ─────────────── */

function ProjectsScene() {
  const rows = [['Personal', User, '3 books'], ['Business', Briefcase, '2 books']]
  return (
    <div>
      <ScreenHeader over="Home" title="Your projects" />
      <div className="space-y-2 px-4">
        {rows.map(([l, I, c], i) => (
          <motion.div key={l} {...rise(0.1 + i * 0.12)} className="flex items-center gap-3 rounded-2xl px-3 py-2.5" style={card}>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: GOLD_TINT, color: 'var(--gold-primary)' }}><I size={16} /></span>
            <span className="flex-1 text-[13px] font-semibold" style={{ color: 'var(--text-main)' }}>{l}</span>
            <span className="text-[11px]" style={{ color: 'var(--text-subtle)' }}>{c}</span>
          </motion.div>
        ))}
        {/* the new project lands here */}
        <motion.div initial={{ opacity: 0, height: 0, scale: 0.9 }} animate={{ opacity: 1, height: 'auto', scale: 1 }} transition={{ delay: 1.7, duration: 0.5, ease: EASE }}>
          <motion.div className="flex items-center gap-3 rounded-2xl px-3 py-2.5"
            style={{ ...card, borderColor: 'var(--gold-primary)' }}
            initial={{ boxShadow: '0 0 0 0 rgba(197,160,89,0)' }} animate={{ boxShadow: ['0 0 0 0 rgba(197,160,89,0.45)', '0 0 0 10px rgba(197,160,89,0)'] }}
            transition={{ delay: 2.1, duration: 1 }}>
            <motion.span className="flex h-9 w-9 items-center justify-center rounded-xl text-white" style={{ background: 'linear-gradient(140deg, #2B2620, #17140F)' }}
              initial={{ rotate: -20, scale: 0.6 }} animate={{ rotate: 0, scale: 1 }} transition={{ delay: 1.9, type: 'spring', stiffness: 320, damping: 14 }}>
              <Users size={16} className="text-[#D4B26E]" />
            </motion.span>
            <span className="flex-1 text-[13px] font-semibold" style={{ color: 'var(--text-main)' }}>Family</span>
            <motion.span {...rise(2.2)} className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: GOLD_TINT, color: 'var(--text-main)' }}>New</motion.span>
          </motion.div>
        </motion.div>
        <div className="relative">
          <motion.div {...rise(0.4)}>
            <motion.div className="flex items-center justify-center gap-2 rounded-2xl py-3 text-[12.5px] font-semibold"
              style={{ border: '1.5px dashed var(--gold-primary)', color: 'var(--gold-primary)' }}
              animate={{ scale: [1, 0.95, 1] }} transition={{ delay: 1.15, duration: 0.3 }}>
              <Plus size={15} /> New project
            </motion.div>
          </motion.div>
          <Tap delay={1.1} className="left-1/2 top-1/2 -ml-5 -mt-5 h-10 w-10" />
        </div>
      </div>
    </div>
  )
}

function BooksScene() {
  const books = [['Groceries', ShoppingBasket, 4800], ['Rent', HomeIcon, 15000], ['School fees', GraduationCap, 6200]]
  return (
    <div>
      <ScreenHeader over="Project" title="Family" />
      <div className="grid grid-cols-2 gap-2 px-4">
        {books.map(([l, I, amt], i) => (
          <motion.div key={l} initial={{ opacity: 0, scale: 0.85, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.25, type: 'spring', stiffness: 260, damping: 20 }}
            className="rounded-2xl p-3" style={card}>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: GOLD_TINT, color: 'var(--gold-primary)' }}><I size={15} /></span>
            <p className="mt-2.5 truncate text-[12px] font-semibold" style={{ color: 'var(--text-main)' }}>{l}</p>
            <Roll from={0} to={amt} delay={0.45 + i * 0.25} className="font-serif-luxury text-[15px] font-semibold" />
          </motion.div>
        ))}
        <motion.div {...rise(1.1)} className="flex flex-col items-center justify-center gap-1 rounded-2xl text-[11.5px] font-semibold"
          style={{ border: '1.5px dashed var(--border-card)', color: 'var(--text-subtle)' }}>
          <Plus size={16} /> New book
        </motion.div>
      </div>
      <motion.div {...rise(1.6)} className="mx-4 mt-3 flex items-center justify-between rounded-2xl px-3.5 py-3 text-white"
        style={{ background: 'linear-gradient(140deg, #2B2620, #17140F)' }}>
        <span className="text-[10px] uppercase tracking-[0.18em] opacity-70">Project total</span>
        <Roll from={0} to={26000} delay={1.7} className="font-serif-luxury text-[16px] font-semibold" />
      </motion.div>
    </div>
  )
}

function RecordScene() {
  const digits = ['4', '8', '0']
  return (
    <div className="relative h-full">
      <ScreenHeader over="Family · Book" title="Groceries" />
      <div className="mx-4 rounded-2xl p-3.5 text-white" style={{ background: 'linear-gradient(140deg, #2B2620, #17140F)' }}>
        <p className="text-[9.5px] uppercase tracking-[0.18em] opacity-70">Money left</p>
        <Roll from={5280} to={4800} delay={3.3} className="font-serif-luxury text-[22px] font-semibold" />
      </div>
      <div className="space-y-1.5 px-4 pt-3">
        <motion.div initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: 'auto', y: 0 }} transition={{ delay: 3.1, duration: 0.45, ease: EASE }}>
          <div className="flex items-center gap-2.5 rounded-xl px-2.5 py-2" style={{ ...card, borderColor: 'var(--gold-primary)' }}>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-500/12 text-rose-600"><ArrowUpRight size={13} /></span>
            <span className="flex-1"><span className="block text-[11.5px] font-semibold" style={{ color: 'var(--text-main)' }}>Vegetables</span><span className="block text-[9.5px]" style={{ color: 'var(--text-subtle)' }}>Groceries · now</span></span>
            <span className="text-[11.5px] font-semibold text-rose-600">− ₹480</span>
          </div>
        </motion.div>
        {[['Milk', '− ₹62', false], ['Refund', '+ ₹300', true]].map(([t, a, isIn]) => (
          <div key={t} className="flex items-center gap-2.5 rounded-xl px-2.5 py-2" style={card}>
            <span className={`flex h-7 w-7 items-center justify-center rounded-full ${isIn ? 'bg-emerald-500/12 text-emerald-600' : 'bg-rose-500/12 text-rose-600'}`}>{isIn ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}</span>
            <span className="flex-1 text-[11.5px] font-semibold" style={{ color: 'var(--text-main)' }}>{t}</span>
            <span className={`text-[11.5px] font-semibold ${isIn ? 'text-emerald-600' : 'text-rose-600'}`}>{a}</span>
          </div>
        ))}
      </div>

      {/* Cash Out sheet: slides up, gets filled in, saves, slides away */}
      <motion.div className="absolute inset-x-0 bottom-0 rounded-t-[1.4rem] px-4 pb-4 pt-3 shadow-[0_-18px_40px_-20px_rgba(0,0,0,0.45)]"
        style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border-card)' }}
        initial={{ y: '105%' }} animate={{ y: ['105%', '0%', '0%', '105%'] }} transition={{ duration: 3.1, times: [0, 0.12, 0.86, 1], delay: 0.2, ease: 'easeInOut' }}>
        <span className="mx-auto mb-3 block h-1 w-9 rounded-full" style={{ background: 'var(--border-card)' }} />
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-rose-600">Cash out</p>
        <p className="font-serif-luxury mt-1 flex text-[30px] font-semibold leading-none" style={{ color: 'var(--text-main)' }}>
          ₹{digits.map((d, i) => (
            <motion.span key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 + i * 0.22, duration: 0.2 }}>{d}</motion.span>
          ))}
          <motion.span className="ml-0.5 w-[2px] self-stretch" style={{ background: 'var(--gold-primary)' }} animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {['Rent', 'Vegetables', 'Fuel'].map((c) => (
            <motion.span key={c} className="relative rounded-full px-2.5 py-1 text-[10.5px] font-semibold"
              style={{ border: '1px solid var(--border-card)', color: 'var(--text-muted)' }}
              animate={c === 'Vegetables' ? { background: ['rgba(0,0,0,0)', '#C5A059'], color: ['#7A6F66', '#1F1A14'], borderColor: ['rgba(0,0,0,0.1)', '#C5A059'] } : undefined}
              transition={{ delay: 1.75, duration: 0.2 }}>
              {c}
              {c === 'Vegetables' && <Tap delay={1.6} className="left-1/2 top-1/2 -ml-4 -mt-4 h-8 w-8" />}
            </motion.span>
          ))}
        </div>
        <div className="relative mt-3">
          <motion.div className="flex items-center justify-center gap-1.5 rounded-full bg-rose-600 py-2.5 text-[12px] font-semibold text-white"
            animate={{ scale: [1, 0.95, 1] }} transition={{ delay: 2.35, duration: 0.25 }}>
            <Check size={14} /> Save
          </motion.div>
          <Tap delay={2.3} className="left-1/2 top-1/2 -ml-5 -mt-5 h-10 w-10" />
        </div>
      </motion.div>
    </div>
  )
}

function PictureScene() {
  const cats = [['Rent', 15000, '#C5A059'], ['Groceries', 8400, '#059669'], ['Bills', 5260, '#2563EB'], ['Other', 12600, '#E11D48']]
  const total = cats.reduce((s, c) => s + c[1], 0)
  const r = 40, C = 2 * Math.PI * r
  return (
    <div className="relative">
      <ScreenHeader over="Analytics" title="October" />
      <div className="mx-4 flex items-center gap-3 rounded-2xl p-3" style={card}>
        <div className="relative h-[92px] w-[92px] shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="50" cy="50" r={r} fill="none" stroke="var(--border-subtle)" strokeWidth="12" />
            {cats.map(([l, v, c], i) => {
              const off = cats.slice(0, i).reduce((s, x) => s + (x[1] / total) * C, 0)
              return (
                <motion.circle key={l} cx="50" cy="50" r={r} fill="none" stroke={c} strokeWidth="12" strokeDashoffset={-off}
                  initial={{ strokeDasharray: `0 ${C}` }} animate={{ strokeDasharray: `${(v / total) * C - 1.5} ${C}` }}
                  transition={{ delay: 0.2 + i * 0.18, duration: 0.8, ease: EASE }} />
              )
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[8.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--text-subtle)' }}>Spent</span>
            <Roll from={0} to={total} delay={0.3} className="font-serif-luxury text-[13px] font-semibold" />
          </div>
        </div>
        <ul className="min-w-0 flex-1 space-y-1.5">
          {cats.map(([l, v, c], i) => (
            <motion.li key={l} {...rise(0.4 + i * 0.12)} className="flex items-center gap-2 text-[11px]">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: c }} />
              <span className="flex-1 truncate" style={{ color: 'var(--text-muted)' }}>{l}</span>
              <span className="font-semibold" style={{ color: 'var(--text-main)' }}>{Math.round((v / total) * 100)}%</span>
            </motion.li>
          ))}
        </ul>
      </div>
      <div className="mx-4 mt-2.5 rounded-2xl p-3.5" style={card}>
        <div className="flex h-[70px] items-end gap-2" aria-hidden="true">
          {[[62, 48], [64, 51], [62, 45], [68, 47], [66, 43], [70, 41]].map(([a, b], i) => (
            <div key={i} className="flex h-full flex-1 items-end justify-center gap-[3px]">
              <motion.span className="w-full rounded-t bg-emerald-500" initial={{ height: 0 }} animate={{ height: `${a / 0.72}%` }} transition={{ delay: 0.6 + i * 0.07, duration: 0.6, ease: EASE }} />
              <motion.span className="w-full rounded-t bg-rose-400" initial={{ height: 0 }} animate={{ height: `${b / 0.72}%` }} transition={{ delay: 0.65 + i * 0.07, duration: 0.6, ease: EASE }} />
            </div>
          ))}
        </div>
        <div className="mt-1.5 flex justify-between text-[9px]" style={{ color: 'var(--text-subtle)' }}>
          {['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'].map(m => <span key={m} className="flex-1 text-center">{m}</span>)}
        </div>
      </div>
      <motion.div className="mx-4 mt-2.5 flex items-center gap-2.5 rounded-2xl px-3 py-2.5 shadow-lg"
        style={{ background: '#1F1A14', color: '#F6EFE2' }}
        initial={{ opacity: 0, y: 24, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 1.8, type: 'spring', stiffness: 300, damping: 22 }}>
        <motion.span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white"
          animate={{ rotate: [0, -14, 12, -8, 0] }} transition={{ delay: 2.2, duration: 0.7 }}>
          <Bell size={15} />
        </motion.span>
        <span className="min-w-0"><span className="block text-[11.5px] font-semibold">Groceries at 84%</span><span className="block text-[10px] opacity-70">₹1,600 left for October</span></span>
      </motion.div>
    </div>
  )
}

const SCENES = [ProjectsScene, BooksScene, RecordScene, PictureScene]

/* ─────────────── phone + steps ─────────────── */

function Phone({ step }) {
  const Scene = SCENES[step]
  return (
    <div data-phone className="relative mx-auto w-full max-w-[300px]">
      <div className="pointer-events-none absolute -inset-10 -z-10 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--gold-primary) 30%, transparent), transparent 70%)' }} aria-hidden="true" />
      <div className="rounded-[2.6rem] p-[9px]" style={{ background: 'linear-gradient(160deg, #3A3530, #1B1815)', boxShadow: '0 40px 80px -30px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06) inset' }}>
        <div className="relative h-[500px] overflow-hidden rounded-[2.1rem]" style={{ background: 'var(--bg-page)' }}>
          <div className="flex items-center justify-between px-6 pt-3 pb-2 text-[10px] font-semibold" style={{ color: 'var(--text-main)' }}>
            <span>9:41</span>
            <span className="h-[18px] w-[70px] rounded-full bg-black/90" aria-hidden="true" />
            <span className="flex items-center gap-1" aria-hidden="true">
              <span className="h-1.5 w-3 rounded-sm" style={{ background: 'var(--text-main)' }} />
              <span className="h-2 w-4 rounded-[3px] border" style={{ borderColor: 'var(--text-main)' }} />
            </span>
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={step} className="absolute inset-x-0 bottom-[58px] top-9"
              initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.35, ease: EASE }}>
              <Scene />
            </motion.div>
          </AnimatePresence>
          {/* tab bar, like the app's */}
          <div className="absolute inset-x-0 bottom-0 z-10 flex h-[58px] items-center justify-around px-4" style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border-subtle)' }} aria-hidden="true">
            {[[HomeIcon, 0], [PieChart, 3], [Users, -1], [BookOpen, 1]].map(([I, s], i) => {
              const on = s === step || (step === 2 && s === 1)
              return (
                <span key={i} className="relative flex h-9 w-12 items-center justify-center rounded-xl transition-colors duration-300" style={{ color: on ? 'var(--gold-primary)' : 'var(--text-subtle)' }}>
                  {on && <motion.span layoutId="tour-tab" className="absolute inset-0 rounded-xl" style={{ background: GOLD_TINT }} transition={{ type: 'spring', stiffness: 380, damping: 30 }} />}
                  <I size={18} className="relative" />
                </span>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HowItWorksTour() {
  const ref = useRef(null)
  const inView = useInView(ref, { margin: '-25% 0px -25% 0px' })
  const reduce = useReducedMotion()
  const [step, setStep] = useState(0)
  const [paused, setPaused] = useState(false)
  const playing = inView && !paused && !reduce

  // Move to the next step when the current one has played
  useEffect(() => {
    if (!playing) return undefined
    const t = setTimeout(() => setStep((s) => (s + 1) % STEPS.length), STEP_MS)
    return () => clearTimeout(t)
  }, [playing, step])

  return (
    <div ref={ref} className="mt-12 grid items-center gap-10 lg:grid-cols-[1fr_1.05fr] lg:gap-16"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {/* steps */}
      <ol className="order-2 grid grid-cols-4 gap-2 lg:order-1 lg:grid-cols-1 lg:gap-3" aria-label="Steps">
        {STEPS.map(({ Icon, title, text }, i) => {
          const on = step === i
          return (
            <li key={title}>
              <button type="button" onClick={() => setStep(i)} aria-current={on ? 'step' : undefined}
                className="relative w-full overflow-hidden rounded-2xl p-2.5 text-left transition-colors lg:p-5"
                style={{ background: on ? 'var(--bg-card)' : 'transparent', border: `1px solid ${on ? 'var(--border-card)' : 'transparent'}`, boxShadow: on ? '0 24px 50px -36px rgba(43,38,32,0.5)' : 'none' }}>
                <div className="flex flex-col items-center gap-1.5 lg:flex-row lg:items-start lg:gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-300"
                    style={on ? { background: 'linear-gradient(135deg, var(--gold-hover), var(--gold-primary))', color: '#1F1A14' } : { background: GOLD_TINT, color: 'var(--gold-primary)' }}>
                    <Icon size={18} />
                  </span>
                  <div className="min-w-0 text-center lg:text-left">
                    <p className="hidden text-[11px] font-semibold uppercase tracking-[0.16em] lg:block" style={{ color: 'var(--text-subtle)' }}>Step {i + 1}</p>
                    <p className="text-[11px] font-semibold leading-tight sm:text-[12.5px] lg:mt-0.5 lg:text-[17px]" style={{ color: on ? 'var(--text-main)' : 'var(--text-muted)' }}>{title}</p>
                    <AnimatePresence initial={false}>
                      {on && (
                        <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: EASE }} className="hidden overflow-hidden text-[14.5px] leading-relaxed lg:block" style={{ color: 'var(--text-muted)' }}>
                          <span className="block pt-1.5">{text}</span>
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                {/* progress */}
                <span className="absolute inset-x-0 bottom-0 h-[3px]" style={{ background: on ? 'var(--border-subtle)' : 'transparent' }} aria-hidden="true">
                  {on && (
                    <motion.span key={`${step}-${playing}`} className="block h-full origin-left" style={{ background: 'linear-gradient(90deg, var(--gold-hover), var(--gold-primary))' }}
                      initial={{ scaleX: 0 }} animate={{ scaleX: playing ? 1 : 0.0001 }} transition={{ duration: playing ? STEP_MS / 1000 : 0, ease: 'linear' }} />
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ol>

      {/* phone, with the step's line under it on small screens */}
      <div className="order-1 lg:order-2">
        <Phone step={step} />
        <AnimatePresence mode="wait">
          <motion.p key={step} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}
            className="mx-auto mt-6 max-w-xs text-center text-[14.5px] leading-relaxed lg:hidden" style={{ color: 'var(--text-muted)' }}>
            <span className="font-semibold" style={{ color: 'var(--text-main)' }}>{step + 1}. {STEPS[step].title}.</span> {STEPS[step].text}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  )
}
