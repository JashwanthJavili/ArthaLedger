import { useState, useRef, useEffect } from 'react'
import { Lock, X, Eye, EyeOff, KeyRound, ShieldAlert, Clock } from 'lucide-react'
import { verifyPin, validatePin, getPinAttemptData, recordPinAttempt, clearPinAttempts } from '../../lib/pin'
import { useAuth } from '../../context/AuthContext'
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth'
import { auth } from '../../lib/firebase'
import PinInput from './PinInput'
import PinLengthSelector from './PinLengthSelector'

/**
 * PIN entry modal with progressive rate limiting.
 *
 * Attempt thresholds:
 *   3 wrong  → 1 minute lockout
 *   6 wrong  → 5 minutes lockout
 *   9+ wrong → 15 minutes lockout
 *
 * After 3 wrong attempts, "Forgot PIN?" link appears.
 *
 * "Forgot PIN" flow: user enters account password → identity verified → PIN removed.
 *
 * Props:
 *   open, onClose, onUnlock, storedHash, itemName
 *   onRemovePin() — clears PIN from Firebase after identity verified
 */

// Lockout durations in seconds
function getLockoutSeconds(totalAttempts) {
  if (totalAttempts >= 9) return 15 * 60
  if (totalAttempts >= 6) return 5 * 60
  if (totalAttempts >= 3) return 1 * 60
  return 0
}

export default function PinModal({ open, onClose, onUnlock, storedHash, itemName, onRemovePin }) {
  const { user } = useAuth()
  const [mode, setMode] = useState('pin')   // 'pin' | 'forgot'
  const [pin, setPin] = useState('')
  const [pinLength, setPinLength] = useState(4)
  const [accountPw, setAccountPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [pinRemoved, setPinRemoved] = useState(false)

  // Rate limiting state — PERSISTED in sessionStorage
  const [attempts, setAttempts] = useState(0)
  const [lockedUntil, setLockedUntil] = useState(0)   // timestamp ms
  const [countdown, setCountdown] = useState(0)        // seconds remaining

  const timerRef = useRef(null)
  const itemIdRef = useRef(itemName) // Stable ref for rate limiting key

  // Load lockout state from sessionStorage on mount
  useEffect(() => {
    if (open && itemName) {
      const data = getPinAttemptData(itemName)
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
      setMode('pin')
      setPin('')
      setPinLength(4)
      setAccountPw('')
      setError('')
      setPinRemoved(false)
      setShowPw(false)
      clearInterval(timerRef.current)
      // Load current lockout state (already done in separate effect above)
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

  // ── Enter PIN ──────────────────────────────────────────────────────────────
  const handlePinSubmit = async (pinValue) => {
    if (isLocked) return
    const pinToVerify = typeof pinValue === 'string' ? pinValue : pin
    
    const validation = validatePin(pinToVerify)
    if (!validation.valid) {
      setError('Incorrect PIN.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const ok = await verifyPin(pinToVerify, storedHash)
      if (ok) {
        // ✅ Success: Clear attempts and unlock
        clearPinAttempts(itemName)
        setAttempts(0)
        setLockedUntil(0)
        setCountdown(0)
        onUnlock()
        onClose()
      } else {
        // ❌ Wrong PIN: Record attempt and check if locked
        const result = recordPinAttempt(itemName)
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
        }
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Auto-submit when all digits are entered
  const handlePinChange = (newPin) => {
    setPin(newPin)
    setError('')
    if (newPin.length === pinLength && !loading && !isLocked) {
      handlePinSubmit(newPin)
    }
  }

  // ── Forgot PIN — verify account password ───────────────────────────────────
  const handleForgotSubmit = async (e) => {
    e.preventDefault()
    if (!accountPw) { setError('Enter your account password.'); return }
    setLoading(true)
    setError('')
    try {
      const credential = EmailAuthProvider.credential(user.email, accountPw)
      await reauthenticateWithCredential(auth.currentUser, credential)
      await onRemovePin()
      // Clear lockout state when PIN is removed
      clearPinAttempts(itemName)
      setAttempts(0)
      setLockedUntil(0)
      setCountdown(0)
      setPinRemoved(true)
    } catch (err) {
      const code = err?.code || ''
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Incorrect account password. Please try again.')
      } else if (code === 'auth/too-many-requests') {
        setError('Too many attempts. Please wait a moment.')
      } else {
        setError('Verification failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const isPasswordUser = user?.providerData?.some(p => p.providerId === 'password')
  const showForgotLink = attempts >= 3 && !isLocked

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xs rounded-3xl bg-white p-6 shadow-2xl">
        <button onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-1.5 text-stone-400 hover:bg-stone-100 transition-colors">
          <X size={15} />
        </button>

        {/* ── PIN removed success ── */}
        {pinRemoved ? (
          <div className="flex flex-col items-center text-center gap-3 py-2">
            <div className="rounded-2xl bg-emerald-100 p-4">
              <ShieldAlert size={24} className="text-emerald-600" />
            </div>
            <div>
              <p className="font-serif text-base font-semibold text-stone-800">PIN Removed</p>
              <p className="mt-1 text-xs text-stone-400 leading-relaxed">
                PIN lock removed. You can set a new PIN from inside the book.
              </p>
            </div>
            <button onClick={onClose}
              className="w-full rounded-xl bg-amber-600 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 transition-colors">
              Done
            </button>
          </div>

        ) : mode === 'pin' ? (
          <>
            {/* ── Enter PIN ── */}
            <div className="flex flex-col items-center text-center gap-3 mb-5">
              <div className={`rounded-2xl p-4 ${isLocked ? 'bg-red-100' : 'bg-amber-100'}`}>
                {isLocked
                  ? <Clock size={24} className="text-red-600" />
                  : <Lock size={24} className="text-amber-700" />
                }
              </div>
              <div>
                <h3 className="font-serif text-lg font-semibold text-stone-800">
                  {isLocked ? 'Too Many Attempts' : 'PIN Protected'}
                </h3>
                <p className="mt-1 text-xs text-stone-400">
                  {isLocked
                    ? `Locked for ${formatCountdown(countdown)}`
                    : <><span className="font-medium text-stone-600">"{itemName}"</span> is locked.</>
                  }
                </p>
              </div>
            </div>

            {isLocked ? (
              /* Lockout screen */
              <div className="space-y-3">
                <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-center">
                  <p className="text-sm font-semibold text-red-700">{formatCountdown(countdown)}</p>
                  <p className="text-xs text-red-500 mt-0.5">remaining</p>
                </div>
                {isPasswordUser && (
                  <button type="button"
                    onClick={() => { setMode('forgot'); setError('') }}
                    className="w-full rounded-xl border border-amber-200 bg-amber-50 py-2.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors">
                    Forgot PIN? Verify with account password
                  </button>
                )}
              </div>
            ) : (
              <form onSubmit={e => { e.preventDefault(); handlePinSubmit(pin) }} className="space-y-4" autoComplete="off">
                {/* Hidden fields to prevent Chrome from treating this as a login form */}
                <input type="text" name="username" style={{ display: 'none' }} readOnly tabIndex={-1} />
                <input type="text" name="fakepassword" style={{ display: 'none' }} readOnly tabIndex={-1} />

                <PinLengthSelector value={pinLength} onChange={(len) => {
                  setPinLength(len)
                  setPin('')
                  setError('')
                }} />

                <PinInput
                  length={pinLength}
                  value={pin}
                  onChange={handlePinChange}
                  autoFocus
                />

                {error && (
                  <p className="rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-600 text-center">
                    {error}
                  </p>
                )}

                <button type="submit" disabled={loading || pin.length < pinLength}
                  className="w-full rounded-2xl bg-amber-600 py-3 text-sm font-semibold text-white hover:bg-amber-700 transition-colors disabled:opacity-60">
                  {loading ? 'Verifying...' : 'Unlock'}
                </button>

                {showForgotLink && isPasswordUser && (
                  <button type="button"
                    onClick={() => { setMode('forgot'); setError('') }}
                    className="w-full text-xs text-amber-600 hover:text-amber-800 font-medium transition-colors py-1">
                    Forgot PIN? Verify with account password →
                  </button>
                )}
              </form>
            )}
          </>

        ) : (
          <>
            {/* ── Forgot PIN — verify account password ── */}
            <div className="flex flex-col items-center text-center gap-3 mb-5">
              <div className="rounded-2xl bg-blue-100 p-4">
                <KeyRound size={24} className="text-blue-600" />
              </div>
              <div>
                <h3 className="font-serif text-base font-semibold text-stone-800">Verify Identity</h3>
                <p className="mt-1 text-xs text-stone-400 leading-relaxed">
                  Enter your account password to remove the PIN lock.
                </p>
              </div>
            </div>

            <form onSubmit={handleForgotSubmit} className="space-y-3">
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={accountPw}
                  onChange={e => { setAccountPw(e.target.value); setError('') }}
                  placeholder="Account password"
                  autoFocus
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 pr-10 text-sm text-stone-800 placeholder-stone-400 focus:border-amber-300 focus:bg-white transition-colors"
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400">
                  {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>

              {error && (
                <p className="rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-600 text-center">
                  {error}
                </p>
              )}

              <button type="submit" disabled={loading || !accountPw}
                className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-60">
                {loading ? 'Verifying...' : 'Remove PIN Lock'}
              </button>

              <button type="button" onClick={() => { setMode('pin'); setError('') }}
                className="w-full text-xs text-stone-400 hover:text-stone-600 transition-colors py-1">
                ← Back to PIN entry
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

