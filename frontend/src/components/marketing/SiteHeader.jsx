import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion'
import { Download, Menu, X, ArrowRight } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { EASE, APK_URL, NAV, goldBtn, scrollToSection } from './constants'
import { Logo } from './ui'
import { useI18n } from '../../i18n/core'
import LanguageMenu from '../common/LanguageMenu'

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
  const { t } = useI18n()
  const isActive = item.page ? current === item.page : current === item.id
  const base = mobile
    ? 'flex min-h-12 items-center justify-between rounded-2xl px-4 text-[15px] font-medium'
    : 'relative rounded-full px-3.5 py-1 text-[13.5px] font-medium leading-6 transition-colors'
  const style = { color: isActive ? 'var(--text-main)' : mobile ? 'var(--text-main)' : 'var(--text-muted)', background: mobile && isActive ? 'var(--border-subtle)' : undefined }
  const inner = (
    <>
      {!mobile && isActive && (
        <motion.span layoutId="nav-pill" className="absolute inset-0 -z-10 rounded-full" style={{ background: 'var(--border-subtle)' }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }} />
      )}
      {t(item.label)}
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
  const { t } = useI18n()
  const { pathname } = useLocation()
  const { user, isEmailVerified } = useAuth()
  const signedIn = Boolean(user && isEmailVerified)
  const onHome = pathname === '/'
  const section = useActiveSection(onHome)
  const current = onHome ? section : pathname

  const { scrollY } = useScroll()
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
        {/* logo · nav centred in the space between · actions */}
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link to="/" className="flex min-h-10 shrink-0 items-center gap-2" aria-label={t('site.header.home')} onClick={close}>
            <Logo size={30} />
            <span className="font-serif-luxury text-[17px] font-semibold tracking-tight" style={{ color: 'var(--text-main)' }}>ArthaLedger</span>
          </Link>

          <div className="hidden min-w-0 flex-1 justify-center lg:flex">
            <nav className="isolate flex items-center gap-0.5 rounded-full p-[3px]" aria-label={t('site.header.mainNav')}
              style={{ background: solid ? 'transparent' : 'color-mix(in srgb, var(--bg-card) 70%, transparent)', border: `1px solid ${solid ? 'transparent' : 'var(--border-card)'}`, backdropFilter: solid ? 'none' : 'blur(10px)' }}>
              {NAV.map(item => <NavItem key={item.label} item={item} onHome={onHome} current={current} />)}
            </nav>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-0">
            <LanguageMenu full size="sm" />
            {signedIn ? (
              <Link to="/dashboard" className="hidden min-h-9 items-center whitespace-nowrap gap-1.5 rounded-full px-4 text-[13.5px] font-semibold hover:brightness-105 min-[420px]:inline-flex" style={goldBtn}>
                {t('common.openApp')} <ArrowRight size={15} />
              </Link>
            ) : (
              <>
                <Link to="/login" className="hidden min-h-9 items-center whitespace-nowrap rounded-full px-3 text-[13.5px] font-semibold transition-colors hover:bg-[var(--border-subtle)] min-[420px]:inline-flex" style={{ color: 'var(--text-main)' }}>
                  {t('common.signIn')}
                </Link>
                <Link to="/register" className="hidden min-h-9 items-center whitespace-nowrap rounded-full px-4 text-[13.5px] font-semibold hover:brightness-105 sm:inline-flex" style={goldBtn}>
                  {t('common.getStarted')}
                </Link>
              </>
            )}
            <button type="button" onClick={() => setOpen(v => !v)} aria-label={open ? t('site.header.closeMenu') : t('site.header.openMenu')} aria-expanded={open} aria-controls="site-menu"
              className="flex h-9 w-9 items-center justify-center rounded-full lg:hidden" style={{ color: 'var(--text-main)', border: '1px solid var(--border-card)', background: 'var(--bg-card)' }}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span key={open ? 'x' : 'm'} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.18 }}>
                  {open ? <X size={17} /> : <Menu size={17} />}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {open && (
            <motion.nav
              id="site-menu"
              aria-label={t('site.header.menu')}
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: EASE }}
              className="overflow-hidden lg:hidden"
            >
              <div className="mx-auto max-h-[calc(100dvh-4rem)] max-w-6xl space-y-1 overflow-y-auto px-4 pb-5 pt-1">
                {NAV.map((item, i) => (
                  <motion.div key={item.label} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 + i * 0.04, duration: 0.25 }}>
                    <NavItem item={item} onHome={onHome} current={current} mobile onClick={close} />
                  </motion.div>
                ))}
                <div className="grid grid-cols-2 gap-2 pt-3">
                  {signedIn ? (
                    <Link to="/dashboard" onClick={close} className="col-span-2 flex min-h-12 items-center justify-center gap-1.5 rounded-full text-[15px] font-semibold" style={goldBtn}>{t('common.openApp')} <ArrowRight size={16} /></Link>
                  ) : (
                    <>
                      <Link to="/login" onClick={close} className="flex min-h-12 items-center justify-center rounded-full text-[15px] font-semibold"
                        style={{ color: 'var(--text-main)', border: '1px solid var(--border-card)', background: 'var(--bg-card)' }}>{t('common.signIn')}</Link>
                      <Link to="/register" onClick={close} className="flex min-h-12 items-center justify-center rounded-full text-[15px] font-semibold" style={goldBtn}>{t('common.getStarted')}</Link>
                    </>
                  )}
                </div>
                <a href={APK_URL} download className="mt-1 flex min-h-12 items-center justify-center gap-2 rounded-full text-[14px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                  <Download size={16} /> {t('site.header.downloadApp')}
                </a>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
      {/* Tap outside to close */}
      <AnimatePresence>
        {open && (
          <motion.button type="button" aria-label={t('site.header.closeMenu')} tabIndex={-1} onClick={close}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 -z-10 bg-black/20 lg:hidden" />
        )}
      </AnimatePresence>
    </header>
  )
}
