import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Settings, BarChart3, ShieldCheck, Users, Bell, ShieldQuestion, MessageSquareHeart, LogOut, ChevronRight, Pencil, LayoutDashboard,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import ConfirmDialog from './ConfirmDialog'
import UserAvatar from './UserAvatar'
import FeedbackSheet from './FeedbackSheet'
import { isAdminUser } from '../../lib/admin'
import { useI18n } from '../../i18n/core'

// Text comes from settings.menu.<key> and settings.menu.<key>Hint
const SHORTCUTS = [
  { to: '/analytics', key: 'analytics', Icon: BarChart3 },
  { to: '/vault', key: 'vault', Icon: ShieldCheck },
  { to: '/trips', key: 'groups', Icon: Users },
]
const ROWS = [
  { to: '/settings', key: 'settings', Icon: Settings },
  { to: '/settings', key: 'reminders', Icon: Bell },
  { to: '/privacy', key: 'privacy', Icon: ShieldQuestion },
  { action: 'feedback', key: 'feedback', Icon: MessageSquareHeart },
]

/**
 * Profile button for the dashboard header. Tapping it opens an account card
 * with the user's details, shortcuts, settings and log out. The phone's back
 * button closes it, like a native menu.
 */
export default function AccountMenu() {
  const { user, logout } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const pushed = useRef(false)

  const name = user?.displayName || t('settings.menu.defaultName')

  useEffect(() => {
    if (!open) return
    window.history.pushState({ ...(window.history.state || {}), accountMenu: true }, '')
    pushed.current = true
    const onPop = () => { pushed.current = false; setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') close() }
    window.addEventListener('popstate', onPop)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('popstate', onPop)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  function close() {
    setOpen(false)
    if (pushed.current) { pushed.current = false; window.history.back() }
  }

  // Leave the menu's history entry in place and replace it with the new page
  function go(to) {
    pushed.current = false
    setOpen(false)
    navigate(to, { replace: true })
  }

  function askLogout() {
    close()
    setConfirmLogout(true)
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={t('settings.menu.account')} aria-haspopup="dialog" aria-expanded={open}
        className="rounded-full ring-offset-2 ring-offset-[var(--bg-page)] transition-shadow focus-visible:ring-2 focus-visible:ring-[var(--gold-primary)] cursor-pointer">
        <UserAvatar user={user} />
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label={t('settings.menu.account')}>
              <motion.div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={close}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} />

              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -6 }}
                transition={{ type: 'spring', stiffness: 520, damping: 38 }}
                style={{ transformOrigin: 'top right' }}
                className="absolute right-4 top-[max(env(safe-area-inset-top),16px)] w-[min(360px,calc(100vw-32px))] overflow-hidden rounded-[28px] border border-[var(--border-card)] bg-[var(--bg-page)] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45)]"
              >
                {/* Who's signed in */}
                <div className="relative px-5 pb-5 pt-6">
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[var(--gold-light)] to-transparent opacity-70" />
                  <div className="relative flex items-center gap-3.5">
                    <UserAvatar user={user} className="h-14 w-14 text-[17px]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-serif-luxury text-[19px] font-semibold leading-tight text-[var(--text-main)]">{name}</p>
                      {user?.email && <p className="mt-0.5 truncate text-[12px] text-[var(--text-muted)]">{user.email}</p>}
                    </div>
                  </div>
                  <button type="button" onClick={() => go('/settings')}
                    className="relative mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-[var(--border-card)] bg-[var(--bg-card)] py-2.5 text-[12.5px] font-semibold text-[var(--text-main)] active:scale-[0.98] transition-transform cursor-pointer">
                    <Pencil size={13} className="text-[var(--gold-primary)]" /> {t('settings.menu.manage')}
                  </button>
                </div>

                {/* Shortcuts */}
                <div className="grid grid-cols-3 gap-2 px-4">
                  {SHORTCUTS.map(({ to, key, Icon }) => (
                    <button key={to} type="button" onClick={() => go(to)}
                      className="flex flex-col items-center gap-1.5 rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] py-3 active:scale-[0.97] transition-transform cursor-pointer">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--gold-light)] text-[var(--gold-primary)]">
                        <Icon size={17} />
                      </span>
                      <span className="text-[11.5px] font-medium text-[var(--text-main)]">{t(`settings.menu.${key}`)}</span>
                    </button>
                  ))}
                </div>

                {/* Everything else */}
                <div className="mt-3 px-2">
                  {[...ROWS, ...(isAdminUser(user) ? [{ to: '/admin', key: 'admin', Icon: LayoutDashboard }] : [])].map(({ to, href, action, key, Icon }) => {
                    const label = t(`settings.menu.${key}`)
                    const hint = t(`settings.menu.${key}Hint`)
                    const inner = (
                      <>
                        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--border-subtle)] text-[var(--text-muted)]">
                          <Icon size={16} />
                        </span>
                        <span className="min-w-0 flex-1 text-left">
                          <span className="block text-[13.5px] font-medium text-[var(--text-main)]">{label}</span>
                          <span className="block truncate text-[11px] text-[var(--text-subtle)]">{hint}</span>
                        </span>
                        <ChevronRight size={15} className="flex-shrink-0 text-[var(--text-subtle)]" />
                      </>
                    )
                    const cls = 'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-[var(--border-subtle)] active:bg-[var(--border-subtle)] transition-colors cursor-pointer'
                    if (href) return <a key={key} href={href} onClick={close} className={cls}>{inner}</a>
                    if (action === 'feedback') return <button key={key} type="button" onClick={() => { close(); setFeedbackOpen(true) }} className={cls}>{inner}</button>
                    return <button key={key} type="button" onClick={() => go(to)} className={cls}>{inner}</button>
                  })}
                </div>

                <div className="mx-5 my-2 h-px bg-[var(--border-subtle)]" />
                <div className="px-2 pb-3">
                  <button type="button" onClick={askLogout}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 active:bg-rose-500/10 transition-colors cursor-pointer">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10"><LogOut size={16} /></span>
                    <span className="text-[13.5px] font-semibold">{t('settings.menu.logout')}</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      <FeedbackSheet open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />

      <ConfirmDialog
        open={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        onConfirm={logout}
        danger={false}
        title={t('settings.logout.title')}
        message={t('settings.logout.message')}
      />
    </>
  )
}
