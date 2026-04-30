import { useState, useEffect } from 'react'
import { ShieldCheck, X, Eye, EyeOff, Trash2 } from 'lucide-react'
import { hashPin, verifyPin, validatePin } from '../../lib/pin'

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
 * PIN rules: min 6 characters, alphanumeric allowed.
 *
 * Props:
 *   open, onClose, hasPin, storedHash
 *   onSet(hash) — save new hash to Firebase
 *   onRemove()  — remove PIN from Firebase
 */
export default function SetPinModal({ open, onClose, hasPin, storedHash, onSet, onRemove }) {
  const [step, setStep] = useState('verify')  // 'verify' | 'set'
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setStep(hasPin ? 'verify' : 'set')
      setCurrentPin('')
      setNewPin('')
      setConfirmPin('')
      setError('')
      setShowCurrent(false)
      setShowNew(false)
    }
  }, [open, hasPin])

  if (!open) return null

  // ── Step 1: Verify current PIN ─────────────────────────────────────────────
  const handleVerify = async (e) => {
    e.preventDefault()
      const validation = validatePin(currentPin)
      if (!validation.valid) { 
        setError('Incorrect PIN.') 
        return 
      }
    setSaving(true)
    setError('')
    try {
      const ok = await verifyPin(currentPin, storedHash)
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
                ? 'Protect this book with a PIN (min. 6 characters)'
                : step === 'verify'
                  ? 'Enter your current PIN to continue'
                  : 'Choose a new PIN for this book'
              }
            </p>
          </div>
        </div>

        {/* ── Verify current PIN (only when changing) ── */}
        {hasPin && step === 'verify' ? (
          <form onSubmit={handleVerify} className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-stone-500 mb-1">Current PIN</label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPin}
                  onChange={e => { setCurrentPin(e.target.value); setError('') }}
                  placeholder="Enter current PIN"
                  maxLength={20}
                  autoFocus
                  className="w-full rounded-xl border border-amber-100 bg-amber-50/40 px-3 py-2.5 pr-9 text-center text-lg font-bold tracking-widest text-stone-800 placeholder-stone-300 placeholder:text-sm placeholder:font-normal placeholder:tracking-normal focus:border-amber-300 focus:bg-white transition-colors"
                />
                <button type="button" onClick={() => setShowCurrent(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400">
                  {showCurrent ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-600 text-center">{error}</p>
            )}

            <button type="submit" disabled={saving || !currentPin}
              className="w-full rounded-xl bg-amber-600 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 transition-colors disabled:opacity-60">
              {saving ? 'Verifying...' : 'Continue'}
            </button>

            {/* Remove PIN is NOT shown here — user must verify PIN first (step 2) */}
          </form>
        ) : (
          /* ── Set new PIN ── */
          <form onSubmit={handleSet} className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-stone-500 mb-1">
                New PIN <span className="text-stone-400 font-normal">(min. 6 chars, letters & numbers ok)</span>
              </label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPin}
                  onChange={e => { setNewPin(e.target.value); setError('') }}
                  placeholder="e.g. mypin7 or 123456"
                  maxLength={20}
                  autoFocus
                  className="w-full rounded-xl border border-amber-100 bg-amber-50/40 px-3 py-2.5 pr-9 text-sm text-stone-800 placeholder-stone-400 focus:border-amber-300 focus:bg-white transition-colors"
                />
                <button type="button" onClick={() => setShowNew(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400">
                  {showNew ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-stone-500 mb-1">Confirm PIN</label>
              <input
                type="password"
                value={confirmPin}
                onChange={e => { setConfirmPin(e.target.value); setError('') }}
                placeholder="Re-enter PIN"
                maxLength={20}
                className="w-full rounded-xl border border-amber-100 bg-amber-50/40 px-3 py-2.5 text-sm text-stone-800 placeholder-stone-400 focus:border-amber-300 focus:bg-white transition-colors"
              />
            </div>

            {/* Strength indicator */}
            {newPin.length > 0 && (
              <div className="h-1 w-full rounded-full bg-stone-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    newPin.length < 6 ? 'bg-red-400 w-1/4' :
                    newPin.length < 8 ? 'bg-orange-400 w-1/2' :
                    /[A-Za-z]/.test(newPin) && /[0-9]/.test(newPin) ? 'bg-emerald-500 w-full' :
                    'bg-yellow-400 w-3/4'
                  }`}
                />
              </div>
            )}

            {error && (
              <p className="rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-600 text-center">{error}</p>
            )}

            <button type="submit" disabled={saving || newPin.length < 6}
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

