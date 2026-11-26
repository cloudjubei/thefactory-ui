import type {
  ColleagueReview,
  ColleagueReviewCloseOutcome,
  ReviewFindingKind,
  ReviewFindingState,
  ReviewVerdict,
  ReviewWaitingOnState,
} from 'thefactory-tools/types'
import type { ReviewReplyPostView } from './colleagueReviewSourceTypes'
import type { ProcessStatusTone } from './processView'

/** How the review card lays out a round: one stack, a tab per round, or a line that opens. */
export type ColleagueReviewCardLayout = 'stacked' | 'rounds' | 'summary'

/** Which review tool a row is: recording a round, or reading the review. */
export type ColleagueReviewTool = 'record' | 'read'

/** A finding as one round shows it. */
export interface ReviewFindingView {
  id: string
  title: string
  detail: string
  kind: ReviewFindingKind
  kindLabel: string
  state: ReviewFindingState
  stateLabel: string
  tone: ProcessStatusTone
  /** What shows where it stands this round. */
  evidence: string[]
  note?: string
  /** The person dropped it. */
  byYou: boolean
  /** Drop is offered: it is open now, on the latest round. */
  canDrop: boolean
  /** The person's drop is on its way. */
  saving: boolean
}

/** Which part of a round a finding is listed under. */
export type ReviewFindingGroupId =
  | 'fixed'
  | 'stillOpen'
  | 'raised'
  | 'noLongerApplies'
  | 'dropped'
  | 'toCheck'

export interface ReviewFindingGroupView {
  id: ReviewFindingGroupId
  label: string
  findings: ReviewFindingView[]
}

/** A decision or approval the work waits on, as one round shows it. */
export interface ReviewWaitingOnView {
  id: string
  who: string
  what: string
  state: ReviewWaitingOnState
  stateLabel: string
  tone: ProcessStatusTone
  /** The person marked it given. */
  byYou: boolean
  evidence: string[]
  note?: string
  /** Given is offered: it is outstanding, on the latest round. */
  canMarkGiven: boolean
  saving: boolean
}

/** A recording a round watched, as its card lists it. */
export interface ReviewRecordingView {
  /** The recording's link, as the round gave it. */
  url: string
  /** The link the row opens: the recording's, when it is a web link. */
  href?: string
  /** The site it is on, numbered when the round watched several there. */
  label: string
  /** The moments the round cites, as `m:ss` or `h:mm:ss`. */
  timestamps: string[]
  /** The video file it was watched from. */
  file?: string
}

/** One round of a review. */
export interface ReviewRoundView {
  n: number
  /** "Round 2 of 3". */
  title: string
  latest: boolean
  /** Its review is recorded; until then its agent is still at it. */
  recorded: boolean
  verdict?: ReviewVerdict
  verdictLabel?: string
  verdictTone?: ProcessStatusTone
  /** What the round came to, in a line: "2 fixed · 1 still open · 1 new". */
  summary: string
  groups: ReviewFindingGroupView[]
  waitingOn: ReviewWaitingOnView[]
  /** The recordings the round watched, with the moments it cites. */
  recordings: ReviewRecordingView[]
  /** The drafted reply, for the person to post. */
  reply?: string
  /** Post in thread, or where the reply was posted; absent when neither is to be shown. */
  post?: ReviewReplyPostView
  /** How many files came with the update. */
  files: number
}

/** What a review tool's row draws. */
export type ColleagueReviewCardView =
  | { kind: 'loading' }
  | { kind: 'none'; line: string }
  | { kind: 'failed'; line: string }
  | { kind: 'refused'; line: string; errors: string[] }
  | {
      kind: 'review'
      ticketKey: string
      ticketUrl?: string
      /** The round this row is about. */
      round: ReviewRoundView
      /** Every round, oldest first: the tabs, and the earlier ones under the row's. */
      rounds: ReviewRoundView[]
      /** A later round exists: this row's is no longer the one to act on. */
      laterNote?: string
      /** Why the person's last drop or given did not go through. */
      actionError?: string
    }

/** The person's own changes on their way, by id. */
export interface ReviewPendingActions {
  drops: ReadonlySet<string>
  givens: ReadonlySet<string>
  /** The rounds whose reply is being posted in the thread. */
  posts: ReadonlySet<number>
  /** The review is being closed, this way. */
  closing?: ColleagueReviewCloseOutcome
}

/** What a review tool row's card is built from. */
export interface ColleagueReviewCardInput {
  tool: ColleagueReviewTool
  /** The review as it is now; `null` when there is none, `undefined` until read. */
  review: ColleagueReview | null | undefined
  /** Why the last read failed. */
  readError?: string
  /** The round the call was about; the latest when left out. */
  round?: number
  /** The call's own refusal: what the agent was told. */
  refusal?: string[]
  pending?: ReviewPendingActions
  actionError?: string
  /** The group watches a Slack thread it can post to. */
  thread?: boolean
}
