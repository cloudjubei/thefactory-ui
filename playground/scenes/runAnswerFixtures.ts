import { PROCESS_MANAGER_INPUT_KEY } from 'thefactory-tools/constants'
import type { ProcessLedgerEntry, ProcessPlan, ProcessRun } from 'thefactory-tools/types'
import type { FixtureRoutes } from './onFixtures'

/** A run stopped on its checks while main moved on one commit. */
export const ANSWER_RUN_ID = 'run-answer-stop'

/** A story run whose feature stopped the same way: its own stop mirrors the feature's. */
export const ANSWER_PARENT_RUN_ID = 'run-answer-parent'

/** That feature's run, answered from the story run's page. */
export const ANSWER_NESTED_RUN_ID = 'run-answer-nested'

/** The answer the states press: once to put it in front, once to send it. */
export const ANSWER_BRING_IN = 'Bring in main (1 new commit) and re-check'

/** How the host takes the answer in a state. */
export type RunAnswerCase = 'sending' | 'refused'

const STOPPED_AT = new Date(2026, 10, 25, 10, 12).getTime()

const FEATURE_PLAN: ProcessPlan = {
  definitionId: 'feature-default',
  definitionScope: 'global',
  definitionVersion: 1,
  name: 'Feature',
  frozenAt: 0,
  steps: [
    { id: 'implement', name: 'Implement', kind: 'agent', agentType: 'developer' },
    { id: 'checks', name: 'Checks', kind: 'check' },
    { id: 'report', name: 'Report', kind: 'report' },
  ],
  loops: [
    { id: 'checks-fix', from: 'checks', to: 'implement', when: ['failed'], maxIterations: 3 },
  ],
}

const entry = (over: Partial<ProcessLedgerEntry> & Pick<ProcessLedgerEntry, 'id' | 'stepId'>) =>
  ({ iteration: 1, status: 'done', outcome: 'passed', startedAt: 0, ...over }) as ProcessLedgerEntry

const stopped = (over: Partial<ProcessRun>): ProcessRun => ({
  id: ANSWER_RUN_ID,
  projectId: 'thefactory-tools',
  title: 'One large-file storage interface, local disk first',
  input: { [PROCESS_MANAGER_INPUT_KEY]: { enabled: false } },
  status: 'parked',
  loopCounts: {},
  startedAt: STOPPED_AT - 1_800_000,
  updatedAt: STOPPED_AT,
  plan: FEATURE_PLAN,
  ledger: [
    entry({ id: 'i1', stepId: 'implement' }),
    entry({ id: 'c1', stepId: 'checks', outcome: 'failed' }),
  ],
  workBranch: {
    name: 'factory/large-file-storage',
    baseRef: 'main',
    baseSha: '105cc1753b1f0f4c2e0d9a8b7c6d5e4f3a2b1c0d',
  },
  baseMoved: {
    baseRef: 'main',
    baseSha: '89dc2ff022c6b0c67d36a6098bb7444d6d7bc787',
    commits: 1,
  },
  park: {
    reason: 'step-failed',
    stepId: 'checks',
    message: 'Checks failed: the type check found 2 errors in test fixtures.',
    parkedAt: STOPPED_AT,
  },
  ...over,
})

/** The run on its own page. */
export const ANSWER_RUN = stopped({})

/** The feature's run, nested in the story run. */
export const ANSWER_NESTED_RUN = stopped({
  id: ANSWER_NESTED_RUN_ID,
  parentRunId: ANSWER_PARENT_RUN_ID,
  parentStepId: 'feature',
})

/** The story run: stopped only because its feature is. */
export const ANSWER_PARENT_RUN = stopped({
  id: ANSWER_PARENT_RUN_ID,
  title: 'Online storage for large project files',
  plan: {
    ...FEATURE_PLAN,
    definitionId: 'story-default',
    name: 'Story',
    steps: [
      {
        id: 'feature',
        name: 'One large-file storage interface',
        kind: 'process',
        processId: 'feature-default',
      },
      { id: 'report', name: 'Report', kind: 'report' },
    ],
    loops: [],
  },
  ledger: [
    entry({
      id: 'f1',
      stepId: 'feature',
      status: 'running',
      outcome: undefined,
      childRunId: ANSWER_NESTED_RUN_ID,
    }),
  ],
  baseMoved: undefined,
  park: {
    reason: 'step-failed',
    stepId: 'feature',
    message: 'Checks failed: the type check found 2 errors in test fixtures.',
    parkedAt: STOPPED_AT,
    childRunId: ANSWER_NESTED_RUN_ID,
  },
})

const RUNS: Record<string, ProcessRun> = {
  [ANSWER_RUN_ID]: ANSWER_RUN,
  [ANSWER_NESTED_RUN_ID]: ANSWER_NESTED_RUN,
  [ANSWER_PARENT_RUN_ID]: ANSWER_PARENT_RUN,
}

function refuse(): never {
  throw new Error('The host refused the answer.')
}

/**
 * The reads a run's page makes, and its answer: left unanswered while it is
 * `sending`, so the answer stays on its way; refused when `refused`, so the
 * stop comes back.
 */
export function runAnswerRoutes(which: RunAnswerCase): FixtureRoutes {
  return {
    '/api/v1/process-runs/{runId}': ({ runId }) => RUNS[runId ?? ''] ?? refuse(),
    '/api/v1/process-runs/{runId}/evidence': () => ({ groups: [] }),
    '/api/v1/process-runs/{runId}/ticket-post': () => ({ tickets: [] }),
    '/api/v1/process-runs/{runId}/diagnostics': () => ({}),
    '/api/v1/process-runs/{runId}/cleanup': () => ({ items: [], off: false }),
    'POST /api/v1/process-runs/{runId}/resume': () =>
      which === 'refused' ? refuse() : new Promise(() => {}),
  }
}
