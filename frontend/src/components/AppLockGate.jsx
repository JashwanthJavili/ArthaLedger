import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { AppLockContext } from '../context/AppLockContext'
import { onSnapshot } from 'firebase/firestore'
import { EmailAuthProvider, GoogleAuthProvider, reauthenticateWithCredential, reauthenticateWithPopup } from 'firebase/auth'
import { Fingerprint, Lock, LogOut } from 'lucide-react'
import { auth } from '../lib/firebase'
import { userDoc } from '../lib/userData'
import {
  GUARD_ID, canUseFingerprint, hasFingerprint, lockFromUserDoc, lockSession, noteAlive, pauseUntilFocus, readLocalLock,
  removeLock, returningFromHandoff, verifyFingerprint, withLockPaused, writeLocalLock,
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
    const onHide = () => {
      if (document.visibilityState !== 'hidden') return
      noteAlive()
      lockSession.lock()
    }
    // Back from the Bank SMS screens, straight from an unlocked page
    const onShow = () => {
      if (document.visibilityState === 'visible' && !lockSession.isUnlocked() && returningFromHandoff()) lockSession.unlock()
    }
    document.addEventListener('visibilitychange', onHide)
    document.addEventListener('visibilitychange', onShow)
    window.addEventListener('pagehide', onHide)
    window.addEventListener('pageshow', onShow)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      document.removeEventListener('visibilitychange', onShow)
      window.removeEventListener('pagehide', onHide)
      window.removeEventListener('pageshow', onShow)
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

  // Signing out, or a different person signing in, starts locked. (Not the
  // first moment of a page load, when sign-in simply hasn't loaded yet.)
  const prevUid = useRef(uid)
  useEffect(() => {
    if (prevUid.current && prevUid.current !== uid) lockSession.lock()
    prevUid.current = uid
  }, [uid])

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
  // Fingerprint first when it's set up on this phone; the PIN stays one tap away
  const [bio, setBio] = useState(() => hasFingerprint(uid))
  const [usePin, setUsePin] = useState(false)
  const [bioBusy, setBioBusy] = useState(false)
  const [bioMsg, setBioMsg] = useState('')
  const [forgot, setForgot] = useState(false)

  // One prompt at a time; remember when the last one closed so a cancelled
  // prompt doesn't pop straight back up
  const busy = useRef(false)
  const lastPrompt = useRef(0)

  // auto: the tries made by the app itself (on opening, on coming back).
  // Chrome may hold those back until the screen is touched, so they fail
  // quietly; the first touch then starts the fingerprint.
  const tryFingerprint = useCallback(async (auto = false) => {
    if (busy.current) return
    busy.current = true
    setBioBusy(true)
    setBioMsg('')
    try {
      if (await verifyFingerprint(uid)) lockSession.unlock()
      else if (!auto) setBioMsg(t('appLock.fingerprintFailed'))
    } catch {
      if (!auto) setBioMsg(t('appLock.fingerprintFailed'))
    } finally {
      busy.current = false
      lastPrompt.current = Date.now()
      setBioBusy(false)
    }
  }, [uid, t])

  // Is a sensor really there? Checked alongside, never before, the first try
  useEffect(() => {
    let alive = true
    canUseFingerprint().then((ok) => { if (alive && !ok) setBio(false) })
    return () => { alive = false }
  }, [])

  // Fingerprint straight away, and again every time the app comes back
  useEffect(() => {
    if (!bio || usePin || forgot) return undefined
    const go = () => {
      if (document.visibilityState !== 'visible' || busy.current) return
      if (Date.now() - lastPrompt.current < 1500) return // the prompt that just closed
      tryFingerprint(true)
    }
    go()
    document.addEventListener('visibilitychange', go)
    window.addEventListener('focus', go)
    window.addEventListener('pageshow', go)
    return () => {
      document.removeEventListener('visibilitychange', go)
      window.removeEventListener('focus', go)
      window.removeEventListener('pageshow', go)
    }
  }, [bio, usePin, forgot, tryFingerprint])

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-y-auto bg-[var(--bg-page)] px-6 py-10"
      onPointerUp={(e) => {
        // On the fingerprint screen, a touch anywhere (not on a button) starts it
        if (bio && !usePin && !forgot && !bioBusy && !e.target.closest?.('button, a, input')) tryFingerprint()
      }}>
      <div className="w-full max-w-xs text-center">
        <img src="/Logo.png" alt="" className="mx-auto h-16 w-16 rounded-2xl object-contain" />
        <h1 className="font-serif-luxury mt-4 text-[22px] font-semibold text-[var(--text-main)]">{t('appLock.lockedTitle')}</h1>
        <p className="mt-1 text-[13px] text-[var(--text-muted)]">{bio && !usePin && !forgot ? t('appLock.bioSubtitle') : t('appLock.enterPin')}</p>

        {forgot ? (
          <ForgotPin uid={uid} onCancel={() => setForgot(false)} />
        ) : bio && !usePin ? (
          <>
            <button type="button" onClick={() => tryFingerprint()} disabled={bioBusy} aria-label={t('appLock.useFingerprint')}
              className="group mx-auto mt-10 flex flex-col items-center gap-4 cursor-pointer disabled:cursor-wait">
              <span className={`flex h-24 w-24 items-center justify-center rounded-full border-2 border-[var(--gold-primary)]/40 bg-[var(--gold-light)] text-[var(--gold-primary)] transition-transform group-active:scale-95 ${bioBusy ? 'animate-pulse' : ''}`}>
                <Fingerprint size={52} strokeWidth={1.5} />
              </span>
              <span className="text-[14px] font-semibold text-[var(--text-main)]">{t('appLock.tapToUnlock')}</span>
            </button>
            {bioMsg && <p className="mt-3 text-[12px] text-rose-600 dark:text-rose-400">{bioMsg}</p>}
            <button type="button" onClick={() => { setUsePin(true); setBioMsg('') }}
              className="mx-auto mt-10 block text-[13px] font-semibold text-[var(--gold-primary)] cursor-pointer">
              {t('appLock.usePin')}
            </button>
          </>
        ) : (
          <>
            <div className="mt-6">
              <PinEntry guardId={GUARD_ID} storedHash={config.pinHash} length={config.pinLength} onSuccess={() => lockSession.unlock()} />
            </div>
            {bio && (
              <button type="button" onClick={() => { setUsePin(false); tryFingerprint() }} disabled={bioBusy}
                className="mx-auto mt-2 inline-flex items-center gap-2 rounded-full border border-[var(--border-card)] bg-[var(--bg-card)] px-4 py-2.5 text-[13px] font-semibold text-[var(--gold-primary)] disabled:opacity-60 cursor-pointer">
                <Fingerprint size={17} /> {t('appLock.useFingerprint')}
              </button>
            )}
            {bioMsg && <p className="mt-2 text-[12px] text-rose-600 dark:text-rose-400">{bioMsg}</p>}
          </>
        )}
        {!forgot && (
            <div className="mt-6 flex items-center justify-center gap-5 text-[12.5px] font-semibold">
              <button type="button" onClick={() => setForgot(true)} className="text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer">{t('appLock.forgot')}</button>
              <button type="button" onClick={() => logout()} className="inline-flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer">
                <LogOut size={13} /> {t('common.signOut')}
              </button>
            </div>
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
