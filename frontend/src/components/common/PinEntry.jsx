import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { verifyPin } from '../../lib/pin'
import { FREE_ATTEMPTS, clearGuard, readGuard, recordFailure } from '../../lib/pinGuard'
import PinPad from './PinPad'
import { useI18n } from '../../i18n/core'

/**
 * Verifies a PIN against `storedHash` with persistent attempt limiting.
 *
 * Props:
 *   guardId     id used for attempt tracking (book / project id)
 *   storedHash  hash to verify against
 *   length      the PIN's digit count (4 or 6). Older PINs saved before the
 *               length was recorded have none: then 4 digits are checked
 *               silently and, if wrong, entry continues to 6 — one attempt.
 *   onSuccess   (pin, length) => void
 *   tone        passed to PinPad
 */
export default function PinEntry({ guardId, storedHash, length: knownLength, onSuccess, tone }) {
  const { user } = useAuth()
  const { t } = useI18n()
  const uid = user?.uid
  const length = knownLength === 4 || knownLength === 6 ? knownLength : 6
  const lengthUnknown = !(knownLength === 4 || knownLength === 6)

  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(true)
  const [shake, setShake] = useState(0)
  const [message, setMessage] = useState('')
  const [lockedUntil, setLockedUntil] = useState(0)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let alive = true
    readGuard(uid, guardId).then((g) => {
      if (!alive) return
      setLockedUntil(g.lockedUntil)
      setBusy(false)
    })
    return () => { alive = false }
  }, [uid, guardId])

  const remainingSecs = Math.max(0, Math.ceil((lockedUntil - now) / 1000))
  const locked = remainingSecs > 0

  useEffect(() => {
    if (!lockedUntil) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [lockedUntil])

  const succeed = async (value) => {
    await clearGuard(uid, guardId)
    onSuccess(value, value.length)
  }

  const submit = async (value) => {
    if (busy || locked) return
    setBusy(true)
    setMessage('')
    try {
      // Re-check the persisted lockout right before verifying (another tab may have set it)
      const g = await readGuard(uid, guardId)
      if (g.lockedUntil > Date.now()) {
        setLockedUntil(g.lockedUntil)
        setNow(Date.now())
        setPin('')
        return
      }
      if (await verifyPin(value, storedHash)) { await succeed(value); return }

      const next = await recordFailure(uid, guardId)
      setShake((n) => n + 1)
      setPin('')
      if (next.lockedUntil) {
        setLockedUntil(next.lockedUntil)
        setNow(Date.now())
      } else {
        const left = FREE_ATTEMPTS - next.failures
        setMessage(t('pin.entry.wrongPin', { count: left }))
      }
    } catch {
      setMessage(t('pin.entry.error'))
      setPin('')
    } finally {
      setBusy(false)
    }
  }

  const handleChange = async (v) => {
    setPin(v)
    if (message) setMessage('')
    // Older PIN with unknown length: quietly check the 4-digit form first.
    if (lengthUnknown && v.length === 4 && !busy && !locked) {
      try {
        if (await verifyPin(v, storedHash)) await succeed(v)
      } catch { /* fall through to 6-digit entry */ }
    }
  }

  return (
    <div>
      <PinPad
        length={length}
        value={pin}
        onChange={handleChange}
        onComplete={submit}
        disabled={busy || locked}
        shakeKey={shake}
        tone={tone}
      />

      <div className="mt-3 min-h-[36px] text-center" aria-live="polite">
        {locked ? (
          <p className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
            <Clock size={13} /> {t('pin.entry.locked', { minutes: Math.floor(remainingSecs / 60), seconds: String(remainingSecs % 60).padStart(2, '0') })}
          </p>
        ) : message ? (
          <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{message}</p>
        ) : busy && pin.length === length ? (
          <p className="text-xs text-[var(--text-subtle)]">{t('pin.entry.checking')}</p>
        ) : null}
      </div>
    </div>
  )
}
