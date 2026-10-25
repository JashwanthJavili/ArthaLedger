import { useEffect, useId, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronDown, Languages } from 'lucide-react'
import { useI18n, LANGS } from '../../i18n/core'
import useChangeLanguage from '../../hooks/useChangeLanguage'

/**
 * Language dropdown for page headers (website, home, analytics). Shows the
 * current language (`full` name on the website, short "Eng" / "తెలుగు" in the
 * app); the menu lists each language in its own script. Closes on
 * outside tap or Escape, and the arrow keys move between options.
 */
export default function LanguageMenu({ full = false, size = 'md', className = '' }) {
  const sizes = { sm: 'h-9 px-2.5 text-[13px]', md: 'h-10 px-3 text-[13px]' }
  const { lang, t } = useI18n()
  const changeLanguage = useChangeLanguage()
  const [open, setOpen] = useState(false)
  const wrap = useRef(null)
  const items = useRef([])
  const menuId = useId()
  const current = LANGS.find((l) => l.code === lang) || LANGS[0]

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

  const pick = (code) => { setOpen(false); changeLanguage(code) }
  const onItemKey = (e, i) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const next = (i + (e.key === 'ArrowDown' ? 1 : -1) + LANGS.length) % LANGS.length
    items.current[next]?.focus()
  }

  return (
    <div ref={wrap} className={`relative shrink-0 ${className}`}>
      <button type="button" onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu" aria-expanded={open} aria-controls={menuId}
        aria-label={`${t('site.header.switchLanguage')}: ${current.label}`}
        className={`flex ${sizes[size] || sizes.md} items-center gap-1.5 rounded-full font-semibold transition-colors hover:border-[var(--gold-primary)] cursor-pointer`}
        style={{ color: 'var(--text-main)', border: '1px solid var(--border-card)', background: 'var(--bg-card)' }}>
        <Languages size={size === 'sm' ? 14 : 15} style={{ color: 'var(--gold-primary)' }} aria-hidden="true" />
        <span lang={current.code}>{full ? current.label : current.short}</span>
        <ChevronDown size={14} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} style={{ color: 'var(--text-subtle)' }} aria-hidden="true" />
      </button>

      <AnimatePresence>
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
