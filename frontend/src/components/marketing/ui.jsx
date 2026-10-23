import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ArrowRight, ChevronDown } from 'lucide-react'
import { EASE, GOLD_TINT, goldBtn } from './constants'

export function Reveal({ children, delay = 0, className = '', style, as = 'div', y = 22 }) {
  const reduce = useReducedMotion()
  const Tag = motion[as]
  return (
    <Tag
      className={className}
      style={style}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: reduce ? 0.3 : 0.65, delay, ease: EASE }}
    >
      {children}
    </Tag>
  )
}

export function Logo({ size = 36 }) {
  return (
    <img src="/icons/maskable-192.png" alt="" width={size} height={size} draggable="false"
      className="shrink-0 rounded-full" style={{ width: size, height: size, boxShadow: '0 0 0 1px var(--border-card)' }} />
  )
}

export function Eyebrow({ children, className = '' }) {
  return <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${className}`} style={{ color: 'var(--gold-primary)' }}>{children}</p>
}

export function SectionTitle({ eyebrow, title, sub, center = true }) {
  return (
    <Reveal className={center ? 'mx-auto max-w-2xl text-center' : 'max-w-xl'}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="font-serif-luxury mt-3 text-[1.85rem] leading-[1.12] font-semibold tracking-tight [text-wrap:balance] sm:text-[2.6rem]" style={{ color: 'var(--text-main)' }}>{title}</h2>
      {sub && <p className="mt-3 text-[15px] leading-relaxed sm:text-base" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
    </Reveal>
  )
}

export function PrimaryLink({ to, href, download, children, icon: Icon = ArrowRight, className = '' }) {
  const cls = `group inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold transition-[filter,transform] duration-200 active:scale-[0.98] hover:brightness-105 ${className}`
  const inner = <>{children}<Icon size={17} className="transition-transform duration-200 group-hover:translate-x-0.5" /></>
  return href
    ? <a href={href} download={download} className={cls} style={goldBtn}>{inner}</a>
    : <Link to={to} className={cls} style={goldBtn}>{inner}</Link>
}

export function GhostLink({ to, href, download, children, icon: Icon, className = '' }) {
  const cls = `inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold transition-colors duration-200 hover:bg-[var(--bg-card-hover)] active:scale-[0.98] ${className}`
  const style = { color: 'var(--text-main)', border: '1px solid var(--border-card)', background: 'var(--bg-card)' }
  const inner = <>{Icon && <Icon size={17} />}{children}</>
  return href
    ? <a href={href} download={download} className={cls} style={style}>{inner}</a>
    : <Link to={to} className={cls} style={style}>{inner}</Link>
}

/** One question in an accordion. Closed until tapped. */
export function FaqItem({ q, a, open, onToggle, id }) {
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

/** Shown under "Download for Android" until the app is on the Play Store. */
export function ApkNote({ dark = false, className = '' }) {
  const onHome = useLocation().pathname === '/'
  const muted = dark ? 'rgba(246,239,226,0.6)' : 'var(--text-subtle)'
  const strong = dark ? '#F6EFE2' : 'var(--text-main)'
  const lk = 'font-semibold underline decoration-1 underline-offset-2 hover:opacity-80'
  return (
    <div className={`mx-auto mt-4 max-w-md text-center text-[12.5px] leading-relaxed ${className}`} style={{ color: muted }}>
      <p>Android app · 1.4 MB · Not on the Play Store yet, so Android will ask you to allow the install.{' '}
        {onHome
          ? <a href="#faq" className={lk} style={{ color: strong }}>How to install</a>
          : <Link to="/#faq" className={lk} style={{ color: strong }}>How to install</Link>}
      </p>
      <p className="mt-0.5">Or <Link to="/register" className={lk} style={{ color: strong }}>use it in your browser</Link>, no download needed.</p>
    </div>
  )
}
