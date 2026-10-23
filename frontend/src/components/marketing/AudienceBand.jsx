import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useInView, useReducedMotion } from 'framer-motion'
import { GraduationCap, Home as HomeIcon, Store, Laptop, Briefcase, Plane } from 'lucide-react'
import { EASE } from './constants'

/*
 * "If money passes through your hands": a ₹ coin is handed from one kind of
 * person to the next. The gold highlight glides between the chips, the coin
 * hops onto the one it lands on, and a line below says what that person
 * usually tracks. Tapping a chip picks it and pauses the hand-off for a while.
 */

const PEOPLE = [
  { label: 'Students', Icon: GraduationCap, line: 'Pocket money, fees, canteen and trips.' },
  { label: 'Families', Icon: HomeIcon, line: 'Groceries, rent, school fees and bills.' },
  { label: 'Shop owners', Icon: Store, line: 'Daily sales in, stock and expenses out.' },
  { label: 'Freelancers', Icon: Laptop, line: 'Client payments in, work costs out.' },
  { label: 'Salaried professionals', Icon: Briefcase, line: 'Salary in, EMIs, bills and savings out.' },
  { label: 'Trips with friends', Icon: Plane, line: 'Who paid for what, all in one place.' },
]

export default function AudienceBand() {
  const ref = useRef(null)
  const inView = useInView(ref, { margin: '-80px' })
  const reduce = useReducedMotion()
  const [active, setActive] = useState(0)
  const [picks, setPicks] = useState(0)

  useEffect(() => {
    if (!inView || reduce) return undefined
    const wait = picks ? 6000 : 0
    let id
    const t = setTimeout(() => {
      id = setInterval(() => setActive((a) => (a + 1) % PEOPLE.length), 2000)
    }, wait)
    return () => { clearTimeout(t); clearInterval(id) }
  }, [inView, reduce, picks])

  const pick = (i) => { setActive(i); setPicks((n) => n + 1) }

  return (
    <motion.div ref={ref} className="relative overflow-hidden rounded-3xl px-5 py-9 text-center sm:px-10 sm:py-10"
      style={{ background: 'color-mix(in srgb, var(--gold-primary) 6%, var(--bg-page))', border: '1px solid var(--border-card)' }}
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.7, ease: EASE }}>
      <h3 className="font-serif-luxury text-[1.45rem] font-semibold leading-snug [text-wrap:balance] sm:text-[1.8rem]" style={{ color: 'var(--text-main)' }}>
        If money passes through your hands, this is for you
      </h3>
      <p className="mx-auto mt-2 max-w-lg text-[14.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        Whether you manage a salary, a household, a shop or a trip with friends, knowing where your money goes is the first step to keeping more of it.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-x-2 gap-y-4" role="tablist" aria-label="Who it is for">
        {PEOPLE.map(({ label, Icon }, i) => {
          const on = i === active
          return (
            <button key={label} type="button" role="tab" aria-selected={on} onClick={() => pick(i)}
              className="relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13.5px] font-medium transition-colors duration-300"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', color: on ? '#1F1A14' : 'var(--text-main)' }}>
              {on && (
                <motion.span layoutId="audience-pill" className="absolute -inset-px rounded-full"
                  style={{ background: 'linear-gradient(135deg, #E8CC92, #C5A059)', boxShadow: '0 10px 24px -12px rgba(197,160,89,0.9)' }}
                  transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 28 }} />
              )}
              {on && !reduce && (
                <motion.span key={`coin-${i}`} aria-hidden="true"
                  className="absolute -top-3 left-1/2 z-10 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full text-[11px] font-bold"
                  style={{ background: 'radial-gradient(circle at 35% 30%, #FFF3D1, #D9B46A 60%, #A9823C)', color: '#5B4214', boxShadow: '0 4px 10px -3px rgba(120,86,30,0.6), inset 0 0 0 1.5px rgba(255,255,255,0.45)' }}
                  initial={{ y: -22, opacity: 0, rotateY: 0 }} animate={{ y: [-22, 2, -4, 0], opacity: 1, rotateY: 360 }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}>
                  ₹
                </motion.span>
              )}
              <Icon size={15} className="relative" style={{ color: on ? '#1F1A14' : 'var(--gold-primary)' }} />
              <span className="relative">{label}</span>
            </button>
          )
        })}
      </div>

      <div className="relative mt-5 h-6" aria-live="polite">
        <AnimatePresence mode="wait">
          <motion.p key={active} className="absolute inset-x-0 text-[14px] font-medium italic font-serif-luxury"
            style={{ color: 'var(--gold-primary)' }}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8, filter: 'blur(4px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8, filter: 'blur(4px)' }} transition={{ duration: 0.35 }}>
            {PEOPLE[active].line}
          </motion.p>
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
