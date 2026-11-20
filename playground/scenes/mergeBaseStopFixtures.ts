import {
  COLLEAGUE_REVIEW_PROCESS_DEFINITION,
  PROCESS_MANAGER_INPUT_KEY,
} from 'thefactory-tools/constants'
import type { ColleagueReview, ProcessLedgerEntry, ProcessRun } from 'thefactory-tools/types'
import { reviewCardMerge } from '../../src/headless/utils/colleagueReviewMerge'
import type {
  ReviewCardMerge,
  ReviewMergeChoosing,
  ReviewMergeJob,
} from '../../src/headless/utils/colleagueReviewMergeTypes'

/** The colleague review run whose merge stopped on a pull request's base. */
export const MERGE_BASE_STOP_RUN_ID = 'run-merge-base-stop'

const PARKED_AT = Date.parse('2026-11-20T09:40:00Z')
const BE = 'https://github.com/acme/coach-be/pull/418'
const WEB = 'https://github.com/acme/coach-web/pull/77'
const ASK =
  '@Ana coach-be#418 conflicts with main in src/billing/invoice.ts and src/billing/invoice.test.ts — could you bring main in and resolve it? Then I’ll merge.'
const NOT_MERGED = `Stopped at ${BE}: GitHub did not merge it: Pull Request has merge conflicts`

const conflict: NonNullable<ReviewMergeJob['baseConflict']> = {
  pullRequestUrl: BE,
  name: 'coach-be#418',
  baseBranch: 'main',
  conflicts: true,
  files: ['src/billing/invoice.ts', 'src/billing/invoice.test.ts'],
  developer: 'Ana',
  ask: ASK,
}

const stoppedJob = (
  over: Partial<ReviewMergeJob['baseConflict'] & object> = {},
): ReviewMergeJob => ({
  jobId: 'job-1',
  groupId: 'coach',
  ticketKey: 'COACH-799',
  round: 2,
  state: 'failed',
  startedAt: '2026-11-20T09:30:00.000Z',
  finishedAt: '2026-11-20T09:31:00.000Z',
  summary: NOT_MERGED,
  pullRequests: [
    {
      url: BE,
      state: 'failed',
      detail: 'GitHub did not merge it: Pull Request has merge conflicts',
    },
    { url: WEB, state: 'skipped', detail: `Not merged: ${BE} did not merge` },
  ],
  baseConflict: { ...conflict, ...over },
})

const review = {
  rounds: [
    {
      n: 1,
      recordedAt: '2026-11-19T09:00:00.000Z',
      submission: { pullRequests: [] },
      reviewedHeads: [],
    },
    {
      n: 2,
      recordedAt: '2026-11-20T09:00:00.000Z',
      submission: {
        pullRequests: [
          { url: BE, host: 'github', owner: 'acme', repo: 'coach-be', number: 418 },
          { url: WEB, host: 'github', owner: 'acme', repo: 'coach-web', number: 77 },
        ],
      },
      reviewedHeads: [],
    },
  ],
} as unknown as ColleagueReview

const merge = (job: ReviewMergeJob, choosing?: ReviewMergeChoosing): ReviewCardMerge =>
  reviewCardMerge(review, 2, {
    job,
    readError: undefined,
    starting: undefined,
    refusal: undefined,
    actionError: undefined,
    choosing,
  })!

/** The inline merge stopped: the backend's pull request conflicts with main on two files. */
export const MERGE_STOPPED_ON_BASE = merge(stoppedJob())

/** The person pressed Resolve it here: shown at once while the review run starts. */
export const MERGE_RESOLVE_STARTING = merge(stoppedJob(), { kind: 'resolve' })

/** The review run resolves it: the stop says so in place of the choices. */
export const MERGE_RESOLVING_IN_RUN = merge(
  stoppedJob({ resolving: { at: '2026-11-20T09:32:00.000Z', runId: MERGE_BASE_STOP_RUN_ID } }),
)

/** The person asked Ana in the update's thread; the post is linked. */
export const MERGE_ASKED_DEVELOPER = merge(
  stoppedJob({
    asked: {
      at: '2026-11-20T09:32:00.000Z',
      permalink: 'https://acme.slack.com/archives/C0REVIEW/p1700000900000100',
    },
  }),
)

/** The head only lacks main's commits: nothing conflicts, and the ask says so. */
export const MERGE_BEHIND_BASE = merge(
  stoppedJob({
    conflicts: false,
    files: [],
    developer: undefined,
    ask: 'coach-be#418 is behind main — could you bring main in? Then I’ll merge.',
  }),
)

const done = (over: Partial<ProcessLedgerEntry> & Pick<ProcessLedgerEntry, 'id' | 'stepId'>) =>
  ({
    iteration: 1,
    status: 'done',
    outcome: 'passed',
    startedAt: PARKED_AT - 3_600_000,
    endedAt: PARKED_AT - 1_800_000,
    ...over,
  }) as ProcessLedgerEntry

const plan: ProcessRun['plan'] = {
  definitionId: COLLEAGUE_REVIEW_PROCESS_DEFINITION.id,
  definitionScope: 'global',
  definitionVersion: COLLEAGUE_REVIEW_PROCESS_DEFINITION.version,
  name: COLLEAGUE_REVIEW_PROCESS_DEFINITION.name,
  frozenAt: 0,
  steps: COLLEAGUE_REVIEW_PROCESS_DEFINITION.steps,
  loops: COLLEAGUE_REVIEW_PROCESS_DEFINITION.loops,
}

const run = (
  ledger: ProcessLedgerEntry[],
  park: NonNullable<ProcessRun['park']>,
  input: Record<string, unknown> = {},
): ProcessRun => ({
  id: MERGE_BASE_STOP_RUN_ID,
  projectId: 'coach-be',
  title: 'Review of COACH-799, round 2',
  input: { runner: 'api', [PROCESS_MANAGER_INPUT_KEY]: { enabled: false }, ...input },
  ticketReview: { groupId: 'coach', ticketKey: 'COACH-799', round: 2 },
  status: 'parked',
  loopCounts: {},
  startedAt: PARKED_AT - 3_600_000,
  updatedAt: PARKED_AT,
  plan,
  ledger,
  park,
})

const approved = [
  done({
    id: 'review-1',
    stepId: 'review',
    summary: 'Round 2 is recorded and waits for your decision.',
  }),
  done({
    id: 'approval-1',
    stepId: 'approval',
    override: { choice: 'approve', at: 1, gateAction: { id: 'approve-and-merge' } },
  }),
  done({ id: 'reply-1', stepId: 'reply', outcome: 'skipped' }),
  done({ id: 'await-1', stepId: 'await-update', outcome: 'skipped' }),
]

/** The run's merge stopped on the backend's pull request: resolve it here, or ask Ana. */
export const RUN_MERGE_STOPPED_ON_BASE = run(
  [
    ...approved,
    done({ id: 'update-1', stepId: 'update-branches', summary: 'The base is in all 2.' }),
    done({ id: 'push-approval-1', stepId: 'push-approval', outcome: 'skipped' }),
    done({ id: 'push-1', stepId: 'push', outcome: 'skipped' }),
    done({
      id: 'merge-1',
      stepId: 'merge',
      outcome: 'failed',
      summary: NOT_MERGED,
      failureReason: NOT_MERGED,
      recoveries: [
        {
          id: 'resolve-here',
          label: 'Resolve it here',
          detail:
            'Bring main in and resolve it in a checkout of its own; you approve the push, then it merges.',
          decidesGate: { gate: 'approval', action: 'approve-and-merge' },
        },
        {
          id: 'ask-developer',
          label: 'Ask Ana',
          detail:
            'Post the message, as you edit it, in the update’s thread, then wait for the answer.',
          decidesGate: { gate: 'approval', action: 'send-reply', text: ASK },
        },
      ],
    }),
  ],
  {
    reason: 'step-failed',
    stepId: 'merge',
    message: `Merge did not pass: ${NOT_MERGED}. Choose how to go on, or stop here.`,
    parkedAt: PARKED_AT,
  },
)

const TYPE_ERROR =
  "e2e/billing/invoice.spec.ts(42,23): error TS2339: Property 'submitInvoiceButton' does not exist on type 'InvoicePage'."
const CHECKS_FAILED = `Stopped at ${WEB}: Not brought in: The merged result 9f3c2e1 fails its type check.`

/** Bringing main into the web app's pull request: its merged result fails the project's type check, so nothing was brought in. */
export const RUN_BASE_CHECKS_FAILED = run(
  [
    ...approved,
    done({
      id: 'update-1',
      stepId: 'update-branches',
      outcome: 'failed',
      summary: CHECKS_FAILED,
      failureReason: `${CHECKS_FAILED}\n\nType check: 1 type error\n${TYPE_ERROR}`,
    }),
  ],
  {
    reason: 'step-failed',
    stepId: 'update-branches',
    message: `Bring the base in did not pass: ${CHECKS_FAILED}\n\nType check: 1 type error\n${TYPE_ERROR}. Choose how to go on, or stop here.`,
    parkedAt: PARKED_AT,
  },
  {
    reviewBranchUpdates: [
      { pullRequestUrl: BE, state: 'up-to-date', detail: 'Has main already.' },
      {
        pullRequestUrl: WEB,
        state: 'failed',
        headSha: 'a'.repeat(40),
        baseBranch: 'main',
        headBranch: 'feature/COACH-799',
        detail: 'Not brought in: The merged result 9f3c2e1 fails its type check.',
        checks: [
          { label: 'Build', status: 'passed', summary: 'built' },
          {
            label: 'Type check',
            status: 'failed',
            summary: '1 type error',
            outputTail: TYPE_ERROR,
          },
        ],
        checksPassed: false,
      },
    ],
  },
)
