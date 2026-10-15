/** What the card about a chat's open changes says. */
export const OPEN_CHANGES_CARD_COPY = {
  title: 'Open changes',
  loading: 'Reading the open changes…',
  unfit: (changed: number, total: number) =>
    `This chat's open changes no longer fit your checkout — ${changed} of ${total} files changed since.`,
  waiting: (since: string, total: number) =>
    `Waiting for you since ${since} · ${total} ${total === 1 ? 'file' : 'files'}`,
  fitsAgain: 'They fit your checkout again.',
  merged: 'Merged.',
  discarded: 'Discarded.',
  settled: 'No longer waiting.',
  conflicts: (paths: readonly string[]) =>
    `These files conflict, so nothing was changed: ${paths.join(', ')}`,
  view: 'View',
  hide: 'Hide',
  discard: 'Discard',
  confirmDiscard: 'Discard these changes? This cannot be undone.',
  keep: 'Keep',
  discarding: 'Discarding…',
  rebuild: 'Rebuild on current',
  rebuilding: 'Rebuilding…',
} as const

/** What the card says when the open changes could not be read or acted on, and the server said nothing more. */
export const OPEN_CHANGES_CARD_ERROR = 'The open changes could not be reached.'
