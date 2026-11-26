import type {
  ColleagueReview,
  ColleagueReviewCloseOutcome,
  ProcessDecisionClient,
} from 'thefactory-tools/types'

/** What closing a review is asked about: the ticket, and what the review still holds. */
export interface ReviewCloseContext {
  ticketKey: string
  /** A review run of the ticket is still going or stopped. */
  runOpen: boolean
  /** An update from the watched thread waits on the ticket. */
  offersWaiting: boolean
}

/** One of the confirm's two outcomes: its name, and exactly what choosing it does, a line each. */
export interface ReviewCloseOutcomeView {
  outcome: ColleagueReviewCloseOutcome
  label: string
  /** When to pick it, in a line. */
  when: string
  goes: string[]
}

/** The confirm closing a review asks first. */
export interface ReviewCloseConfirmView {
  title: string
  outcomes: ReviewCloseOutcomeView[]
  nothingPosted: string
  noteLabel: string
  notePlaceholder: string
  confirm: Record<ColleagueReviewCloseOutcome, string>
  cancel: string
}

/** What closing a review sends. */
export interface ReviewCloseBody {
  outcome: ColleagueReviewCloseOutcome
  note?: string
  decidedVia: ProcessDecisionClient
}

/** What closing a review answers. */
export interface ReviewCloseAnswer {
  outcome: ColleagueReviewCloseOutcome
  /** The review, closed, when it was kept. */
  review?: ColleagueReview
  /** The runs it ended. */
  runIds: string[]
  /** How many updates it dismissed. */
  offers: number
  chatDeleted: boolean
}

/** What the action reads its state from: the review as it shows, and the closing on its way. */
export interface ReviewCloseInput {
  review: ColleagueReview | null | undefined
  closing: ColleagueReviewCloseOutcome | undefined
  error: string | undefined
}

/** Where a review's closing stands, as its action draws it. */
export type ReviewCloseView =
  | { state: 'none' }
  | { state: 'open'; label: string; error?: string }
  | { state: 'resolved'; line: string }
  | { state: 'removed'; line: string }
