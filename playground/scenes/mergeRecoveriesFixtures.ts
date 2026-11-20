import type { ProcessLedgerEntry, ProcessRun, ProcessStepRecovery } from 'thefactory-tools/types'

/** The colleague review run a failed merge stops on. */
export const MERGE_RECOVERIES_RUN_ID = 'run-merge-checks-failed'

const PARKED_AT = Date.parse('2026-11-19T21:40:00Z')
const PR = 'https://github.com/acme/web-user/pull/300'

const RECOVERIES: ProcessStepRecovery[] = [
  {
    id: 'rerun-failed-checks',
    label: 'Re-run failed checks',
    detail: 'Run the failed checks on GitHub again, wait for them to pass, then merge.',
  },
  {
    id: 'merge-anyway',
    label: 'Merge anyway',
    detail: 'Mark the files viewed, approve and merge without waiting for the checks.',
  },
]

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
  definitionId: 'colleague-review',
  definitionScope: 'global',
  definitionVersion: 2,
  name: 'Colleague review',
  frozenAt: 0,
  steps: [
    { id: 'review', name: 'Review', kind: 'agent', agentType: 'analyst' },
    { id: 'approval', name: 'Approval', kind: 'gate' },
    { id: 'merge', name: 'Merge', kind: 'action' },
    { id: 'report', name: 'Report', kind: 'report' },
  ],
  loops: [],
}

const run = (ledger: ProcessLedgerEntry[], park: NonNullable<ProcessRun['park']>): ProcessRun => ({
  id: MERGE_RECOVERIES_RUN_ID,
  projectId: 'web-user',
  title: 'Review of ENG-756, round 2',
  input: { runner: 'api' },
  status: 'parked',
  loopCounts: {},
  startedAt: PARKED_AT - 3_600_000,
  updatedAt: PARKED_AT,
  plan,
  ledger,
  park,
})

const reviewed = [
  done({
    id: 'review-1',
    stepId: 'review',
    summary: 'Round 2 is recorded and waits for your decision.',
  }),
  done({ id: 'approval-1', stepId: 'approval', override: { choice: 'approve', at: 1 } }),
]

const checksFailed = `Stopped at ${PR}: Checks failed: v2a first flows`

/** Stopped on the merge: the pull request's checks failed — re-run them, merge anyway, try again or stop. */
export const MERGE_CHECKS_FAILED_RUN = run(
  [
    ...reviewed,
    done({
      id: 'merge-1',
      stepId: 'merge',
      outcome: 'failed',
      summary: checksFailed,
      failureReason: checksFailed,
      recoveries: RECOVERIES,
    }),
  ],
  {
    reason: 'step-failed',
    stepId: 'merge',
    message: `Merge did not pass: ${checksFailed}. Choose how to go on, or stop here.`,
    parkedAt: PARKED_AT,
  },
)

const notMerged = `Stopped at ${PR}: GitHub did not merge it: At least 1 approving review is required`

/** Stopped on the merge for something other than failed checks: no re-run, no merge anyway. */
export const MERGE_OTHER_FAILURE_RUN = run(
  [
    ...reviewed,
    done({
      id: 'merge-1',
      stepId: 'merge',
      outcome: 'failed',
      summary: notMerged,
      failureReason: notMerged,
    }),
  ],
  {
    reason: 'step-failed',
    stepId: 'merge',
    message: `Merge did not pass: ${notMerged}. Choose how to go on, or stop here.`,
    parkedAt: PARKED_AT,
  },
)

const refused = 'The review chat ended without recording round 2: Upgrade your plan to continue'

/** Stopped on the review: its chat's CLI refused, and the stop says so in the CLI's words. */
export const REVIEW_AGENT_REFUSED_RUN = run(
  [
    done({
      id: 'review-1',
      stepId: 'review',
      outcome: 'failed',
      summary: refused,
      failureReason: 'Upgrade your plan to continue',
    }),
  ],
  {
    reason: 'step-failed',
    stepId: 'review',
    message:
      'Review did not pass: Upgrade your plan to continue. Choose how to go on, or stop here.',
    parkedAt: PARKED_AT,
  },
)
