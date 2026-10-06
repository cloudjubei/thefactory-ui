import { describe, expect, it } from 'vitest'
import type { ProcessRun } from 'thefactory-tools/types'

import { processBaseMovedView } from './processBaseMovedView'

const moved = { baseRef: 'main', baseSha: 'c'.repeat(40), commits: 2 }

const run = (over: Partial<ProcessRun> = {}): ProcessRun => ({
  id: 'r',
  projectId: 'p',
  title: 'Run',
  plan: {
    definitionId: 'feature-default',
    definitionScope: 'global',
    definitionVersion: 1,
    name: 'Feature',
    steps: [
      { id: 'implement', name: 'Implement', kind: 'agent', agentType: 'developer' },
      { id: 'checks', name: 'Checks', kind: 'check' },
    ],
    loops: [
      { id: 'checks-fix', from: 'checks', to: 'implement', when: ['failed'], maxIterations: 3 },
    ],
    frozenAt: 0,
  },
  status: 'parked',
  loopCounts: {},
  workBranch: { name: 'factory/x-1a2b3c4d', baseRef: 'main', baseSha: 'b'.repeat(40) },
  ledger: [
    {
      id: 'e',
      stepId: 'checks',
      iteration: 1,
      status: 'done',
      outcome: 'errored',
      startedAt: 0,
      checks: [
        {
          id: 'build',
          label: 'Build',
          kind: 'command',
          status: 'failed',
          durationMs: 1,
          summary: 'tsc failed',
          baseline: { sha: 'bbbbbbb', verdict: 'pre-existing' },
        },
      ],
    },
  ],
  park: {
    reason: 'step-errored',
    stepId: 'checks',
    message: 'Checks did not complete.',
    parkedAt: 1,
  },
  baseMoved: moved,
  startedAt: 0,
  updatedAt: 0,
  ...over,
})

describe('processBaseMovedView', () => {
  it('says the base moved on and offers to bring it in while the checks park offers it', () => {
    expect(processBaseMovedView(run())).toEqual({
      note: 'main has 2 new commits',
      choice: expect.objectContaining({
        choice: 'update-base',
        label: 'Bring in main (2 new commits) and re-check',
        primary: true,
      }),
      lastUpdate: undefined,
    })
  })

  it('says the base moved on without a choice while the run is not parked on its checks', () => {
    const { park: _park, ...running } = run({ status: 'running' })
    expect(processBaseMovedView(running)).toEqual({
      note: 'main has 2 new commits',
      choice: undefined,
      lastUpdate: undefined,
    })
  })

  it('names the newest time the base was brought in', () => {
    const { baseMoved: _moved, ...brought } = run({
      baseUpdates: [
        { ...moved, commits: 1, sha: 'd'.repeat(40), at: 1 },
        { ...moved, sha: 'e'.repeat(40), at: 2 },
      ],
    })
    expect(processBaseMovedView(brought)?.lastUpdate).toBe(
      'Brought in main (2 commits) — the work branch is now at eeeeeee.',
    )
  })

  it('has nothing to say when the base has not moved and nothing was brought in', () => {
    const { baseMoved: _moved, ...still } = run()
    expect(processBaseMovedView(still)).toBeUndefined()
  })

  it('has nothing to say for a base with no new commits', () => {
    expect(processBaseMovedView(run({ baseMoved: { ...moved, commits: 0 } }))).toBeUndefined()
  })
})
