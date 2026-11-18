import type { ProcessStatusTone } from './processView'
import type { ReviewMergeJob, ReviewMergePullRequestState } from './colleagueReviewMergeTypes'

/** A repository the backend's: its pull request merges first. */
export const REVIEW_MERGE_BACKEND_REPO = /(-be$|backend)/i

export const REVIEW_MERGE_PR_VIEW: Record<
  ReviewMergePullRequestState,
  { label: string; tone: ProcessStatusTone }
> = {
  queued: { label: 'Waiting its turn', tone: 'queued' },
  'waiting-for-checks': { label: 'Waiting for checks', tone: 'working' },
  'marking-viewed': { label: 'Marking files viewed', tone: 'working' },
  approving: { label: 'Approving', tone: 'working' },
  merging: { label: 'Merging', tone: 'working' },
  merged: { label: 'Merged', tone: 'done' },
  failed: { label: 'Failed', tone: 'stuck' },
  skipped: { label: 'Skipped', tone: 'empty' },
}

export const REVIEW_MERGE_STATE_VIEW: Record<
  ReviewMergeJob['state'],
  { label: string; tone: ProcessStatusTone }
> = {
  running: { label: 'Merging', tone: 'working' },
  merged: { label: 'Merged', tone: 'done' },
  failed: { label: 'Stopped', tone: 'stuck' },
}

export const REVIEW_MERGE_TEXT = {
  button: 'Approve & merge',
  heading: 'Approve & merge',
  starting: 'Starting…',
  confirmTitle: 'Approve and merge?',
  confirmBody: 'Approved and merged in this order, the backend’s first:',
  slackLine: 'Slack message',
  slackHint: 'Posted in the update’s thread once every pull request merged.',
  slackPlaceholder: 'The group’s merged message',
  confirm: 'Approve & merge',
  cancel: 'Cancel',
  mergeAnyway: 'Merge anyway',
  posted: 'Posted in Slack',
  notPosted: (why: string) => `Not posted in Slack: ${why}`,
  failed: 'The merge did not start.',
  readFailed: 'Could not read the merge.',
} as const
