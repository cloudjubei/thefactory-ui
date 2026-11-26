import type {
  ColleagueReviewCloseOutcome,
  ColleagueReviewClosure,
  ProcessDecisionClient,
} from 'thefactory-tools/types'
import {
  REVIEW_CLOSE_NOTE_MAX_CHARS,
  REVIEW_CLOSE_OUTCOMES,
  REVIEW_CLOSE_TEXT,
  REVIEW_CLOSED_BY_TEXT,
} from './colleagueReviewCloseConstants'
import type {
  ReviewCloseBody,
  ReviewCloseConfirmView,
  ReviewCloseContext,
  ReviewCloseInput,
  ReviewCloseView,
} from './colleagueReviewCloseTypes'
import { timeAgo } from './time'

function goesOf(outcome: ColleagueReviewCloseOutcome, context: ReviewCloseContext): string[] {
  if (outcome === 'resolved') {
    const text = REVIEW_CLOSE_TEXT.resolved
    return [
      text.kept,
      ...(context.runOpen ? [text.run] : []),
      ...(context.offersWaiting ? [text.offers] : []),
      text.again,
    ]
  }
  const text = REVIEW_CLOSE_TEXT.remove
  return [text.deleted, ...(context.runOpen ? [text.run] : []), text.offers]
}

/**
 * The confirm closing a ticket's review asks first: the two outcomes, each
 * saying exactly what it does to what the review still holds, and that nothing
 * is posted. Pure.
 */
export function reviewCloseConfirmView(context: ReviewCloseContext): ReviewCloseConfirmView {
  return {
    title: REVIEW_CLOSE_TEXT.title(context.ticketKey),
    outcomes: REVIEW_CLOSE_OUTCOMES.map((outcome) => ({
      outcome,
      label: REVIEW_CLOSE_TEXT.labels[outcome],
      when: REVIEW_CLOSE_TEXT.when[outcome],
      goes: goesOf(outcome, context),
    })),
    nothingPosted: REVIEW_CLOSE_TEXT.nothingPosted,
    noteLabel: REVIEW_CLOSE_TEXT.noteLabel,
    notePlaceholder: REVIEW_CLOSE_TEXT.notePlaceholder,
    confirm: REVIEW_CLOSE_TEXT.confirm,
    cancel: REVIEW_CLOSE_TEXT.cancel,
  }
}

/** What closing a review sends: the outcome, the note trimmed and within its limit, and the client. Pure. */
export function reviewCloseBody(
  outcome: ColleagueReviewCloseOutcome,
  note: string | undefined,
  decidedVia: ProcessDecisionClient,
): ReviewCloseBody {
  const trimmed = note?.trim().slice(0, REVIEW_CLOSE_NOTE_MAX_CHARS)
  return { outcome, ...(trimmed ? { note: trimmed } : {}), decidedVia }
}

/** A closed review in a line: who resolved it, why when the host did, when, and the note. Pure. */
export function reviewClosedLine(closed: ColleagueReviewClosure, now: number): string {
  const parts = [
    REVIEW_CLOSED_BY_TEXT[closed.by],
    ...(closed.reason ? [closed.reason] : []),
    timeAgo(now, Date.parse(closed.at)),
  ]
  return `${parts.join(' · ')}${closed.note ? ` — “${closed.note}”` : ''}`
}

/**
 * Where a review's closing stands: nothing to close, the action (with why the
 * last try failed), closed as resolved, or removed — shown at once while the
 * removal is on its way. Pure.
 */
export function reviewCloseView(input: ReviewCloseInput, now: number): ReviewCloseView {
  const { review, closing, error } = input
  if (closing === 'remove') return { state: 'removed', line: REVIEW_CLOSE_TEXT.removed }
  if (!review) return { state: 'none' }
  if (review.closed) return { state: 'resolved', line: reviewClosedLine(review.closed, now) }
  return { state: 'open', label: REVIEW_CLOSE_TEXT.action, ...(error ? { error } : {}) }
}
