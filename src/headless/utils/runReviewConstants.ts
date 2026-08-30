import type {
  CliRunLandFailureReason,
  CliRunVerdict,
  CliRunVerdictAuthor,
  VerificationCheckStatus,
} from '../api/generated'
import type { ReviewTone, VerificationHeadlineStatus } from './runReviewTypes'

export const VERIFICATION_STATUS_TONES: Record<VerificationHeadlineStatus, ReviewTone> = {
  passed: 'positive',
  failed: 'danger',
  error: 'danger',
  'not-run': 'neutral',
}

export const VERIFICATION_STATUS_LABELS: Record<VerificationHeadlineStatus, string> = {
  passed: 'Checks passed',
  failed: 'Checks failed',
  error: 'Checks errored',
  'not-run': 'Not verified',
}

export const CHECK_STATUS_TONES: Record<VerificationCheckStatus, ReviewTone> = {
  passed: 'positive',
  failed: 'danger',
  error: 'danger',
  skipped: 'neutral',
}

export const VERDICT_LABELS: Record<CliRunVerdict['decision'], string> = {
  approved: 'Approved',
  'changes-requested': 'Changes requested',
  rejected: 'Rejected',
}

export const VERDICT_TONES: Record<CliRunVerdict['decision'], ReviewTone> = {
  approved: 'positive',
  'changes-requested': 'warning',
  rejected: 'danger',
}

export const VERDICT_AUTHOR_LABELS: Record<CliRunVerdictAuthor, string> = {
  user: 'you',
  'reviewer-agent': 'the reviewer agent',
}

export const LAND_FAILURE_REASON_LABELS: Record<CliRunLandFailureReason, string> = {
  'not-a-git-repo': 'the project is not a git repository',
  'detached-head': 'the project checkout is on a detached HEAD',
  'commit-failed': 'the review commit could not be created',
  error: 'the review branch could not be created',
}

export const LAND_FAILURE_TITLE = 'Changes were not landed for review'

export const NOT_VERIFIED_DETAIL = 'No checks have run against these changes yet.'

export const NO_CHECKS_DETAIL = 'No checks configured'

export const MERGE_FAILED_FALLBACK = 'Merge failed'

export const MERGE_BLOCKED_FALLBACK = 'Verification must pass before this run can be merged'

/**
 * Preface for the message a change request sends into the chat.
 *
 * "Request changes" recorded a verdict and nothing else — the notes reached the
 * run record and never the agent, so a user who typed what to fix and waited
 * was waiting on a message nobody had sent. The request now goes back into the
 * conversation, and this frames it as review feedback on the last run rather
 * than as an unrelated new instruction.
 */
export const CHANGE_REQUEST_MESSAGE_PREFIX =
  'Requested changes on your last run (the review branch is kept, so build on it):'
