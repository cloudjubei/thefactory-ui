import type { GitChangeFileView } from './gitChangeApprovalTypes'

/** The host's tools that change a project's repository — each asks on a card, every time. */
export const GIT_CHANGE_TOOL_NAMES: readonly string[] = [
  'commitGitChanges',
  'createGitBranch',
  'moveGitBranch',
  'switchGitBranch',
  'deleteGitBranch',
  'mergeGitBranch',
  'abortGitMerge',
  'resolveGitMergeConflicts',
  'pushGitBranch',
  'pullGitBranch',
  'fetchGitRemote',
  'stageGitChanges',
  'unstageGitChanges',
  'discardGitChanges',
  'resetGitChanges',
  'stashGitChanges',
  'applyGitStash',
  'dropGitStash',
  'applyGitPatch',
  'applyGitMergePlan',
  'recoverGitText',
  'openGitPullRequest',
]

export const GIT_CHANGE_COPY = {
  kind: 'Git',
  later: 'Decide later',
  decline: 'Not now',
  approve: 'Approve',
  approveDanger: 'Approve — cannot be undone',
  editEmpty: (label: string) => `${label} cannot be empty.`,
  commitsAs: 'Committed as',
  repository: 'Repository',
  branch: 'Branch',
  run: 'Run',
  files: 'Files',
  diff: 'The change',
  diffTruncated: 'The diff is longer than this — the rest is cut.',
  gained: 'Commits it brings',
  dropped: 'Commits it drops',
  more: (n: number) => `and ${n} more`,
  waiting: 'Waiting for you to approve the git change',
  failed: 'The git change was not made',
  pullRequest: 'Open the pull request',
  pullRequestPage: 'Open a pull request from its page',
  mergeCommitted: 'Merge committed',
} as const

/** Why the card cannot be approved while a run works on the branch. */
export const GIT_CHANGE_RUN_BUSY = (runTitle: string, branch: string): string =>
  `The run “${runTitle}” is working on ${branch} right now. Stop it, or wait until it parks, before approving.`

/** What each operation's tool row says once done, before its commit. */
export const GIT_CHANGE_DONE: Record<string, string> = {
  commit: 'Committed',
  'create-branch': 'Branch created at',
  'move-branch': 'Branch moved to',
  'switch-branch': 'Checked out at',
  'delete-branch': 'Branch deleted',
  merge: 'Merged — branch at',
  'abort-merge': 'Merge aborted — back at',
  'resolve-conflicts': 'Resolved — merge still open at',
  push: 'Pushed — remote at',
  pull: 'Pulled — branch at',
  fetch: 'Fetched',
  stage: 'Staged — HEAD at',
  unstage: 'Unstaged — HEAD at',
  discard: 'Changes thrown away — HEAD at',
  reset: 'Changes thrown away — HEAD at',
  stash: 'Stashed as',
  'apply-stash': 'Stash applied — HEAD at',
  'drop-stash': 'Stash deleted — HEAD at',
  'apply-patch': 'Patch applied — HEAD at',
  'merge-plan': 'Merged — branch at',
  'recover-text': 'Recovered as text — HEAD at',
  'pull-request': 'Pushed for a pull request —',
}

/** The tool whose successful call leaves a commit receipt in place of its row. */
export const COMMIT_TOOL_NAME = 'commitGitChanges'

/** What a commit receipt says. */
export const COMMIT_RECEIPT_COPY = {
  committed: 'Committed',
  to: 'to',
  files: (n: number): string => `${n} ${n === 1 ? 'file' : 'files'}`,
  view: 'View the change',
  hide: 'Hide the change',
} as const

/** A file's status in a commit, as one letter. */
export const CHANGE_STATUS_LETTERS: Record<GitChangeFileView['status'], string> = {
  added: 'A',
  modified: 'M',
  deleted: 'D',
}
