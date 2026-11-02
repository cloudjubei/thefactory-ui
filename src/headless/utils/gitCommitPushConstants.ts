/** The words of the commit dialog's commit-and-push, on every client. */
export const GIT_COMMIT_PUSH_TEXT = {
  commit: 'Commit',
  amend: 'Amend',
  commitMerge: 'Commit merge',
  andPush: ' & Push',
  committing: 'Committing…',
  pushing: 'Pushing…',
  pushAgain: 'Push',
  pushAfter: 'Push to origin after commit',
  pushFailed: (reason: string) => `Committed. The push failed: ${reason}`,
} as const
