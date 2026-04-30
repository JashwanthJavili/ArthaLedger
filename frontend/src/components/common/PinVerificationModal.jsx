import { useState, useEffect, useRef } from 'react'
import { ShieldAlert, X, Eye, EyeOff, Clock } from 'lucide-react'
import { verifyPin, validatePin, getPinAttemptData, recordPinAttempt, clearPinAttempts } from '../../lib/pin'

/**
 * PIN verification modal for deletion.
 * 
 * Shows when user tries to delete a PIN-protected book or project.
 * Props:
 *   open, onClose
 *   storedHash - the PIN hash to verify against
 *   onVerified(pin) - called on successful PIN verification
 *   itemType - 'book' or 'project' for display text
 *   itemName - name of the item being deleted
 */
export default function PinVerificationModal({ open, onClose, storedHash, onVerified, itemType = 'book', itemName = '' }) {
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [error, setError] = useState('')
  const [verifying, setVerifying] = useState(false)

  // Rate limiting (persisted)
  const [attempts, setAttempts] = useState(0)
  const [lockedUntil, setLockedUntil] = useState(0)
  const [countdown, setCountdown] = useState(0)

  const inputRef = useRef(null)
  const timerRef = useRef(null)
  const itemIdRef = useRef(`deletion_${itemName}`)

  // Load lockout state from sessionStorage
  useEffect(() => {
    if (open && itemName) {
      const data = getPinAttemptData(`deletion_${itemName}`)
      setAttempts(data.attempts)
      setLockedUntil(data.lockedUntil)
    }
  }, [open, itemName])

  // Countdown ticker
  useEffect(() => {
    if (lockedUntil <= 0) return
    const tick = () => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000)
      if (remaining <= 0) {
        setCountdown(0)
        setLockedUntil(0)
        clearInterval(timerRef.current)
        setTimeout(() => inputRef.current?.focus(), 50)
      } else {
        setCountdown(remaining)
      }
    }
    tick()
    timerRef.current = setInterval(tick, 1000)
    return () => clearInterval(timerRef.current)
  }, [lockedUntil])

  useEffect(() => {
    if (open) {
      setPin('')
      setError('')
      setShowPin(false)
      setVerifying(false)
      clearInterval(timerRef.current)
      setTimeout(() => inputRef.current?.focus(), 80)
    } else {
      clearInterval(timerRef.current)
    }
  }, [open])

  if (!open) return null

  const isLocked = countdown > 0

  const formatCountdown = (secs) => {
    if (secs >= 60) return `${Math.ceil(secs / 60)} min`
    return `${secs}s`
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    if (isLocked) return
    setError('')

    const validation = validatePin(pin)
    if (!validation.valid) {
      setError('Incorrect PIN.')
      return
    }

    setVerifying(true)
    try {
      const isValid = await verifyPin(pin, storedHash)
      if (isValid) {
        // ✅ Success
        clearPinAttempts(`deletion_${itemName}`)
        setAttempts(0)
        setLockedUntil(0)
        setCountdown(0)
        onVerified(pin)
        onClose()
      } else {
        // ❌ Wrong PIN: Record attempt and check if locked
        const result = recordPinAttempt(`deletion_${itemName}`)
        setAttempts(result.newAttempts)

        if (result.lockedUntil > 0) {
          // Locked now
          setLockedUntil(result.lockedUntil)
          setError(`Incorrect PIN. Too many attempts. Try again in ${formatCountdown(result.lockoutSeconds)}.`)
        } else {
          // Still has attempts left
          const attemptsUntilLockout = result.newAttempts < 3
            ? 3 - result.newAttempts
            : result.newAttempts < 6
              ? 6 - result.newAttempts
              : 9 - result.newAttempts
          const chanceWord = attemptsUntilLockout === 1 ? 'chance' : 'chances'
          setError(`Incorrect PIN. ${attemptsUntilLockout} ${chanceWord} left before lockout.`)
          setPin('')
          inputRef.current?.focus()
        }
      }
    } catch (err) {
      setError('Verification failed. Please try again.')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xs rounded-3xl bg-white p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-1.5 text-stone-400 hover:bg-stone-100 transition-colors"
        >
          <X size={15} />
        </button>

        <div className="flex flex-col items-center text-center gap-3 mb-5">
          <div className="rounded-2xl bg-red-100 p-4">
            {isLocked
              ? <Clock size={24} className="text-red-600" />
              : <ShieldAlert size={24} className="text-red-600" />
            }
          </div>
          <div>
            <h3 className="font-serif text-lg font-semibold text-stone-800">
              {isLocked ? 'Too Many Attempts' : 'Delete Requires PIN'}
            </h3>
            <p className="mt-2 text-xs text-stone-500 leading-relaxed">
              {isLocked
                ? `Too many attempts. Try again in ${formatCountdown(countdown)}.`
                : `This ${itemType} is PIN-protected. Enter the PIN to continue deleting${itemName ? ` "${itemName}"` : ''}.`
              }
            </p>
          </div>
        </div>

        {isLocked ? (
          <div className="space-y-3">
            <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-center">
              <p className="text-sm font-semibold text-red-700">{formatCountdown(countdown)}</p>
              <p className="text-xs text-red-500 mt-0.5">remaining</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-stone-600 hover:bg-stone-50 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
        <form onSubmit={handleVerify} className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-stone-500 mb-1">
              PIN
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value)
                  setError('')
                }}
                placeholder="Enter your PIN"
                maxLength={20}
                autoFocus
                className="w-full rounded-xl border border-amber-100 bg-amber-50/40 px-3 py-2.5 pr-9 text-center text-lg font-bold tracking-widest text-stone-800 placeholder-stone-300 placeholder:text-sm placeholder:font-normal placeholder:tracking-normal focus:border-amber-300 focus:bg-white transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPin((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                {showPin ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-600 text-center">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={verifying}
              className="flex-1 rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-stone-600 hover:bg-stone-50 transition-colors disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={verifying || isLocked}
              className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-60"
            >
              {verifying ? 'Verifying...' : 'Delete'}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  )
}
