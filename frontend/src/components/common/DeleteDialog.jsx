import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion'
import { Trash2, X, Loader2, Lock } from 'lucide-react'
import PinEntry from './PinEntry'
import { useI18n } from '../../i18n/core'

const HOLD_MS = 900

/**
 * Delete confirmation for books and projects.
 *
 * - Shows what will be removed (name + counts).
 * - Press and hold to delete, so a stray tap never deletes anything.
 * - If the item is PIN-protected, the PIN is asked first and a correct PIN
 *   deletes straight away.
 *
 * Props:
 *   open, onClose
 *   kind          'book' | 'project'
 *   name          item name
 *   stats         [{ label, value }] shown as a summary row
 *   note          extra line about what happens (optional)
 *   pin           { storedHash, length, guardId } when PIN-protected (optional)
 *   onConfirm()   async; throw to show an error
 */
export default function DeleteDialog(props) {
  return createPortal(
    <AnimatePresence>{props.open && <DeleteDialogInner key="delete" {...props} />}</AnimatePresence>,
    document.body,
  )
}

function DeleteDialogInner({ onClose, kind = 'book', name, stats = [], note, pin, onConfirm }) {
  const [step, setStep] = useState(pin?.storedHash ? 'pin' : 'confirm')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const { t } = useI18n()
  const noun = kind === 'project' ? 'project' : 'book'
  // dialogs.delete.book.* / dialogs.delete.project.*
  const txt = (key) => t(`dialogs.delete.${noun}.${key}`)

  const run = async () => {
    if (deleting) return
    setDeleting(true)
    setError('')
    try {
      await onConfirm()
      onClose()
    } catch (err) {
      setError(err?.message || txt('failed'))
      setDeleting(false)
      setStep('confirm')
    }
  }

  const close = () => { if (!deleting) onClose() }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-4"
      onKeyDown={(e) => { if (e.key === 'Escape') close() }}
    >
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={close} />
      <motion.div
        role="alertdialog" aria-modal="true" aria-label={txt('aria')}
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full sm:max-w-[400px] rounded-t-3xl sm:rounded-3xl border border-[var(--border-card)] bg-[var(--bg-page)] px-5 pt-5 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.5)]"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex justify-end">
          <button type="button" onClick={close} aria-label={t('common.close')} disabled={deleting}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors disabled:opacity-40 cursor-pointer">
            <X size={15} />
          </button>
        </div>

        <div className="-mt-5 flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
            {step === 'pin' ? <Lock size={22} /> : <Trash2 size={22} />}
          </span>
          <h2 className="mt-3 text-[17px] font-semibold text-[var(--text-main)]">{txt('title')}</h2>
          <p className="mt-1 max-w-full truncate px-4 font-serif-luxury text-[18px] italic text-[var(--text-main)]">{name}</p>
        </div>

        {stats.length > 0 && (
          <div className="mt-4 grid divide-x divide-[var(--border-subtle)] rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] py-2.5"
            style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}>
            {stats.map(s => (
              <div key={s.label} className="min-w-0 px-2 text-center">
                <p className="truncate text-[14px] font-semibold tabular-nums text-[var(--text-main)]">{s.value}</p>
                <p className="truncate text-[10px] text-[var(--text-subtle)]">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        <p className="mt-3 text-center text-[12px] leading-relaxed text-[var(--text-muted)]">
          {note || txt('note')} <span className="font-medium text-rose-600 dark:text-rose-400">{t('dialogs.delete.cantUndo')}</span>
        </p>

        {error && <p className="mt-3 rounded-xl bg-rose-500/10 px-3 py-2 text-center text-[12px] text-rose-600 dark:text-rose-400">{error}</p>}

        <div className="mt-5">
          {step === 'pin' ? (
            <>
              <p className="mb-3 text-center text-[12px] font-medium text-[var(--text-subtle)]">{t('dialogs.delete.enterPin')}</p>
              <PinEntry
                guardId={pin.guardId}
                storedHash={pin.storedHash}
                length={pin.length}
                tone="danger"
                onSuccess={() => { setStep('confirm'); run() }}
              />
            </>
          ) : (
            <div className="space-y-2">
              <HoldToDelete label={txt('hold')} busy={deleting} onDone={run} />
              <button type="button" onClick={close} disabled={deleting}
                className="w-full rounded-2xl py-3 text-[14px] font-medium text-[var(--text-muted)] hover:bg-[var(--border-subtle)] hover:text-[var(--text-main)] transition-colors disabled:opacity-40 cursor-pointer">
                {t('common.cancel')}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

/** Press-and-hold button: a fill sweeps across; releasing early cancels. */
function HoldToDelete({ label, busy, onDone }) {
  const controls = useAnimationControls()
  const timer = useRef(null)
  const [holding, setHolding] = useState(false)
  const { t } = useI18n()

  useEffect(() => () => clearTimeout(timer.current), [])

  const start = () => {
    if (busy) return
    setHolding(true)
    controls.start({ scaleX: 1, transition: { duration: HOLD_MS / 1000, ease: 'linear' } })
    timer.current = setTimeout(() => {
      setHolding(false)
      navigator.vibrate?.(30)
      onDone()
    }, HOLD_MS)
  }
  const cancel = () => {
    if (!holding) return
    clearTimeout(timer.current)
    setHolding(false)
    controls.start({ scaleX: 0, transition: { duration: 0.2 } })
  }

  return (
    <button
      type="button"
      disabled={busy}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); start() } }}
      onKeyUp={(e) => { if (e.key === 'Enter' || e.key === ' ') cancel() }}
      className="relative w-full overflow-hidden rounded-2xl bg-rose-600/90 py-3.5 text-[14px] font-semibold text-white shadow-lg shadow-rose-900/20 transition-transform active:scale-[0.99] disabled:opacity-80 cursor-pointer select-none"
      style={{ touchAction: 'none' }}
    >
      <motion.span
        aria-hidden initial={{ scaleX: 0 }} animate={controls}
        className="absolute inset-0 origin-left bg-rose-700"
      />
      <span className="relative flex items-center justify-center gap-2">
        {busy ? <><Loader2 size={15} className="animate-spin" /> {t('common.deleting')}</> : <><Trash2 size={15} /> {holding ? t('dialogs.delete.keepHolding') : label}</>}
      </span>
    </button>
  )
}
