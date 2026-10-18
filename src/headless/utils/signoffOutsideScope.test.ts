import { describe, expect, it } from 'vitest'
import type { ProcessLedgerEntry, ProcessRun } from 'thefactory-tools/types'

import { signoffOutsideScopeLine } from './signoffOutsideScope'

const plan = {
  steps: [
    { id: 'implement', name: 'Implement', kind: 'agent' },
    { id: 'code-review', name: 'Code review', kind: 'judge' },
  ],
} as unknown as ProcessRun['plan']

const review = (outsideScope?: string[], status: 'done' | 'running' = 'done'): ProcessLedgerEntry =>
  ({
    id: Math.random().toString(36),
    stepId: 'code-review',
    iteration: 1,
    status,
    startedAt: 1,
    ...(outsideScope ? { outsideScope } : {}),
  }) as ProcessLedgerEntry

describe('signoffOutsideScopeLine', () => {
  it('joins each run’s newest review’s files outside the scope', () => {
    expect(
      signoffOutsideScopeLine([
        { plan, ledger: [review(['src/agentRunner/agentRunnerOrchestrator.ts'])] },
        {
          plan,
          ledger: [
            review(['docs/FILE_ORGANISATION.md', 'src/agentRunner/agentRunnerOrchestrator.ts']),
          ],
        },
      ]),
    ).toBe(
      'Outside the feature’s scope: docs/FILE_ORGANISATION.md, src/agentRunner/agentRunnerOrchestrator.ts',
    )
  })

  it('takes a later review with every file in scope as clearing its run’s', () => {
    expect(
      signoffOutsideScopeLine([{ plan, ledger: [review(['a.ts']), review()] }]),
    ).toBeUndefined()
  })

  it('reads past a review still running and steps that are not reviews', () => {
    const ledger = [
      review(['a.ts']),
      review(undefined, 'running'),
      { ...review(['b.ts']), stepId: 'implement' },
    ]
    expect(signoffOutsideScopeLine([{ plan, ledger }])).toBe('Outside the feature’s scope: a.ts')
  })

  it('says nothing for runs with no review', () => {
    expect(signoffOutsideScopeLine([{ plan, ledger: [] }])).toBeUndefined()
  })
})
