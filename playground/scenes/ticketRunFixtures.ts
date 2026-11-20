import { COLLEAGUE_REVIEW_PROCESS_DEFINITION } from 'thefactory-tools/constants'
import type { ProcessGroupRun, ProcessLedgerEntry, ProcessRun } from 'thefactory-tools/types'
import {
  groupTicketPageView,
  reviewRunWorkingView,
  ticketRunIndex,
  type GroupTicketOverview,
  type GroupTicketPageState,
  type ReviewMergeJob,
  type TicketRunIndex,
  type UseReviewChatSlot,
} from 'thefactory-ui/headless'
import { OSC_TABS, OVERVIEW_FULL, TABS_NOW } from './groupTicketTabsFixtures'
import { chatSlot } from './reviewChatSlotFixtures'
import { REVIEW_RUN_PUSH_PASSED } from './reviewRunRoundsFixtures'

const GROUP = 'osc'
const MINUTES_AGO = (n: number) => TABS_NOW - n * 60_000

const BE_PR = 'https://github.com/acme/compass-be/pull/392'
const WEB_PR = 'https://github.com/acme/compass-web-user/pull/302'

const entry = (
  stepId: string,
  minutesAgo: number,
  outcome?: ProcessLedgerEntry['outcome'],
): ProcessLedgerEntry =>
  ({
    id: `e-${stepId}`,
    stepId,
    iteration: 1,
    status: outcome ? 'done' : 'running',
    startedAt: MINUTES_AGO(minutesAgo),
    ...(outcome ? { outcome, endedAt: MINUTES_AGO(minutesAgo - 1) } : {}),
  }) as ProcessLedgerEntry

const DONE_TO_MERGE = [
  entry('review', 60, 'passed'),
  entry('approval', 40, 'passed'),
  entry('update-branches', 14, 'passed'),
  entry('push-approval', 13, 'skipped'),
  entry('push', 13, 'skipped'),
]

/** A colleague review run of one of OSC's tickets, on the seeded process. */
const reviewRun = (ticketKey: string, over: Partial<ProcessRun>): ProcessRun =>
  ({
    id: `run-${ticketKey}`,
    projectId: 'compass-be',
    title: `Review of ${ticketKey}, round 1`,
    plan: {
      definitionId: 'colleague-review',
      definitionScope: 'global',
      definitionVersion: 2,
      name: COLLEAGUE_REVIEW_PROCESS_DEFINITION.name,
      steps: COLLEAGUE_REVIEW_PROCESS_DEFINITION.steps,
      loops: COLLEAGUE_REVIEW_PROCESS_DEFINITION.loops,
      frozenAt: 0,
    },
    status: 'running',
    loopCounts: {},
    ledger: [],
    startedAt: MINUTES_AGO(60),
    updatedAt: MINUTES_AGO(1),
    chatContextId: `/groups/${GROUP}/topics/review-${ticketKey}`,
    ticketReview: { groupId: GROUP, ticketKey, round: 1 },
    input: {},
    ...over,
  }) as unknown as ProcessRun

/** OSC-409, the person's: the run brought the base in and waits for them to approve the push. */
export const RUN_AT_PUSH = reviewRun('OSC-409', {
  status: 'parked',
  cursor: { stepId: 'push-approval', iteration: 1 },
  ledger: DONE_TO_MERGE.slice(0, 3),
  park: { reason: 'gate', stepId: 'push-approval', message: 'Approve the push', parkedAt: 1 },
  input: REVIEW_RUN_PUSH_PASSED.input,
} as Partial<ProcessRun>)

/** OSC-409's slot: the run's own push approval, as its review chat shows it. */
export const PUSH_SLOT: UseReviewChatSlot = chatSlot({
  kind: 'run-push',
  run: RUN_AT_PUSH,
  liveRun: RUN_AT_PUSH,
})

/** OSC-398: merging, the backend's pull request merged, the web one waiting on its checks. */
export const RUN_MERGING = reviewRun('OSC-398', {
  cursor: { stepId: 'merge', iteration: 1 },
  ledger: [...DONE_TO_MERGE, entry('merge', 12)],
} as Partial<ProcessRun>)

/** OSC-402: bringing the base into its pull requests after the person chose Approve & merge. */
export const RUN_BRINGING_BASE = reviewRun('OSC-402', {
  cursor: { stepId: 'update-branches', iteration: 1 },
  ledger: [...DONE_TO_MERGE.slice(0, 2), entry('update-branches', 2)],
} as Partial<ProcessRun>)

/** OSC-407: the run failed at its merge. */
export const RUN_FAILED = reviewRun('OSC-407', {
  status: 'failed',
  endedAt: MINUTES_AGO(5),
  cursor: { stepId: 'merge', iteration: 1 },
  ledger: [...DONE_TO_MERGE, entry('merge', 8, 'failed')],
} as Partial<ProcessRun>)

/** OSC-405: the reply is posted, the run waits for the developer. */
export const RUN_WAITING_DEVELOPER = reviewRun('OSC-405', {
  status: 'parked',
  cursor: { stepId: 'await-update', iteration: 1 },
  ledger: [
    entry('review', 50, 'passed'),
    entry('approval', 45, 'passed'),
    entry('reply', 44, 'passed'),
  ],
  park: {
    reason: 'step-waiting',
    stepId: 'await-update',
    message: 'Waiting for a reply in Aashan’s thread',
    parkedAt: 1,
    ask: {
      kind: 'blocker',
      agent: 'host',
      title: 'Waiting for a reply in Aashan’s thread',
      detail: 'The reply is posted.',
      outside: { awaits: 'a reply in Aashan’s thread' },
    },
  },
} as Partial<ProcessRun>)

/** OSC-412's group story building, both projects going. */
export const GROUP_RUN_BUILDING = {
  id: 'group-run-renewal',
  groupId: GROUP,
  groupStoryId: 'gs-renewal',
  title: 'Renewal date on the plan page',
  status: 'running',
  legs: [
    { id: 'leg-be', projectId: 'compass-be', status: 'running' },
    { id: 'leg-web', projectId: 'compass-web-user', status: 'waiting' },
  ],
  startedAt: MINUTES_AGO(30),
  updatedAt: MINUTES_AGO(2),
} as unknown as ProcessGroupRun

/** An approve-and-merge of OSC-398's round 1 as the backend tells it. */
const mergeJob = (over: Partial<ReviewMergeJob>): ReviewMergeJob => ({
  jobId: 'merge-398',
  groupId: GROUP,
  ticketKey: 'OSC-398',
  round: 1,
  state: 'running',
  startedAt: new Date(MINUTES_AGO(12)).toISOString(),
  pullRequests: [
    { url: BE_PR, state: 'queued' },
    { url: WEB_PR, state: 'queued' },
  ],
  ...over,
})

/** The backend's pull request waits on its checks; the web one waits its turn. */
export const MERGE_FIRST_CHECKS = mergeJob({
  pullRequests: [
    { url: BE_PR, state: 'waiting-for-checks', detail: 'Waiting on build, unit (1 of 3 done).' },
    { url: WEB_PR, state: 'queued' },
  ],
})

/** The backend's merged; the web one waits on its Playwright check. */
export const MERGE_ONE_MERGED = mergeJob({
  pullRequests: [
    { url: BE_PR, state: 'merged', detail: 'Merged as 8f2c1d0' },
    {
      url: WEB_PR,
      state: 'waiting-for-checks',
      detail: 'Waiting on playwright (4 of 5 done), 11 min so far.',
    },
  ],
})

/** The web pull request's Playwright check failed: it stopped there. */
export const MERGE_STOPPED = mergeJob({
  state: 'failed',
  finishedAt: new Date(MINUTES_AGO(1)).toISOString(),
  pullRequests: [
    { url: BE_PR, state: 'merged', detail: 'Merged as 8f2c1d0' },
    { url: WEB_PR, state: 'failed', detail: 'Required check “playwright” failed.' },
  ],
  summary: `Stopped at ${WEB_PR}: Required check “playwright” failed.`,
})

/** Both merged, the thanks posted and the ticket moved; the run writes its report. */
export const MERGE_DONE = mergeJob({
  state: 'merged',
  finishedAt: new Date(MINUTES_AGO(1)).toISOString(),
  pullRequests: [
    { url: BE_PR, state: 'merged', detail: 'Merged as 8f2c1d0' },
    { url: WEB_PR, state: 'merged', detail: 'Merged as 51aa9e3' },
  ],
  summary: 'Merged 2 pull requests',
  slack: {
    posted: true,
    permalink: 'https://acme.slack.com/archives/C07REVIEWS/p1763381400000400',
  },
  ticket: { moved: true, status: 'In QA', from: 'In Review', detail: 'Moved OSC-398 to In QA' },
})

/** OSC's runs as the Tickets tab reads them once for the list. */
export const TICKET_RUNS: TicketRunIndex = ticketRunIndex(
  GROUP,
  [RUN_AT_PUSH, RUN_MERGING, RUN_BRINGING_BASE, RUN_FAILED, RUN_WAITING_DEVELOPER],
  [GROUP_RUN_BUILDING],
)

/** The merges of the tickets whose review run works, as the list reads them. */
export const TICKET_MERGES: Readonly<Record<string, ReviewMergeJob>> = {
  'OSC-398': MERGE_ONE_MERGED,
}

/** OSC-398's run at a step of its own: on its merge, or writing its report once merged. */
const runAt = (stepId: string): ProcessRun =>
  stepId === 'merge'
    ? RUN_MERGING
    : reviewRun('OSC-398', {
        cursor: { stepId, iteration: 1 },
        ledger: [...DONE_TO_MERGE, entry('merge', 12, 'passed'), entry(stepId, 1)],
      } as Partial<ProcessRun>)

/** The review chat's slot while the run works off the chat, following its merge. */
export const workingSlot = (
  job: ReviewMergeJob | undefined,
  stepId = 'merge',
): UseReviewChatSlot => {
  const run = runAt(stepId)
  return chatSlot({
    kind: 'run-working',
    run,
    liveRun: run,
    working: reviewRunWorkingView(run, job, TABS_NOW),
  })
}

/** The review chat's slot while the run brings the base in, before its merge. */
export const BRINGING_BASE_SLOT: UseReviewChatSlot = (() => {
  const run = RUN_BRINGING_BASE
  return chatSlot({
    kind: 'run-working',
    run,
    liveRun: run,
    working: reviewRunWorkingView(run, undefined, TABS_NOW),
  })
})()

/** OSC-409's page as it reads with its run, the merge of a working one followed. */
export const pageWithRun = (
  overview: GroupTicketOverview,
  runs: ProcessRun[],
  merges: Readonly<Record<string, ReviewMergeJob>> = {},
): GroupTicketPageState => ({
  kind: 'page',
  page: groupTicketPageView(
    overview.ticket?.key ?? 'OSC-409',
    overview,
    OSC_TABS,
    TABS_NOW,
    undefined,
    { index: ticketRunIndex(GROUP, runs, []), merges },
  ),
  refreshing: false,
})

/** OSC-409's page while its run waits to have the push approved. */
export const PAGE_AT_PUSH = pageWithRun(OVERVIEW_FULL, [RUN_AT_PUSH])

/** OSC-398's overview: OSC-409's page as OSC-398, for its merging run. */
export const OVERVIEW_398: GroupTicketOverview = {
  ...OVERVIEW_FULL,
  ticket: {
    ...OVERVIEW_FULL.ticket!,
    key: 'OSC-398',
    summary: 'Streak counter resets at midnight in the wrong time zone',
  },
}

/** OSC-398's page while its run merges. */
export const PAGE_MERGING = pageWithRun(OVERVIEW_398, [RUN_MERGING], TICKET_MERGES)
