import type { ChatOpenChanges, ChatOpenChangesCard, CliRunReview } from '../api/generated'

/** What the card about a chat's open changes is shown from — all of it read live. */
export interface OpenChangesCardInput {
  card: ChatOpenChangesCard
  /** The chat's open changes now: `undefined` until read, `null` once there are none. */
  openChanges: ChatOpenChanges | null | undefined
  /** How the card's own run's review was decided, read once the changes no longer wait. */
  cardRunReview?: Pick<CliRunReview, 'mergedAt' | 'rejectedAt'>
  /** An action on the card in flight. */
  busy?: 'discarding' | 'rebuilding'
  /** The files a rebuild could not merge. */
  conflicts?: ReadonlyArray<{ path: string; reason: string }>
  /** Why an action failed. */
  error?: string
}

/** The card as it shows. */
export interface OpenChangesCardView {
  state: 'loading' | 'open' | 'settled'
  title: string
  detail: string
  /** The run whose review View opens. */
  viewRunId?: string
  canDiscard: boolean
  canRebuild: boolean
  busy?: 'discarding' | 'rebuilding'
  conflictLine?: string
  error?: string
}
