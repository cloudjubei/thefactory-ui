/** What a review says when it offers to close it as already on its base. */
export const REVIEW_ON_BASE_COPY = {
  close: (base: string): string => `Already on ${base} — close it`,
  closeAnyway: (base: string): string => `Close as already on ${base}…`,
  held: (base: string): string =>
    `${base} already holds this change. Closing removes its branch, recorded for restore.`,
  superseded: (base: string): string =>
    `A later commit on ${base} replaced every file it changed. Closing removes its branch, recorded for restore.`,
  lacks: (base: string, files: string): string => `${base} lacks ${files}.`,
  moreFiles: (n: number): string => `and ${n} more`,
  confirm:
    'Close it anyway? Nothing on disk is discarded — the review closes and its branch is removed, recorded for restore.',
  confirmAction: 'Close it',
  keep: 'Keep open',
  closing: 'Closing…',
} as const

/** How many of the files the base lacks the offer names before it counts the rest. */
export const REVIEW_ON_BASE_NAMED_FILES = 3

/** What the offer says when a close failed and the server said nothing more. */
export const REVIEW_ON_BASE_ERROR = 'The review could not be closed.'
