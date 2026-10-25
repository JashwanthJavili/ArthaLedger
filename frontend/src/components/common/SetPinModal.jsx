import { useState } from 'react'
import { ShieldCheck, KeyRound, Check, Trash2 } from 'lucide-react'
import { hashPin, weakPinReason } from '../../lib/pin'
import PinDialog from './PinDialog'
import PinPad from './PinPad'
import PinEntry from './PinEntry'
import { useI18n } from '../../i18n/core'

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
  const { t } = useI18n()

  const fail = (msg) => { setError(msg); setShake((n) => n + 1); setPin('') }

  const handleCreate = (value) => {
    const weak = weakPinReason(value)
    if (weak) { fail(weak); return }
    if (hasPin && value === currentPin) { fail(t('pin.set.differentFromCurrent')); return }
    setFirst(value)
    setPin('')
    setError('')
    setStep('confirm')
  }

  const handleConfirm = async (value) => {
    if (value !== first) {
      setFirst('')
      setStep('create')
      fail(t('pin.set.mismatch'))
      return
    }
    setSaving(true)
    try {
      const hash = await hashPin(value)
      await onSet(hash, length)
      setStep('done')
      setTimeout(onClose, 900)
    } catch {
      fail(t('pin.set.saveFailed'))
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
      setError(t('pin.set.removeFailed'))
    } finally {
      setSaving(false)
    }
  }

  const name = itemName ? t('pin.set.named', { name: itemName }) : t('pin.set.thisItem')

  if (step === 'verify') {
    return (
      <PinDialog icon={KeyRound} title={t('pin.set.verifyTitle')} subtitle={t('pin.set.verifySubtitle', { name })} onClose={onClose}>
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
      { n: 4, title: t('pin.set.fourTitle'), hint: t('pin.set.fourHint') },
      { n: 6, title: t('pin.set.sixTitle'), hint: t('pin.set.sixHint'), recommended: true },
    ]
    return (
      <PinDialog
        icon={ShieldCheck}
        title={hasPin ? t('pin.set.chooseNew') : t('pin.set.setLock')}
        subtitle={t('pin.set.chooseSubtitle', { name })}
        onClose={onClose}
        footer={hasPin && (
          <button type="button" onClick={handleRemove} disabled={saving}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 disabled:opacity-50 transition-colors cursor-pointer">
            <Trash2 size={13} /> {saving ? t('pin.set.removing') : t('pin.set.removeLock')}
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
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">{t('pin.set.best')}</span>
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
      <PinDialog icon={Check} iconTone="success" title={t('pin.set.saved')} subtitle={t('pin.set.doneSubtitle', { name, length })} />
    )
  }

  const isConfirm = step === 'confirm'
  return (
    <PinDialog
      icon={ShieldCheck}
      title={isConfirm ? t('pin.set.confirmTitle') : t('pin.set.createTitle', { length })}
      subtitle={isConfirm ? t('pin.set.confirmSubtitle') : t('pin.set.createSubtitle')}
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
          : saving ? <p className="text-xs text-[var(--text-subtle)]">{t('common.saving')}</p>
            : <p className="text-[11px] text-[var(--text-subtle)]">{t('pin.set.step', { n: isConfirm ? 2 : 1 })}</p>}
      </div>
    </PinDialog>
  )
}
