import type { MergeChecksStatus } from 'thefactory-tools/types'
import type { GitUnifiedBranch } from '../api'
import type { CheckMethodRow } from './checkMethodTypes'

/** Which list of the Git view's sidebar a branch row sits in. */
export type GitBranchSection = 'local' | 'remote'

/** A branch the "Merge…" sheet offers as the source of a merge. */
export type GitMergeSourceOption = {
  /** What the merge is given: `dev` for a local branch, `origin/dev` for a remote one. */
  ref: string
  kind: GitBranchSection
  /** Set when the branch cannot be merged into the current one. */
  disabledReason?: string
}

/** The actions a branch's context menu offers — each one the Git view already has. */
export type GitBranchMenuAction = 'merge' | 'checkout' | 'pull-request' | 'delete'

export type GitBranchMenuItem = {
  action: GitBranchMenuAction
  label: string
  /** Shown under the item, which is disabled, when set. */
  disabledReason?: string
  destructive?: boolean
}

/** What the Git view says a merge did. */
export type GitMergeOutcomeLine = {
  tone: 'success' | 'info' | 'warning' | 'error'
  text: string
  /** The commit the branch now points at, shown as its chip. */
  sha?: string
  /** What building and type-checking the result first came to, when it was asked for. */
  checksNote?: string
}

/** A merge result's build and type check, arranged for one render. */
export type GitMergeChecksView = {
  status: MergeChecksStatus
  summary: string
  /** A chip per check method that ran — build, types — in the sign-off's order. */
  chips: CheckMethodRow[]
  /** What the failed checks printed — their failing lines first. */
  failingOutput?: string
}

export type GitBranchMenuInput = {
  branch: Pick<GitUnifiedBranch, 'name' | 'remoteName' | 'current'>
  section: GitBranchSection
  /** The checked-out branch; absent on a detached HEAD. */
  current?: string
  merging: boolean
  /** Uncommitted changes to tracked files block a checkout. */
  isDirty: boolean
  canCreatePullRequest: boolean
}
