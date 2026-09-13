import type {
  CliRunLandFailureReason,
  CliRunVerdict,
  CliRunVerdictAuthor,
  VerificationCheckStatus,
} from '../api/generated'
import type { ReviewTone } from './runReviewTypes'

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
  'no-source-changes': 'the run only touched files the repository ignores',
  error: 'the review branch could not be created',
}

export const LAND_FAILURE_TITLE = 'Changes were not landed for review'

/**
 * A run whose only output was ignored build files did not FAIL — there is
 * simply nothing to review. Titling that "Changes were not landed" reads as a
 * broken pipeline, which is how a verifier that merely ran a Gradle build was
 * reported for months.
 */
export const NO_SOURCE_CHANGES_TITLE = 'No source changes to review'

export const NOT_VERIFIED_DETAIL = 'No checks have run against these changes yet.'

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
 *
 * It says the WORK is carried forward, not the branch. Continuity comes from
 * seeding the next run's workspace with the open review's cumulative changes;
 * each run still lands its own branch. Promising "the branch is kept" was read
 * by the agent as "you are on that branch", and it found a base checkout.
 */
export const CHANGE_REQUEST_MESSAGE_PREFIX =
  'Requested changes on your last run (its work is carried into the next one, so build on it):'
