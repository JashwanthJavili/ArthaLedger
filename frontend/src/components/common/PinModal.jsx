import { useState } from 'react'
import { Lock, KeyRound, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { EmailAuthProvider, GoogleAuthProvider, reauthenticateWithCredential, reauthenticateWithPopup } from 'firebase/auth'
import { useAuth } from '../../context/AuthContext'
import { auth } from '../../lib/firebase'
import { hashPin, needsRehash } from '../../lib/pin'
import { clearGuard } from '../../lib/pinGuard'
import PinDialog from './PinDialog'
import PinEntry from './PinEntry'
import { useI18n } from '../../i18n/core'
import { Trans } from '../../i18n/Trans'

/**
 * Unlock a PIN-protected book or project.
 *
 * Props:
 *   open, onClose
 *   onUnlock()                 called after a correct PIN
 *   storedHash, pinLength      the item's PIN hash and digit count (length may be unknown for older PINs)
 *   guardId                    id for wrong-attempt tracking
 *   itemName
 *   onRemovePin()              remove the PIN after re-verifying the account ("Forgot PIN")
 *   onRehash(hash, length)     optional: upgrade older PINs to the stronger format / record their length
 */
export default function PinModal(props) {
  if (!props.open) return null
  return <PinUnlock {...props} />
}

function PinUnlock({ onClose, onUnlock, storedHash, pinLength, guardId, itemName, onRemovePin, onRehash }) {
  const { user } = useAuth()
  const { t } = useI18n()
  const [mode, setMode] = useState('pin') // pin | forgot | removed
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const providers = user?.providerData?.map((p) => p.providerId) || []
  const isPasswordUser = providers.includes('password')
  const isGoogleUser = providers.includes('google.com')

  const handleSuccess = async (pin, length) => {
    // Upgrade older PINs (unsalted hash or unknown length) silently in the background.
    if (onRehash && (needsRehash(storedHash) || !pinLength)) {
      hashPin(pin).then((h) => onRehash(h, length)).catch(() => {})
    }
    onUnlock()
    onClose()
  }

  const removeAfterReauth = async (reauth) => {
    setBusy(true)
    setError('')
    try {
      await reauth()
      await onRemovePin()
      await clearGuard(user?.uid, guardId)
      setMode('removed')
    } catch (err) {
      const code = err?.code || ''
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') setError(t('pin.unlock.wrongPassword'))
      else if (code === 'auth/too-many-requests') setError(t('pin.unlock.tooMany'))
      else if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') setError(t('pin.unlock.cancelled'))
      else setError(t('pin.unlock.failed'))
    } finally {
      setBusy(false)
    }
  }

  if (mode === 'removed') {
    return (
      <PinDialog icon={ShieldCheck} iconTone="success" title={t('pin.unlock.removedTitle')}
        subtitle={itemName ? t('pin.unlock.removedNamed', { name: itemName }) : t('pin.unlock.removedItem')}
        onClose={onClose}>
        <button type="button" onClick={onClose}
          className="w-full rounded-2xl bg-[var(--gold-primary)] py-3 text-[13px] font-semibold text-white hover:bg-[var(--gold-hover)] transition-colors cursor-pointer">
          {t('common.done')}
        </button>
      </PinDialog>
    )
  }

  if (mode === 'forgot') {
    return (
      <PinDialog icon={KeyRound} title={t('pin.unlock.forgotTitle')} subtitle={t('pin.unlock.forgotBody')}
        onClose={onClose} onBack={() => { setMode('pin'); setError('') }}>
        {isPasswordUser ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!password) { setError(t('pin.unlock.enterPassword')); return }
              removeAfterReauth(() => reauthenticateWithCredential(auth.currentUser, EmailAuthProvider.credential(user.email, password)))
            }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2 rounded-xl border border-[var(--border-card)] bg-[var(--bg-card)] px-3.5 focus-within:border-[var(--gold-primary)] transition-colors">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError('') }}
                placeholder={t('pin.unlock.passwordPlaceholder')}
                autoComplete="current-password"
                autoFocus
                className="min-w-0 flex-1 bg-transparent py-3 text-[13px] text-[var(--text-main)] placeholder-[var(--text-subtle)] outline-none"
              />
              <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? t('dialogs.hidePassword') : t('dialogs.showPassword')}
                className="text-[var(--text-subtle)] hover:text-[var(--text-main)] cursor-pointer">
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {error && <p className="text-center text-xs text-rose-600 dark:text-rose-400">{error}</p>}
            <button type="submit" disabled={busy || !password}
              className="w-full rounded-2xl bg-[var(--gold-primary)] py-3 text-[13px] font-semibold text-white hover:bg-[var(--gold-hover)] disabled:opacity-40 transition-colors cursor-pointer">
              {busy ? t('pin.unlock.verifying') : t('pin.unlock.verifyRemove')}
            </button>
          </form>
        ) : isGoogleUser ? (
          <div className="space-y-3">
            {error && <p className="text-center text-xs text-rose-600 dark:text-rose-400">{error}</p>}
            <button type="button" disabled={busy}
              onClick={() => removeAfterReauth(() => reauthenticateWithPopup(auth.currentUser, new GoogleAuthProvider()))}
              className="w-full rounded-2xl bg-[var(--gold-primary)] py-3 text-[13px] font-semibold text-white hover:bg-[var(--gold-hover)] disabled:opacity-40 transition-colors cursor-pointer">
              {busy ? t('pin.unlock.verifying') : t('pin.unlock.google')}
            </button>
          </div>
        ) : (
          <p className="text-center text-xs text-[var(--text-subtle)]">{t('pin.unlock.signOutHint')}</p>
        )}
      </PinDialog>
    )
  }

  return (
    <PinDialog
      icon={Lock}
      title={t('pin.unlock.title')}
      subtitle={itemName
        ? <Trans k="pin.unlock.lockedNamed" vars={{ name: itemName }} components={{ b: <span className="font-semibold text-[var(--text-main)]" /> }} />
        : t('pin.unlock.lockedItem')}
      onClose={onClose}
      footer={
        <button type="button" onClick={() => { setMode('forgot'); setError('') }}
          className="w-full text-center text-xs font-semibold text-[var(--gold-primary)] hover:underline cursor-pointer">
          {t('pin.unlock.forgotTitle')}
        </button>
      }
    >
      <PinEntry guardId={guardId} storedHash={storedHash} length={pinLength} onSuccess={handleSuccess} />
    </PinDialog>
  )
}
