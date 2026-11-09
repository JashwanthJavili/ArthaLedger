import { useEffect, useState } from 'react'
import { Fingerprint, KeyRound, Lock } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useAppLock } from '../../context/AppLockContext'
import {
  GUARD_ID, canUseFingerprint, enrollFingerprint, hasFingerprint, removeFingerprint, removeLock, saveLock,
} from '../../lib/appLock'
import { useI18n } from '../../i18n/core'
import SetPinModal from '../common/SetPinModal'
import PinDialog from '../common/PinDialog'
import PinEntry from '../common/PinEntry'
import { Group, Row, Switch } from './ui'

/**
 * Settings → Security: app lock (PIN every time the app opens) and, on phones
 * that have it, unlocking with the fingerprint.
 */
export default function AppLockSection({ delay = 0.045, onToast }) {
  const { t } = useI18n()
  const { user } = useAuth()
  const { config } = useAppLock()
  const uid = user?.uid
  const on = Boolean(config)

  const [dialog, setDialog] = useState(null) // 'set' | 'change' | 'off'
  const [bioAvailable, setBioAvailable] = useState(false)
  const [bioOn, setBioOn] = useState(() => (uid ? hasFingerprint(uid) : false))
  const [bioBusy, setBioBusy] = useState(false)

  useEffect(() => {
    let alive = true
    canUseFingerprint().then((ok) => { if (alive) setBioAvailable(ok) })
    return () => { alive = false }
  }, [])

  const toggleLock = () => setDialog(on ? 'off' : 'set')

  const toggleFingerprint = async () => {
    if (!uid || bioBusy) return
    if (bioOn) {
      removeFingerprint(uid)
      setBioOn(false)
      return
    }
    setBioBusy(true)
    try {
      await enrollFingerprint(user)
      setBioOn(true)
      onToast?.(t('appLock.fingerprintOn'))
    } catch {
      onToast?.(t('appLock.fingerprintError'), 'error')
    } finally {
      setBioBusy(false)
    }
  }

  const turnOff = async () => {
    try {
      await removeLock(uid)
      setBioOn(false)
      setDialog(null)
      onToast?.(t('appLock.turnedOff'))
    } catch {
      onToast?.(t('pin.set.removeFailed'), 'error')
    }
  }

  return (
    <>
      <Group title={t('appLock.groupTitle')} delay={delay} footer={on ? t('appLock.footerOn') : t('appLock.footerOff')}>
        <Row icon={Lock} label={t('appLock.settingsRow')} hint={t('appLock.settingsHint')}
          trailing={<Switch checked={on} onChange={toggleLock} label={t('appLock.settingsRow')} />} />
        {on && (
          <Row icon={KeyRound} label={t('appLock.changePin')} onClick={() => setDialog('change')} />
        )}
        {on && bioAvailable && (
          <Row icon={Fingerprint} label={t('appLock.fingerprintRow')} hint={t('appLock.fingerprintHint')}
            trailing={<Switch checked={bioOn} onChange={toggleFingerprint} label={t('appLock.fingerprintRow')} />} />
        )}
      </Group>

      <SetPinModal
        open={dialog === 'set' || dialog === 'change'}
        onClose={() => setDialog(null)}
        hasPin={dialog === 'change'}
        storedHash={config?.pinHash}
        pinLength={config?.pinLength}
        guardId={GUARD_ID}
        itemName={t('appLock.itemName')}
        onSet={(hash, length) => saveLock(uid, hash, length)}
        onRemove={turnOff}
      />

      {dialog === 'off' && config && (
        <PinDialog icon={Lock} title={t('appLock.turnOffTitle')} subtitle={t('appLock.turnOffSubtitle')} onClose={() => setDialog(null)}>
          <PinEntry guardId={GUARD_ID} storedHash={config.pinHash} length={config.pinLength} onSuccess={turnOff} />
        </PinDialog>
      )}
    </>
  )
}
