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
  progress: (merged: number, total: number) => `${merged} of ${total} merged`,
  at: (step: string, name: string) => `${step.toLowerCase()} on ${name}`,
  separator: ' · ',
} as const

/** Where a pull request stands once it is the one the merge is at: working on it, or stopped on it. */
export const REVIEW_MERGE_AT_STATES: readonly ReviewMergePullRequestState[] = [
  'waiting-for-checks',
  'marking-viewed',
  'approving',
  'merging',
  'failed',
]

/** A merge stopped on a pull request's base: what it says, and the two ways on. */
export const REVIEW_MERGE_STOP_TEXT = {
  conflicts: (name: string, base: string, files: string) =>
    `${name} conflicts with ${base}${files ? ` in ${files}` : ''}`,
  behind: (name: string, base: string) => `${name} is behind ${base}`,
  more: (count: number) => `${count} more`,
  resolveHere: 'Resolve it here',
  ask: (developer: string | undefined) => `Ask ${developer ?? 'the developer'}`,
  askField: 'Message in the update’s thread',
  send: 'Send',
  cancel: 'Cancel',
  resolving: 'Resolving it here…',
  posting: 'Posting in the thread…',
  resolvingInRun: 'Resolving it in the review run',
  asked: (developer: string | undefined) => `Asked ${developer ?? 'the developer'} in the thread`,
  openPost: 'Open in Slack',
  failed: 'That did not go through.',
} as const

/** How many conflicted files a stop names before counting the rest. */
export const REVIEW_MERGE_STOP_MAX_FILES = 3
