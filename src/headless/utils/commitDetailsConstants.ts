/** What the backend answers when a ref is not in the local object store. */
export const GIT_REF_UNAVAILABLE_CODE = 'GIT_REF_UNAVAILABLE'

/** The words a commit chip and its hover card use. */
export const COMMIT_DETAILS_TEXT = {
  loading: 'Reading the commit…',
  missing: 'Commit not available locally',
  missingDetail: 'Fetch or pull the branch it is on to see it here.',
  failed: 'The commit could not be read.',
  open: 'Open in Git',
  copy: 'Copy the full sha',
} as const
