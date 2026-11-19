import type { ColleagueReviewMode } from './colleagueReviewStartTypes'
/** A ticket's review chat is the group topic `review-<KEY>`, apart from its own `ticket-<KEY>` chat. */
export const COLLEAGUE_REVIEW_TOPIC_PREFIX = 'review-'

/** How long a pasted update may be, as the backend takes it. */
export const COLLEAGUE_REVIEW_TEXT_MAX_CHARS = 100_000

/** How many files one update may bring, as the backend takes them. */
export const COLLEAGUE_REVIEW_FILES_MAX = 50

/** The event the backend sends when a ticket's review changes, whoever changed it. */
export const COLLEAGUE_REVIEWS_EVENT = 'colleagueReviews:updated'

export const REVIEW_START_TEXT = {
  review: 'Review',
  nextRound: 'Next round',
  reviewOpen: 'Review open',
  title: (key: string) => `Review ${key}`,
  nextTitle: (key: string) => `Next round of ${key}`,
  update: 'Their update',
  placeholder: 'Paste what they wrote: pull requests, recordings, links.',
  attach: 'Attach files',
  filesHint: 'Screenshots, documents, a video or a transcript.',
  start: 'Start review',
  startNext: 'Start round',
  uploading: (done: number, total: number) => `Files ${done}/${total}…`,
  starting: 'Starting…',
  failed: 'The review did not start.',
  uploadFailed: (name: string) => `${name} did not upload.`,
  empty: 'Paste their update first.',
  tooLong: (max: number) => `The update is longer than ${max.toLocaleString('en-GB')} characters.`,
  tooMany: (max: number) => `Up to ${max} files.`,
  remove: (name: string) => `Remove ${name}`,
  reviewTicket: (key: string) => `Review ${key}`,
  nextRoundOf: (key: string) => `Start the next round of ${key}`,
  mode: 'Review it',
  modeInline: 'In chat',
  modeProcess: 'As a run',
  modeInlineHint: 'In the ticket’s review chat; you decide on a card at the end.',
  modeProcessHint: 'As a run; you decide at its approval. Nothing is posted or merged before.',
  agent: 'Agent',
} as const

/** The ways a round may be reviewed, in the order the choice offers them. */
export const COLLEAGUE_REVIEW_MODES: readonly ColleagueReviewMode[] = ['inline', 'process']
