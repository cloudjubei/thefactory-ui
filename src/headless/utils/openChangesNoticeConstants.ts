/** What the change card says of a chat's open changes that need the person. */
export const OPEN_CHANGES_NOTICE_COPY = {
  waiting: (wait: string): string => `Waiting for you · ${wait}`,
  hours: (hours: number): string => `${hours} h`,
  days: (days: number): string => `${days} d`,
  unfit: (changed: number, total: number): string =>
    `No longer fits your checkout — ${changed} of ${total} ${total === 1 ? 'file' : 'files'} changed since`,
  conflicts: (paths: readonly string[]): string =>
    `These files conflict, so nothing was changed: ${paths.join(', ')}`,
  discard: 'Discard',
  confirmDiscard: 'Discard these changes? This cannot be undone.',
  keep: 'Keep',
  discarding: 'Discarding…',
  rebuild: 'Rebuild on current',
  rebuilding: 'Rebuilding…',
} as const

/** How many hours a wait is counted in hours before it is counted in days. */
export const OPEN_CHANGES_NOTICE_HOURS_BEFORE_DAYS = 48

/** What the card says when the open changes could not be read or acted on, and the server said nothing more. */
export const OPEN_CHANGES_NOTICE_ERROR = 'The open changes could not be reached.'
