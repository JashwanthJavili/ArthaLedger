import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, useReducedMotion, useScroll, useTransform, useMotionValueEvent } from 'framer-motion'
import {
  Check, ArrowDownLeft, ArrowUpRight, BookOpen, Bell, WifiOff, ShieldCheck,
  CloudUpload, Download, NotebookPen, Calculator, Landmark, Star, Mail,
  Handshake, GraduationCap, Home as HomeIcon, Store, Laptop, Plane, Quote,
  Briefcase, Sparkles, Gift, ChevronDown,
} from 'lucide-react'
import { forceLightTheme, restoreTheme } from '../lib/theme'
import { api } from '../lib/api'
import SiteHeader from '../components/marketing/SiteHeader'
import SiteFooter from '../components/marketing/SiteFooter'
import BeforeAfter from '../components/marketing/BeforeAfter'
import FeatureBento from '../components/marketing/FeatureBento'
import HowItWorksTour from '../components/marketing/HowItWorksTour'
import { Counter, Donut, InOutBars, Sparkline } from '../components/marketing/Charts'
import { Reveal, Eyebrow, SectionTitle, PrimaryLink, GhostLink, FaqItem } from '../components/marketing/ui'
import { EASE, APK_URL, CONTACT, GOLD_TINT, GOLD_SOFT, BAND_BG, goldBtn, card } from '../components/marketing/constants'

/* ─────────────────────────── shared bits ─────────────────────────── */

const IN = 'text-emerald-600'
const OUT = 'text-rose-600'

/* ─────────────────────────── phone mockup ─────────────────────────── */

const mockEntries = [
  { title: 'Salary', cat: 'Income · Monthly', amount: '+ ₹62,000', type: 'in' },
  { title: 'Vegetables', cat: 'Groceries · Market', amount: '− ₹480', type: 'out' },
  { title: 'Electricity bill', cat: 'Bills · Power', amount: '− ₹1,320', type: 'out' },
  { title: 'Freelance work', cat: 'Income · Side work', amount: '+ ₹8,500', type: 'in' },
]

function PhoneMockup() {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className="relative mx-auto w-full max-w-[290px]"
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 40, rotate: -2 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ duration: 1, delay: 0.25, ease: EASE }}
    >
      <motion.div animate={reduce ? undefined : { y: [0, -10, 0] }} transition={reduce ? undefined : { duration: 6, repeat: Infinity, ease: 'easeInOut' }}>
        <div className="relative rounded-[2.6rem] p-[9px]" style={{ background: 'linear-gradient(160deg, #3A3530, #1B1815)', boxShadow: '0 40px 80px -30px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06) inset' }}>
          <div className="overflow-hidden rounded-[2.1rem]" style={{ background: 'var(--bg-page)' }}>
            <div className="flex items-center justify-between px-6 pt-3 pb-1 text-[10px] font-semibold" style={{ color: 'var(--text-main)' }}>
              <span>9:41</span>
              <span className="h-[18px] w-[70px] rounded-full bg-black/90" aria-hidden="true" />
              <span className="flex items-center gap-1" aria-hidden="true">
                <span className="h-1.5 w-3 rounded-sm" style={{ background: 'var(--text-main)' }} />
                <span className="h-2 w-4 rounded-[3px] border" style={{ borderColor: 'var(--text-main)' }} />
              </span>
            </div>
            <div className="flex items-center justify-between px-4 pt-2 pb-3">
              <div>
                <p className="text-[9px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-subtle)' }}>Family project · Book</p>
                <p className="font-serif-luxury text-[15px] font-semibold" style={{ color: 'var(--text-main)' }}>Home Expenses</p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: GOLD_TINT, color: 'var(--gold-primary)' }}><BookOpen size={14} /></div>
            </div>
            <div className="px-4">
              <div className="relative overflow-hidden rounded-2xl p-4" style={{ background: 'linear-gradient(140deg, #2B2620, #17140F)', color: '#F6EFE2' }}>
                <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full" style={{ background: 'radial-gradient(circle, rgba(212,178,110,0.45), transparent 70%)' }} />
                <p className="text-[9px] uppercase tracking-[0.2em] opacity-70">Money left</p>
                <p className="mt-1 font-serif-luxury text-[24px] font-semibold tracking-tight">₹ 68,700</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
                  <div className="rounded-xl bg-white/8 px-2.5 py-1.5"><p className="opacity-60">Came in</p><p className="font-semibold text-emerald-300">₹ 70,500</p></div>
                  <div className="rounded-xl bg-white/8 px-2.5 py-1.5"><p className="opacity-60">Went out</p><p className="font-semibold text-rose-300">₹ 1,800</p></div>
                </div>
              </div>
            </div>
            <div className="mx-4 mt-3 rounded-xl px-3 py-2.5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-semibold" style={{ color: 'var(--text-main)' }}>Groceries budget</span>
                <span style={{ color: 'var(--text-muted)' }}>₹4,800 / ₹6,000</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--border-subtle)' }}>
                <motion.div className="h-full rounded-full" style={{ background: 'var(--gold-primary)' }}
                  initial={{ width: reduce ? '80%' : '0%' }} animate={{ width: '80%' }} transition={{ duration: 1.4, delay: 0.9, ease: EASE }} />
              </div>
            </div>
            <div className="px-4 pt-3 pb-2">
              <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-subtle)' }}>Today</p>
              <ul className="space-y-1.5">
                {mockEntries.map((e, i) => (
                  <motion.li key={e.title} className="flex items-center gap-2.5 rounded-xl px-2.5 py-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
                    initial={reduce ? false : { opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.8 + i * 0.12, ease: EASE }}>
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${e.type === 'in' ? 'bg-emerald-500/12' : 'bg-rose-500/12'} ${e.type === 'in' ? IN : OUT}`}>
                      {e.type === 'in' ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-semibold" style={{ color: 'var(--text-main)' }}>{e.title}</span>
                      <span className="block truncate text-[9px]" style={{ color: 'var(--text-subtle)' }}>{e.cat}</span>
                    </span>
                    <span className={`text-[11px] font-semibold tabular-nums ${e.type === 'in' ? IN : OUT}`}>{e.amount}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-2 px-4 pt-1 pb-5 text-[10px] font-semibold">
              <span className="rounded-full bg-emerald-600 py-2 text-center text-white">+ Cash In</span>
              <span className="rounded-full bg-rose-600 py-2 text-center text-white">− Cash Out</span>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div className="absolute -left-4 top-24 hidden items-center gap-2 rounded-2xl px-3 py-2 text-[11px] shadow-lg min-[420px]:flex"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', color: 'var(--text-main)', backdropFilter: 'blur(10px)' }}
        initial={reduce ? { opacity: 0 } : { opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 1.3, ease: EASE }}>
        <Bell size={13} style={{ color: 'var(--gold-primary)' }} /><span className="font-medium">Time to note today&rsquo;s spends</span>
      </motion.div>
      <motion.div className="absolute -right-4 bottom-28 hidden items-center gap-2 rounded-2xl px-3 py-2 text-[11px] shadow-lg min-[420px]:flex"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', color: 'var(--text-main)', backdropFilter: 'blur(10px)' }}
        initial={reduce ? { opacity: 0 } : { opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 1.5, ease: EASE }}>
        <CloudUpload size={13} className={IN} /><span className="font-medium">Saved safely</span>
      </motion.div>
    </motion.div>
  )
}

/* ─────────────────────────── hero ─────────────────────────── */

function Hero() {
  const reduce = useReducedMotion()
  const fade = (d) => ({
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, delay: d, ease: EASE },
  })
  return (
    <section className="relative -mt-16 pt-16">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute left-1/2 top-[-160px] h-[560px] w-[560px] -translate-x-1/2 rounded-full blur-3xl lg:left-[72%]" style={{ background: `radial-gradient(circle, ${GOLD_SOFT}, transparent 65%)` }} />
        <div className="absolute inset-0 opacity-[0.35]" style={{ backgroundImage: 'radial-gradient(var(--border-card) 1px, transparent 1px)', backgroundSize: '22px 22px', maskImage: 'linear-gradient(to bottom, black, transparent 70%)', WebkitMaskImage: 'linear-gradient(to bottom, black, transparent 70%)' }} />
      </div>

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-10 pb-16 sm:px-6 sm:pt-14 lg:grid-cols-[1.1fr_1fr] lg:gap-8 lg:pt-20 lg:pb-24">
        <div className="text-center lg:text-left">
          <motion.div {...fade(0)}><Eyebrow>Your money notebook, on your phone</Eyebrow></motion.div>

          <motion.h1 {...fade(0.08)}
            className="font-serif-luxury mt-5 text-[2.15rem] min-[380px]:text-[2.5rem] leading-[1.06] font-semibold tracking-tight sm:text-6xl lg:text-[4.2rem]"
            style={{ color: 'var(--text-main)' }}>
            Know where every
            <br className="hidden min-[380px]:block" /> rupee <em className="italic" style={{ color: 'var(--gold-primary)' }}>goes.</em>
          </motion.h1>

          <motion.p {...fade(0.16)} className="mx-auto mt-5 max-w-lg text-[15.5px] leading-relaxed sm:text-lg lg:mx-0" style={{ color: 'var(--text-muted)' }}>
            Add money in and out in a few taps. ArthaLedger does the maths.
          </motion.p>

          <motion.div {...fade(0.24)} className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <PrimaryLink to="/register">Start for free</PrimaryLink>
            <GhostLink href={APK_URL} download icon={Download}>Download for Android</GhostLink>
          </motion.div>

          <motion.ul {...fade(0.32)} className="mt-7 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[13px] lg:justify-start" style={{ color: 'var(--text-subtle)' }}>
            <li className="flex items-center gap-1.5"><Landmark size={14} style={{ color: 'var(--gold-primary)' }} /> No bank login needed</li>
            <li className="flex items-center gap-1.5"><ShieldCheck size={14} style={{ color: 'var(--gold-primary)' }} /> Private to you</li>
            <li className="flex items-center gap-1.5"><WifiOff size={14} style={{ color: 'var(--gold-primary)' }} /> Works without internet</li>
          </motion.ul>
        </div>

        <PhoneMockup />
      </div>
    </section>
  )
}

/* ─────────────────────────── scroll cue ─────────────────────────── */

/** A gentle "there is more below" cue on the first screen; fades as soon as you scroll. */
function ScrollCue() {
  const reduce = useReducedMotion()
  const { scrollY } = useScroll()
  const opacity = useTransform(scrollY, [0, 140], [1, 0])
  const [gone, setGone] = useState(false)
  useMotionValueEvent(scrollY, 'change', (y) => setGone(y > 140))
  return (
    <motion.div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[max(18px,env(safe-area-inset-bottom))]" style={{ opacity }}>
      <motion.button type="button" aria-label="Scroll down to learn more" tabIndex={gone ? -1 : 0}
        onClick={() => document.getElementById('learn')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.6, duration: 0.7, ease: EASE }}
        className={`${gone ? '' : 'pointer-events-auto'} flex items-center gap-2.5 rounded-full py-2 pl-2.5 pr-3.5`}
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', boxShadow: '0 14px 34px -14px rgba(43,38,32,0.45)' }}>
        <span className="relative flex h-7 w-[18px] justify-center rounded-full" style={{ border: '1.5px solid var(--gold-primary)' }} aria-hidden="true">
          <motion.span className="mt-1 h-1.5 w-[3px] rounded-full" style={{ background: 'var(--gold-primary)' }}
            animate={reduce ? undefined : { y: [0, 9, 9], opacity: [1, 0, 0] }} transition={{ duration: 1.8, repeat: Infinity, times: [0, 0.7, 1], ease: 'easeInOut' }} />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--text-main)' }}>Scroll</span>
        <motion.span aria-hidden="true" style={{ color: 'var(--gold-primary)' }}
          animate={reduce ? undefined : { y: [0, 4, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}>
          <ChevronDown size={16} strokeWidth={2.5} />
        </motion.span>
      </motion.button>
    </motion.div>
  )
}

/* ─────────────────────────── what is it ─────────────────────────── */

const BASICS = [
  { Icon: NotebookPen, title: 'Like a khata, but on your phone', text: 'The same idea as the notebook many families use for household accounts, neatly organised into projects and books.' },
  { Icon: Calculator, title: 'You add, it adds up', text: 'Totals, balances and monthly summaries are worked out for you. No spreadsheets, no formulas.' },
  { Icon: Landmark, title: 'Never touches your bank', text: 'ArthaLedger does not connect to your bank, cards or UPI. You decide what to write. Nothing moves your money.' },
]

function WhatIsIt() {
  return (
    <section id="learn" className="scroll-mt-16 px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <SectionTitle eyebrow="New here?" title="What is ArthaLedger?" sub="An easy way to keep track of your money, made for everyday life in India." />
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {BASICS.map((b, i) => (
            <Reveal key={b.title} delay={i * 0.08} className="rounded-3xl p-6 sm:p-7" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: GOLD_TINT, color: 'var(--gold-primary)' }}><b.Icon size={22} /></span>
              <h3 className="mt-5 text-[17px] font-semibold" style={{ color: 'var(--text-main)' }}>{b.title}</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{b.text}</p>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-14 rounded-3xl px-5 py-8 text-center sm:px-10" style={{ background: 'color-mix(in srgb, var(--gold-primary) 6%, var(--bg-page))', border: '1px solid var(--border-card)' }}>
          <h3 className="font-serif-luxury text-[1.45rem] font-semibold leading-snug [text-wrap:balance] sm:text-[1.8rem]" style={{ color: 'var(--text-main)' }}>
            If money passes through your hands, this is for you
          </h3>
          <p className="mx-auto mt-2 max-w-lg text-[14.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Whether you manage a salary, a household, a shop or a trip with friends, knowing where your money goes is the first step to keeping more of it.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {[['Students', GraduationCap], ['Families', HomeIcon], ['Shop owners', Store], ['Freelancers', Laptop], ['Salaried professionals', Briefcase], ['Trips with friends', Plane]].map(([l, I]) => (
              <span key={l} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13.5px] font-medium" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', color: 'var(--text-main)' }}>
                <I size={15} style={{ color: 'var(--gold-primary)' }} /> {l}
              </span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ─────────────────────────── how it works ─────────────────────────── */

function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20 overflow-hidden px-4 py-16 sm:px-6 sm:py-24" style={{ background: BAND_BG, borderBlock: '1px solid var(--border-subtle)' }}>
      <div className="mx-auto max-w-6xl">
        <SectionTitle eyebrow="How it works" title="Projects hold books. Books hold your money." sub="Four steps, under a minute. Watch it play, or tap a step." />
        <HowItWorksTour />
      </div>
    </section>
  )
}

/* ─────────────────────────── features ─────────────────────────── */

function Features() {
  return (
    <section id="features" className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24" style={{ background: BAND_BG, borderBlock: '1px solid var(--border-subtle)' }}>
      <div className="mx-auto max-w-6xl">
        <SectionTitle eyebrow="Features" title="Small habits. Big clarity." />
        <FeatureBento />
      </div>
    </section>
  )
}

/* ─────────────────────────── before / after ─────────────────────────── */

const SHIFTS = [
  ['Guesses at month end', 'Exact totals, any day'],
  ['Lost bills and screenshots', 'Every entry saved and searchable'],
  ['Surprise when money runs out', 'A heads-up before a budget runs out'],
]

function Transformation() {
  return (
    <section className="px-4 pb-16 sm:px-6 sm:pb-24">
      <div className="mx-auto max-w-6xl">
        <SectionTitle eyebrow="See the difference" title="From scattered to sorted."
          sub="Most of us keep track of money on scraps: notes, screenshots and memory. Drag the slider to see the same month in ArthaLedger." />
        <Reveal className="mt-10"><BeforeAfter /></Reveal>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {SHIFTS.map(([from, to], i) => (
            <Reveal key={from} delay={i * 0.08} className="flex items-center gap-3 rounded-2xl px-4 py-3.5" style={card}>
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] line-through decoration-rose-400/70" style={{ color: 'var(--text-subtle)' }}>{from}</p>
                <p className="mt-0.5 text-[14.5px] font-semibold" style={{ color: 'var(--text-main)' }}>{to}</p>
              </div>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-600"><Check size={16} /></span>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────── insights (charts) ─────────────────────────── */

const MONTHS = [
  { m: 'May', in: 62000, out: 48300 },
  { m: 'June', in: 64500, out: 51200 },
  { m: 'July', in: 62000, out: 44800 },
  { m: 'August', in: 68000, out: 46900 },
  { m: 'September', in: 66500, out: 43100 },
  { m: 'October', in: 70500, out: 41260 },
]
const SPEND = [
  { label: 'Rent', value: 15000, color: '#C5A059' },
  { label: 'Groceries', value: 8400, color: '#059669' },
  { label: 'Bills', value: 5260, color: '#2563EB' },
  { label: 'Travel', value: 4600, color: '#7C3AED' },
  { label: 'Eating out', value: 3800, color: '#E11D48' },
  { label: 'Other', value: 4200, color: '#94A3B8' },
]

function Panel({ title, sub, children, className = '' }) {
  return (
    <div className={`rounded-2xl p-4 sm:p-5 ${className}`} style={card}>
      {title && (
        <div className="mb-4">
          <p className="text-[14px] font-semibold" style={{ color: 'var(--text-main)' }}>{title}</p>
          {sub && <p className="text-[12px]" style={{ color: 'var(--text-subtle)' }}>{sub}</p>}
        </div>
      )}
      {children}
    </div>
  )
}

function Kpi({ label, value, tone, color, points, delay }) {
  return (
    <Reveal delay={delay} y={12} className="flex items-end justify-between gap-3 rounded-2xl p-4 sm:p-5" style={card}>
      <div className="min-w-0">
        <p className="text-[12px] font-medium" style={{ color: 'var(--text-subtle)' }}>{label}</p>
        <Counter value={value} className={`font-serif-luxury mt-1 block text-[1.6rem] font-semibold leading-none ${tone}`} />
      </div>
      <Sparkline points={points} width={84} height={30} color={color} />
    </Reveal>
  )
}

function Insights() {
  return (
    <section id="insights" className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <SectionTitle eyebrow="Insights" title="Your money, drawn as a picture."
          sub="No spreadsheets to build. As you add entries, ArthaLedger turns them into charts you can read at a glance. Tap the charts to explore." />

        <Reveal className="mt-12 rounded-[2rem] p-2.5 sm:p-4" style={{ background: 'linear-gradient(165deg, color-mix(in srgb, var(--gold-primary) 16%, var(--bg-page)), var(--bg-page) 60%)', border: '1px solid var(--border-card)', boxShadow: '0 50px 100px -60px rgba(43,38,32,0.55)' }}>
          <div className="flex items-center gap-2 px-2 pb-3 pt-1 sm:px-1">
            <span className="flex gap-1.5" aria-hidden="true">{['#F87171', '#FBBF24', '#34D399'].map(c => <span key={c} className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />)}</span>
            <span className="ml-2 text-[12.5px] font-semibold" style={{ color: 'var(--text-main)' }}>Analytics · October</span>
            <span className="ml-auto rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider" style={{ background: GOLD_TINT, color: 'var(--text-muted)' }}>Sample data</span>
          </div>

          <div className="grid gap-2.5 sm:gap-3 lg:grid-cols-3">
            <div className="grid gap-2.5 sm:grid-cols-3 sm:gap-3 lg:col-span-3">
              <Kpi delay={0} label="Money in" value={70500} tone="text-emerald-600" color="#059669" points={MONTHS.map(d => d.in)} />
              <Kpi delay={0.06} label="Money out" value={41260} tone="text-rose-600" color="#E11D48" points={MONTHS.map(d => d.out)} />
              <Kpi delay={0.12} label="Money left" value={29240} tone="text-[var(--text-main)]" color="var(--gold-primary)" points={MONTHS.map(d => d.in - d.out)} />
            </div>

            <Panel title="In and out, month by month" sub="Last 6 months" className="lg:col-span-2">
              <InOutBars data={MONTHS} height={150} />
            </Panel>

            <Panel title="Where it went" sub="October spending by category">
              <Donut data={SPEND} size={150} thickness={22} />
            </Panel>

          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ─────────────────────────── pricing teaser (full page at /pricing) ─────────────────────────── */

function PricingTeaser() {
  const reduce = useReducedMotion()
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-24">
      <Reveal className="relative isolate mx-auto grid max-w-5xl items-center gap-8 overflow-hidden rounded-[2rem] p-7 sm:p-10 md:grid-cols-[1.35fr_1fr]" style={card}>
        <div className="pointer-events-none absolute -left-20 -top-24 -z-10 h-64 w-64 rounded-full blur-3xl" style={{ background: GOLD_SOFT }} aria-hidden="true" />
        <div>
          <Eyebrow>Pricing</Eyebrow>
          <h2 className="font-serif-luxury mt-3 text-[1.8rem] font-semibold leading-tight [text-wrap:balance] sm:text-[2.3rem]" style={{ color: 'var(--text-main)' }}>Free for our first 50 users</h2>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Everyone else can also try every feature free until paid plans launch.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <PrimaryLink to="/register">Claim your spot</PrimaryLink>
            <GhostLink to="/pricing">See pricing</GhostLink>
          </div>
        </div>
        <div className="relative mx-auto flex h-48 w-full max-w-[240px] items-center justify-center">
          <motion.div className="absolute inset-0 rounded-full" style={{ border: '1.5px dashed var(--border-card)' }}
            animate={reduce ? undefined : { rotate: 360 }} transition={{ duration: 40, repeat: Infinity, ease: 'linear' }} aria-hidden="true" />
          <div className="text-center">
            <p className="text-[12px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--text-subtle)' }}>Early access</p>
            <p className="font-serif-luxury text-[3.6rem] font-semibold leading-none tracking-tight" style={{ color: 'var(--text-main)' }}>Free</p>
            <p className="mt-1 text-[12.5px] font-semibold" style={{ color: 'var(--gold-primary)' }}>every feature included</p>
          </div>
          <motion.span className="absolute right-0 top-4 flex h-11 w-11 items-center justify-center rounded-2xl shadow-lg" style={goldBtn} aria-hidden="true"
            animate={reduce ? undefined : { y: [0, -6, 0], rotate: [0, -6, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
            <Gift size={19} />
          </motion.span>
          <motion.span className="absolute bottom-5 left-0 flex h-9 w-9 items-center justify-center rounded-xl shadow-md" style={{ ...card, color: 'var(--gold-primary)' }} aria-hidden="true"
            animate={reduce ? undefined : { y: [0, 5, 0] }} transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}>
            <Sparkles size={16} />
          </motion.span>
        </div>
      </Reveal>
    </section>
  )
}

/* ─────────────────────────── testimonials (real, approved feedback) ─────────────────────────── */

function Testimonials() {
  const [items, setItems] = useState([])
  useEffect(() => {
    let alive = true
    api('/v1/testimonials', { signedIn: false, timeoutMs: 20000 })
      .then(d => { if (alive) setItems(d.items || []) })
      .catch(() => { /* section stays hidden */ })
    return () => { alive = false }
  }, [])

  if (!items.length) return null
  return (
    <section className="px-4 pb-16 sm:px-6 sm:pb-24">
      <div className="mx-auto max-w-6xl">
        <SectionTitle eyebrow="In their words" title="What people say" sub="Shared by people who use ArthaLedger, with their permission." />
        <div className="mt-12 columns-1 gap-4 sm:columns-2 lg:columns-3">
          {items.map((t, i) => (
            <Reveal key={t.id} delay={(i % 3) * 0.07} className="mb-4 break-inside-avoid rounded-3xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
              {t.rating ? (
                <div className="flex gap-0.5" aria-label={`${t.rating} out of 5`}>
                  {[1, 2, 3, 4, 5].map(n => <Star key={n} size={14} className={n <= t.rating ? 'fill-[var(--gold-primary)] text-[var(--gold-primary)]' : 'text-[var(--border-card)]'} />)}
                </div>
              ) : null}
              <p className="mt-3 text-[15px] leading-relaxed" style={{ color: 'var(--text-main)' }}>“{t.message}”</p>
              <p className="mt-4 text-[13px] font-semibold" style={{ color: 'var(--text-muted)' }}>{t.name}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────── founder ─────────────────────────── */

function Founder() {
  return (
    <section className="px-4 pb-16 sm:px-6 sm:pb-24">
      <Reveal className="relative mx-auto max-w-4xl overflow-hidden rounded-[2rem] px-6 py-10 sm:px-12 sm:py-14" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
        <Quote size={64} className="pointer-events-none absolute -top-2 right-6 opacity-[0.08]" style={{ color: 'var(--gold-primary)' }} aria-hidden="true" />
        <Eyebrow>A note from our founder</Eyebrow>
        <div className="font-serif-luxury mt-5 space-y-4 text-[1.1rem] leading-[1.7] sm:text-[1.3rem]" style={{ color: 'var(--text-main)' }}>
          <p>ArthaLedger began with a simple observation: most of us do not lack income as much as we lack clarity. Small everyday expenses add up quietly, and by the end of the month it is hard to say where the money went.</p>
          <p>Our purpose is to give every household, student and small business in India a clear record of their money, as familiar as a traditional khata and as dependable as a modern app.</p>
          <p>We build with care, read every piece of feedback, and improve ArthaLedger together with the people who use it. Thank you for trusting us with something so personal.</p>
        </div>
        <div className="mt-8 flex items-center gap-3.5">
          <span className="flex h-12 w-12 items-center justify-center rounded-full font-serif-luxury text-[17px] font-semibold" style={{ background: GOLD_TINT, color: 'var(--gold-primary)' }}>JJ</span>
          <div>
            <p className="text-[15px] font-semibold" style={{ color: 'var(--text-main)' }}>Javili Jashwanth</p>
            <p className="text-[13px]" style={{ color: 'var(--text-subtle)' }}>Founder, ArthaLedger</p>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

/* ─────────────────────────── FAQ ─────────────────────────── */

const FAQ = [
  ['What exactly is ArthaLedger?', 'A money notebook on your phone. You create projects (like Personal or Business), add books inside them, and note down money you receive and spend. ArthaLedger keeps the totals, balances and summaries for you.'],
  ['What is the difference between a project and a book?', 'A project is a folder for one part of your life, such as Family. A book is one account inside it, such as Groceries or Rent. Each book has its own balance, and the project shows them together.'],
  ['Does it connect to my bank account or UPI?', 'No. ArthaLedger never asks for bank, card or UPI details and cannot move money. You type in what you want to keep track of.'],
  ['Is it free?', 'Right now, yes. Early access is free for our first 50 users. Everyone else can also try every feature free until paid plans launch. Paid plans are coming soon, and we will tell you well before anything changes.'],
  ['Is my data safe and private?', 'Yes. Your projects and books can only be opened by your own account, and they are encrypted while they travel and while they are stored. You can also lock any project or book with a PIN.'],
  ['Do I need internet?', 'Not to add entries. ArthaLedger works offline and saves your changes as soon as you are connected again.'],
  ['Can I use it on more than one phone?', 'Yes. Sign in with the same account on any phone or computer and your projects and books will be there.'],
  ['How do I install it on Android?', 'ArthaLedger is not on the Play Store yet, so Android asks you to allow the install. Tap “Download for Android”, open the downloaded file, allow installs from your browser when Android asks, then tap Install. Prefer not to download? Open this website in Chrome and choose “Install app”, or simply use ArthaLedger in your browser.'],
  ['Can I use it on an iPhone or iPad?', 'Yes. ArthaLedger is not on the App Store yet, but it works in Safari. Open this website in Safari, tap the Share button, then choose “Add to Home Screen”. ArthaLedger then opens from your home screen like any other app. To get reminders, open it from the home screen and allow notifications (this needs iOS 16.4 or later).'],
  ['What are Groups?', 'A group collects related transactions from different books in one place, such as everything spent on a trip or a wedding. Select transactions in any book, tap Add to group, and see the total and a category breakdown. Your transactions stay in their books.'],
  ['How do I delete my account?', 'Go to Settings, then Delete account. Your account and all your projects and books are removed for good.'],
]

function Faq() {
  const [open, setOpen] = useState(-1)
  return (
    <section id="faq" className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24" style={{ background: BAND_BG, borderBlock: '1px solid var(--border-subtle)' }}>
      <div className="mx-auto max-w-3xl">
        <SectionTitle eyebrow="FAQ" title="Frequently asked questions" />
        <Reveal className="mt-10 overflow-hidden rounded-3xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', boxShadow: '0 24px 60px -40px rgba(0,0,0,0.25)' }}>
          {FAQ.map(([q, a], i) => <FaqItem key={q} id={`faq-${i}`} q={q} a={a} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />)}
        </Reveal>
        <Reveal delay={0.05} className="mt-6 flex flex-col items-center gap-3 rounded-3xl px-6 py-6 text-center sm:flex-row sm:text-left" style={{ border: '1px dashed var(--border-card)' }}>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ background: GOLD_TINT, color: 'var(--gold-primary)' }}><Mail size={19} /></span>
          <div className="flex-1">
            <p className="text-[15px] font-semibold" style={{ color: 'var(--text-main)' }}>Still have a question?</p>
            <p className="text-[13.5px]" style={{ color: 'var(--text-muted)' }}>Write to us and we will get back to you.</p>
          </div>
          <a href={`mailto:${CONTACT}`} className="inline-flex min-h-11 items-center rounded-full px-5 text-[14px] font-semibold" style={goldBtn}>Contact us</a>
        </Reveal>
      </div>
    </section>
  )
}

/* ─────────────────────────── collaborate + final CTA ─────────────────────────── */

function Collaborate() {
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-24">
      <Reveal className="mx-auto flex max-w-5xl flex-col items-start gap-6 rounded-[2rem] p-7 sm:flex-row sm:items-center sm:p-10" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl" style={{ background: GOLD_TINT, color: 'var(--gold-primary)' }}><Handshake size={26} /></span>
        <div className="flex-1">
          <h2 className="font-serif-luxury text-[1.6rem] font-semibold leading-tight sm:text-[1.9rem]" style={{ color: 'var(--text-main)' }}>Want to collaborate?</h2>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Working on money education, small businesses or community finance? Have an idea we could build together? We would love to hear from you.
          </p>
        </div>
        <a href={`mailto:${CONTACT}?subject=Collaboration%20with%20ArthaLedger`}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold sm:w-auto" style={{ color: 'var(--text-main)', border: '1px solid var(--border-card)', background: 'var(--bg-page)' }}>
          <Mail size={17} /> Write to us
        </a>
      </Reveal>
    </section>
  )
}

function FinalCta() {
  return (
    <section className="px-4 pb-16 sm:px-6 sm:pb-24">
      <Reveal className="relative isolate mx-auto max-w-5xl overflow-hidden rounded-[2rem] px-6 py-12 text-center sm:px-12 sm:py-16" style={{ background: 'linear-gradient(140deg, #2B2620, #15120E)' }}>
        <div className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-72 w-72 -translate-x-1/2 rounded-full blur-3xl" style={{ background: 'rgba(212,178,110,0.35)' }} aria-hidden="true" />
        <img src="/icons/maskable-192.png" alt="" className="mx-auto h-14 w-14 rounded-full" style={{ boxShadow: '0 0 0 4px rgba(212,178,110,0.2)' }} />
        <h2 className="font-serif-luxury mx-auto mt-6 max-w-xl text-[1.9rem] leading-tight font-semibold tracking-tight text-[#F6EFE2] [text-wrap:balance] sm:text-[2.6rem]">Start your money notebook today.</h2>
        <p className="mx-auto mt-3 max-w-md text-[15px] text-[#F6EFE2]/70">Free for our first 50 users. Ready in a minute.</p>
        <div className="mx-auto mt-8 flex max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <PrimaryLink to="/register">Create free account</PrimaryLink>
          <a href={APK_URL} download className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold text-[#F6EFE2] transition-colors hover:bg-white/10" style={{ border: '1px solid rgba(246,239,226,0.25)' }}>
            <Download size={17} /> Download for Android
          </a>
        </div>
      </Reveal>
    </section>
  )
}

/* ─────────────────────────── page ─────────────────────────── */

export default function LandingPage() {
  const { hash } = useLocation()

  // The landing page is always shown in light mode
  useEffect(() => {
    forceLightTheme()
    const html = document.documentElement
    const prev = html.style.scrollBehavior
    html.style.scrollBehavior = 'smooth'
    return () => { restoreTheme(); html.style.scrollBehavior = prev }
  }, [])

  // Always open at the top: no restored scroll position on reload
  useEffect(() => {
    if (!('scrollRestoration' in window.history)) return undefined
    const prev = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    if (!window.location.hash) window.scrollTo(0, 0)
    return () => { window.history.scrollRestoration = prev }
  }, [])

  // Arriving from another page with a section link, such as /#faq: scroll
  // there, then drop the #faq so a reload starts at the top again
  useEffect(() => {
    if (!hash) return undefined
    const t = setTimeout(() => {
      document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
    }, 80)
    return () => clearTimeout(t)
  }, [hash])

  return (
    <div className="min-h-screen overflow-x-clip" style={{ background: 'var(--bg-page)', color: 'var(--text-main)' }}>
      <SiteHeader />
      <main>
        <Hero />
        <ScrollCue />
        <WhatIsIt />
        <Transformation />
        <HowItWorks />
        <Insights />
        <Features />
        <PricingTeaser />
        <Testimonials />
        <Founder />
        <Faq />
        <Collaborate />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  )
}
