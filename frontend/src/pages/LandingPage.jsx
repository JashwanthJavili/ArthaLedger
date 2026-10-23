import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion, useScroll, useMotionValueEvent } from 'framer-motion'
import {
  ArrowRight, ArrowDownLeft, ArrowUpRight, BookOpen, Bell, Users, Lock, FileSpreadsheet, WifiOff, ShieldCheck,
  Tags, PieChart, CloudUpload, Download, Menu, X, Plus, Minus, NotebookPen, Calculator, Landmark, Star, Mail,
  Handshake, GraduationCap, Home as HomeIcon, Store, Laptop, Plane, Target, Quote, ChevronDown, FolderOpen, Check,
  User, Briefcase, ShoppingBasket, ArrowLeftRight,
} from 'lucide-react'
import { forceLightTheme, restoreTheme } from '../lib/theme'
import { api } from '../lib/api'

/* ─────────────────────────── shared bits ─────────────────────────── */

const EASE = [0.22, 1, 0.36, 1]
const APK_URL = '/download/ArthaLedger.apk'
const CONTACT = 'jashwanthjavili7@gmail.com'
const IN = 'text-emerald-600'
const OUT = 'text-rose-600'
const GOLD_TINT = 'color-mix(in srgb, var(--gold-primary) 14%, transparent)'
const GOLD_SOFT = 'color-mix(in srgb, var(--gold-primary) 26%, transparent)'
const NAV = [['#how', 'How it works'], ['#features', 'Features'], ['#pricing', 'Pricing'], ['#faq', 'FAQ']]

function Reveal({ children, delay = 0, className = '', style, as = 'div' }) {
  const reduce = useReducedMotion()
  const Tag = motion[as]
  return (
    <Tag
      className={className}
      style={style}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: reduce ? 0.3 : 0.65, delay, ease: EASE }}
    >
      {children}
    </Tag>
  )
}

function Logo({ size = 36 }) {
  return (
    <img src="/icons/maskable-192.png" alt="" width={size} height={size} draggable="false"
      className="shrink-0 rounded-full" style={{ width: size, height: size, boxShadow: '0 0 0 1px var(--border-card)' }} />
  )
}

function Eyebrow({ children, className = '' }) {
  return <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${className}`} style={{ color: 'var(--gold-primary)' }}>{children}</p>
}

function SectionTitle({ eyebrow, title, sub, center = true }) {
  return (
    <Reveal className={center ? 'mx-auto max-w-2xl text-center' : 'max-w-xl'}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="font-serif-luxury mt-3 text-[1.85rem] leading-[1.12] font-semibold tracking-tight [text-wrap:balance] sm:text-[2.6rem]" style={{ color: 'var(--text-main)' }}>{title}</h2>
      {sub && <p className="mt-3 text-[15px] leading-relaxed sm:text-base" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
    </Reveal>
  )
}

const goldBtn = {
  background: 'linear-gradient(135deg, var(--gold-hover), var(--gold-primary))',
  color: '#1F1A14',
  boxShadow: '0 12px 30px -14px var(--gold-primary)',
}

function PrimaryLink({ to, href, download, children, icon: Icon = ArrowRight, className = '' }) {
  const cls = `group inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold transition-[filter,transform] duration-200 active:scale-[0.98] hover:brightness-105 ${className}`
  const inner = <>{children}<Icon size={17} className="transition-transform duration-200 group-hover:translate-x-0.5" /></>
  return href
    ? <a href={href} download={download} className={cls} style={goldBtn}>{inner}</a>
    : <Link to={to} className={cls} style={goldBtn}>{inner}</Link>
}

function GhostLink({ to, href, download, children, icon: Icon, className = '' }) {
  const cls = `inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold transition-colors duration-200 hover:bg-[var(--bg-card-hover)] active:scale-[0.98] ${className}`
  const style = { color: 'var(--text-main)', border: '1px solid var(--border-card)', background: 'var(--bg-card)' }
  const inner = <>{Icon && <Icon size={17} />}{children}</>
  return href
    ? <a href={href} download={download} className={cls} style={style}>{inner}</a>
    : <Link to={to} className={cls} style={style}>{inner}</Link>
}

/* ─────────────────────────── header ─────────────────────────── */

function Header() {
  const { scrollY } = useScroll()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  useMotionValueEvent(scrollY, 'change', (y) => setScrolled(y > 8))

  return (
    <header className="sticky top-0 z-50" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div
        className="transition-[background-color,box-shadow,border-color] duration-300"
        style={{
          background: scrolled || open ? 'color-mix(in srgb, var(--bg-page) 88%, transparent)' : 'transparent',
          backdropFilter: scrolled || open ? 'saturate(160%) blur(16px)' : 'none',
          WebkitBackdropFilter: scrolled || open ? 'saturate(160%) blur(16px)' : 'none',
          borderBottom: `1px solid ${scrolled || open ? 'var(--border-subtle)' : 'transparent'}`,
        }}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link to="/" className="flex min-h-11 items-center gap-2.5" aria-label="ArthaLedger home" onClick={() => setOpen(false)}>
            <Logo size={34} />
            <span className="font-serif-luxury text-[18px] font-semibold tracking-tight" style={{ color: 'var(--text-main)' }}>ArthaLedger</span>
          </Link>

          <nav className="ml-6 hidden items-center gap-1 md:flex" aria-label="Main">
            {NAV.map(([href, label]) => (
              <a key={href} href={href} className="rounded-full px-3.5 py-2 text-[14px] font-medium transition-colors hover:bg-[var(--border-subtle)]" style={{ color: 'var(--text-muted)' }}>
                {label}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Link to="/login" className="hidden min-h-11 items-center rounded-full px-4 text-[14px] font-semibold transition-colors hover:bg-[var(--border-subtle)] min-[420px]:inline-flex" style={{ color: 'var(--text-main)' }}>
              Sign in
            </Link>
            <Link to="/register" className="hidden min-h-11 items-center rounded-full px-5 text-[14px] font-semibold hover:brightness-105 sm:inline-flex" style={goldBtn}>
              Get started
            </Link>
            <button type="button" onClick={() => setOpen(v => !v)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}
              className="flex h-11 w-11 items-center justify-center rounded-full md:hidden" style={{ color: 'var(--text-main)', border: '1px solid var(--border-card)', background: 'var(--bg-card)' }}>
              {open ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {open && (
            <motion.nav
              aria-label="Menu"
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: EASE }}
              className="overflow-hidden md:hidden"
            >
              <div className="mx-auto max-w-6xl space-y-1 px-4 pb-5 pt-1">
                {NAV.map(([href, label]) => (
                  <a key={href} href={href} onClick={() => setOpen(false)} className="flex min-h-12 items-center rounded-2xl px-4 text-[15px] font-medium" style={{ color: 'var(--text-main)' }}>
                    {label}
                  </a>
                ))}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Link to="/login" onClick={() => setOpen(false)} className="flex min-h-12 items-center justify-center rounded-full text-[15px] font-semibold"
                    style={{ color: 'var(--text-main)', border: '1px solid var(--border-card)', background: 'var(--bg-card)' }}>Sign in</Link>
                  <Link to="/register" onClick={() => setOpen(false)} className="flex min-h-12 items-center justify-center rounded-full text-[15px] font-semibold" style={goldBtn}>Get started</Link>
                </div>
                <a href={APK_URL} download className="mt-1 flex min-h-12 items-center justify-center gap-2 rounded-full text-[14px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                  <Download size={16} /> Download the Android app
                </a>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </header>
  )
}

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
            ArthaLedger is a simple notebook for your money. Each time money comes in or goes out, add it in a few taps.
            ArthaLedger does the maths, so you always know what came in, what went out, and what is left.
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

/* ─────────────────────────── what is it ─────────────────────────── */

const BASICS = [
  { Icon: NotebookPen, title: 'Like a khata, but on your phone', text: 'The same idea as the notebook many families use for household accounts, neatly organised into projects and books.' },
  { Icon: Calculator, title: 'You add, it adds up', text: 'Totals, balances and monthly summaries are worked out for you. No spreadsheets, no formulas.' },
  { Icon: Landmark, title: 'Never touches your bank', text: 'ArthaLedger does not connect to your bank, cards or UPI. You decide what to write. Nothing moves your money.' },
]

function WhatIsIt() {
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-24">
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

const STEPS = [
  { n: '1', title: 'Create a project', text: 'A project is a folder for one part of your life, like Personal, Family or Business. It keeps related money together.', demo: 'project' },
  { n: '2', title: 'Add books inside it', text: 'Each project holds books, one for each purpose. A Family project might have “Groceries”, “Rent” and “School fees”.', demo: 'book' },
  { n: '3', title: 'Record money in and out', text: 'Tap Cash In when you receive money and Cash Out when you spend. Type the amount and pick what it was for.', demo: 'entry' },
  { n: '4', title: 'See the full picture', text: 'Balances update instantly. See where the money went this month and get a heads-up before a budget runs out.', demo: 'chart' },
]

function StepDemo({ kind }) {
  if (kind === 'project') {
    return (
      <div className="space-y-1.5">
        {[['Personal', User, '3 books'], ['Family', Users, '4 books'], ['Business', Briefcase, '2 books']].map(([l, I, c]) => (
          <div key={l} className="flex items-center gap-2.5 rounded-xl px-3 py-2" style={{ background: 'var(--bg-page)', border: '1px solid var(--border-card)' }}>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: GOLD_TINT, color: 'var(--gold-primary)' }}><I size={14} /></span>
            <span className="flex-1 text-[12.5px] font-semibold" style={{ color: 'var(--text-main)' }}>{l}</span>
            <span className="text-[11px]" style={{ color: 'var(--text-subtle)' }}>{c}</span>
          </div>
        ))}
      </div>
    )
  }
  if (kind === 'book') {
    return (
      <div className="flex flex-wrap gap-2">
        {[['Groceries', ShoppingBasket], ['Rent', HomeIcon], ['School fees', GraduationCap]].map(([l, I]) => (
          <span key={l} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium" style={{ background: 'var(--bg-page)', border: '1px solid var(--border-card)', color: 'var(--text-main)' }}>
            <I size={13} style={{ color: 'var(--gold-primary)' }} /> {l}
          </span>
        ))}
      </div>
    )
  }
  if (kind === 'entry') {
    return (
      <div className="grid grid-cols-2 gap-2 text-[12px] font-semibold">
        <span className="flex items-center justify-center gap-1 rounded-full bg-emerald-600 py-2 text-white"><Plus size={13} /> Cash In</span>
        <span className="flex items-center justify-center gap-1 rounded-full bg-rose-600 py-2 text-white"><Minus size={13} /> Cash Out</span>
      </div>
    )
  }
  return (
    <div className="flex h-12 items-end gap-1.5" aria-hidden="true">
      {[40, 65, 50, 85, 60, 95, 70].map((h, i) => (
        <motion.span key={i} className="flex-1 rounded-t-md" style={{ background: i === 5 ? 'var(--gold-primary)' : GOLD_SOFT }}
          initial={{ height: 0 }} whileInView={{ height: `${h}%` }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.2 + i * 0.06, ease: EASE }} />
      ))}
    </div>
  )
}

function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24" style={{ background: 'color-mix(in srgb, var(--gold-primary) 5%, var(--bg-page))', borderBlock: '1px solid var(--border-subtle)' }}>
      <div className="mx-auto max-w-6xl">
        <SectionTitle eyebrow="How it works" title="Projects hold books. Books hold your money." sub="Four simple steps. You can start in under a minute, with nothing to set up." />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.08} className="flex flex-col rounded-3xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
              <span className="font-serif-luxury text-[2.6rem] font-semibold leading-none" style={{ color: 'var(--gold-primary)' }}>{s.n}</span>
              <h3 className="mt-4 text-[17px] font-semibold" style={{ color: 'var(--text-main)' }}>{s.title}</h3>
              <p className="mt-2 flex-1 text-[14.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{s.text}</p>
              <div className="mt-6"><StepDemo kind={s.demo} /></div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────── features ─────────────────────────── */

const FEATURES = [
  { Icon: FolderOpen, title: 'Projects', text: 'Group your money by life area: Personal, Family, Business, a trip. Pick an icon for each.' },
  { Icon: BookOpen, title: 'Books inside projects', text: 'Split a project into books like Groceries or Rent, each with its own balance.' },
  { Icon: Tags, title: 'Categories', text: 'Groceries, rent, fuel, salary… pick one so you can see where money goes.' },
  { Icon: Target, title: 'Monthly budgets', text: 'Set a limit for a category. We warn you when you get close.' },
  { Icon: PieChart, title: 'Clear summaries', text: 'See this month and this year, by category, in plain numbers.' },
  { Icon: Users, title: 'Split with friends', text: 'Trips and shared flats: see who paid and who owes whom.' },
  { Icon: Lock, title: 'Lock private books', text: 'Add a PIN to any book or project you want to keep to yourself.' },
  { Icon: Bell, title: 'Gentle reminders', text: 'A friendly nudge, morning to night, so nothing is forgotten.' },
  { Icon: FileSpreadsheet, title: 'Download reports', text: 'Save any book as a PDF or Excel file to share or print.' },
  { Icon: WifiOff, title: 'Works offline', text: 'Add entries without internet. They are saved when you are back online.' },
  { Icon: ArrowLeftRight, title: 'Move money between books', text: 'Transfer from one book to another and both balances stay right.' },
]

function Features() {
  return (
    <section id="features" className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <SectionTitle eyebrow="Features" title="Small habits. Big clarity." sub="Each tool is built to save you a few minutes today and a lot of worry by the end of the month." />
        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 0.06} className="group flex gap-4 rounded-2xl p-5 transition-colors hover:bg-[var(--bg-card-hover)]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105" style={{ background: GOLD_TINT, color: 'var(--gold-primary)' }}><f.Icon size={20} /></span>
              <div className="min-w-0">
                <h3 className="text-[15.5px] font-semibold" style={{ color: 'var(--text-main)' }}>{f.title}</h3>
                <p className="mt-1 text-[14px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{f.text}</p>
              </div>
            </Reveal>
          ))}
        </div>

      </div>
    </section>
  )
}

/* ─────────────────────────── pricing ─────────────────────────── */

const PLAN_FEATURES = ['Unlimited projects and books', 'Budgets, summaries and reports', 'Groups, reminders and PIN lock', 'Sync across your devices']

function PriceCard({ name, price, period, note, badge, highlight, cta, delay }) {
  return (
    <Reveal delay={delay} className="relative flex flex-col rounded-3xl p-6 sm:p-7"
      style={highlight
        ? { background: 'linear-gradient(160deg, #2B2620, #15120E)', color: '#F6EFE2', boxShadow: '0 30px 70px -35px rgba(43,38,32,0.8)' }
        : { background: 'var(--bg-card)', border: '1px solid var(--border-card)', color: 'var(--text-main)' }}>
      {badge && (
        <span className="absolute right-5 top-5 rounded-full px-3 py-1 text-[11px] font-semibold"
          style={highlight ? { background: 'var(--gold-primary)', color: '#1F1A14' } : { background: GOLD_TINT, color: 'var(--text-main)' }}>{badge}</span>
      )}
      <p className="text-[13px] font-semibold uppercase tracking-[0.16em]" style={{ color: highlight ? '#D4B26E' : 'var(--gold-primary)' }}>{name}</p>
      <p className="mt-4 flex items-baseline gap-1.5">
        <span className="font-serif-luxury text-[2.6rem] font-semibold leading-none tracking-tight">{price}</span>
        {period && <span className="text-[14px]" style={{ opacity: 0.7 }}>{period}</span>}
      </p>
      <p className="mt-2 text-[14px] leading-relaxed" style={{ opacity: highlight ? 0.75 : 1, color: highlight ? undefined : 'var(--text-muted)' }}>{note}</p>
      <ul className="mt-6 flex-1 space-y-2.5">
        {PLAN_FEATURES.map(f => (
          <li key={f} className="flex items-start gap-2.5 text-[14px]">
            <Check size={16} className="mt-0.5 shrink-0" style={{ color: highlight ? '#D4B26E' : 'var(--gold-primary)' }} />
            <span style={{ opacity: highlight ? 0.9 : 1 }}>{f}</span>
          </li>
        ))}
      </ul>
      <div className="mt-7">{cta}</div>
    </Reveal>
  )
}

function Pricing() {
  const soon = (
    <span className="flex min-h-12 w-full items-center justify-center rounded-full text-[14.5px] font-semibold"
      style={{ border: '1px dashed var(--border-card)', color: 'var(--text-subtle)' }}>Coming soon</span>
  )
  return (
    <section id="pricing" className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <SectionTitle eyebrow="Pricing" title="Free for our first 50 users" sub="Paid plans are coming soon. For now, everyone can explore every feature at no cost." />
        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          <PriceCard delay={0} highlight name="Early access" price="Free" note="For our first 50 users. Every feature, no card needed."
            badge="Limited" cta={<PrimaryLink to="/register" className="w-full">Claim your spot</PrimaryLink>} />
          <PriceCard delay={0.08} name="Monthly" price="₹199" period="/ month" note="Pay month to month. Cancel any time." badge="Coming soon" cta={soon} />
          <PriceCard delay={0.16} name="Yearly" price="₹999" period="/ year" note="Just ₹83 a month. Save 58% compared to monthly." badge="Best value" cta={soon} />
        </div>
        <Reveal delay={0.1} className="mt-6 text-center text-[13.5px]" style={{ color: 'var(--text-subtle)' }}>
          Prices in Indian rupees. We will let you know well before paid plans begin.
        </Reveal>
      </div>
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
  ['Is it free?', 'Right now, yes. Our first 50 users get ArthaLedger free, and everyone can explore every feature at no cost for now. Paid plans (₹199 a month or ₹999 a year) are coming soon, and we will tell you well before anything changes.'],
  ['Is my data safe and private?', 'Yes. Your projects and books can only be opened by your own account, and they are encrypted while they travel and while they are stored. You can also lock any project or book with a PIN.'],
  ['Do I need internet?', 'Not to add entries. ArthaLedger works offline and saves your changes as soon as you are connected again.'],
  ['Can I use it on more than one phone?', 'Yes. Sign in with the same account on any phone or computer and your projects and books will be there.'],
  ['How do I install it on Android?', 'Tap “Download for Android”, open the downloaded file and allow the install when Android asks. You can also open this website in Chrome and choose “Install app”.'],
  ['Can I share expenses with friends?', 'Yes. Use Groups for trips or shared flats. Add what each person paid and ArthaLedger shows who owes whom.'],
  ['How do I delete my account?', 'Go to Settings, then Delete account. Your account and all your projects and books are removed for good.'],
]

function FaqItem({ q, a, open, onToggle, id }) {
  return (
    <div className="border-b last:border-b-0" style={{ borderColor: 'var(--border-subtle)' }}>
      <h3>
        <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={`${id}-a`} id={`${id}-q`}
          className="group flex w-full items-center gap-4 px-5 py-5 text-left transition-colors hover:bg-[var(--bg-card-hover)] sm:px-7">
          <span className="flex-1 text-[15.5px] font-semibold leading-snug sm:text-[16.5px]" style={{ color: 'var(--text-main)' }}>{q}</span>
          <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.3, ease: EASE }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors"
            style={{ background: open ? 'var(--gold-primary)' : GOLD_TINT, color: open ? '#1F1A14' : 'var(--gold-primary)' }}>
            <ChevronDown size={17} />
          </motion.span>
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div id={`${id}-a`} role="region" aria-labelledby={`${id}-q`}
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: EASE }} className="overflow-hidden">
            <p className="max-w-2xl px-5 pb-6 text-[15px] leading-relaxed sm:px-7" style={{ color: 'var(--text-muted)' }}>{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Faq() {
  const [open, setOpen] = useState(-1)
  return (
    <section id="faq" className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24" style={{ background: 'color-mix(in srgb, var(--gold-primary) 5%, var(--bg-page))', borderBlock: '1px solid var(--border-subtle)' }}>
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

/* ─────────────────────────── footer ─────────────────────────── */

function FooterCol({ title, children }) {
  return (
    <div>
      <p className="text-[12px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-subtle)' }}>{title}</p>
      <ul className="mt-4 space-y-1">{children}</ul>
    </div>
  )
}
function FooterLink({ to, href, download, children }) {
  const cls = 'inline-flex min-h-9 items-center text-[14px] transition-colors hover:text-[var(--text-main)]'
  const style = { color: 'var(--text-muted)' }
  return <li>{to ? <Link to={to} className={cls} style={style}>{children}</Link> : <a href={href} download={download} className={cls} style={style}>{children}</a>}</li>
}

function Footer() {
  const [year] = useState(() => new Date().getFullYear())
  return (
    <footer style={{ borderTop: '1px solid var(--border-subtle)', background: 'color-mix(in srgb, var(--gold-primary) 3%, var(--bg-page))' }}>
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <div className="col-span-2 max-w-xs lg:col-span-1">
          <div className="flex items-center gap-2.5">
            <Logo size={34} />
            <span className="font-serif-luxury text-[18px] font-semibold" style={{ color: 'var(--text-main)' }}>ArthaLedger</span>
          </div>
          <p className="font-serif-luxury mt-3 text-[14px] italic" style={{ color: 'var(--text-muted)' }}>Where every rupee has meaning.</p>
          <p className="mt-3 text-[13.5px] leading-relaxed" style={{ color: 'var(--text-subtle)' }}>A simple, private money notebook for personal, family and business use.</p>
        </div>
        <FooterCol title="Product">
          <FooterLink href="#how">How it works</FooterLink>
          <FooterLink href="#features">Features</FooterLink>
          <FooterLink href="#pricing">Pricing</FooterLink>
          <FooterLink href="#faq">FAQ</FooterLink>
          <FooterLink href={APK_URL} download>Download for Android</FooterLink>
        </FooterCol>
        <FooterCol title="Account">
          <FooterLink to="/register">Create account</FooterLink>
          <FooterLink to="/login">Sign in</FooterLink>
          <FooterLink to="/forgot-password">Reset password</FooterLink>
        </FooterCol>
        <FooterCol title="Company">
          <FooterLink to="/privacy">Privacy policy</FooterLink>
          <FooterLink href={`mailto:${CONTACT}`}>Contact us</FooterLink>
          <FooterLink href={`mailto:${CONTACT}?subject=Collaboration%20with%20ArthaLedger`}>Collaborate</FooterLink>
        </FooterCol>
      </div>
      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 py-6 text-[13px] sm:flex-row sm:justify-between sm:px-6" style={{ color: 'var(--text-subtle)' }}>
          <span>© {year} ArthaLedger. All rights reserved.</span>
          <span>Made with care in India</span>
        </div>
      </div>
    </footer>
  )
}

/* ─────────────────────────── page ─────────────────────────── */

export default function LandingPage() {
  // The landing page is always shown in light mode
  useEffect(() => {
    forceLightTheme()
    const html = document.documentElement
    const prev = html.style.scrollBehavior
    html.style.scrollBehavior = 'smooth'
    return () => { restoreTheme(); html.style.scrollBehavior = prev }
  }, [])

  return (
    <div className="min-h-screen overflow-x-clip" style={{ background: 'var(--bg-page)', color: 'var(--text-main)' }}>
      <Header />
      <main>
        <Hero />
        <WhatIsIt />
        <HowItWorks />
        <Features />
        <Pricing />
        <Testimonials />
        <Founder />
        <Faq />
        <Collaborate />
        <FinalCta />
      </main>
      <Footer />
    </div>
  )
}
