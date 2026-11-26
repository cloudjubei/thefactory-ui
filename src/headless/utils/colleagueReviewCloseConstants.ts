import type { ColleagueReviewCloseOutcome, ColleagueReviewClosure } from 'thefactory-tools/types'

/** How long the note a review is closed with may be. */
export const REVIEW_CLOSE_NOTE_MAX_CHARS = 2000

/** The outcomes the confirm offers, in order. */
export const REVIEW_CLOSE_OUTCOMES: readonly ColleagueReviewCloseOutcome[] = ['resolved', 'remove']

/** The outcome the confirm opens on. */
export const REVIEW_CLOSE_DEFAULT_OUTCOME: ColleagueReviewCloseOutcome = 'resolved'

/** Who closed a review, as its closed line says it. */
export const REVIEW_CLOSED_BY_TEXT: Record<ColleagueReviewClosure['by'], string> = {
  person: 'Resolved by you',
  agent: 'Resolved by the agent, with your approval',
  manager: 'Resolved by the manager, with your approval',
  host: 'Resolved',
}

/** What closing a review says. */
export const REVIEW_CLOSE_TEXT = {
  action: 'Close this review',
  title: (ticketKey: string) => `Close the review of ${ticketKey}?`,
  labels: { resolved: 'Resolved', remove: 'Remove' },
  when: {
    resolved: 'It was handled outside Overseer, or needs nothing more.',
    remove: 'It should not have been started.',
  },
  resolved: {
    kept: 'The review is kept and marked closed.',
    run: 'Its run ends as resolved.',
    offers: 'Updates waiting on it are dismissed.',
    again: 'A new message from the developer can start a new round.',
  },
  remove: {
    deleted: 'The review and its chat are deleted.',
    run: 'Its run ends.',
    offers: 'Its updates are dismissed, the one it started from too.',
  },
  nothingPosted: 'Nothing is posted to Slack or GitHub.',
  noteLabel: 'Note',
  notePlaceholder: 'Optional: why, in a line',
  confirm: { resolved: 'Close as resolved', remove: 'Remove the review' },
  cancel: 'Cancel',
  removed: 'Review removed.',
  failed: 'The review was not closed.',
} as const
