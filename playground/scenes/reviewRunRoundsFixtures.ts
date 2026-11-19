import { COLLEAGUE_REVIEW_PROCESS_DEFINITION } from 'thefactory-tools/constants'
import type { ProcessRun, ProcessWaitingAsk } from 'thefactory-tools/types'

import type { ColleagueReviewBranchUpdate } from '../../src/headless/utils/colleagueReviewBranchUpdatesTypes'

const AWAITING: ProcessWaitingAsk = {
  kind: 'blocker',
  agent: 'host',
  title: 'Waiting for a reply in Saif’s thread',
  detail:
    'Your reply is posted. The run waits for Saif or anyone else to answer in the update’s thread, then tells you; you start the next round with what they wrote. Your own posts there do not count.',
  outside: { awaits: 'a reply in Saif’s thread' },
}

const SHORT_REPLY = 'Fixed the retry and added the test. The copy change is in osc-ui #77 now.'

const LONG_REPLY = [
  'Thanks for the review!',
  '- Retry: fixed, see the new test in sync.test.ts',
  '- Empty state copy: changed as you asked',
  '- Migration: I kept it, it is needed for the old rows',
  'Files: after.png, retry.mov',
  'Let me know if anything else is off.',
].join('\n')

const base = {
  id: 'run-review-767',
  projectId: 'osc-be',
  processId: 'colleague-review',
  title: 'Review of ZNR-767, round 1',
  plan: {
    definitionId: 'colleague-review',
    definitionScope: 'global',
    definitionVersion: 2,
    name: COLLEAGUE_REVIEW_PROCESS_DEFINITION.name,
    steps: COLLEAGUE_REVIEW_PROCESS_DEFINITION.steps,
    loops: COLLEAGUE_REVIEW_PROCESS_DEFINITION.loops,
    frozenAt: 0,
  },
  status: 'parked',
  loopCounts: {},
  ledger: [],
  startedAt: 0,
  updatedAt: 0,
  ticketReview: { groupId: 'osc', ticketKey: 'ZNR-767', round: 1 },
  input: {},
}

const waitingAt = (ask: ProcessWaitingAsk): ProcessRun =>
  ({
    ...base,
    park: { reason: 'step-waiting', stepId: 'await-update', message: ask.title, parkedAt: 1, ask },
  }) as unknown as ProcessRun

/** A review run waiting for the developer after its reply. */
export const REVIEW_RUN_WAITING = waitingAt(AWAITING)

/** The developer replied: the person starts round 2. */
export const REVIEW_RUN_REPLIED = waitingAt({
  ...AWAITING,
  outside: {
    awaits: AWAITING.outside!.awaits,
    arrived: {
      title: 'ZNR-767: Saif replied',
      detail: SHORT_REPLY,
      carryOnLabel: 'Start round 2',
      at: 2,
    },
  },
})

/** A long reply, cut on the card. */
export const REVIEW_RUN_REPLIED_LONG = waitingAt({
  ...AWAITING,
  outside: {
    awaits: AWAITING.outside!.awaits,
    arrived: {
      title: 'ZNR-767: Saif replied',
      detail: LONG_REPLY,
      carryOnLabel: 'Start round 3',
      at: 2,
    },
  },
})

const DIFF = [
  'diff --git a/src/sync/retry.ts b/src/sync/retry.ts',
  '--- a/src/sync/retry.ts',
  '+++ b/src/sync/retry.ts',
  '@@ -12,7 +12,8 @@ export function retryDelay(attempt: number): number {',
  '-  const max = 30_000',
  '+  const max = RETRY_MAX_MS',
  '+  const jitter = Math.random() * 250',
  '   return Math.min(max, 2 ** attempt * 100)',
  ' }',
].join('\n')

const resolved = (checksPassed: boolean): ColleagueReviewBranchUpdate => ({
  pullRequestUrl: 'https://github.com/acme/osc-be/pull/418',
  state: 'resolved',
  headSha: '4f1c2aa',
  newHeadSha: '9b0e7d1',
  baseBranch: 'dev',
  headBranch: 'feature/ZNR-767-retry',
  detail: 'Resolved a conflict; waits for your approval to push.',
  conflictedFiles: ['src/sync/retry.ts'],
  diffStat: ' src/sync/retry.ts | 3 ++-\n 1 file changed, 2 insertions(+), 1 deletion(-)',
  diff: DIFF,
  checks: checksPassed
    ? [
        { label: 'Unit tests', status: 'passed', summary: '214 passed' },
        { label: 'Types', status: 'passed', summary: 'No errors' },
      ]
    : [
        { label: 'Unit tests', status: 'failed', summary: '2 failed' },
        { label: 'Types', status: 'passed', summary: 'No errors' },
      ],
  checksPassed,
})

const UPDATED_UI: ColleagueReviewBranchUpdate = {
  pullRequestUrl: 'https://github.com/acme/osc-ui/pull/77',
  state: 'updated',
  headSha: 'aa11bb2',
  newHeadSha: 'cc33dd4',
  baseBranch: 'dev',
  headBranch: 'feature/ZNR-767-copy',
  detail: 'GitHub brought dev in.',
}

const pushRun = (checksPassed: boolean): ProcessRun =>
  ({
    ...base,
    park: { reason: 'gate', stepId: 'push-approval', message: 'Approve the push', parkedAt: 3 },
    input: { reviewBranchUpdates: [UPDATED_UI, resolved(checksPassed)] },
  }) as unknown as ProcessRun

/** The push approval with a resolution whose checks passed. */
export const REVIEW_RUN_PUSH_PASSED = pushRun(true)

/** The push approval with a resolution whose checks failed. */
export const REVIEW_RUN_PUSH_FAILED = pushRun(false)

/** After the push and the merge: every pull request has its base. */
export const REVIEW_RUN_PUSHED: ColleagueReviewBranchUpdate[] = [
  {
    ...resolved(true),
    state: 'pushed',
    detail: 'Pushed the resolution to feature/ZNR-767-retry, as you.',
  },
  UPDATED_UI,
]
