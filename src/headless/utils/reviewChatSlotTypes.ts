import type { ReviewCardMerge } from './colleagueReviewMergeTypes'
import type { ProcessStatusTone } from './processView'

/** What a review chat shows in its composer's place: its run's card while the run needs the person or works off the chat, or the reply waiting to start an inline review's next round. */
export type ReviewChatSlotKind =
  | 'run-decision'
  | 'run-push'
  | 'run-outside'
  | 'run-working'
  | 'reply'

/** A review run's card while it works off the chat: the step it is on, and the round's merge as it goes. */
export interface ReviewRunWorkingView {
  /** "Review run". */
  name: string
  /** The step it works on: "Bring the base in", "Merge". */
  step: string
  badge: { label: string; tone: ProcessStatusTone }
  /** The round's approve-and-merge, pull request by pull request, once it started this round. */
  merge?: ReviewCardMerge
}
