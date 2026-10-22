import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, Check, Loader2, AlertTriangle, Target } from 'lucide-react'
import { enableDailyReminder, getDailyReminderSettings, setBudgetAlertsEnabled } from '../../lib/notifications'

const STORE_KEY = 'al_reminder_prompt'
const MAX_ASKS = 3
const ASK_AGAIN_MS = 3 * 24 * 60 * 60 * 1000
const SHOW_DELAY_MS = 1800
const PRESETS = ['20:00', '21:00', '22:00']

const fmt12 = (t) => {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

function readAsks() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}') || {} } catch { return {} }
}
function recordAsk() {
  const prev = readAsks()
  try { localStorage.setItem(STORE_KEY, JSON.stringify({ count: (prev.count || 0) + 1, last: Date.now() })) } catch { /* ignore */ }
}

/** Should we offer reminders on this device right now? */
function shouldAsk() {
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) return false
  if (Notification.permission === 'denied') return false
  if (getDailyReminderSettings().enabled) return false
  const { count = 0, last = 0 } = readAsks()
  return count < MAX_ASKS && Date.now() - last > ASK_AGAIN_MS
}

/**
 * One-time, native-style ask on Home: pick a reminder time and turn it on.
 * Tapping "Turn on" shows Android's own permission dialog, saves the
 * reminder, registers the device and confirms with the server.
 */
export default function ReminderPrompt() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // Re-check after a moment: settings synced from the cloud may say it's already on
    const t = setTimeout(() => { if (shouldAsk()) setOpen(true) }, SHOW_DELAY_MS)
    return () => clearTimeout(t)
  }, [])

  const close = () => { recordAsk(); setOpen(false) }

  return createPortal(
    <AnimatePresence>{open && <PromptSheet key="reminder-prompt" onClose={close} />}</AnimatePresence>,
    document.body,
  )
}

function PromptSheet({ onClose }) {
  const [time, setTime] = useState('21:00')
  const [custom, setCustom] = useState(false)
  const [alerts, setAlerts] = useState(true)
  const [step, setStep] = useState('ask') // ask | working | done | error
  const [next, setNext] = useState('')
  const [error, setError] = useState(null)

  const turnOn = async () => {
    setStep('working')
    try {
      const { status } = await enableDailyReminder([time])
      setBudgetAlertsEnabled(alerts)
      setNext(status?.next_reminder || `Today at ${fmt12(time)}`)
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
        className="relative w-full sm:max-w-[400px] rounded-t-3xl sm:rounded-3xl border border-[var(--border-card)] bg-[var(--bg-page)] px-6 pt-7 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.5)]"
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
                  A gentle nudge to log your spending, even when the app is closed.
                </p>
              </div>

              {/* Time */}
              <p className="mt-6 px-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-subtle)]">Remind me at</p>
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {PRESETS.map(t => (
                  <button key={t} type="button" onClick={() => { setTime(t); setCustom(false) }}
                    className={`rounded-xl border py-2.5 text-[12px] font-semibold tabular-nums transition-colors cursor-pointer ${
                      !custom && time === t
                        ? 'border-[var(--gold-primary)] bg-[var(--gold-light)] text-[var(--text-main)]'
                        : 'border-[var(--border-card)] bg-[var(--bg-card)] text-[var(--text-muted)]'
                    }`}>
                    {fmt12(t)}
                  </button>
                ))}
                <label className={`relative flex items-center justify-center rounded-xl border py-2.5 text-[12px] font-semibold tabular-nums transition-colors cursor-pointer ${
                  custom ? 'border-[var(--gold-primary)] bg-[var(--gold-light)] text-[var(--text-main)]' : 'border-[var(--border-card)] bg-[var(--bg-card)] text-[var(--text-muted)]'
                }`}>
                  {custom ? fmt12(time) : 'Other'}
                  {/* Native clock picker */}
                  <input type="time" value={time} aria-label="Custom reminder time"
                    onChange={(e) => { if (e.target.value) { setTime(e.target.value); setCustom(true) } }}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
                </label>
              </div>

              {/* Budget alerts */}
              <button type="button" role="switch" aria-checked={alerts} onClick={() => setAlerts(v => !v)}
                className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] px-4 py-3 text-left cursor-pointer">
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

              <button type="button" onClick={turnOn} disabled={step === 'working'}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--gold-primary)] py-3.5 text-[14px] font-semibold text-white hover:bg-[var(--gold-hover)] disabled:opacity-80 transition-colors cursor-pointer">
                {step === 'working' ? <><Loader2 size={16} className="animate-spin" /> Turning on…</> : `Remind me at ${fmt12(time)}`}
              </button>
              <button type="button" onClick={onClose} disabled={step === 'working'}
                className="mt-1 w-full rounded-2xl py-3 text-[13px] font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-40 transition-colors cursor-pointer">
                Not now
              </button>
              <p className="text-center text-[11px] text-[var(--text-subtle)]">You can change this anytime in Settings.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
