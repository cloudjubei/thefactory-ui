export type LeaveGuardListener = () => void

export interface PendingLeave {
  message: string
  proceed: () => void
}

export interface LeaveGuardState {
  /** The question a leave would ask now, or `null` when nothing blocks. */
  blockingMessage: string | null
  /** The question being asked, while a held leave waits for the person. */
  pendingMessage: string | null
}
