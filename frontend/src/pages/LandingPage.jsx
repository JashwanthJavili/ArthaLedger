import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRight, ArrowDownLeft, ArrowUpRight, BookOpen, Bell, Users, Lock,
  FileText, FileSpreadsheet, Moon, Smartphone, WifiOff, ShieldCheck,
  Tags, PieChart, Wallet, FolderOpen, CloudUpload, KeyRound, ChevronRight,
} from 'lucide-react'

/* ─────────────────────────── shared bits ─────────────────────────── */

const EASE = [0.22, 1, 0.36, 1]
const IN = 'text-emerald-600 dark:text-emerald-400'
const OUT = 'text-rose-600 dark:text-rose-400'
const GOLD_TINT = 'color-mix(in srgb, var(--gold-primary) 14%, transparent)'
const GOLD_SOFT = 'color-mix(in srgb, var(--gold-primary) 28%, transparent)'

function Reveal({ children, delay = 0, className = '', style, as = 'div' }) {
  const reduce = useReducedMotion()
  const Tag = motion[as]
  return (
    <Tag
      className={className}
      style={style}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: reduce ? 0.3 : 0.7, delay, ease: EASE }}
    >
      {children}
    </Tag>
  )
}

function Logo({ size = 36 }) {
  return (
    <img
      src="/icons/maskable-192.png"
      alt=""
      width={size}
      height={size}
      className="rounded-full shrink-0"
      style={{ width: size, height: size, boxShadow: '0 0 0 1px var(--border-card)' }}
    />
  )
}

function Eyebrow({ children }) {
  return (
    <p
      className="text-[11px] font-semibold uppercase tracking-[0.22em]"
      style={{ color: 'var(--gold-primary)' }}
    >
      {children}
    </p>
  )
}

function PrimaryButton({ to, children, className = '' }) {
  return (
    <Link
      to={to}
      className={`group inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold transition-all duration-200 active:scale-[0.98] hover:brightness-105 ${className}`}
      style={{
        background: 'linear-gradient(135deg, var(--gold-hover), var(--gold-primary))',
        color: '#1F1A14',
        boxShadow: '0 10px 30px -12px var(--gold-primary)',
      }}
    >
      {children}
      <ArrowRight size={17} className="transition-transform duration-200 group-hover:translate-x-0.5" />
    </Link>
  )
}

function GhostButton({ to, children, className = '' }) {
  return (
    <Link
      to={to}
      className={`inline-flex min-h-12 items-center justify-center rounded-full px-6 text-[15px] font-semibold transition-colors duration-200 active:scale-[0.98] ${className}`}
      style={{ color: 'var(--text-main)', border: '1px solid var(--border-card)', background: 'var(--bg-card)' }}
    >
      {children}
    </Link>
  )
}

/* ─────────────────────────── top bar ─────────────────────────── */

function TopBar() {
  return (
    <header
      className="sticky top-0 z-40 backdrop-blur-xl"
      style={{
        background: 'color-mix(in srgb, var(--bg-page) 82%, transparent)',
        borderBottom: '1px solid var(--border-subtle)',
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link to="/" className="flex min-h-11 items-center gap-2.5" aria-label="ArthaLedger home">
          <Logo size={34} />
          <span className="font-serif-luxury text-[19px] font-semibold tracking-tight" style={{ color: 'var(--text-main)' }}>
            ArthaLedger
          </span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            to="/login"
            className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold transition-colors"
            style={{ color: 'var(--text-main)', border: '1px solid var(--border-card)' }}
          >
            Sign in
          </Link>
          <Link
            to="/register"
            className="hidden min-h-11 items-center rounded-full px-5 text-sm font-semibold sm:inline-flex hover:brightness-105"
            style={{ background: 'var(--gold-primary)', color: '#1F1A14' }}
          >
            Get started
          </Link>
        </nav>
      </div>
    </header>
  )
}

/* ─────────────────────────── phone mockup ─────────────────────────── */

const mockEntries = [
  { title: 'Salary', cat: 'Income · Monthly', amount: '+ ₹62,000', type: 'in' },
  { title: 'Vegetables', cat: 'Groceries · Market', amount: '− ₹480', type: 'out' },
  { title: 'Electricity bill', cat: 'Utilities · Power', amount: '− ₹1,320', type: 'out' },
  { title: 'Freelance design', cat: 'Income · Side work', amount: '+ ₹8,500', type: 'in' },
]

function PhoneMockup() {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className="relative mx-auto w-full max-w-[300px]"
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 40, rotate: -2 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ duration: 1, delay: 0.25, ease: EASE }}
    >
      <motion.div
        animate={reduce ? undefined : { y: [0, -10, 0] }}
        transition={reduce ? undefined : { duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* device frame */}
        <div
          className="relative rounded-[2.6rem] p-[9px]"
          style={{
            background: 'linear-gradient(160deg, #3A3530, #1B1815)',
            boxShadow: '0 40px 80px -30px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06) inset',
          }}
        >
          <div className="overflow-hidden rounded-[2.1rem]" style={{ background: 'var(--bg-page)' }}>
            {/* status bar */}
            <div className="flex items-center justify-between px-6 pt-3 pb-1 text-[10px] font-semibold" style={{ color: 'var(--text-main)' }}>
              <span>9:41</span>
              <span className="h-[18px] w-[70px] rounded-full bg-black/90" aria-hidden="true" />
              <span className="flex items-center gap-1" aria-hidden="true">
                <span className="h-1.5 w-3 rounded-sm" style={{ background: 'var(--text-main)' }} />
                <span className="h-2 w-4 rounded-[3px] border" style={{ borderColor: 'var(--text-main)' }} />
              </span>
            </div>

            {/* app header */}
            <div className="flex items-center justify-between px-4 pt-2 pb-3">
              <div>
                <p className="text-[9px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-subtle)' }}>Family · Book</p>
                <p className="font-serif-luxury text-[15px] font-semibold" style={{ color: 'var(--text-main)' }}>Home Expenses</p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: GOLD_TINT, color: 'var(--gold-primary)' }}>
                <BookOpen size={14} />
              </div>
            </div>

            {/* balance card */}
            <div className="px-4">
              <div
                className="relative overflow-hidden rounded-2xl p-4"
                style={{ background: 'linear-gradient(140deg, #2B2620, #17140F)', color: '#F6EFE2' }}
              >
                <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full" style={{ background: 'radial-gradient(circle, rgba(212,178,110,0.45), transparent 70%)' }} />
                <p className="text-[9px] uppercase tracking-[0.2em] opacity-70">Net balance</p>
                <p className="mt-1 font-serif-luxury text-[24px] font-semibold tracking-tight">₹ 68,700</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
                  <div className="rounded-xl bg-white/8 px-2.5 py-1.5">
                    <p className="opacity-60">Cash in</p>
                    <p className="font-semibold text-emerald-300">₹ 70,500</p>
                  </div>
                  <div className="rounded-xl bg-white/8 px-2.5 py-1.5">
                    <p className="opacity-60">Cash out</p>
                    <p className="font-semibold text-rose-300">₹ 1,800</p>
                  </div>
                </div>
              </div>
            </div>

            {/* budget */}
            <div className="mx-4 mt-3 rounded-xl px-3 py-2.5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-semibold" style={{ color: 'var(--text-main)' }}>Groceries budget</span>
                <span style={{ color: 'var(--text-muted)' }}>₹4,800 / ₹6,000</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--border-subtle)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'var(--gold-primary)' }}
                  initial={{ width: reduce ? '80%' : '0%' }}
                  animate={{ width: '80%' }}
                  transition={{ duration: 1.4, delay: 0.9, ease: EASE }}
                />
              </div>
            </div>

            {/* entries */}
            <div className="px-4 pt-3 pb-2">
              <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-subtle)' }}>Today</p>
              <ul className="space-y-1.5">
                {mockEntries.map((e) => (
                  <li key={e.title} className="flex items-center gap-2.5 rounded-xl px-2.5 py-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${e.type === 'in' ? 'bg-emerald-500/12' : 'bg-rose-500/12'} ${e.type === 'in' ? IN : OUT}`}
                    >
                      {e.type === 'in' ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-semibold" style={{ color: 'var(--text-main)' }}>{e.title}</span>
                      <span className="block truncate text-[9px]" style={{ color: 'var(--text-subtle)' }}>{e.cat}</span>
                    </span>
                    <span className={`text-[11px] font-semibold tabular-nums ${e.type === 'in' ? IN : OUT}`}>{e.amount}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* bottom buttons */}
            <div className="grid grid-cols-2 gap-2 px-4 pt-1 pb-5 text-[10px] font-semibold">
              <span className="rounded-full bg-emerald-600 py-2 text-center text-white">+ Cash In</span>
              <span className="rounded-full bg-rose-600 py-2 text-center text-white">− Cash Out</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* floating reminder chip */}
      <motion.div
        className="absolute -left-3 top-24 hidden items-center gap-2 rounded-2xl px-3 py-2 text-[11px] shadow-lg min-[400px]:flex"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', color: 'var(--text-main)', backdropFilter: 'blur(10px)' }}
        initial={reduce ? { opacity: 0 } : { opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, delay: 1.2, ease: EASE }}
      >
        <Bell size={13} style={{ color: 'var(--gold-primary)' }} />
        <span className="font-medium">Log today&rsquo;s spends</span>
      </motion.div>
      <motion.div
        className="absolute -right-3 bottom-28 hidden items-center gap-2 rounded-2xl px-3 py-2 text-[11px] shadow-lg min-[400px]:flex"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', color: 'var(--text-main)', backdropFilter: 'blur(10px)' }}
        initial={reduce ? { opacity: 0 } : { opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, delay: 1.4, ease: EASE }}
      >
        <CloudUpload size={13} className={IN} />
        <span className="font-medium">Synced</span>
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
    <section className="relative">
      {/* gold glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute left-1/2 top-[-120px] h-[520px] w-[520px] -translate-x-1/2 rounded-full blur-3xl lg:left-[70%]"
          style={{ background: `radial-gradient(circle, ${GOLD_SOFT}, transparent 65%)` }}
        />
      </div>

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-16 sm:px-6 sm:pt-16 lg:grid-cols-[1.1fr_1fr] lg:gap-8 lg:pt-24 lg:pb-24">
        <div className="text-center lg:text-left">
          <motion.div {...fade(0)} className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium" style={{ background: GOLD_TINT, color: 'var(--text-main)', border: '1px solid var(--border-card)' }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--gold-primary)' }} />
            A calm cashbook for Indian households
          </motion.div>

          <motion.h1
            {...fade(0.08)}
            className="font-serif-luxury mt-6 text-[2.2rem] min-[400px]:text-[2.6rem] leading-[1.05] font-semibold tracking-tight sm:text-6xl lg:text-[4.4rem]"
            style={{ color: 'var(--text-main)' }}
          >
            Where every rupee
            <br />
            has <em className="italic" style={{ color: 'var(--gold-primary)' }}>meaning.</em>
          </motion.h1>

          <motion.p {...fade(0.16)} className="mx-auto mt-5 max-w-md text-base leading-relaxed sm:text-lg lg:mx-0" style={{ color: 'var(--text-muted)' }}>
            Keep your personal, family and business books in one quiet place. Record cash in and cash out,
            set budgets, split trips with friends, and see where your money really goes.
          </motion.p>

          <motion.div {...fade(0.24)} className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <PrimaryButton to="/register">Create your ledger</PrimaryButton>
            <GhostButton to="/login">I already have an account</GhostButton>
          </motion.div>

          <motion.ul {...fade(0.32)} className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[13px] lg:justify-start" style={{ color: 'var(--text-subtle)' }}>
            <li className="flex items-center gap-1.5"><ShieldCheck size={14} style={{ color: 'var(--gold-primary)' }} /> Private to your account</li>
            <li className="flex items-center gap-1.5"><WifiOff size={14} style={{ color: 'var(--gold-primary)' }} /> Works offline</li>
            <li className="flex items-center gap-1.5"><Smartphone size={14} style={{ color: 'var(--gold-primary)' }} /> Installs on Android</li>
          </motion.ul>
        </div>

        <PhoneMockup />
      </div>
    </section>
  )
}

/* ─────────────────────────── bento features ─────────────────────────── */

function Tile({ icon: Icon, title, desc, children, className = '', delay = 0 }) {
  return (
    <Reveal
      delay={delay}
      className={`relative flex flex-col overflow-hidden rounded-3xl p-5 sm:p-6 ${className}`}
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl" style={{ background: GOLD_TINT, color: 'var(--gold-primary)' }}>
          <Icon size={18} />
        </span>
        <h3 className="font-serif-luxury text-lg font-semibold" style={{ color: 'var(--text-main)' }}>{title}</h3>
      </div>
      <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{desc}</p>
      {children && <div className="mt-5 flex-1">{children}</div>}
    </Reveal>
  )
}

const miniCard = { background: 'var(--bg-page)', border: '1px solid var(--border-subtle)' }

function ProjectsArt() {
  const books = [
    { name: 'Personal', sub: '3 books', tone: '#C5A059' },
    { name: 'Family', sub: '4 books', tone: '#8FA67A' },
    { name: 'Business', sub: '2 books', tone: '#7C8DB5' },
  ]
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {books.map((b) => (
        <div key={b.name} className="relative overflow-hidden rounded-2xl p-3" style={miniCard}>
          <span className="absolute left-0 top-0 h-full w-1" style={{ background: b.tone }} />
          <FolderOpen size={16} style={{ color: b.tone }} />
          <p className="mt-3 truncate text-[13px] font-semibold" style={{ color: 'var(--text-main)' }}>{b.name}</p>
          <p className="text-[11px]" style={{ color: 'var(--text-subtle)' }}>{b.sub}</p>
        </div>
      ))}
    </div>
  )
}

function CategoriesArt() {
  return (
    <div className="space-y-2">
      {[['Groceries', 'Vegetables'], ['Transport', 'Auto & cab'], ['Home', 'Rent']].map(([c, s]) => (
        <div key={c} className="flex items-center gap-1.5 text-[12px]">
          <span className="rounded-full px-2.5 py-1 font-semibold" style={{ background: GOLD_TINT, color: 'var(--text-main)' }}>{c}</span>
          <ChevronRight size={12} style={{ color: 'var(--text-subtle)' }} />
          <span className="rounded-full px-2.5 py-1" style={{ ...miniCard, color: 'var(--text-muted)' }}>{s}</span>
        </div>
      ))}
    </div>
  )
}

function BudgetArt() {
  const rows = [
    { name: 'Dining out', pct: 92, warn: true },
    { name: 'Groceries', pct: 64 },
    { name: 'Fuel', pct: 38 },
  ]
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.name}>
          <div className="flex justify-between text-[12px]">
            <span style={{ color: 'var(--text-main)' }}>{r.name}</span>
            <span className={r.warn ? OUT : ''} style={r.warn ? undefined : { color: 'var(--text-subtle)' }}>{r.pct}%</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--border-subtle)' }}>
            <div className={`h-full rounded-full ${r.warn ? 'bg-rose-500' : ''}`} style={{ width: `${r.pct}%`, background: r.warn ? undefined : 'var(--gold-primary)' }} />
          </div>
        </div>
      ))}
      <p className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
        <Bell size={12} className={OUT} /> Alert: Dining out is close to its limit
      </p>
    </div>
  )
}

function AnalyticsArt() {
  const months = [
    ['Jun', 48], ['Jul', 62], ['Aug', 55], ['Sep', 74], ['Oct', 58], ['Nov', 40],
  ]
  const cats = [
    ['Home', 42], ['Groceries', 26], ['Travel', 18], ['Other', 14],
  ]
  return (
    <div className="grid gap-4 sm:grid-cols-[1.3fr_1fr]">
      <div className="rounded-2xl p-4" style={miniCard}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-subtle)' }}>Spending by month</p>
        <div className="mt-3 flex h-24 items-end gap-2">
          {months.map(([m, h], i) => (
            <div key={m} className="flex flex-1 flex-col items-center gap-1.5">
              <div
                className="w-full rounded-t-md"
                style={{ height: `${h}%`, background: i === 3 ? 'var(--gold-primary)' : GOLD_SOFT }}
              />
              <span className="text-[10px]" style={{ color: 'var(--text-subtle)' }}>{m}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl p-4" style={miniCard}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-subtle)' }}>By category</p>
        <ul className="mt-3 space-y-2">
          {cats.map(([c, p]) => (
            <li key={c} className="flex items-center gap-2 text-[12px]">
              <span className="w-16 shrink-0 truncate" style={{ color: 'var(--text-main)' }}>{c}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--border-subtle)' }}>
                <span className="block h-full rounded-full" style={{ width: `${p}%`, background: 'var(--gold-primary)' }} />
              </span>
              <span className="w-8 text-right tabular-nums" style={{ color: 'var(--text-subtle)' }}>{p}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function GroupsArt() {
  return (
    <div className="rounded-2xl p-3.5" style={miniCard}>
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold" style={{ color: 'var(--text-main)' }}>Goa trip</span>
        <div className="flex -space-x-2">
          {['A', 'R', 'M', 'S'].map((l, i) => (
            <span
              key={l}
              className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold"
              style={{ background: ['#E8D5B0', '#CFDCC2', '#C9D1E6', '#EBCFCB'][i], color: '#2A241D', boxShadow: '0 0 0 2px var(--bg-page)' }}
            >
              {l}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-3 space-y-1.5 text-[12px]">
        <p className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Rahul owes you</span><span className={`font-semibold ${IN}`}>₹ 1,250</span></p>
        <p className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>You owe Meera</span><span className={`font-semibold ${OUT}`}>₹ 430</span></p>
      </div>
    </div>
  )
}

function VaultArt() {
  return (
    <div className="flex items-center justify-center gap-4 rounded-2xl py-5" style={miniCard}>
      <span className="flex h-11 w-11 items-center justify-center rounded-full" style={{ background: GOLD_TINT, color: 'var(--gold-primary)' }}>
        <KeyRound size={18} />
      </span>
      <div className="flex gap-2.5" aria-hidden="true">
        {[1, 1, 1, 0].map((f, i) => (
          <span key={i} className="h-3 w-3 rounded-full" style={f ? { background: 'var(--gold-primary)' } : { border: '1.5px solid var(--text-subtle)' }} />
        ))}
      </div>
    </div>
  )
}

function ReminderArt() {
  return (
    <div className="rounded-2xl p-3.5" style={miniCard}>
      <div className="flex items-start gap-2.5">
        <img src="/icons/icon-192.png" alt="" className="h-7 w-7 rounded-lg" />
        <div className="min-w-0 flex-1">
          <p className="flex justify-between text-[11px]" style={{ color: 'var(--text-subtle)' }}><span>ArthaLedger</span><span>8:00 pm</span></p>
          <p className="text-[12px] font-semibold" style={{ color: 'var(--text-main)' }}>Any spends to note today?</p>
        </div>
      </div>
      <div className="mt-3 flex gap-2 text-[11px] font-semibold">
        <span className="rounded-full px-3 py-1" style={{ background: GOLD_TINT, color: 'var(--text-main)' }}>Add entry</span>
        <span className="rounded-full px-3 py-1" style={{ border: '1px solid var(--border-card)', color: 'var(--text-muted)' }}>Snooze</span>
      </div>
    </div>
  )
}

function ExportArt() {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <div className="flex items-center gap-2 rounded-2xl p-3" style={miniCard}>
        <FileText size={18} className={OUT} />
        <span className="text-[12px] font-semibold" style={{ color: 'var(--text-main)' }}>PDF</span>
      </div>
      <div className="flex items-center gap-2 rounded-2xl p-3" style={miniCard}>
        <FileSpreadsheet size={18} className={IN} />
        <span className="text-[12px] font-semibold" style={{ color: 'var(--text-main)' }}>Excel</span>
      </div>
    </div>
  )
}

function AppFeelArt() {
  const items = [
    { icon: Smartphone, label: 'Install on Android', note: 'Opens from your home screen like any app' },
    { icon: WifiOff, label: 'Offline first', note: 'Entries save instantly, sync when online' },
    { icon: Moon, label: 'Dark mode', note: 'Soft charcoal for late-night bookkeeping' },
  ]
  return (
    <div className="grid gap-2.5 sm:grid-cols-3">
      {items.map(({ icon: I, label, note }) => (
        <div key={label} className="rounded-2xl p-3.5" style={miniCard}>
          <I size={17} style={{ color: 'var(--gold-primary)' }} />
          <p className="mt-2 text-[13px] font-semibold" style={{ color: 'var(--text-main)' }}>{label}</p>
          <p className="mt-0.5 text-[12px] leading-snug" style={{ color: 'var(--text-subtle)' }}>{note}</p>
        </div>
      ))}
    </div>
  )
}

function SectionHeading({ eyebrow, title, sub }) {
  return (
    <Reveal className="mx-auto max-w-2xl text-center">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="font-serif-luxury mt-3 text-3xl leading-tight font-semibold tracking-tight sm:text-[2.6rem]" style={{ color: 'var(--text-main)' }}>
        {title}
      </h2>
      {sub && <p className="mt-4 text-base leading-relaxed" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
    </Reveal>
  )
}

function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <SectionHeading
        eyebrow="Everything in its place"
        title="A ledger that understands how you live"
        sub="Built around the way money actually moves in an Indian home: shared, seasonal and personal."
      />
      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Tile icon={FolderOpen} title="Projects and books" className="sm:col-span-2" desc="Create a project for each part of life, then keep as many books inside it as you need. Personal, family and business stay neatly apart.">
          <ProjectsArt />
        </Tile>
        <Tile icon={Tags} title="Cash In, Cash Out" delay={0.05} desc="Every entry gets a category and subcategory, so a quick note becomes a clear record.">
          <CategoriesArt />
        </Tile>
        <Tile icon={Wallet} title="Monthly budgets" desc="Set a limit per category and get an alert before you cross it.">
          <BudgetArt />
        </Tile>
        <Tile icon={PieChart} title="Analytics summary" delay={0.05} className="sm:col-span-2" desc="See spending by category, by month and by year. Patterns you never noticed become obvious.">
          <AnalyticsArt />
        </Tile>
        <Tile icon={Users} title="Groups" desc="Split trips and flat expenses with friends. ArthaLedger works out who owes whom.">
          <GroupsArt />
        </Tile>
        <Tile icon={Lock} title="Private Vault" delay={0.05} desc="Keep sensitive records behind a PIN, separate from everyday books.">
          <VaultArt />
        </Tile>
        <Tile icon={Bell} title="Gentle reminders" delay={0.1} desc="Four nudges a day by default, so nothing slips. Snooze any of them.">
          <ReminderArt />
        </Tile>
        <Tile icon={FileText} title="Export anytime" desc="Download your books as PDF or Excel to share, file or archive.">
          <ExportArt />
        </Tile>
        <Tile icon={Smartphone} title="Feels like a native app" delay={0.05} className="sm:col-span-2" desc="Fast, installable and comfortable to use one-handed on your phone.">
          <AppFeelArt />
        </Tile>
      </div>
    </section>
  )
}

/* ─────────────────────────── how it works ─────────────────────────── */

const steps = [
  { title: 'Create a project', desc: 'Name it Home, Shop or anything that fits. Add books inside for each purpose.' },
  { title: 'Record as you go', desc: 'Tap Cash In or Cash Out, pick a category, done. It saves even without internet.' },
  { title: 'Understand and plan', desc: 'Watch budgets, read the monthly summary and export when you need a copy.' },
]

function HowItWorks() {
  return (
    <section className="relative py-16 sm:py-24" style={{ background: 'color-mix(in srgb, var(--gold-primary) 5%, var(--bg-page))', borderBlock: '1px solid var(--border-subtle)' }}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading eyebrow="How it works" title="Three steps to a clearer month" />
        <div className="relative mt-12">
          <div className="pointer-events-none absolute left-[16%] right-[16%] top-9 hidden h-px md:block" style={{ background: 'linear-gradient(90deg, transparent, var(--gold-primary), transparent)', opacity: 0.4 }} aria-hidden="true" />
        <ol className="relative grid gap-4 md:grid-cols-3 md:gap-6">
          {steps.map((s, i) => (
            <Reveal as="li" key={s.title} delay={i * 0.1} className="relative flex gap-4 rounded-3xl p-5 md:flex-col md:items-center md:bg-transparent md:p-2 md:text-center">
              <span
                className="font-serif-luxury relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl font-semibold"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', color: 'var(--gold-primary)' }}
              >
                {i + 1}
              </span>
              <div>
                <h3 className="font-serif-luxury text-lg font-semibold" style={{ color: 'var(--text-main)' }}>{s.title}</h3>
                <p className="mt-1.5 max-w-xs text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </ol>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────── privacy ─────────────────────────── */

const privacyPoints = [
  { icon: ShieldCheck, title: 'Yours alone', desc: 'Your books are tied to your account. Nobody else can read them.' },
  { icon: Lock, title: 'Vault with PIN', desc: 'An extra lock for the records you want kept out of sight.' },
  { icon: CloudUpload, title: 'Safely synced', desc: 'Saved on your phone first, then synced to your account through Firebase.' },
]

function Privacy() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <Reveal>
          <Eyebrow>Privacy</Eyebrow>
          <h2 className="font-serif-luxury mt-3 text-3xl leading-tight font-semibold tracking-tight sm:text-[2.6rem]" style={{ color: 'var(--text-main)' }}>
            Your money is personal. <span style={{ color: 'var(--gold-primary)' }}>So is your ledger.</span>
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            ArthaLedger is a private notebook, not a social feed. What you write stays with your account.
          </p>
          <Link to="/privacy" className="mt-6 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold underline-offset-4 hover:underline" style={{ color: 'var(--gold-primary)' }}>
            Read the privacy policy <ArrowRight size={15} />
          </Link>
        </Reveal>
        <div className="space-y-3">
          {privacyPoints.map(({ icon: I, title, desc }, i) => (
            <Reveal
              key={title}
              delay={i * 0.08}
              className="flex items-start gap-4 rounded-3xl p-5"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ background: GOLD_TINT, color: 'var(--gold-primary)' }}>
                <I size={19} />
              </span>
              <div>
                <h3 className="text-[15px] font-semibold" style={{ color: 'var(--text-main)' }}>{title}</h3>
                <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────── CTA + footer ─────────────────────────── */

function FinalCta() {
  return (
    <section className="px-4 pb-16 sm:px-6 sm:pb-24">
      <Reveal
        className="relative isolate mx-auto max-w-5xl overflow-hidden rounded-[2rem] px-6 py-12 text-center sm:px-12 sm:py-16"
        style={{ background: 'linear-gradient(140deg, #2B2620, #15120E)' }}
      >
        <div className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-72 w-72 -translate-x-1/2 rounded-full blur-3xl" style={{ background: 'rgba(212,178,110,0.35)' }} aria-hidden="true" />
        <img src="/icons/maskable-192.png" alt="" className="mx-auto h-14 w-14 rounded-full" style={{ boxShadow: '0 0 0 4px rgba(212,178,110,0.2)' }} />
        <h2 className="font-serif-luxury mx-auto mt-6 max-w-xl text-3xl leading-tight font-semibold tracking-tight text-[#F6EFE2] sm:text-[2.6rem]">
          Start your first book tonight.
        </h2>
        <p className="mx-auto mt-3 max-w-md text-base text-[#F6EFE2]/70">
          It takes a minute to set up. Your future self will thank you every month.
        </p>
        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <PrimaryButton to="/register">Create account</PrimaryButton>
          <Link
            to="/login"
            className="inline-flex min-h-12 items-center justify-center rounded-full px-6 text-[15px] font-semibold text-[#F6EFE2] transition-colors hover:bg-white/10"
            style={{ border: '1px solid rgba(246,239,226,0.25)' }}
          >
            Sign in
          </Link>
        </div>
      </Reveal>
    </section>
  )
}

function Footer() {
  const [year] = useState(() => new Date().getFullYear())
  return (
    <footer style={{ borderTop: '1px solid var(--border-subtle)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-8 text-sm sm:flex-row sm:justify-between sm:px-6">
        <div className="flex items-center gap-2.5">
          <Logo size={28} />
          <span className="font-serif-luxury font-semibold" style={{ color: 'var(--text-main)' }}>ArthaLedger</span>
          <span className="hidden sm:inline" style={{ color: 'var(--text-subtle)' }}>· Where every rupee has meaning</span>
        </div>
        <div className="flex items-center gap-5" style={{ color: 'var(--text-subtle)' }}>
          <Link to="/privacy" className="inline-flex min-h-11 items-center hover:underline underline-offset-4" style={{ color: 'var(--text-muted)' }}>
            Privacy policy
          </Link>
          <span>© {year} ArthaLedger</span>
        </div>
      </div>
    </footer>
  )
}

/* ─────────────────────────── page ─────────────────────────── */

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-clip" style={{ background: 'var(--bg-page)', color: 'var(--text-main)' }}>
      <TopBar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Privacy />
        <FinalCta />
      </main>
      <Footer />
    </div>
  )
}
