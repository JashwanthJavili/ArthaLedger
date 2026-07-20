import { useState, useEffect, useRef } from 'react'
import { ShieldAlert, X, Clock } from 'lucide-react'
import { verifyPin, validatePin, getPinAttemptData, recordPinAttempt, clearPinAttempts } from '../../lib/pin'
import PinInput from './PinInput'
import PinLengthSelector from './PinLengthSelector'

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
  const [pinLength, setPinLength] = useState(4)
  const [error, setError] = useState('')
  const [verifying, setVerifying] = useState(false)

  // Rate limiting (persisted)
  const [attempts, setAttempts] = useState(0)
  const [lockedUntil, setLockedUntil] = useState(0)
  const [countdown, setCountdown] = useState(0)

  const timerRef = useRef(null)

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
      setVerifying(false)
      clearInterval(timerRef.current)
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

  const handleVerify = async (pinValue) => {
    if (isLocked) return
    const pinToVerify = typeof pinValue === 'string' ? pinValue : pin
    setError('')

    const validation = validatePin(pinToVerify)
    if (!validation.valid) {
      setError('Incorrect PIN.')
      return
    }

    setVerifying(true)
    try {
      const isValid = await verifyPin(pinToVerify, storedHash)
      if (isValid) {
        // ✅ Success
        clearPinAttempts(`deletion_${itemName}`)
        setAttempts(0)
        setLockedUntil(0)
        setCountdown(0)
        onVerified(pinToVerify)
        onClose()
      } else {
        // ❌ Wrong PIN: Record attempt and check if locked
        const result = recordPinAttempt(`deletion_${itemName}`)
        setAttempts(result.newAttempts)

        if (result.lockedUntil > 0) {
          setLockedUntil(result.lockedUntil)
          setError(`Incorrect PIN. Too many attempts. Try again in ${formatCountdown(result.lockoutSeconds)}.`)
        } else {
          const attemptsUntilLockout = result.newAttempts < 3
            ? 3 - result.newAttempts
            : result.newAttempts < 6
              ? 6 - result.newAttempts
              : 9 - result.newAttempts
          const chanceWord = attemptsUntilLockout === 1 ? 'chance' : 'chances'
          setError(`Incorrect PIN. ${attemptsUntilLockout} ${chanceWord} left before lockout.`)
          setPin('')
        }
      }
    } catch (err) {
      setError('Verification failed. Please try again.')
    } finally {
      setVerifying(false)
    }
  }

  // Auto-submit when all digits entered
  const handlePinChange = (val) => {
    setPin(val)
    setError('')
    if (val.length === pinLength && !verifying && !isLocked) {
      handleVerify(val)
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
          <form onSubmit={e => { e.preventDefault(); handleVerify(pin) }} className="space-y-4" autoComplete="off">
            <input type="text" name="username" style={{ display: 'none' }} readOnly tabIndex={-1} />
            <input type="text" name="fakepassword" style={{ display: 'none' }} readOnly tabIndex={-1} />

            {/* PIN length selector */}
            <div className="space-y-2">
              <label className="block text-[11px] font-medium text-stone-500 text-center">
                PIN length
              </label>
              <PinLengthSelector value={pinLength} onChange={(len) => {
                setPinLength(len)
                setPin('')
                setError('')
              }} />
            </div>

            <PinInput
              length={pinLength}
              value={pin}
              onChange={handlePinChange}
              autoFocus
            />

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-600 text-center">
                {error}
              </div>
            )}

            <div className="flex gap-2 pt-1">
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
                disabled={verifying || isLocked || pin.length < pinLength}
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
