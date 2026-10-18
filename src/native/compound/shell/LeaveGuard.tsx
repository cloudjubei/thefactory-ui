import type { ReactNode } from 'react'
import {
  LeaveGuardProvider,
  useLeaveGuardState,
  useLeaveGuardStore,
} from '../../../headless/contexts/LeaveGuardContext'
import {
  LEAVE_CONFIRM_LABEL,
  LEAVE_CONFIRM_TITLE,
} from '../../../headless/utils/leaveGuardConstants'
import type { LeaveGuardStore } from '../../../headless/utils/leaveGuardStore'
import { ConfirmDialog } from '../../primitives/Modal'

/**
 * The shell's leave guard on native: one store for the app plus the discard-style dialog forms use.
 * Mount it above the navigator and the nav drawer. A screen with unsaved work blocks with
 * `useLeaveBlocker` (or `useAppDirtyGuard`), routes its removal through `useRequestLeave` (e.g. from
 * React Navigation's `usePreventRemove`), and so does a nav-drawer project switch.
 */
export default function LeaveGuard({ children }: { children: ReactNode }) {
  return (
    <LeaveGuardProvider>
      {children}
      <LeaveGuardDialog />
    </LeaveGuardProvider>
  )
}

function LeaveGuardDialog() {
  const store = useLeaveGuardStore() as LeaveGuardStore
  const { pendingMessage } = useLeaveGuardState()
  return (
    <ConfirmDialog
      isOpen={pendingMessage !== null}
      onClose={() => store.cancel()}
      onConfirm={() => store.confirm()}
      title={LEAVE_CONFIRM_TITLE}
      description={pendingMessage ?? ''}
      confirmLabel={LEAVE_CONFIRM_LABEL}
      destructive
      hideCancel
      closeOnOverlayClick={false}
    />
  )
}
