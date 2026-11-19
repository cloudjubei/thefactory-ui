import type { ProcessStatusTone } from './processView'

/** Where bringing the base into one pull request stands, as the run keeps it. */
export type ColleagueReviewBranchState =
  | 'up-to-date'
  | 'updated'
  | 'conflicted'
  | 'resolved'
  | 'pushed'
  | 'failed'

/** One check run on a resolution. */
export interface ColleagueReviewBranchCheck {
  label: string
  status: string
  summary: string
}

/** Bringing the base into one pull request of the round, as the run keeps it on its input. */
export interface ColleagueReviewBranchUpdate {
  pullRequestUrl: string
  state: ColleagueReviewBranchState
  headSha?: string
  newHeadSha?: string
  baseBranch?: string
  headBranch?: string
  baseSha?: string
  detail?: string
  conflictedFiles?: string[]
  diffStat?: string
  diff?: string
  checks?: ColleagueReviewBranchCheck[]
  checksPassed?: boolean
  worktree?: string
}

/** One check as its chip shows it. */
export interface ColleagueReviewBranchCheckRow {
  label: string
  summary: string
  passed: boolean
}

/** One pull request's row on the push approval. */
export interface ColleagueReviewBranchRow {
  url: string
  /** "osc-be #418". */
  name: string
  stateLabel: string
  tone: ProcessStatusTone
  detail?: string
  /** "dev into feature/418". */
  branches?: string
  files: string[]
  diffStat?: string
  diff?: string
  checks: ColleagueReviewBranchCheckRow[]
  /** Whether its checks passed; absent when none ran. */
  checksPassed?: boolean
}
