import type { TicketPreview, TicketStatusLozengeView } from './ticketCardTypes'

/** Where a ticket's status move stands. */
export type TicketStatusMoveOutcome =
  | 'asking'
  | 'moving'
  | 'moved'
  | 'failed'
  | 'declined'
  | 'cancelled'

/** How the statuses of a move are drawn: two lozenges and an arrow, or one line of text. */
export type TicketStatusMoveLayout = 'lozenges' | 'line'

/** What a status move's view is read from. */
export interface TicketStatusMoveInput {
  /** The call's arguments: `issueKey`, `transition`, `comment`. */
  args?: unknown
  result?: unknown
  resultType?: string
  /** The ticket as its preview reads it now, for an ask: nothing has moved, so this is where it stands. */
  preview?: TicketPreview | undefined
  /** The chat's Jira site, to link the ticket before any answer names its link. */
  siteUrl?: string | undefined
}

/**
 * A ticket's status move as its tool row and its ask show it: the ticket, the
 * statuses it moves between, the comment sent with it, and how it ended. A move
 * that failed or was refused has no statuses, only why.
 */
export interface TicketStatusMoveView {
  key: string
  /** The ticket in Jira; absent when no web link to it is known. */
  url?: string
  title?: string
  /** The status it leaves: after a move, what Jira read before it; on an ask, where it stands now. */
  from?: TicketStatusLozengeView
  /** The status it moves to: what Jira answered, else the target the agent asked for. */
  to?: TicketStatusLozengeView
  /** The statuses as one line of text. */
  line?: string
  comment?: string
  outcome: TicketStatusMoveOutcome
  note: string
  /** Why it did not move, in the words given. */
  error?: string
}
