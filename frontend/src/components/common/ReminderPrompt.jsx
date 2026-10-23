import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, Check, Loader2, AlertTriangle, Target, Sunrise, Sun, Sunset, Moon } from 'lucide-react'
import { enableDailyReminder, getDailyReminderSettings, setBudgetAlertsEnabled, DEFAULT_REMINDER_TIMES } from '../../lib/notifications'

const STORE_KEY = 'al_reminder_prompt'
const SESSION_KEY = 'al_reminder_prompt_shown'
// Shows just after the launch screen has faded
const SHOW_DELAY_MS = 2000
const SLOTS = [
  { key: 'morning', label: 'Morning', hint: 'Plan the day’s spends', Icon: Sunrise },
  { key: 'afternoon', label: 'Afternoon', hint: 'Quick lunch-time check', Icon: Sun },
  { key: 'evening', label: 'Evening', hint: 'Wrap up the day', Icon: Sunset },
  { key: 'night', label: 'Night', hint: 'Log it before bed', Icon: Moon },
]

const fmt12 = (t) => {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

function neverAsk() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}')?.never === true } catch { return false }
}
function setNeverAsk() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify({ never: true })) } catch { /* ignore */ }
}
function markShownThisOpen() {
  try { sessionStorage.setItem(SESSION_KEY, '1') } catch { /* ignore */ }
}
function shownThisOpen() {
  try { return sessionStorage.getItem(SESSION_KEY) === '1' } catch { return false }
}

/**
 * Ask each time the app is opened while notifications are off on this
 * device (not allowed yet, or reminders switched off), until they are on or
 * the user says "Don't ask again". Android can't show its permission dialog
 * once it has been blocked, so a blocked device isn't asked.
 */
function shouldAsk() {
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) return false
  if (Notification.permission === 'denied') return false
  if (Notification.permission === 'granted' && getDailyReminderSettings().enabled) return false
  return !neverAsk() && !shownThisOpen()
}

/**
 * Native-style ask on Home, once per app open while notifications are off: pick a reminder time and turn it on.
 * Tapping "Turn on" shows Android's own permission dialog, saves the
 * reminder, registers the device and confirms with the server.
 */
export default function ReminderPrompt() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // Re-check after a moment: settings synced from the cloud may say it's already on
    const t = setTimeout(() => { if (shouldAsk()) { markShownThisOpen(); setOpen(true) } }, SHOW_DELAY_MS)
    return () => clearTimeout(t)
  }, [])

  const close = () => setOpen(false)
  const dontAsk = () => { setNeverAsk(); setOpen(false) }

  return createPortal(
    <AnimatePresence>{open && <PromptSheet key="reminder-prompt" onClose={close} onNever={dontAsk} />}</AnimatePresence>,
    document.body,
  )
}

function PromptSheet({ onClose, onNever }) {
  const [slots, setSlots] = useState(() => SLOTS.map((sl, i) => ({ ...sl, time: DEFAULT_REMINDER_TIMES[i], on: true })))
  const [alerts, setAlerts] = useState(true)
  const chosen = slots.filter(sl => sl.on).map(sl => sl.time).sort()
  const update = (key, patch) => setSlots(list => list.map(sl => (sl.key === key ? { ...sl, ...patch } : sl)))
  const [step, setStep] = useState('ask') // ask | working | done | error
  const [next, setNext] = useState('')
  const [error, setError] = useState(null)

  const turnOn = async () => {
    setStep('working')
    try {
      const { status } = await enableDailyReminder(chosen)
      setBudgetAlertsEnabled(alerts)
      setNext(status?.next_reminder || chosen.map(fmt12).join(', '))
      setStep('done')
    } catch (err) {
      setError({ message: err?.message || 'Something went wrong.', code: err?.code })
      setStep('error')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[65] flex items-end sm:items-center justify-center sm:p-4"
    >
      <div className="absolute inset-0 bg-black/50" onClick={step === 'working' ? undefined : onClose} />
      <motion.div
        role="dialog" aria-modal="true" aria-label="Daily reminders"
        initial={{ y: 48, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 48, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative max-h-[92vh] w-full overflow-y-auto sm:max-w-[420px] rounded-t-3xl sm:rounded-3xl border border-[var(--border-card)] bg-[var(--bg-page)] px-5 pt-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.5)]"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {step === 'done' ? (
            <motion.div key="done" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center text-center">
              <motion.span
                initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
              >
                <Check size={30} strokeWidth={2.6} />
              </motion.span>
              <h2 className="mt-4 text-[18px] font-semibold text-[var(--text-main)]">You’re all set</h2>
              <p className="mt-1 text-[13px] text-[var(--text-muted)]">Next reminder · <span className="font-semibold text-[var(--text-main)]">{next}</span></p>
              <p className="mt-1 text-[12px] text-[var(--text-subtle)]">It arrives even when ArthaLedger is closed.</p>
              <button type="button" onClick={onClose}
                className="mt-6 w-full rounded-2xl bg-[var(--gold-primary)] py-3.5 text-[14px] font-semibold text-white hover:bg-[var(--gold-hover)] transition-colors cursor-pointer">
                Done
              </button>
            </motion.div>
          ) : step === 'error' ? (
            <motion.div key="error" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <AlertTriangle size={24} />
              </span>
              <h2 className="mt-4 text-[17px] font-semibold text-[var(--text-main)]">
                {error?.code === 'blocked' ? 'Notifications are blocked' : 'Couldn’t turn on reminders'}
              </h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--text-muted)]">{error?.message}</p>
              <div className="mt-6 grid w-full grid-cols-2 gap-2">
                <button type="button" onClick={onClose}
                  className="rounded-2xl border border-[var(--border-card)] py-3 text-[14px] font-medium text-[var(--text-main)] hover:bg-[var(--border-subtle)] transition-colors cursor-pointer">
                  Close
                </button>
                <button type="button" onClick={() => setStep('ask')} disabled={error?.code === 'blocked' || error?.code === 'unsupported'}
                  className="rounded-2xl bg-[var(--gold-primary)] py-3 text-[14px] font-semibold text-white hover:bg-[var(--gold-hover)] disabled:opacity-40 transition-colors cursor-pointer">
                  Try again
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="ask" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="flex flex-col items-center text-center">
                <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[var(--gold-light)] text-[var(--gold-primary)]">
                  <motion.span
                    aria-hidden className="absolute inset-0 rounded-full border border-[var(--gold-primary)]"
                    initial={{ scale: 1, opacity: 0.5 }} animate={{ scale: 1.35, opacity: 0 }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                  />
                  <motion.span animate={{ rotate: [0, -12, 10, -6, 0] }} transition={{ duration: 0.9, delay: 0.4 }}>
                    <Bell size={26} />
                  </motion.span>
                </span>
                <h2 className="mt-4 font-serif-luxury text-[22px] font-semibold text-[var(--text-main)]">Never miss a day</h2>
                <p className="mt-1 max-w-[290px] text-[13px] leading-relaxed text-[var(--text-muted)]">
                  Four friendly nudges a day, even when the app is closed. Change them anytime.
                </p>
              </div>

              {/* Four daily nudges, each can be switched off or moved */}
              <div className="mt-5 divide-y divide-[var(--border-subtle)] rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)]">
                {slots.map(sl => (
                  <div key={sl.key} className="flex items-center gap-3 px-3.5 py-2.5">
                    <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors ${
                      sl.on ? 'bg-[var(--gold-light)] text-[var(--gold-primary)]' : 'bg-[var(--border-subtle)] text-[var(--text-subtle)]'
                    }`}>
                      <sl.Icon size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-[13px] font-medium ${sl.on ? 'text-[var(--text-main)]' : 'text-[var(--text-subtle)]'}`}>{sl.label}</span>
                      <span className="block truncate text-[11px] text-[var(--text-subtle)]">{sl.hint}</span>
                    </span>
                    {/* Tap the time to change it with the phone's clock picker */}
                    <label className={`relative flex-shrink-0 rounded-lg border px-2 py-1 text-[12px] font-semibold tabular-nums cursor-pointer ${
                      sl.on ? 'border-[var(--border-card)] text-[var(--text-main)]' : 'border-transparent text-[var(--text-subtle)]'
                    }`}>
                      {fmt12(sl.time)}
                      <input type="time" value={sl.time} aria-label={`${sl.label} reminder time`} disabled={!sl.on}
                        onChange={(e) => { if (e.target.value) update(sl.key, { time: e.target.value }) }}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
                    </label>
                    <button type="button" role="switch" aria-checked={sl.on} aria-label={`${sl.label} reminder`}
                      onClick={() => update(sl.key, { on: !sl.on })}
                      className={`relative h-6 w-10 flex-shrink-0 rounded-full transition-colors cursor-pointer ${sl.on ? 'bg-[var(--gold-primary)]' : 'bg-[var(--border-card)]'}`}>
                      <motion.span initial={false} animate={{ x: sl.on ? 16 : 0 }} transition={{ type: 'spring', stiffness: 600, damping: 35 }}
                        className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Budget alerts */}
              <button type="button" role="switch" aria-checked={alerts} onClick={() => setAlerts(v => !v)}
                className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] px-3.5 py-3 text-left cursor-pointer">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--gold-light)] text-[var(--gold-primary)]">
                  <Target size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium text-[var(--text-main)]">Budget alerts too</span>
                  <span className="block truncate text-[11px] text-[var(--text-subtle)]">When a category reaches 80% or 100%</span>
                </span>
                <span className={`relative h-6 w-10 flex-shrink-0 rounded-full transition-colors ${alerts ? 'bg-[var(--gold-primary)]' : 'bg-[var(--border-card)]'}`}>
                  <motion.span initial={false} animate={{ x: alerts ? 16 : 0 }} transition={{ type: 'spring', stiffness: 600, damping: 35 }}
                    className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow" />
                </span>
              </button>

              <button type="button" onClick={turnOn} disabled={step === 'working' || chosen.length === 0}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--gold-primary)] py-3.5 text-[14px] font-semibold text-white hover:bg-[var(--gold-hover)] disabled:opacity-80 transition-colors cursor-pointer">
                {step === 'working'
                  ? <><Loader2 size={16} className="animate-spin" /> Turning on…</>
                  : chosen.length ? `Turn on ${chosen.length} daily reminder${chosen.length === 1 ? '' : 's'}` : 'Pick at least one'}
              </button>
              <button type="button" onClick={onClose} disabled={step === 'working'}
                className="mt-1 w-full rounded-2xl py-3 text-[13px] font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-40 transition-colors cursor-pointer">
                Not now
              </button>
              <p className="text-center text-[11px] text-[var(--text-subtle)]">
                You can change this anytime in Settings.{' '}
                <button type="button" onClick={onNever} disabled={step === 'working'}
                  className="font-medium text-[var(--text-muted)] underline underline-offset-2 hover:text-[var(--text-main)] cursor-pointer">
                  Don’t ask again
                </button>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
