import type { ProcessLedgerEntry, ProcessRun } from 'thefactory-tools/types'

const UNCHECKED_SUMMARY =
  'The fake data grew on a timer, so the before and after screens showed different rows and nothing could be compared.'

const ledger: ProcessLedgerEntry[] = [
  {
    id: 'implement-1',
    stepId: 'implement',
    iteration: 1,
    status: 'done',
    outcome: 'passed',
    startedAt: 0,
  },
  {
    id: 'checks-1',
    stepId: 'checks',
    iteration: 1,
    status: 'done',
    outcome: 'passed',
    startedAt: 1,
  },
  {
    id: 'review-1',
    stepId: 'code-review',
    iteration: 1,
    status: 'done',
    outcome: 'passed',
    startedAt: 2,
  },
  {
    id: 'verify-1',
    stepId: 'verify',
    iteration: 1,
    status: 'done',
    outcome: 'unchecked',
    startedAt: 3,
    summary: UNCHECKED_SUMMARY,
  },
]

/** The feature run of Covision run 59d1109e, stopped because its verifier could not compare before and after. */
export function sendToDeveloperRun(over: Partial<ProcessRun> = {}): ProcessRun {
  return {
    id: '6f17e130-4b2d-4c8e-9a71-3d5f0e2b8c64',
    projectId: 'covision-android',
    title: 'Live occupancy on the dashboard',
    featureId: 'a41c7e09-5d3b-4f2a-8e6c-1b9d0f7a2e53',
    input: { runner: 'cli' },
    status: 'parked',
    loopCounts: {},
    startedAt: 0,
    updatedAt: 4,
    plan: {
      definitionId: 'feature-default',
      definitionScope: 'global',
      definitionVersion: 4,
      name: 'Feature',
      frozenAt: 0,
      steps: [
        { id: 'implement', name: 'Implement', kind: 'agent', agentType: 'developer' },
        { id: 'checks', name: 'Checks', kind: 'check' },
        { id: 'code-review', name: 'Code review', kind: 'judge' },
        { id: 'verify', name: 'Verify', kind: 'agent', agentType: 'verifier' },
      ],
      loops: [
        { id: 'checks-fix', from: 'checks', to: 'implement', when: ['failed'], maxIterations: 3 },
        { id: 'verify-fix', from: 'verify', to: 'implement', when: ['failed'], maxIterations: 3 },
      ],
    },
    ledger,
    park: {
      reason: 'step-unchecked',
      stepId: 'verify',
      message: 'Verify could not check anything, so nothing was proven.',
      parkedAt: 4,
    },
    ...over,
  }
}

/** The same stop once the verifier's passes back to the developer are spent. */
export const SEND_TO_DEVELOPER_SPENT_RUN = sendToDeveloperRun({ loopCounts: { 'verify-fix': 2 } })
