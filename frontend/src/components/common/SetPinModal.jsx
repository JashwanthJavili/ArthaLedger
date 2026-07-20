import { useState, useEffect } from 'react'
import { ShieldCheck, X, Trash2 } from 'lucide-react'
import { hashPin, verifyPin, validatePin } from '../../lib/pin'
import PinInput from './PinInput'
import PinLengthSelector from './PinLengthSelector'

/**
 * Set / change / remove PIN modal.
 *
 * Flow when hasPin === true (changing):
 *   Step 1: Verify current PIN
 *   Step 2: Enter new PIN + confirm
 *
 * Flow when hasPin === false (setting):
 *   Enter new PIN + confirm directly
 *
 * PIN rules: exactly 4 or 6 numeric digits.
 *
 * Props:
 *   open, onClose, hasPin, storedHash
 *   onSet(hash) — save new hash to Firebase
 *   onRemove()  — remove PIN from Firebase
 */
export default function SetPinModal({ open, onClose, hasPin, storedHash, onSet, onRemove }) {
  const [step, setStep] = useState('verify')  // 'verify' | 'set'
  const [currentPin, setCurrentPin] = useState('')
  const [currentPinLength, setCurrentPinLength] = useState(4)
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinLength, setPinLength] = useState(4)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setStep(hasPin ? 'verify' : 'set')
      setCurrentPin('')
      setCurrentPinLength(4)
      setNewPin('')
      setConfirmPin('')
      setPinLength(4)
      setError('')
    }
  }, [open, hasPin])

  if (!open) return null

  // ── Step 1: Verify current PIN ─────────────────────────────────────────────
  const handleVerify = async (pinValue) => {
    const pinToVerify = typeof pinValue === 'string' ? pinValue : currentPin
    const validation = validatePin(pinToVerify)
    if (!validation.valid) {
      setError('Incorrect PIN.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const ok = await verifyPin(pinToVerify, storedHash)
      if (ok) {
        setStep('set')
        setCurrentPin('')
        setError('')
      } else {
        setError('Incorrect PIN. Please try again.')
        setCurrentPin('')
      }
    } catch {
      setError('Verification failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Auto-submit verify when all digits entered
  const handleCurrentPinChange = (val) => {
    setCurrentPin(val)
    setError('')
    if (val.length === currentPinLength && !saving) {
      handleVerify(val)
    }
  }

  // ── Step 2: Set new PIN ────────────────────────────────────────────────────
  const handleSet = async (e) => {
    e.preventDefault()
    setError('')

    const validation = validatePin(newPin)
    if (!validation.valid) {
      setError(validation.error)
      return
    }

    if (newPin !== confirmPin) { setError('PINs do not match.'); return }
    if (hasPin && newPin === currentPin) { setError('New PIN must be different from the current one.'); return }
    setSaving(true)
    try {
      const hash = await hashPin(newPin)
      await onSet(hash)
      onClose()
    } catch {
      setError('Failed to save PIN. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // ── Remove PIN ─────────────────────────────────────────────────────────────
  const handleRemove = async () => {
    setSaving(true)
    try {
      await onRemove()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  // Strength indicator for numeric PINs
  const pinStrength = pinLength === 6 ? 'strong' : 'weak'

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xs rounded-3xl bg-white p-6 shadow-2xl">
        <button onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-1.5 text-stone-400 hover:bg-stone-100 transition-colors">
          <X size={15} />
        </button>

        <div className="flex flex-col items-center text-center gap-3 mb-5">
          <div className="rounded-2xl bg-amber-100 p-4">
            <ShieldCheck size={24} className="text-amber-700" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-semibold text-stone-800">
              {!hasPin ? 'Set PIN Lock' : step === 'verify' ? 'Verify Current PIN' : 'Set New PIN'}
            </h3>
            <p className="mt-1 text-xs text-stone-400">
              {!hasPin
                ? 'Protect this book with a 4 or 6 digit PIN'
                : step === 'verify'
                  ? 'Enter your current PIN to continue'
                  : 'Choose a new PIN for this book'
              }
            </p>
          </div>
        </div>

        {/* ── Verify current PIN (only when changing) ── */}
        {hasPin && step === 'verify' ? (
          <form onSubmit={e => { e.preventDefault(); handleVerify(currentPin) }} className="space-y-4" autoComplete="off">
            <input type="text" name="username" style={{ display: 'none' }} readOnly tabIndex={-1} />
            <input type="text" name="fakepassword" style={{ display: 'none' }} readOnly tabIndex={-1} />

            <div className="space-y-2">
              <label className="block text-[11px] font-medium text-stone-500 text-center">
                Current PIN length
              </label>
              <PinLengthSelector value={currentPinLength} onChange={(len) => {
                setCurrentPinLength(len)
                setCurrentPin('')
                setError('')
              }} />
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-medium text-stone-500 text-center">
                Current PIN
              </label>
              <PinInput
                length={currentPinLength}
                value={currentPin}
                onChange={handleCurrentPinChange}
                autoFocus
              />
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-600 text-center">{error}</p>
            )}

            <button type="submit" disabled={saving || currentPin.length < currentPinLength}
              className="w-full rounded-xl bg-amber-600 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 transition-colors disabled:opacity-60">
              {saving ? 'Verifying...' : 'Continue'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSet} className="space-y-4" autoComplete="off">
            <input type="text" name="username" style={{ display: 'none' }} readOnly tabIndex={-1} />
            <input type="text" name="fakepassword" style={{ display: 'none' }} readOnly tabIndex={-1} />

            {/* PIN length selector */}
            <div className="space-y-2">
              <label className="block text-[11px] font-medium text-stone-500 text-center">
                PIN length
              </label>
              <PinLengthSelector value={pinLength} onChange={(len) => {
                setPinLength(len)
                setNewPin('')
                setConfirmPin('')
                setError('')
              }} />
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-medium text-stone-500 text-center">
                New PIN
              </label>
              <PinInput
                length={pinLength}
                value={newPin}
                onChange={val => { setNewPin(val); setError('') }}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-medium text-stone-500 text-center">
                Confirm PIN
              </label>
              <PinInput
                length={pinLength}
                value={confirmPin}
                onChange={val => { setConfirmPin(val); setError('') }}
              />
            </div>

            {/* Strength indicator */}
            {newPin.length > 0 && (
              <div className="space-y-1">
                <div className="h-1 w-full rounded-full bg-stone-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      pinStrength === 'strong' ? 'bg-emerald-500 w-full' : 'bg-yellow-400 w-1/2'
                    }`}
                  />
                </div>
                <p className={`text-[10px] text-center ${pinStrength === 'strong' ? 'text-emerald-600' : 'text-yellow-600'}`}>
                  {pinStrength === 'strong' ? '6-digit PIN — stronger' : '4-digit PIN — consider 6 digits for more security'}
                </p>
              </div>
            )}

            {error && (
              <p className="rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-600 text-center">{error}</p>
            )}

            <button type="submit" disabled={saving || newPin.length < pinLength || confirmPin.length < pinLength}
              className="w-full rounded-xl bg-amber-600 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 transition-colors disabled:opacity-60">
              {saving ? 'Saving...' : hasPin ? 'Update PIN' : 'Set PIN'}
            </button>

            {hasPin && (
              <>
                <button type="button" onClick={() => { setStep('verify'); setNewPin(''); setConfirmPin(''); setError('') }}
                  className="w-full text-xs text-stone-400 hover:text-stone-600 transition-colors py-1">
                  ← Back
                </button>

                <button type="button" onClick={handleRemove} disabled={saving}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-xs text-red-600 hover:bg-red-100 transition-colors disabled:opacity-60 mt-2">
                  <Trash2 size={12} />
                  Remove PIN
                </button>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
