import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useInView, useReducedMotion } from 'framer-motion'
import { GraduationCap, Home as HomeIcon, Store, Laptop, Briefcase, Plane } from 'lucide-react'
import { EASE, card } from './constants'

/*
 * "If money passes through your hands": a gold ₹ coin sits in the middle with
 * six kinds of people around it. The coin is passed along a gold line to one
 * person at a time; that person lights up and a small ledger beside it shows
 * what they would typically write down. Tapping a person picks them and
 * pauses the hand-off for a while.
 */

const PEOPLE = [
  { label: 'Students', Icon: GraduationCap, line: 'Pocket money, fees and canteen bills.',
    rows: [['Pocket money', 3000], ['Canteen', -420], ['Bus pass', -350]] },
  { label: 'Families', Icon: HomeIcon, line: 'Groceries, school fees and bills.',
    rows: [['Groceries', -4800], ['School fees', -6500], ['Electricity', -1240]] },
  { label: 'Shop owners', Icon: Store, line: 'Daily sales in, stock and rent out.',
    rows: [['Today’s sales', 12400], ['Stock', -7900], ['Shop rent', -9000]] },
  { label: 'Freelancers', Icon: Laptop, line: 'Client payments in, work costs out.',
    rows: [['Client payment', 35000], ['Software', -1600], ['Internet', -799]] },
  { label: 'Salaried', Icon: Briefcase, line: 'Salary in, EMIs and savings out.',
    rows: [['Salary', 62000], ['Home EMI', -18500], ['SIP', -5000]] },
  { label: 'Trips', Icon: Plane, line: 'Who paid for what, all in one place.',
    rows: [['Hotel · Ravi', -6000], ['Dinner · You', -2100], ['Cab · Asha', -900]] },
]

const R = 40 // orbit radius, in percent of the box
const spot = (i) => {
  const a = (-90 + i * (360 / PEOPLE.length)) * (Math.PI / 180)
  return { x: 50 + R * Math.cos(a), y: 50 + R * Math.sin(a) }
}
const inr = (v) => Math.abs(v).toLocaleString('en-IN')

function Orbit({ active, onPick, reduce }) {
  const to = spot(active)
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[270px] sm:max-w-[360px]">
      {/* rings */}
      <motion.div className="absolute inset-[10%] rounded-full" style={{ border: '1.5px dashed color-mix(in srgb, var(--gold-primary) 45%, transparent)' }}
        animate={reduce ? undefined : { rotate: 360 }} transition={{ duration: 80, repeat: Infinity, ease: 'linear' }} aria-hidden="true" />
      <div className="absolute inset-[27%] rounded-full" style={{ border: '1px solid var(--border-card)' }} aria-hidden="true" />
      <div className="absolute inset-[30%] rounded-full blur-2xl" style={{ background: 'color-mix(in srgb, var(--gold-primary) 22%, transparent)' }} aria-hidden="true" />

      {/* the line the coin travels along */}
      <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" aria-hidden="true">
        <motion.line x1="50" y1="50" stroke="var(--gold-primary)" strokeWidth="0.7" strokeLinecap="round"
          initial={false} animate={{ x2: to.x, y2: to.y }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
        {!reduce && (
          <motion.circle key={active} r="1.8" fill="#E0C084" stroke="#A9823C" strokeWidth="0.4"
            initial={{ cx: 50, cy: 50, opacity: 1 }} animate={{ cx: to.x, cy: to.y, opacity: [1, 1, 0] }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.15 }} />
        )}
      </svg>

      {/* the coin */}
      <div className="absolute left-1/2 top-1/2 h-[25%] w-[25%] -translate-x-1/2 -translate-y-1/2" style={{ perspective: 400 }}>
        <motion.div key={active} className="flex h-full w-full items-center justify-center rounded-full font-serif-luxury text-[30px] font-semibold sm:text-[34px]"
          style={{ background: 'radial-gradient(circle at 35% 30%, #FFF3D1, #DDBA72 55%, #A9823C)', color: '#5B4214', boxShadow: '0 18px 36px -16px rgba(120,86,30,0.7), inset 0 0 0 3px rgba(255,255,255,0.4), inset 0 -6px 12px rgba(120,86,30,0.25)' }}
          initial={reduce ? false : { rotateY: -180 }} animate={{ rotateY: 0 }} transition={{ duration: 0.7, ease: EASE }}>
          ₹
        </motion.div>
      </div>

      {/* the people */}
      {PEOPLE.map(({ label, Icon }, i) => {
        const p = spot(i)
        const on = i === active
        return (
          <button key={label} type="button" onClick={() => onPick(i)} aria-pressed={on} aria-label={label}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}>
            <motion.span className="flex h-12 w-12 items-center justify-center rounded-full sm:h-14 sm:w-14"
              initial={false}
              animate={{ scale: on ? 1.12 : 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              style={on
                ? { background: 'linear-gradient(135deg, #E8CC92, #C5A059)', color: '#1F1A14', boxShadow: '0 0 0 6px color-mix(in srgb, var(--gold-primary) 18%, transparent), 0 14px 28px -12px rgba(197,160,89,0.9)' }
                : { ...card, color: 'var(--gold-primary)', boxShadow: '0 10px 22px -16px rgba(0,0,0,0.35)' }}>
              <Icon size={20} />
            </motion.span>
            <span className="whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-semibold sm:text-[12.5px]"
              style={{ color: on ? 'var(--text-main)' : 'var(--text-muted)', background: on ? 'var(--bg-card)' : 'transparent' }}>
              {label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function Ledger({ person, reduce }) {
  const total = person.rows.reduce((s, [, v]) => s + v, 0)
  return (
    <AnimatePresence mode="wait">
      <motion.div key={person.label} className="rounded-3xl p-4 shadow-[0_24px_48px_-34px_rgba(43,38,32,0.45)] sm:p-6" style={card}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
        transition={{ duration: 0.35, ease: EASE }}>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: 'color-mix(in srgb, var(--gold-primary) 14%, transparent)', color: 'var(--gold-primary)' }}>
            <person.Icon size={19} />
          </span>
          <div className="min-w-0 text-left">
            <p className="text-[15px] font-semibold" style={{ color: 'var(--text-main)' }}>{person.label}</p>
            <p className="truncate text-[13px]" style={{ color: 'var(--text-muted)' }}>{person.line}</p>
          </div>
        </div>
        <div className="mt-3 space-y-1.5 sm:mt-4">
          {person.rows.map(([l, v], i) => (
            <motion.div key={l} className="flex items-center justify-between rounded-xl px-3.5 py-2 text-[13.5px] sm:py-2.5"
              style={{ background: 'color-mix(in srgb, var(--gold-primary) 5%, var(--bg-page))', color: 'var(--text-main)' }}
              initial={reduce ? false : { opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.1, duration: 0.35, ease: EASE }}>
              <span>{l}</span>
              <span className={`tabular-nums font-semibold ${v > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{v > 0 ? '+' : '−'} ₹{inr(v)}</span>
            </motion.div>
          ))}
        </div>
        <div className="mt-3 flex items-baseline justify-between border-t px-1 pt-3" style={{ borderColor: 'var(--border-card)' }}>
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-subtle)' }}>{total >= 0 ? 'Left over' : 'Spent'}</span>
          <span className="font-serif-luxury text-[22px] font-semibold tabular-nums" style={{ color: 'var(--gold-primary)' }}>₹{inr(total)}</span>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

export default function AudienceBand() {
  const ref = useRef(null)
  const inView = useInView(ref, { margin: '-80px' })
  const reduce = useReducedMotion()
  const [active, setActive] = useState(0)
  const [picks, setPicks] = useState(0)

  useEffect(() => {
    if (!inView || reduce) return undefined
    let id
    const t = setTimeout(() => {
      id = setInterval(() => setActive((a) => (a + 1) % PEOPLE.length), 2800)
    }, picks ? 7000 : 0)
    return () => { clearTimeout(t); clearInterval(id) }
  }, [inView, reduce, picks])

  const pick = (i) => { setActive(i); setPicks((n) => n + 1) }

  return (
    <motion.div ref={ref} className="relative overflow-hidden rounded-[2rem] px-4 py-7 sm:rounded-[2.4rem] sm:px-10 sm:py-12"
      style={{ background: 'linear-gradient(160deg, color-mix(in srgb, var(--gold-primary) 10%, var(--bg-page)), var(--bg-page) 70%)', border: '1px solid var(--border-card)' }}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.7, ease: EASE }}>
      <div className="grid items-center gap-5 sm:gap-8 lg:grid-cols-[1fr_1.05fr] lg:gap-x-12 lg:gap-y-7">
        <div className="text-center lg:col-start-1 lg:row-start-1 lg:self-end lg:text-left">
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--gold-primary)' }}>Who it&rsquo;s for</span>
          <h3 className="font-serif-luxury mt-3 text-[1.7rem] font-semibold leading-[1.15] [text-wrap:balance] sm:text-[2.2rem]" style={{ color: 'var(--text-main)' }}>
            If money passes through your hands, <em className="italic" style={{ color: 'var(--gold-primary)' }}>this is for you.</em>
          </h3>
          <p className="mx-auto mt-3 hidden max-w-md text-[14.5px] leading-relaxed sm:block lg:mx-0" style={{ color: 'var(--text-muted)' }}>
            Whether you manage a salary, a household, a shop or a trip with friends, knowing where your money goes is the first step to keeping more of it.
          </p>
        </div>
        <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <Orbit active={active} onPick={pick} reduce={reduce} />
        </div>
        <div className="mx-auto w-full max-w-md lg:col-start-1 lg:row-start-2 lg:mx-0 lg:self-start">
          <Ledger person={PEOPLE[active]} reduce={reduce} />
        </div>
      </div>
    </motion.div>
  )
}
