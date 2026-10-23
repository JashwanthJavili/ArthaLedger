import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence, useScroll, useSpring, useMotionValueEvent } from 'framer-motion'
import { Download, Menu, X, ArrowRight } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { EASE, APK_URL, NAV, goldBtn, scrollToSection } from './constants'
import { Logo } from './ui'

/** Tracks which landing section is on screen, for the nav highlight. */
function useActiveSection(enabled) {
  const [active, setActive] = useState('')
  useEffect(() => {
    if (!enabled) return undefined
    const els = NAV.filter(n => n.id).map(n => document.getElementById(n.id)).filter(Boolean)
    if (!els.length) return undefined
    const seen = new Map()
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => seen.set(e.target.id, e.isIntersecting))
      const first = els.find(el => seen.get(el.id))
      setActive(first ? first.id : '')
    }, { rootMargin: '-45% 0px -50% 0px' })
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [enabled])
  return enabled ? active : ''
}

function NavItem({ item, onHome, current, mobile, onClick }) {
  const isActive = item.page ? current === item.page : current === item.id
  const base = mobile
    ? 'flex min-h-12 items-center justify-between rounded-2xl px-4 text-[15px] font-medium'
    : 'relative rounded-full px-3.5 py-2 text-[14px] font-medium transition-colors'
  const style = { color: isActive ? 'var(--text-main)' : mobile ? 'var(--text-main)' : 'var(--text-muted)', background: mobile && isActive ? 'var(--border-subtle)' : undefined }
  const inner = (
    <>
      {!mobile && isActive && (
        <motion.span layoutId="nav-pill" className="absolute inset-0 -z-10 rounded-full" style={{ background: 'var(--border-subtle)' }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }} />
      )}
      {item.label}
      {mobile && <ArrowRight size={16} style={{ color: 'var(--text-subtle)' }} />}
    </>
  )
  const cls = `${base} ${!mobile ? 'hover:text-[var(--text-main)]' : ''}`
  if (item.page) return <Link to={item.page} onClick={onClick} className={cls} style={style} aria-current={isActive ? 'page' : undefined}>{inner}</Link>
  // On the landing page, jump to the section; from any other page, go there first
  return onHome
    ? <a href={`#${item.id}`} onClick={(e) => { scrollToSection(e, item.id); onClick?.() }} className={cls} style={style}>{inner}</a>
    : <Link to={`/#${item.id}`} onClick={onClick} className={cls} style={style}>{inner}</Link>
}

export default function SiteHeader() {
  const { pathname } = useLocation()
  const { user, isEmailVerified } = useAuth()
  const signedIn = Boolean(user && isEmailVerified)
  const onHome = pathname === '/'
  const section = useActiveSection(onHome)
  const current = onHome ? section : pathname

  const { scrollY, scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 200, damping: 30, restDelta: 0.001 })
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  useMotionValueEvent(scrollY, 'change', (y) => setScrolled(y > 8))

  // Close the menu with Escape, and stop the page scrolling behind it
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  }, [open])

  const solid = scrolled || open || !onHome
  const close = () => setOpen(false)

  return (
    <header className="sticky top-0 z-50" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div
        className="relative transition-[background-color,border-color] duration-300"
        style={{
          background: solid ? 'color-mix(in srgb, var(--bg-page) 86%, transparent)' : 'transparent',
          backdropFilter: solid ? 'saturate(160%) blur(16px)' : 'none',
          WebkitBackdropFilter: solid ? 'saturate(160%) blur(16px)' : 'none',
          borderBottom: `1px solid ${solid ? 'var(--border-subtle)' : 'transparent'}`,
        }}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link to="/" className="flex min-h-11 items-center gap-2.5" aria-label="ArthaLedger home" onClick={close}>
            <Logo size={34} />
            <span className="font-serif-luxury text-[18px] font-semibold tracking-tight" style={{ color: 'var(--text-main)' }}>ArthaLedger</span>
          </Link>

          <nav className="isolate ml-4 hidden items-center gap-0.5 lg:ml-8 md:flex" aria-label="Main">
            {NAV.map(item => <NavItem key={item.label} item={item} onHome={onHome} current={current} />)}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {signedIn ? (
              <Link to="/dashboard" className="hidden min-h-11 items-center gap-1.5 rounded-full px-5 text-[14px] font-semibold hover:brightness-105 min-[420px]:inline-flex" style={goldBtn}>
                Open app <ArrowRight size={15} />
              </Link>
            ) : (
              <>
                <Link to="/login" className="hidden min-h-11 items-center rounded-full px-4 text-[14px] font-semibold transition-colors hover:bg-[var(--border-subtle)] min-[420px]:inline-flex" style={{ color: 'var(--text-main)' }}>
                  Sign in
                </Link>
                <Link to="/register" className="hidden min-h-11 items-center rounded-full px-5 text-[14px] font-semibold hover:brightness-105 sm:inline-flex" style={goldBtn}>
                  Get started
                </Link>
              </>
            )}
            <button type="button" onClick={() => setOpen(v => !v)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="site-menu"
              className="flex h-11 w-11 items-center justify-center rounded-full md:hidden" style={{ color: 'var(--text-main)', border: '1px solid var(--border-card)', background: 'var(--bg-card)' }}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span key={open ? 'x' : 'm'} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.18 }}>
                  {open ? <X size={19} /> : <Menu size={19} />}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>
        </div>

        {/* Reading progress */}
        <motion.div aria-hidden="true" className="absolute bottom-[-1px] left-0 right-0 h-[2px] origin-left"
          style={{ scaleX: progress, background: 'linear-gradient(90deg, var(--gold-hover), var(--gold-primary))', opacity: scrolled ? 1 : 0 }} />

        <AnimatePresence initial={false}>
          {open && (
            <motion.nav
              id="site-menu"
              aria-label="Menu"
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: EASE }}
              className="overflow-hidden md:hidden"
            >
              <div className="mx-auto max-h-[calc(100dvh-4rem)] max-w-6xl space-y-1 overflow-y-auto px-4 pb-5 pt-1">
                {NAV.map((item, i) => (
                  <motion.div key={item.label} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 + i * 0.04, duration: 0.25 }}>
                    <NavItem item={item} onHome={onHome} current={current} mobile onClick={close} />
                  </motion.div>
                ))}
                <div className="grid grid-cols-2 gap-2 pt-3">
                  {signedIn ? (
                    <Link to="/dashboard" onClick={close} className="col-span-2 flex min-h-12 items-center justify-center gap-1.5 rounded-full text-[15px] font-semibold" style={goldBtn}>Open app <ArrowRight size={16} /></Link>
                  ) : (
                    <>
                      <Link to="/login" onClick={close} className="flex min-h-12 items-center justify-center rounded-full text-[15px] font-semibold"
                        style={{ color: 'var(--text-main)', border: '1px solid var(--border-card)', background: 'var(--bg-card)' }}>Sign in</Link>
                      <Link to="/register" onClick={close} className="flex min-h-12 items-center justify-center rounded-full text-[15px] font-semibold" style={goldBtn}>Get started</Link>
                    </>
                  )}
                </div>
                <a href={APK_URL} download className="mt-1 flex min-h-12 items-center justify-center gap-2 rounded-full text-[14px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                  <Download size={16} /> Download the Android app
                </a>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
      {/* Tap outside to close */}
      <AnimatePresence>
        {open && (
          <motion.button type="button" aria-label="Close menu" tabIndex={-1} onClick={close}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 -z-10 bg-black/20 md:hidden" />
        )}
      </AnimatePresence>
    </header>
  )
}
