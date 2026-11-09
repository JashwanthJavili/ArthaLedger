import { useEffect, useId, useRef, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Check, ChevronDown, Languages, X } from 'lucide-react'
import { useI18n, LANGS } from '../../i18n/core'
import useChangeLanguage from '../../hooks/useChangeLanguage'

/**
 * Language dropdown for page headers (website, home, analytics). Shows the
 * current language (`full` name on the website, short "Eng" / "తెలుగు" in the
 * app); the menu lists each language in its own script. Closes on
 * outside tap or Escape, and the arrow keys move between options.
 */
// "Choose your language", each in its own language and script
const GUIDE_LINES = [
  { code: 'en', text: 'Choose your language' },
  { code: 'te', text: 'మీ భాషను ఎంచుకోండి' },
  { code: 'ta', text: 'உங்கள் மொழியைத் தேர்ந்தெடுங்கள்' },
  { code: 'hi', text: 'अपनी भाषा चुनें' },
]
const GUIDE_KEY = 'artha.langGuide'
// Survives the header being rebuilt while the page loads, so it doesn't flicker
let guideShowing = false
const LANG_KEY = 'artha.lang'

// First visit only, and only if no language has been picked yet
function shouldGuide() {
  try { return !localStorage.getItem(GUIDE_KEY) && !localStorage.getItem(LANG_KEY) } catch { return false }
}

/**
 * Language dropdown for page headers (website, home, analytics). Shows the
 * current language (`full` name on the website, short "Eng" / "తెలుగు" in the
 * app); the menu lists each language in its own script. Closes on
 * outside tap or Escape, and the arrow keys move between options.
 * `guide`: on a first visit to the website, a small bubble points at the
 * button and cycles "Choose your language" through each language.
 */
export default function LanguageMenu({ full = false, size = 'md', className = '', guide = false }) {
  const sizes = { sm: 'h-9 px-2.5 text-[13px]', md: 'h-10 px-3 text-[13px]' }
  const { lang, t } = useI18n()
  const changeLanguage = useChangeLanguage()
  const [open, setOpen] = useState(false)
  const wrap = useRef(null)
  const items = useRef([])
  const menuId = useId()
  const current = LANGS.find((l) => l.code === lang) || LANGS[0]
  const reduceMotion = useReducedMotion()
  const [guiding, setGuiding] = useState(() => guide && guideShowing && shouldGuide())
  const [line, setLine] = useState(0)

  const endGuide = () => {
    setGuiding(false)
    guideShowing = false
    try { localStorage.setItem(GUIDE_KEY, '1') } catch { /* shows again next visit */ }
  }
  // Show the guide a moment after the page settles; it goes once seen
  useEffect(() => {
    if (!guide || guideShowing || !shouldGuide()) return undefined
    const show = setTimeout(() => { guideShowing = true; setGuiding(true) }, 1200)
    return () => clearTimeout(show)
  }, [guide])
  useEffect(() => {
    if (!guiding) return undefined
    const cycle = setInterval(() => setLine((i) => (i + 1) % GUIDE_LINES.length), 1800)
    const hide = setTimeout(() => endGuide(), 16000)
    return () => { clearInterval(cycle); clearTimeout(hide) }
  }, [guiding])

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => { if (!wrap.current?.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    // Focus the current language, like a native menu
    const i = LANGS.findIndex((l) => l.code === lang)
    requestAnimationFrame(() => items.current[Math.max(0, i)]?.focus())
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, lang])

  const pick = (code) => { setOpen(false); endGuide(); changeLanguage(code) }
  const toggle = () => { if (guiding) endGuide(); setOpen((v) => !v) }
  const onItemKey = (e, i) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const next = (i + (e.key === 'ArrowDown' ? 1 : -1) + LANGS.length) % LANGS.length
    items.current[next]?.focus()
  }

  return (
    <div ref={wrap} className={`relative shrink-0 ${className}`}>
      {/* A soft ring that breathes around the button while the guide is up */}
      {guiding && !open && !reduceMotion && (
        <motion.span aria-hidden="true" className="pointer-events-none absolute -inset-1 rounded-full"
          style={{ border: '2px solid var(--gold-primary)' }}
          initial={{ opacity: 0.7, scale: 1 }} animate={{ opacity: 0, scale: 1.25 }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }} />
      )}
      <button type="button" onClick={toggle}
        aria-haspopup="menu" aria-expanded={open} aria-controls={menuId}
        aria-label={`${t('site.header.switchLanguage')}: ${current.label}`}
        className={`flex ${sizes[size] || sizes.md} items-center gap-1.5 rounded-full font-semibold transition-colors hover:border-[var(--gold-primary)] cursor-pointer`}
        style={{ color: 'var(--text-main)', border: '1px solid var(--border-card)', background: 'var(--bg-card)' }}>
        <Languages size={size === 'sm' ? 14 : 15} style={{ color: 'var(--gold-primary)' }} aria-hidden="true" />
        <span lang={current.code}>{full ? current.label : current.short}</span>
        <ChevronDown size={14} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} style={{ color: 'var(--text-subtle)' }} aria-hidden="true" />
      </button>

      <AnimatePresence>
        {guiding && !open && (
          <motion.div role="status"
            initial={{ opacity: 0, y: -4, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-[calc(100%+12px)] z-50 w-[min(15rem,calc(100vw-2rem))] origin-top-right">
            {/* little pointer up to the button */}
            <span aria-hidden="true" className="absolute -top-1.5 right-6 h-3 w-3 rotate-45"
              style={{ background: 'var(--gold-primary)' }} />
            <div className="relative flex items-center gap-2 rounded-2xl py-2.5 pl-3.5 pr-2 text-white shadow-[0_14px_34px_-12px_rgba(0,0,0,0.45)]"
              style={{ background: 'var(--gold-primary)' }}>
              <button type="button" onClick={toggle} className="min-w-0 flex-1 text-left cursor-pointer">
                <span className="relative block h-5 overflow-hidden text-[13.5px] font-semibold leading-5">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span key={line} lang={GUIDE_LINES[line].code} className="block truncate"
                      initial={reduceMotion ? false : { y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={reduceMotion ? undefined : { y: -14, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}>
                      {GUIDE_LINES[line].text}
                    </motion.span>
                  </AnimatePresence>
                </span>
                <span className="mt-0.5 flex gap-1" aria-hidden="true">
                  {GUIDE_LINES.map((l, i) => (
                    <span key={l.code} className="h-1 rounded-full bg-white transition-all duration-300"
                      style={{ width: i === line ? 14 : 4, opacity: i === line ? 0.95 : 0.45 }} />
                  ))}
                </span>
              </button>
              <button type="button" onClick={endGuide} aria-label={t('common.close')}
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-white/85 hover:bg-white/15 cursor-pointer">
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
        {open && (
          <motion.div id={menuId} role="menu" aria-label={t('site.header.switchLanguage')}
            initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 top-[calc(100%+8px)] z-50 w-44 origin-top-right overflow-hidden rounded-2xl p-1.5"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', boxShadow: '0 18px 40px -18px rgba(0,0,0,0.35)' }}>
            {LANGS.map((l, i) => {
              const on = l.code === lang
              return (
                <button key={l.code} ref={(el) => { items.current[i] = el }} type="button" role="menuitemradio" aria-checked={on}
                  lang={l.code} onClick={() => pick(l.code)} onKeyDown={(e) => onItemKey(e, i)}
                  className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-[14px] font-medium outline-none transition-colors hover:bg-[var(--border-subtle)] focus-visible:bg-[var(--border-subtle)] cursor-pointer"
                  style={{ color: 'var(--text-main)' }}>
                  <span>{l.label}</span>
                  {on && <Check size={16} style={{ color: 'var(--gold-primary)' }} aria-hidden="true" />}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
