/** The remote a remote branch without a known remote-tracking name is read from. */
export const GIT_DEFAULT_REMOTE = 'origin'

/** How many commits the "Merge…" sheet reads to count what a merge would bring in. */
export const GIT_MERGE_COUNT_LIMIT = 100

export const GIT_MERGE_TEXT = {
  currentBranch: 'This is the current branch.',
  detached: 'HEAD is detached. Check out a branch to merge into.',
  inProgress: 'A merge is in progress. Commit it or abort it first.',
  pickSource: 'Pick the branch to merge.',
  dirtyCheckout: 'Commit or stash your changes before switching branches.',
  staged: (source: string) =>
    `The merge of ${source} is staged. Review it, then commit it with the prepared message.`,
  merged: (source: string, into: string) => `Merged ${source} into ${into}.`,
  stopped: (source: string, into: string, files: string) =>
    `Merging ${source} into ${into} stopped: ${files} in conflict.`,
  abortConfirm:
    'Abort the merge? The branch and its files go back to how they were before the merge started; any conflicts you resolved are lost.',
  checkFirst: 'Build and type-check the result before merging',
  checkFirstHint: (into: string) =>
    `The merge is made in a scratch copy and the project's build and type check run on it; ${into} moves only if they pass.`,
  checkFirstDefault: (into: string) => `On by default: ${into} is the default branch.`,
  checkFirstNeedsCommit: 'Only a merge committed right away can be built first.',
  checking: (into: string) =>
    `Merging in a scratch copy, then building and type-checking the result — ${into} moves only if they pass.`,
} as const
