import { useState } from 'react'
import { ShieldCheck, KeyRound, Check, Trash2 } from 'lucide-react'
import { hashPin, weakPinReason } from '../../lib/pin'
import PinDialog from './PinDialog'
import PinPad from './PinPad'
import PinEntry from './PinEntry'

/**
 * Set / change / remove a PIN.
 *
 *   New PIN:     choose length → enter → confirm → saved
 *   Change PIN:  verify current → choose length (or remove) → enter → confirm → saved
 *
 * Props:
 *   open, onClose
 *   hasPin, storedHash, pinLength   current PIN info (length may be unknown for older PINs)
 *   guardId                         id for wrong-attempt tracking
 *   itemName                        shown in copy
 *   onSet(hash, length)             persist the new PIN
 *   onRemove()                      remove the PIN
 */
export default function SetPinModal(props) {
  if (!props.open) return null
  return <SetPinFlow {...props} />
}

function SetPinFlow({ onClose, hasPin, storedHash, pinLength, guardId, itemName, onSet, onRemove }) {
  const [step, setStep] = useState(hasPin ? 'verify' : 'choose') // verify | choose | create | confirm | done
  const [length, setLength] = useState(6)
  const [first, setFirst] = useState('')
  const [pin, setPin] = useState('')
  const [shake, setShake] = useState(0)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [currentPin, setCurrentPin] = useState('')

  const fail = (msg) => { setError(msg); setShake((n) => n + 1); setPin('') }

  const handleCreate = (value) => {
    const weak = weakPinReason(value)
    if (weak) { fail(weak); return }
    if (hasPin && value === currentPin) { fail('Choose a PIN different from your current one.'); return }
    setFirst(value)
    setPin('')
    setError('')
    setStep('confirm')
  }

  const handleConfirm = async (value) => {
    if (value !== first) {
      setFirst('')
      setStep('create')
      fail("PINs didn't match. Enter a new PIN again.")
      return
    }
    setSaving(true)
    try {
      const hash = await hashPin(value)
      await onSet(hash, length)
      setStep('done')
      setTimeout(onClose, 900)
    } catch {
      fail('Could not save the PIN. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async () => {
    setSaving(true)
    try {
      await onRemove()
      onClose()
    } catch {
      setError('Could not remove the PIN. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const name = itemName ? `"${itemName}"` : 'this item'

  if (step === 'verify') {
    return (
      <PinDialog icon={KeyRound} title="Enter current PIN" subtitle={`Confirm it's you before changing the PIN for ${name}.`} onClose={onClose}>
        <PinEntry
          guardId={guardId}
          storedHash={storedHash}
          length={pinLength}
          onSuccess={(value) => { setCurrentPin(value); setStep('choose') }}
        />
      </PinDialog>
    )
  }

  if (step === 'choose') {
    const options = [
      { n: 4, title: '4-digit PIN', hint: 'Quicker to enter' },
      { n: 6, title: '6-digit PIN', hint: 'Recommended · 100× harder to guess', recommended: true },
    ]
    return (
      <PinDialog
        icon={ShieldCheck}
        title={hasPin ? 'Choose a new PIN' : 'Set a PIN lock'}
        subtitle={`Pick how many digits you want for ${name}.`}
        onClose={onClose}
        footer={hasPin && (
          <button type="button" onClick={handleRemove} disabled={saving}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 disabled:opacity-50 transition-colors cursor-pointer">
            <Trash2 size={13} /> {saving ? 'Removing…' : 'Remove PIN lock'}
          </button>
        )}
      >
        <div className="space-y-2.5">
          {options.map((o) => (
            <button key={o.n} type="button"
              onClick={() => { setLength(o.n); setPin(''); setFirst(''); setError(''); setStep('create') }}
              className="flex w-full items-center gap-4 rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] px-4 py-3.5 text-left hover:border-[var(--gold-primary)] transition-colors cursor-pointer">
              <span className="flex gap-1">
                {Array.from({ length: o.n }).map((_, i) => (
                  <span key={i} className="h-2 w-2 rounded-full bg-[var(--gold-primary)]" />
                ))}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold text-[var(--text-main)]">{o.title}</span>
                <span className="block text-[11px] text-[var(--text-subtle)]">{o.hint}</span>
              </span>
              {o.recommended && (
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">Best</span>
              )}
            </button>
          ))}
        </div>
        {error && <p className="mt-3 text-center text-xs text-rose-600 dark:text-rose-400">{error}</p>}
      </PinDialog>
    )
  }

  if (step === 'done') {
    return (
      <PinDialog icon={Check} iconTone="success" title="PIN saved" subtitle={`${name} now needs your ${length}-digit PIN to open.`} />
    )
  }

  const isConfirm = step === 'confirm'
  return (
    <PinDialog
      icon={ShieldCheck}
      title={isConfirm ? 'Confirm your PIN' : `Create a ${length}-digit PIN`}
      subtitle={isConfirm ? 'Enter the same PIN again.' : 'Avoid easy picks like 1234 or birthdays.'}
      onClose={onClose}
      onBack={() => { setPin(''); setError(''); if (isConfirm) { setFirst(''); setStep('create') } else setStep('choose') }}
    >
      <PinPad
        length={length}
        value={pin}
        onChange={(v) => { setPin(v); if (error) setError('') }}
        onComplete={isConfirm ? handleConfirm : handleCreate}
        disabled={saving}
        shakeKey={shake}
      />
      <div className="mt-3 min-h-[36px] text-center" aria-live="polite">
        {error
          ? <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p>
          : saving ? <p className="text-xs text-[var(--text-subtle)]">Saving…</p>
            : <p className="text-[11px] text-[var(--text-subtle)]">Step {isConfirm ? 2 : 1} of 2</p>}
      </div>
    </PinDialog>
  )
}
