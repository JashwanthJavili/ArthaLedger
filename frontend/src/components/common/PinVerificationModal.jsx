import { ShieldAlert } from 'lucide-react'
import PinDialog from './PinDialog'
import PinEntry from './PinEntry'

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
  if (!open) return null
  return (
    <PinDialog
      icon={ShieldAlert}
      iconTone="danger"
      title={`Delete ${itemType}?`}
      subtitle={`Enter the PIN to permanently delete${itemName ? ` "${itemName}"` : ` this ${itemType}`}. This can't be undone.`}
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
