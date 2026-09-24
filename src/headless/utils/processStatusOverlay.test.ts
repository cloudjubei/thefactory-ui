import { describe, expect, it } from 'vitest'
import type { ProcessRun } from 'thefactory-tools/types'

import { isReviewable, processStatusOverlay } from './processStatusOverlay'

const run = (over: Partial<ProcessRun>): Pick<ProcessRun, 'id' | 'status' | 'park'> =>
  ({ id: 'run-1', status: 'running', ...over }) as Pick<ProcessRun, 'id' | 'status' | 'park'>

describe('processStatusOverlay', () => {
  it('parked at the SIGN-OFF gate → Reviewable, linking to the run', () => {
    const o = processStatusOverlay(run({ status: 'parked', park: { reason: 'gate' } as never }))
    expect(o).toEqual({ label: 'Reviewable', semantic: 'review', runId: 'run-1' })
  })

  it('parked for any OTHER reason → Blocked (it is stuck, not awaiting sign-off)', () => {
    // A step-failed / step-question / step-errored park is not a sign-off — the
    // Reviewable word must be reserved for the gate, or it would mean "stuck".
    for (const reason of ['step-failed', 'step-question', 'step-errored', 'loop-exhausted']) {
      const o = processStatusOverlay(run({ status: 'parked', park: { reason } as never }))
      expect(o).toEqual({ label: 'Blocked', semantic: 'stuck', runId: 'run-1' })
    }
  })

  it('running or pending → Crunching', () => {
    expect(processStatusOverlay(run({ status: 'running' }))?.label).toBe('Crunching')
    expect(processStatusOverlay(run({ status: 'pending' }))?.label).toBe('Crunching')
    expect(processStatusOverlay(run({ status: 'running' }))?.semantic).toBe('working')
  })

  it('failed → Blocked', () => {
    expect(processStatusOverlay(run({ status: 'failed' }))).toEqual({
      label: 'Blocked',
      semantic: 'stuck',
      runId: 'run-1',
    })
  })

  const decidedRun = (choice: 'reject' | 'request-changes' | 'abandon' | 'retry') =>
    ({
      id: 'run-1',
      status: 'failed',
      plan: { steps: [{ id: 'sign-off', name: 'Sign-off', kind: 'gate' }] },
      ledger: [
        {
          id: 'e1',
          stepId: 'sign-off',
          iteration: 1,
          status: 'done',
          startedAt: 0,
          override: { choice, at: 1 },
        },
      ],
    }) as unknown as ProcessRun

  it('a run a PERSON ended — rejected, sent back, abandoned — yields NO overlay: its features are pending again', () => {
    for (const choice of ['reject', 'request-changes', 'abandon'] as const) {
      expect(processStatusOverlay(decidedRun(choice))).toBeUndefined()
    }
  })

  it('a run that failed with nobody deciding stays Blocked — it is stuck', () => {
    expect(processStatusOverlay(decidedRun('retry'))?.label).toBe('Blocked')
  })

  it('a finished (succeeded / cancelled) or absent run yields NO overlay — the stored status stands', () => {
    expect(processStatusOverlay(run({ status: 'succeeded' }))).toBeUndefined()
    expect(processStatusOverlay(run({ status: 'cancelled' }))).toBeUndefined()
    expect(processStatusOverlay(undefined)).toBeUndefined()
  })

  it('parked with no park record at all falls back to Blocked, never Reviewable', () => {
    expect(processStatusOverlay(run({ status: 'parked' }))?.label).toBe('Blocked')
  })
})

describe('isReviewable', () => {
  it('is true only when parked at a gate', () => {
    expect(isReviewable(run({ status: 'parked', park: { reason: 'gate' } as never }))).toBe(true)
    expect(isReviewable(run({ status: 'parked', park: { reason: 'step-failed' } as never }))).toBe(
      false,
    )
    expect(isReviewable(run({ status: 'parked' }))).toBe(false)
    expect(isReviewable(run({ status: 'running' }))).toBe(false)
    expect(isReviewable(undefined)).toBe(false)
  })
})
