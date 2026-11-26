import type { ReviewCardMerge } from './colleagueReviewMergeTypes'
import type { ProcessStatusTone } from './processView'

/** The ticket a review is of. */
export interface ReviewedTicket {
  groupId: string
  ticketKey: string
}

/** Which of its own cards a ticket's review run shows away from its page: its approval, a push to approve, the reply it waits for, or its working card. */
export type TicketReviewRunCardKind = 'decision' | 'push' | 'outside' | 'working'

/** A review run's card while it works: the step it is on, and the round's merge as it goes. */
export interface ReviewRunWorkingView {
  /** "Review run". */
  name: string
  /** The step it works on: "Review", "Bring the base in", "Merge". */
  step: string
  badge: { label: string; tone: ProcessStatusTone }
  /** The round's approve-and-merge, pull request by pull request, once it started this round. */
  merge?: ReviewCardMerge
}
