import {
  LEAVE_CONFIRM_LABEL,
  LEAVE_CONFIRM_TITLE,
} from '../../../headless/utils/leaveGuardConstants'
import { ConfirmDialog } from '../../primitives/Modal'

export type LeaveConfirmDialogProps = {
  /** The question asked; `null` keeps the dialog closed. */
  message: string | null
  onLeave: () => void
  onStay: () => void
}

/** The leave guard's question, in the forms' discard style: one destructive Leave; X / Esc stays. */
export default function LeaveConfirmDialog({ message, onLeave, onStay }: LeaveConfirmDialogProps) {
  return (
    <ConfirmDialog
      isOpen={message !== null}
      onClose={onStay}
      onConfirm={onLeave}
      title={LEAVE_CONFIRM_TITLE}
      description={message ?? ''}
      confirmLabel={LEAVE_CONFIRM_LABEL}
      destructive
      hideCancel
      closeOnOverlayClick={false}
    />
  )
}
