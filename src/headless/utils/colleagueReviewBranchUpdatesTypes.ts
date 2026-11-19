import type { VerificationBaselineVerdict } from '../api/generated'
import type { ProcessStatusTone } from './processView'

/** Where bringing the base into one pull request stands, as the run keeps it. */
export type ColleagueReviewBranchState =
  | 'up-to-date'
  | 'updated'
  | 'conflicted'
  | 'resolved'
  | 'pushed'
  | 'failed'

/** How a check that failed on a resolution went at the base brought in. */
export interface ColleagueReviewBranchCheckBaseline {
  sha: string
  status?: string
  verdict: VerificationBaselineVerdict
  reason?: string
}

/** One check run on a resolution. */
export interface ColleagueReviewBranchCheck {
  label: string
  status: string
  summary: string
  /** How the same check went at the base, when it failed here and was compared there. */
  baseline?: ColleagueReviewBranchCheckBaseline
  /** The end of what it printed, when it did not pass. */
  outputTail?: string
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
  tone: ProcessStatusTone
  /** How it compares with the base: "fails on dev too", "new on this branch". */
  baseLabel?: string
  /** The comparison in one sentence, naming the base commit. */
  baseDetail?: string
  outputTail?: string
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
  /** The badge saying how its checks went; absent when none ran. */
  checksBadge?: { label: string; tone: ProcessStatusTone }
  /** Why failures the base shares do not block the push, when any did not. */
  checksNote?: string
}
