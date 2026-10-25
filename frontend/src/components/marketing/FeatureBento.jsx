import { motion, useReducedMotion } from 'framer-motion'
import {
  FolderOpen, BookOpen, Lock, Bell, FileText, FileSpreadsheet, WifiOff, Check, ArrowRight, Plane, Utensils, Hotel, Car,
  ShoppingBasket, Fuel, Home as HomeIcon, Wallet,
} from 'lucide-react'
import { EASE, GOLD_TINT, card } from './constants'
import { useI18n } from '../../i18n/core'

const view = { once: true, margin: '-40px' }

/* Each tile is mostly picture: a title of a few words and one short line */
function Tile({ title, line, children, className = '', delay = 0 }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={view}
      transition={{ duration: 0.6, delay, ease: EASE }}
      whileHover={reduce ? undefined : { y: -4 }}
      className={`group relative flex flex-col overflow-hidden rounded-3xl p-5 ${className}`} style={card}>
      <div className="relative flex min-h-[132px] flex-1 items-center justify-center">{children}</div>
      <div className="mt-4">
        <h3 className="text-[15.5px] font-semibold" style={{ color: 'var(--text-main)' }}>{title}</h3>
        <p className="mt-0.5 text-[13px]" style={{ color: 'var(--text-subtle)' }}>{line}</p>
      </div>
    </motion.div>
  )
}

function ProjectsArt() {
  const { t } = useI18n()
  const books = [[t('landing.cats.groceries'), ShoppingBasket], [t('landing.cats.rent'), HomeIcon], [t('landing.cats.fuel'), Fuel]]
  return (
    <div className="flex w-full max-w-[300px] items-center gap-3">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={view} transition={{ duration: 0.5, ease: EASE }}
        className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl text-white" style={{ background: 'linear-gradient(140deg, #2B2620, #17140F)' }}>
        <FolderOpen size={20} className="text-[#D4B26E]" />
        <span className="mt-1 text-[9.5px] font-semibold">{t('landing.cats.family')}</span>
      </motion.div>
      <svg width="28" height="80" viewBox="0 0 28 80" className="shrink-0" aria-hidden="true">
        {[12, 40, 68].map((y, i) => (
          <motion.path key={y} d={`M0 40 C 14 40, 14 ${y}, 28 ${y}`} fill="none" stroke="var(--gold-primary)" strokeWidth="1.5"
            initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={view} transition={{ duration: 0.5, delay: 0.3 + i * 0.12 }} />
        ))}
      </svg>
      <div className="min-w-0 flex-1 space-y-1.5">
        {books.map(([l, I], i) => (
          <motion.div key={l} initial={{ opacity: 0, x: 12 }} whileInView={{ opacity: 1, x: 0 }} viewport={view} transition={{ duration: 0.45, delay: 0.5 + i * 0.12, ease: EASE }}
            className="flex items-center gap-2 rounded-xl px-2.5 py-1.5" style={{ background: 'var(--bg-page)', border: '1px solid var(--border-card)' }}>
            <I size={13} style={{ color: 'var(--gold-primary)' }} />
            <span className="truncate text-[12px] font-semibold" style={{ color: 'var(--text-main)' }}>{l}</span>
            <BookOpen size={11} className="ml-auto shrink-0" style={{ color: 'var(--text-subtle)' }} />
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function BudgetArt() {
  const { t } = useI18n()
  const r = 38, C = 2 * Math.PI * r
  return (
    <div className="relative h-[104px] w-[104px]">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--border-subtle)" strokeWidth="10" />
        <motion.circle cx="50" cy="50" r={r} fill="none" stroke="#D97706" strokeWidth="10" strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${C}` }} whileInView={{ strokeDasharray: `${C * 0.84} ${C}` }} viewport={view} transition={{ duration: 1.4, delay: 0.2, ease: EASE }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-serif-luxury text-[1.5rem] font-semibold leading-none" style={{ color: 'var(--text-main)' }}>84%</span>
        <span className="text-[10px] font-semibold text-amber-600">{t('landing.cats.groceries')}</span>
      </div>
      <motion.span initial={{ opacity: 0, scale: 0.6 }} whileInView={{ opacity: 1, scale: 1 }} viewport={view} transition={{ delay: 1.4, type: 'spring', stiffness: 400, damping: 18 }}
        className="absolute -right-3 -top-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">{t('landing.features.headsUp')}</motion.span>
    </div>
  )
}

function GroupsArt() {
  const { t } = useI18n()
  const items = [[Plane, -74, -38], [Hotel, 74, -34], [Utensils, -68, 38], [Car, 70, 40]]
  return (
    <div className="relative h-[120px] w-full max-w-[240px]">
      {items.map(([I, x, y], i) => (
        <motion.span key={i} className="absolute left-1/2 top-1/2 flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ ...card, color: 'var(--gold-primary)', marginLeft: -18, marginTop: -18 }}
          initial={{ x: x * 1.25, y: y * 1.25, opacity: 0 }} whileInView={{ x: [x * 1.25, x * 1.25, x], y: [y * 1.25, y * 1.25, y], opacity: 1 }} viewport={view}
          transition={{ duration: 1.3, delay: 0.2 + i * 0.08, times: [0, 0.35, 1], ease: EASE }}>
          <I size={15} />
        </motion.span>
      ))}
      <motion.div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded-2xl px-3.5 py-2 text-white shadow-lg"
        style={{ background: 'linear-gradient(140deg, #2B2620, #17140F)' }}
        initial={{ scale: 0.6, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={view} transition={{ delay: 1.1, type: 'spring', stiffness: 300, damping: 20 }}>
        <span className="text-[9px] uppercase tracking-[0.18em] opacity-70">{t('landing.features.goaTrip')}</span>
        <span className="font-serif-luxury text-[15px] font-semibold">₹18,450</span>
      </motion.div>
    </div>
  )
}

function LockArt() {
  return (
    <div className="flex flex-col items-center gap-3">
      <motion.span className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: GOLD_TINT, color: 'var(--gold-primary)' }}
        initial={{ rotate: 0 }} whileInView={{ rotate: [0, -10, 10, -6, 0] }} viewport={view} transition={{ delay: 1.2, duration: 0.6 }}>
        <Lock size={21} />
      </motion.span>
      <div className="flex gap-2.5" aria-hidden="true">
        {[0, 1, 2, 3].map(i => (
          <motion.span key={i} className="h-3 w-3 rounded-full" style={{ border: '1.5px solid var(--gold-primary)' }}
            initial={{ background: 'rgba(0,0,0,0)' }} whileInView={{ background: '#C5A059' }} viewport={view} transition={{ delay: 0.3 + i * 0.18, duration: 0.2 }} />
        ))}
      </div>
    </div>
  )
}

function ReminderArt() {
  const { t } = useI18n()
  return (
    <motion.div className="flex w-full max-w-[240px] items-center gap-2.5 rounded-2xl px-3 py-2.5 shadow-[0_14px_30px_-18px_rgba(0,0,0,0.4)]"
      style={card} initial={{ y: -24, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={view} transition={{ delay: 0.2, type: 'spring', stiffness: 260, damping: 20 }}>
      <motion.span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: GOLD_TINT, color: 'var(--gold-primary)' }}
        initial={{ rotate: 0 }} whileInView={{ rotate: [0, -16, 14, -10, 6, 0] }} viewport={view} transition={{ delay: 0.8, duration: 0.8 }}>
        <Bell size={16} />
      </motion.span>
      <span className="min-w-0">
        <span className="block text-[12px] font-semibold" style={{ color: 'var(--text-main)' }}>{t('landing.features.reminderTime')}</span>
        <span className="block truncate text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{t('landing.features.reminderText')}</span>
      </span>
    </motion.div>
  )
}

function ReportArt() {
  return (
    <div className="flex items-end gap-3">
      {[[FileText, 'PDF', '#E11D48', -6], [FileSpreadsheet, 'Excel', '#059669', 6]].map(([I, l, c, rot], i) => (
        <motion.div key={l} className="flex h-[86px] w-[68px] flex-col items-center justify-center gap-1.5 rounded-xl shadow-[0_12px_26px_-16px_rgba(0,0,0,0.45)]"
          style={{ ...card }} initial={{ y: 20, opacity: 0, rotate: 0 }} whileInView={{ y: 0, opacity: 1, rotate: rot }} viewport={view}
          transition={{ delay: 0.2 + i * 0.15, duration: 0.6, ease: EASE }}>
          <I size={24} style={{ color: c }} />
          <span className="text-[11px] font-bold" style={{ color: c }}>{l}</span>
        </motion.div>
      ))}
    </div>
  )
}

function OfflineArt() {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: 'var(--border-subtle)', color: 'var(--text-muted)' }}><WifiOff size={19} /></span>
      <motion.span className="h-[2px] w-8 origin-left rounded-full" style={{ background: 'var(--gold-primary)' }}
        initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={view} transition={{ delay: 0.4, duration: 0.6 }} />
      <motion.span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white"
        initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={view} transition={{ delay: 1, type: 'spring', stiffness: 380, damping: 16 }}>
        <Check size={20} />
      </motion.span>
    </div>
  )
}

function TransferArt() {
  const { t } = useI18n()
  const reduce = useReducedMotion()
  return (
    <div className="relative flex w-full max-w-[240px] items-center justify-between">
      {[t('landing.cats.savings'), t('landing.cats.wallet')].map((l, i) => (
        <div key={l} className="z-10 flex flex-col items-center gap-1">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: GOLD_TINT, color: 'var(--gold-primary)' }}>
            {i ? <Wallet size={18} /> : <BookOpen size={18} />}
          </span>
          <span className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>{l}</span>
        </div>
      ))}
      <span className="absolute left-14 right-14 top-[22px] border-t-2 border-dashed" style={{ borderColor: 'var(--border-card)' }} aria-hidden="true" />
      <motion.span className="absolute left-14 top-[10px] flex h-6 items-center gap-1 rounded-full px-2 text-[10.5px] font-bold text-white"
        style={{ background: 'var(--gold-primary)' }}
        initial={{ x: 0 }} animate={reduce ? undefined : { x: [0, 92, 92, 0] }} transition={{ duration: 3.4, repeat: Infinity, times: [0, 0.45, 0.8, 1], ease: 'easeInOut' }}>
        ₹2,000 <ArrowRight size={11} />
      </motion.span>
    </div>
  )
}

export default function FeatureBento() {
  const { t } = useI18n()
  const tile = (id) => ({ title: t(`landing.features.tiles.${id}.title`), line: t(`landing.features.tiles.${id}.line`) })
  return (
    <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Tile className="sm:col-span-2" {...tile('projects')} delay={0}><ProjectsArt /></Tile>
      <Tile {...tile('budgets')} delay={0.05}><BudgetArt /></Tile>
      <Tile {...tile('reminders')} delay={0.1}><ReminderArt /></Tile>
      <Tile {...tile('groups')} delay={0}><GroupsArt /></Tile>
      <Tile {...tile('pin')} delay={0.05}><LockArt /></Tile>
      <Tile className="sm:col-span-2" {...tile('move')} delay={0.1}><TransferArt /></Tile>
      <Tile {...tile('reports')} delay={0}><ReportArt /></Tile>
      <Tile {...tile('offline')} delay={0.05}><OfflineArt /></Tile>
      <Tile className="sm:col-span-2" {...tile('charts')} delay={0.1}>
        <div className="flex h-[110px] w-full max-w-[300px] items-end gap-2" aria-hidden="true">
          {[45, 70, 52, 88, 60, 96, 74].map((h, i) => (
            <motion.span key={i} className="flex-1 rounded-t-lg" style={{ background: i === 5 ? 'var(--gold-primary)' : 'color-mix(in srgb, var(--gold-primary) 28%, transparent)' }}
              initial={{ height: 0 }} whileInView={{ height: `${h}%` }} viewport={view} transition={{ duration: 0.8, delay: 0.15 + i * 0.06, ease: EASE }} />
          ))}
        </div>
      </Tile>
    </div>
  )
}
