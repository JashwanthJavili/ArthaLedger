import { ShieldAlert } from 'lucide-react'
import PinDialog from './PinDialog'
import PinEntry from './PinEntry'
import { useI18n } from '../../i18n/core'

/**
 * Confirm a destructive action (delete) on a PIN-protected book or project.
 *
 * Props:
 *   open, onClose
 *   storedHash, pinLength   PIN to verify against (length may be unknown for older PINs)
 *   guardId                 id for wrong-attempt tracking
 *   onVerified(pin)         called after a correct PIN
 *   itemType, itemName      for display
 */
export default function PinVerificationModal({ open, onClose, storedHash, pinLength, guardId, onVerified, itemType = 'book', itemName = '' }) {
  const { t } = useI18n()
  if (!open) return null
  const noun = itemType === 'project' ? 'project' : 'book'
  return (
    <PinDialog
      icon={ShieldAlert}
      iconTone="danger"
      title={t(`dialogs.delete.${noun}.title`)}
      subtitle={itemName ? t('pin.verify.bodyNamed', { name: itemName }) : t(`pin.verify.${noun}Body`)}
      onClose={onClose}
    >
      <PinEntry
        guardId={guardId}
        storedHash={storedHash}
        length={pinLength}
        tone="danger"
        onSuccess={(pin) => { onVerified(pin); onClose() }}
      />
    </PinDialog>
  )
}
