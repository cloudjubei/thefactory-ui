/** What the group's merge checks in Settings say. */
export const REVIEW_MERGE_CHECKS_TEXT = {
  heading: 'Checks to merge',
  hint: 'Merging waits for each ticked check. Untick a flaky one to merge even when it fails.',
  required: 'Required to merge',
  requiredOf: (name: string) => `${name}: required to merge`,
  loading: 'Reading checks…',
  none: 'No checks seen yet. They show once a review has pull requests.',
  notRead: (error: string) => `Not read: ${error}`,
  readFailed: 'The checks could not be read',
  setFailed: 'The check could not be saved',
} as const
