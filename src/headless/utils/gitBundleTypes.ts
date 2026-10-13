import type { GitLogCommit, GitStashListItem, GitStatus, GitUnifiedBranch } from '../api'

/** A project's git as last read: status, branches and stashes, and the log once a screen read it. */
export type GitBundle = {
  status: GitStatus | null
  branches: GitUnifiedBranch[]
  log: GitLogCommit[]
  hasMoreLog: boolean
  stashes: GitStashListItem[]
  /** Whether `log` was read, rather than left out by a read nothing showed it for. */
  hasLog: boolean
}

/** One bundle read: `log` absent when it was not asked for. */
export type GitBundleRead = {
  status: GitStatus | null
  branches: GitUnifiedBranch[]
  stashes: GitStashListItem[]
  log?: GitLogCommit[]
}
