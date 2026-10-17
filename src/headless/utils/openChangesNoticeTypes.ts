import type { ChatOpenChanges } from '../api/generated'

/** An action on the open changes in flight. */
export type OpenChangesNoticeBusy = 'discarding' | 'rebuilding'

/** What the notice on a chat's change card is shown from — all of it read live. */
export interface OpenChangesNoticeInput {
  /** The run whose change card it is. */
  runId: string
  /** The chat's open changes now: `undefined` until read, `null` once there are none. */
  openChanges: ChatOpenChanges | null | undefined
  busy?: OpenChangesNoticeBusy
  /** The files a rebuild could not merge. */
  conflicts?: ReadonlyArray<{ path: string; reason: string }>
  /** Why an action failed. */
  error?: string
}

/** The notice as it shows on the change card. */
export interface OpenChangesNoticeView {
  /** "Waiting for you · 12 h" — once the changes waited past the limit. */
  waiting?: string
  /** That they no longer fit the checkout, counted live. */
  unfit?: string
  canDiscard: boolean
  canRebuild: boolean
  busy?: OpenChangesNoticeBusy
  conflictLine?: string
  error?: string
}
