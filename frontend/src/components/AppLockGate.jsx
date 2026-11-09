import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { AppLockContext } from '../context/AppLockContext'
import { onSnapshot } from 'firebase/firestore'
import { EmailAuthProvider, GoogleAuthProvider, reauthenticateWithCredential, reauthenticateWithPopup } from 'firebase/auth'
import { Fingerprint, Lock, LogOut } from 'lucide-react'
import { auth } from '../lib/firebase'
import { userDoc } from '../lib/userData'
import {
  GUARD_ID, canUseFingerprint, hasFingerprint, lockFromUserDoc, lockSession, pauseUntilFocus, readLocalLock,
  removeLock, verifyFingerprint, withLockPaused, writeLocalLock,
} from '../lib/appLock'
import Toast from './common/Toast'
import { useAuth, parseFirebaseError } from '../context/AuthContext'
import { useI18n } from '../i18n/core'
import PinEntry from './common/PinEntry'
import Loader from './common/Loader'

/*
 * Covers the whole app with the lock screen whenever app lock is on and this
 * visit hasn't been unlocked yet: on every open, every reload, and every time
 * the app comes back to the screen. While locked nothing behind it is drawn.
 */

const REMOTE_WAIT_MS = 6000

export default function AppLockGate({ children }) {
  const { user } = useAuth()
  const uid = user?.uid || null
  const unlocked = useSyncExternalStore(lockSession.subscribe, lockSession.isUnlocked)

  // The account's setting (null = off), and whether it has been heard from
  const [remote, setRemote] = useState({ uid: null, loaded: false, config: null })
  const [waitedOut, setWaitedOut] = useState(false)

  useEffect(() => {
    if (!uid) return undefined
    const off = onSnapshot(userDoc(uid), (snap) => {
      const config = lockFromUserDoc(snap.exists() ? snap.data() : null)
      writeLocalLock(uid, config)
      setRemote({ uid, loaded: true, config })
    }, () => setWaitedOut(true))
    const timer = setTimeout(() => setWaitedOut(true), REMOTE_WAIT_MS)
    return () => { off(); clearTimeout(timer); setWaitedOut(false) }
  }, [uid])

  // Strict: the moment the app leaves the screen, it locks
  useEffect(() => {
    // Fires when the person switches to another app or tab, goes home, or the
    // screen turns off
    const onHide = () => { if (document.visibilityState === 'hidden') lockSession.lock() }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', onHide)
    }
  }, [])

  // Choosing a file or sharing is the person's own doing: don't lock for that
  useEffect(() => {
    const onClick = (e) => { if (e.target?.closest?.('input[type=file]')) pauseUntilFocus() }
    document.addEventListener('click', onClick, true)
    const share = navigator.share
    if (typeof share === 'function') {
      navigator.share = (...args) => withLockPaused(() => share.apply(navigator, args))
    }
    return () => {
      document.removeEventListener('click', onClick, true)
      if (typeof share === 'function') navigator.share = share
    }
  }, [])

  // A different person signing in starts locked
  useEffect(() => { if (!uid) lockSession.lock() }, [uid])

  const heard = remote.uid === uid && remote.loaded
  const config = !uid ? null : heard ? remote.config : readLocalLock(uid)
  const ready = !uid || heard || waitedOut || Boolean(config)

  const value = { config, ready }
  if (!uid) return <AppLockContext.Provider value={value}>{children}</AppLockContext.Provider>
  if (!ready) return <Loader />
  if (config && !unlocked) return <LockScreen uid={uid} config={config} />
  return (
    <AppLockContext.Provider value={value}>
      {children}
      <ResetNotice />
    </AppLockContext.Provider>
  )
}

/** After "Forgot PIN": says the lock is off and where to set a new one. */
function ResetNotice() {
  const { t } = useI18n()
  const [visible, setVisible] = useState(() => {
    try { return sessionStorage.getItem('artha.lockReset') === '1' } catch { return false }
  })
  useEffect(() => {
    if (!visible) return undefined
    try { sessionStorage.removeItem('artha.lockReset') } catch { /* ignore */ }
    const timer = setTimeout(() => setVisible(false), 5000)
    return () => clearTimeout(timer)
  }, [visible])
  return <Toast message={t('appLock.resetDone')} type="success" visible={visible} />
}

function LockScreen({ uid, config }) {
  const { t } = useI18n()
  const { logout } = useAuth()
  const [bio, setBio] = useState(false)
  const [bioBusy, setBioBusy] = useState(false)
  const [bioMsg, setBioMsg] = useState('')
  const [forgot, setForgot] = useState(false)

  // auto: the try made on opening; Chrome may refuse it until the person
  // taps, so that one fails quietly and the button stays ready
  const tryFingerprint = useCallback(async (auto = false) => {
    setBioBusy(true)
    setBioMsg('')
    try {
      if (await verifyFingerprint(uid)) lockSession.unlock()
      else if (!auto) setBioMsg(t('appLock.fingerprintFailed'))
    } catch {
      if (!auto) setBioMsg(t('appLock.fingerprintFailed'))
    } finally {
      setBioBusy(false)
    }
  }, [uid, t])

  // Offer the fingerprint straight away when this phone has it set up
  useEffect(() => {
    let alive = true
    ;(async () => {
      const ok = hasFingerprint(uid) && await canUseFingerprint()
      if (!alive) return
      setBio(ok)
      if (ok && document.visibilityState === 'visible') tryFingerprint(true)
    })()
    return () => { alive = false }
  }, [uid]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-y-auto bg-[var(--bg-page)] px-6 py-10">
      <div className="w-full max-w-xs text-center">
        <img src="/Logo.png" alt="" className="mx-auto h-16 w-16 rounded-2xl object-contain" />
        <h1 className="font-serif-luxury mt-4 text-[22px] font-semibold text-[var(--text-main)]">{t('appLock.lockedTitle')}</h1>
        <p className="mt-1 text-[13px] text-[var(--text-muted)]">{t('appLock.enterPin')}</p>

        {forgot ? (
          <ForgotPin uid={uid} onCancel={() => setForgot(false)} />
        ) : (
          <>
            <div className="mt-6">
              <PinEntry guardId={GUARD_ID} storedHash={config.pinHash} length={config.pinLength} onSuccess={() => lockSession.unlock()} />
            </div>
            {bio && (
              <button type="button" onClick={() => tryFingerprint()} disabled={bioBusy}
                className="mx-auto mt-2 inline-flex items-center gap-2 rounded-full border border-[var(--border-card)] bg-[var(--bg-card)] px-4 py-2.5 text-[13px] font-semibold text-[var(--gold-primary)] disabled:opacity-60 cursor-pointer">
                <Fingerprint size={17} /> {t('appLock.useFingerprint')}
              </button>
            )}
            {bioMsg && <p className="mt-2 text-[12px] text-rose-600 dark:text-rose-400">{bioMsg}</p>}
            <div className="mt-6 flex items-center justify-center gap-5 text-[12.5px] font-semibold">
              <button type="button" onClick={() => setForgot(true)} className="text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer">{t('appLock.forgot')}</button>
              <button type="button" onClick={() => logout()} className="inline-flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer">
                <LogOut size={13} /> {t('common.signOut')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/** Forgot the PIN: prove it's you with the account itself, then the lock is turned off. */
function ForgotPin({ uid, onCancel }) {
  const { t } = useI18n()
  const current = auth.currentUser
  const isPasswordUser = current?.providerData?.some((p) => p.providerId === 'password')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const reset = async () => {
    setBusy(true)
    setError('')
    try {
      if (isPasswordUser) {
        await reauthenticateWithCredential(current, EmailAuthProvider.credential(current.email, password))
      } else {
        await reauthenticateWithPopup(current, new GoogleAuthProvider())
      }
      await removeLock(uid)
      try { sessionStorage.setItem('artha.lockReset', '1') } catch { /* notice is optional */ }
      lockSession.unlock()
    } catch (err) {
      setError(parseFirebaseError(err))
      setBusy(false)
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] p-4 text-left">
      <p className="flex items-center gap-2 text-[14px] font-semibold text-[var(--text-main)]"><Lock size={15} /> {t('appLock.forgotTitle')}</p>
      <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--text-muted)]">
        {isPasswordUser ? t('appLock.forgotPassword') : t('appLock.forgotGoogle')}
      </p>
      {isPasswordUser && (
        <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder={t('common.password')} aria-label={t('common.password')}
          onKeyDown={(e) => { if (e.key === 'Enter' && password) reset() }}
          className="mt-3 w-full rounded-xl border border-[var(--border-card)] bg-[var(--bg-page)] px-3 py-2.5 text-[14px] text-[var(--text-main)] outline-none focus:border-[var(--gold-primary)]" />
      )}
      {error && <p className="mt-2 text-[12px] text-rose-600 dark:text-rose-400">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={onCancel} disabled={busy}
          className="flex-1 rounded-full border border-[var(--border-card)] py-2.5 text-[13px] font-semibold text-[var(--text-main)] cursor-pointer">{t('common.cancel')}</button>
        <button type="button" onClick={reset} disabled={busy || (isPasswordUser && !password)}
          className="flex-1 rounded-full bg-[var(--gold-primary)] py-2.5 text-[13px] font-semibold text-white disabled:opacity-50 cursor-pointer">
          {busy ? t('appLock.checking') : isPasswordUser ? t('appLock.verify') : t('appLock.continueGoogle')}
        </button>
      </div>
    </div>
  )
}
