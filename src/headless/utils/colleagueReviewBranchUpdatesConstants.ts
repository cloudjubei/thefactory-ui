import type { ProcessStatusTone } from './processView'
import type { ColleagueReviewBranchState } from './colleagueReviewBranchUpdatesTypes'

/** Where a review run keeps how bringing the base in went, on its input. */
export const REVIEW_BRANCH_UPDATES_INPUT_KEY = 'reviewBranchUpdates'

/** The step a review run asks for the push at. */
export const REVIEW_PUSH_APPROVAL_STEP_ID = 'push-approval'

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
  files: 'Conflicted files',
  changes: 'Changes',
  showDiff: 'Show diff',
  hideDiff: 'Hide diff',
  checks: 'Checks',
  checksPassed: 'Checks passed',
  checksFailed: 'Checks failed',
  noChecks: 'No checks ran',
  sendBack: 'Send back with a note',
} as const
