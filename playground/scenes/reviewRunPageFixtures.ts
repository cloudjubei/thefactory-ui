import {
  COLLEAGUE_REVIEW_PROCESS_DEFINITION,
  PROCESS_MANAGER_INPUT_KEY,
} from 'thefactory-tools/constants'
import type { ProcessLedgerEntry, ProcessRun } from 'thefactory-tools/types'
import { getChatContextKey, processRunChatContext } from 'thefactory-tools/utils'
import type { PendingQuestionGrant } from 'thefactory-ui/headless'
import type { ColleagueReviewBranchUpdate } from '../../src/headless/utils/colleagueReviewBranchUpdatesTypes'
import type { ReviewMergeJob } from '../../src/headless/utils/colleagueReviewMergeTypes'
import { REVIEW_GROUP, REVIEW_TICKET } from './colleagueReviewFixtures'
import type { FixtureRoutes } from './onFixtures'
import { MERGE_RUNNING, ROUND_TWO_WITH_PRS } from './slackReviewFixtures'

/** The colleague review run every state of its page shows. */
export const REVIEW_RUN_PAGE_ID = 'run-review-page'

const STARTED = Date.parse('2026-11-17T11:00:00.000Z')
const MINUTES = (n: number) => STARTED + n * 60_000

const BE = 'https://github.com/acme/coach-be/pull/390'
const WEB = 'https://github.com/acme/coach-web/pull/112'

const plan: ProcessRun['plan'] = {
  definitionId: COLLEAGUE_REVIEW_PROCESS_DEFINITION.id,
  definitionScope: 'global',
  definitionVersion: COLLEAGUE_REVIEW_PROCESS_DEFINITION.version,
  name: COLLEAGUE_REVIEW_PROCESS_DEFINITION.name,
  frozenAt: 0,
  steps: COLLEAGUE_REVIEW_PROCESS_DEFINITION.steps,
  loops: COLLEAGUE_REVIEW_PROCESS_DEFINITION.loops,
}

const entry = (
  stepId: string,
  at: number,
  over: Partial<ProcessLedgerEntry> = {},
): ProcessLedgerEntry =>
  ({
    id: `${stepId}-1`,
    stepId,
    iteration: 1,
    status: 'done',
    outcome: 'passed',
    startedAt: MINUTES(at),
    endedAt: MINUTES(at + 1),
    ...over,
  }) as ProcessLedgerEntry

const working = (stepId: string, at: number): ProcessLedgerEntry =>
  ({
    id: `${stepId}-1`,
    stepId,
    iteration: 1,
    status: 'running',
    startedAt: MINUTES(at),
  }) as ProcessLedgerEntry

const run = (over: Partial<ProcessRun>): ProcessRun =>
  ({
    id: REVIEW_RUN_PAGE_ID,
    projectId: 'coach-be',
    groupId: REVIEW_GROUP,
    title: `Review of ${REVIEW_TICKET}, round 2`,
    input: { runner: 'api', [PROCESS_MANAGER_INPUT_KEY]: { enabled: false } },
    ticketReview: { groupId: REVIEW_GROUP, ticketKey: REVIEW_TICKET, round: 2 },
    status: 'running',
    loopCounts: {},
    startedAt: STARTED,
    updatedAt: MINUTES(30),
    plan,
    ledger: [],
    ...over,
  }) as unknown as ProcessRun

const parked = (
  ledger: ProcessLedgerEntry[],
  park: NonNullable<ProcessRun['park']>,
  input: Record<string, unknown> = {},
): ProcessRun =>
  run({
    status: 'parked',
    cursor: { stepId: park.stepId ?? '', iteration: 1 },
    ledger,
    park,
    input: { runner: 'api', [PROCESS_MANAGER_INPUT_KEY]: { enabled: false }, ...input },
  } as Partial<ProcessRun>)

const REVIEWED = entry('review', 0, {
  summary: 'Round 2 is recorded and waits for your decision.',
})

const CHOSE_MERGE = [
  REVIEWED,
  entry('approval', 12, {
    override: { choice: 'approve', at: MINUTES(12), gateAction: { id: 'approve-and-merge' } },
  } as Partial<ProcessLedgerEntry>),
  entry('reply', 13, { outcome: 'skipped' }),
  entry('await-update', 13, { outcome: 'skipped' }),
]

/** The review step works, as turns of the run's own chat. */
export const RUN_REVIEWING = run({
  cursor: { stepId: 'review', iteration: 1 },
  ledger: [working('review', 0)],
} as Partial<ProcessRun>)

/** The round is recorded: the run waits at Your approval with the drafted reply. */
export const RUN_AT_APPROVAL = parked([REVIEWED], {
  reason: 'gate',
  stepId: 'approval',
  message: 'Round 2 is recorded and waits for your decision.',
  parkedAt: MINUTES(11),
})

/** The reply is posted: the run waits for the developer. */
export const RUN_WAITING_DEVELOPER = parked(
  [
    REVIEWED,
    entry('approval', 12, {
      override: { choice: 'approve', at: MINUTES(12), gateAction: { id: 'send-reply' } },
    } as Partial<ProcessLedgerEntry>),
    entry('reply', 13, { summary: 'Posted the reply in Ana’s thread.' }),
  ],
  {
    reason: 'step-waiting',
    stepId: 'await-update',
    message: 'Waiting for a reply in Ana’s thread',
    parkedAt: MINUTES(14),
    ask: {
      kind: 'blocker',
      agent: 'host',
      title: 'Waiting for a reply in Ana’s thread',
      detail:
        'Your reply is posted. The run waits for Ana or anyone else to answer in the update’s thread, then tells you; you start the next round with what they wrote. Your own posts there do not count.',
      outside: { awaits: 'a reply in Ana’s thread' },
    },
  },
)

const TYPE_ERRORS = [
  "src/billing/invoice.ts(42,23): error TS2339: Property 'roundingMode' does not exist on type 'InvoiceOptions'.",
  "src/billing/invoice.test.ts(18,5): error TS2345: Argument of type '{ total: number; }' is not assignable to parameter of type 'InvoiceOptions'.",
].join('\n')

const UPDATED_WEB: ColleagueReviewBranchUpdate = {
  pullRequestUrl: WEB,
  state: 'updated',
  baseBranch: 'dev',
  headBranch: 'feature/ZNR-809-plan-page',
  detail: 'GitHub brought dev in.',
}

const FAILED_BE: ColleagueReviewBranchUpdate = {
  pullRequestUrl: BE,
  state: 'failed',
  headSha: '4f1c2aa',
  baseBranch: 'dev',
  headBranch: 'feature/ZNR-809-invoice',
  detail: 'Not brought in: Type check failed on the merged result; the agent could not fix it.',
  worktree: '/tmp/overseer-review-merge/run-review-page/acme-coach-be-390',
  checks: [
    { label: 'Build', status: 'passed', summary: 'Built' },
    { label: 'Type check', status: 'failed', summary: '2 type errors', outputTail: TYPE_ERRORS },
  ],
  checksPassed: false,
}

const NOT_BROUGHT_IN = `Stopped at ${BE}: ${FAILED_BE.detail}`

const ASK_ANA =
  '@Ana coach-be#390: with dev merged in, the type check fails (2 type errors in src/billing/invoice.ts and its test) — could you bring dev in and fix it? Then I’ll merge.'

/** Bringing dev in failed its checks and the agent could not fix it: resolve it here, ask Ana, or stop. */
export const RUN_BASE_FAILED = parked(
  [
    ...CHOSE_MERGE,
    entry('update-branches', 14, {
      outcome: 'failed',
      summary: NOT_BROUGHT_IN,
      failureReason: `${NOT_BROUGHT_IN}\n\nType check: 2 type errors\n${TYPE_ERRORS}`,
      recoveries: [
        {
          id: 'resolve-here',
          label: 'Resolve it here',
          detail:
            'The agent tries again in the same checkout, with your note; you approve the push.',
        },
        {
          id: 'ask-developer',
          label: 'Ask Ana',
          detail:
            'Post the message, as you edit it, in the update’s thread, then wait for the answer.',
          decidesGate: { gate: 'approval', action: 'send-reply', text: ASK_ANA },
        },
      ],
    } as Partial<ProcessLedgerEntry>),
  ],
  {
    reason: 'step-failed',
    stepId: 'update-branches',
    message: 'Bring the base in did not pass. Choose how to go on, or stop here.',
    parkedAt: MINUTES(22),
  },
  { reviewBranchUpdates: [UPDATED_WEB, FAILED_BE] },
)

const FIX_DIFF = [
  'diff --git a/src/billing/invoice.ts b/src/billing/invoice.ts',
  '--- a/src/billing/invoice.ts',
  '+++ b/src/billing/invoice.ts',
  '@@ -40,7 +40,7 @@ export function invoiceTotal(lines: InvoiceLine[], options: InvoiceOptions) {',
  '-  return round(sum, options.roundingMode)',
  '+  return round(sum, options.rounding)',
  ' }',
].join('\n')

const FIXED_BE: ColleagueReviewBranchUpdate = {
  pullRequestUrl: BE,
  state: 'resolved',
  headSha: '4f1c2aa',
  newHeadSha: '9b0e7d1',
  baseBranch: 'dev',
  headBranch: 'feature/ZNR-809-invoice',
  detail: 'Fixed the merged result; waits for your approval to push.',
  conflictedFiles: [],
  diffStat:
    ' src/billing/invoice.ts      | 2 +-\n src/billing/invoice.test.ts | 2 +-\n 2 files changed, 2 insertions(+), 2 deletions(-)',
  diff: FIX_DIFF,
  checks: [
    { label: 'Build', status: 'passed', summary: 'Built' },
    { label: 'Type check', status: 'passed', summary: 'No errors' },
  ],
  checksPassed: true,
  worktree: FAILED_BE.worktree,
}

/** The agent fixed the merged result: the run asks to approve the push of the fix. */
export const RUN_PUSH_AFTER_FIX = parked(
  [
    ...CHOSE_MERGE,
    entry('update-branches', 14, {
      summary: 'The base is in 1 of 2; 1 resolved and waiting for your approval to push.',
    }),
  ],
  {
    reason: 'gate',
    stepId: 'push-approval',
    message: 'Approve the push',
    parkedAt: MINUTES(26),
  },
  { reviewBranchUpdates: [UPDATED_WEB, FIXED_BE] },
)

/** Approved: the run merges, one pull request merged and the other waiting on its checks. */
export const RUN_MERGING = run({
  cursor: { stepId: 'merge', iteration: 1 },
  startedAt: Date.parse(MERGE_RUNNING.startedAt) - 60 * 60_000,
  ledger: [
    ...CHOSE_MERGE,
    entry('update-branches', 14, { summary: 'The base is in all 2.' }),
    entry('push-approval', 15, { outcome: 'skipped' }),
    entry('push', 15, { outcome: 'skipped' }),
    working('merge', 16),
  ],
} as Partial<ProcessRun>)

/** The round's merge as the backend tells it, begun within this pass of the run. */
const MERGE_JOB: ReviewMergeJob = {
  ...MERGE_RUNNING,
  ticketKey: REVIEW_TICKET,
  startedAt: new Date(MINUTES(17)).toISOString(),
}

/** The review agent asks the person a question, in the run's chat. */
export const RUN_CHAT_QUESTION = {
  id: 'review-question',
  chatRunner: 'api',
  label: 'askUser',
  toolName: 'askUser',
  args: {},
  question: {
    question: 'coach-be #390 rounds invoice totals half-up. Is that the rule product asked for?',
    context:
      'The ticket says “round as checkout does”; checkout rounds half-even. The answer decides finding 2.',
    options: [
      { label: 'Half-even, as checkout', recommended: true },
      { label: 'Half-up is intended' },
    ],
  },
  decide: () => new Promise<void>(() => undefined),
  answer: () => new Promise<void>(() => undefined),
} as unknown as PendingQuestionGrant

/** What the review step said so far, in the run's chat. */
export const RUN_CHAT_MESSAGES = [
  {
    id: 'm1',
    role: 'assistant',
    content: `Reviewing ${REVIEW_TICKET}, round 2: reading coach-be #390 and coach-web #112 against round 1’s findings.`,
  },
  {
    id: 'm2',
    role: 'assistant',
    content:
      'Finding 1 (currency from the billing country) is fixed in coach-be #390. Checking the invoice rounding next.',
  },
] as const

export type ReviewRunPageCase =
  | 'review-working'
  | 'ask-pending'
  | 'approval'
  | 'waiting-developer'
  | 'base-failed'
  | 'base-failed-note'
  | 'base-failed-ask'
  | 'push-after-fix'
  | 'merging'

const RUNS: Record<ReviewRunPageCase, ProcessRun> = {
  'review-working': RUN_REVIEWING,
  'ask-pending': RUN_REVIEWING,
  approval: RUN_AT_APPROVAL,
  'waiting-developer': RUN_WAITING_DEVELOPER,
  'base-failed': RUN_BASE_FAILED,
  'base-failed-note': RUN_BASE_FAILED,
  'base-failed-ask': RUN_BASE_FAILED,
  'push-after-fix': RUN_PUSH_AFTER_FIX,
  merging: RUN_MERGING,
}

/** What each state presses once the page has drawn, in order. */
export const REVIEW_RUN_PAGE_CLICKS: Partial<Record<ReviewRunPageCase, readonly string[]>> = {
  'base-failed-note': ['Resolve it here', 'Add a note'],
  'base-failed-ask': ['Ask Ana', 'Ask Ana'],
}

const RUN_CHAT_KEY = getChatContextKey(
  processRunChatContext({ id: REVIEW_RUN_PAGE_ID, projectId: 'coach-be' }),
)

/** What the run's page reads in each state: the run, its review, its merge and the asks waiting in its chat. */
export const reviewRunPageRoutes = (which: ReviewRunPageCase): FixtureRoutes => ({
  '/api/v1/process-runs/{runId}': () => RUNS[which],
  '/api/v1/groups/{groupId}/tickets/{ticketKey}/review': () => ROUND_TWO_WITH_PRS,
  '/api/v1/groups/{groupId}/tickets/{ticketKey}/review/approve-and-merge': () => {
    if (which !== 'merging') throw new Error('no merge')
    return MERGE_JOB
  },
  '/api/v1/cli-runs/actions/pending-by-chat': () => ({
    counts: which === 'ask-pending' ? { [RUN_CHAT_KEY]: 1 } : {},
  }),
})
