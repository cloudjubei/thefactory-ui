import type { VerificationBaselineVerdict } from '../api/generated'
import type { ProcessStatusTone } from './processView'
import type { ColleagueReviewBranchState } from './colleagueReviewBranchUpdatesTypes'

/** Where a review run keeps how bringing the base in went, on its input. */
export const REVIEW_BRANCH_UPDATES_INPUT_KEY = 'reviewBranchUpdates'

/** The step a review run asks for the push at. */
export const REVIEW_PUSH_APPROVAL_STEP_ID = 'push-approval'

/** The step a review run brings the base into each pull request in. */
export const REVIEW_UPDATE_BRANCHES_STEP_ID = 'update-branches'

/** How each state reads, and its tone. */
export const REVIEW_BRANCH_STATE_VIEW: Readonly<
  Record<ColleagueReviewBranchState, { label: string; tone: ProcessStatusTone }>
> = {
  'up-to-date': { label: 'Up to date', tone: 'done' },
  updated: { label: 'Updated', tone: 'done' },
  conflicted: { label: 'Conflict', tone: 'stuck' },
  resolved: { label: 'Resolved', tone: 'review' },
  pushed: { label: 'Pushed', tone: 'done' },
  failed: { label: 'Failed', tone: 'stuck' },
}

/** The push approval's words. */
export const REVIEW_PUSH_COPY = {
  heading: 'Approve the push',
  intro:
    'Bringing the base in conflicted. Check each resolution before it is pushed to the developer’s branch, as you.',
  introFixed:
    'The base came in with no conflict, but the result failed its checks. Check each fix before it is pushed to the developer’s branch, as you.',
  introBoth:
    'Bringing the base in needed a resolution here and a fix there. Check each before it is pushed to the developer’s branch, as you.',
  fixed: 'Fixed',
  stopped: 'Not brought in',
  files: 'Conflicted files',
  changes: 'Changes',
  showDiff: 'Show diff',
  hideDiff: 'Hide diff',
  checks: 'Checks',
  checksPassed: 'Checks passed',
  checksFailed: 'Checks failed',
  noChecks: 'No checks ran',
  checksFailOnBase: (base: string) => `Checks fail on ${base} too`,
  checksBaseNote: (labels: string, many: boolean, base: string) =>
    `${labels} ${many ? 'fail' : 'fails'} on ${base} the same way, so ${many ? 'they do' : 'it does'} not block the push.`,
  showOutput: 'Show output',
  hideOutput: 'Hide output',
  sendBack: 'Send back with a note',
} as const

/** What a check's base reads as when the run keeps no base branch. */
export const REVIEW_PUSH_UNNAMED_BASE = 'the base'

/** How a failed check of a resolution compares with the base brought in, on its chip. */
export const REVIEW_PUSH_BASE_LABELS: Readonly<
  Record<VerificationBaselineVerdict, (base: string) => string>
> = {
  'pre-existing': (base) => `fails on ${base} too`,
  'partly-pre-existing': (base) => `partly fails on ${base} too`,
  new: () => 'new on this branch',
  'not-comparable': (base) => `not compared with ${base}`,
}

/** A failure the base shares, which does not block the push: amber, as an advisory check's. */
export const REVIEW_PUSH_BASE_FAILURE_TONE: ProcessStatusTone = 'working'

/** How a check's chip reads by how it went. */
export const REVIEW_PUSH_CHECK_TONES: Readonly<Record<string, ProcessStatusTone>> = {
  passed: 'done',
  skipped: 'empty',
}
