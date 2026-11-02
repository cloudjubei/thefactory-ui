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
      headline: 'main has 2 new commits',
      meaning: 'The work branch does not have them yet.',
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
      headline: 'main has 2 new commits',
      meaning: 'The work branch does not have them yet.',
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

  it('heads a base brought in once, and not since moved on, with what was brought in', () => {
    const { baseMoved: _moved, ...brought } = run({
      baseUpdates: [{ ...moved, baseRef: 'develop', sha: 'e'.repeat(40), at: 2 }],
    })
    expect(processBaseMovedView(brought)).toEqual({
      note: undefined,
      headline: 'Brought in develop',
      meaning: undefined,
      choice: undefined,
      lastUpdate: 'Brought in develop (2 commits) — the work branch is now at eeeeeee.',
    })
  })

  it('counts the times a base was brought in when it was more than once', () => {
    const { baseMoved: _moved, ...brought } = run({
      baseUpdates: [
        { ...moved, commits: 1, sha: 'd'.repeat(40), at: 1 },
        { ...moved, sha: 'e'.repeat(40), at: 2 },
        { ...moved, commits: 4, sha: 'f'.repeat(40), at: 3 },
      ],
    })
    expect(processBaseMovedView(brought)?.headline).toBe('Brought in main · 3 times')
  })

  it('heads with the new commits when the base moved on again after it was brought in', () => {
    const view = processBaseMovedView(
      run({
        baseMoved: { ...moved, commits: 1 },
        baseUpdates: [{ ...moved, sha: 'e'.repeat(40), at: 2 }],
      }),
    )
    expect(view?.headline).toBe('main has 1 new commit')
    expect(view?.meaning).toBe('The work branch does not have it yet.')
    expect(view?.lastUpdate).toBe(
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
