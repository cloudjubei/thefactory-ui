import { describe, expect, it } from 'vitest'
import type { ProcessRun } from 'thefactory-tools/types'

import { isReviewable, processStatusOverlay } from './processStatusOverlay'
import { PROCESS_STATUS_OVERLAY_TITLES } from './processStatusOverlayConstants'

const run = (over: Partial<ProcessRun>): Pick<ProcessRun, 'id' | 'status' | 'park'> =>
  ({ id: 'run-1', status: 'running', ...over }) as Pick<ProcessRun, 'id' | 'status' | 'park'>

describe('processStatusOverlay', () => {
  it('parked at the SIGN-OFF gate → Reviewable, linking to the run', () => {
    const o = processStatusOverlay(run({ status: 'parked', park: { reason: 'gate' } as never }))
    expect(o).toEqual({
      label: 'Reviewable',
      semantic: 'review',
      title: PROCESS_STATUS_OVERLAY_TITLES.review,
      runId: 'run-1',
    })
  })

  it('parked for any OTHER reason → Blocked (it is stuck, not awaiting sign-off)', () => {
    // A step-failed / step-waiting / step-errored park is not a sign-off — the
    // Reviewable word must be reserved for the gate, or it would mean "stuck".
    for (const reason of ['step-failed', 'step-waiting', 'step-errored', 'loop-exhausted']) {
      const o = processStatusOverlay(run({ status: 'parked', park: { reason } as never }))
      expect(o).toEqual({
        label: 'Blocked',
        semantic: 'stuck',
        title: PROCESS_STATUS_OVERLAY_TITLES.stuck,
        runId: 'run-1',
      })
    }
  })

  it('running or pending → Working', () => {
    expect(processStatusOverlay(run({ status: 'running' }))?.label).toBe('Working')
    expect(processStatusOverlay(run({ status: 'pending' }))?.label).toBe('Working')
    expect(processStatusOverlay(run({ status: 'running' }))?.semantic).toBe('working')
    expect(processStatusOverlay(run({ status: 'running' }))?.title).toBe(
      PROCESS_STATUS_OVERLAY_TITLES.working,
    )
  })

  it('failed → Blocked', () => {
    expect(processStatusOverlay(run({ status: 'failed' }))).toEqual({
      label: 'Blocked',
      semantic: 'stuck',
      title: PROCESS_STATUS_OVERLAY_TITLES.stuck,
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

  it('a run a PERSON rejected or abandoned yields NO overlay: its features are pending again', () => {
    for (const choice of ['reject', 'abandon'] as const) {
      expect(processStatusOverlay(decidedRun(choice))).toBeUndefined()
    }
  })

  it('a run ended on a request for changes says so and links to it, where it is sent back', () => {
    expect(processStatusOverlay(decidedRun('request-changes'))).toEqual({
      label: 'Changes requested',
      semantic: 'onhold',
      title: PROCESS_STATUS_OVERLAY_TITLES.changesRequested,
      runId: 'run-1',
    })
  })

  it('a run that failed with nobody deciding stays Blocked — it is stuck', () => {
    expect(processStatusOverlay(decidedRun('retry'))?.label).toBe('Blocked')
  })

  it('a finished (succeeded / cancelled) or absent run yields NO overlay — the stored status stands', () => {
    expect(processStatusOverlay(run({ status: 'succeeded' }))).toBeUndefined()
    expect(processStatusOverlay(run({ status: 'cancelled' }))).toBeUndefined()
    expect(processStatusOverlay(undefined)).toBeUndefined()
  })

  const approvedRun = (integration?: ProcessRun['integration'], shadow = false) =>
    ({
      id: 'run-1',
      status: 'succeeded',
      workBranch: { name: 'factory/x-1', baseRef: 'main', baseSha: 'a'.repeat(40), shadow },
      plan: { steps: [{ id: 'sign-off', name: 'Sign-off', kind: 'gate' }], loops: [] },
      ledger: [
        {
          id: 'e1',
          stepId: 'sign-off',
          iteration: 1,
          status: 'done',
          startedAt: 0,
          override: { choice: 'approve', at: 1, integration: 'squash' },
        },
      ],
      ...(integration ? { integration } : {}),
    }) as unknown as ProcessRun

  it('approved work that did not land says so and links to the run, where it is brought in', () => {
    expect(
      processStatusOverlay(approvedRun({ mode: 'squash', status: 'failed', error: 'x', at: 2 })),
    ).toEqual({
      label: 'Not merged',
      semantic: 'onhold',
      title: PROCESS_STATUS_OVERLAY_TITLES.notLanded,
      runId: 'run-1',
    })
  })

  it('approved work in a project without git of its own says it was not brought in', () => {
    expect(processStatusOverlay(approvedRun(undefined, true))?.label).toBe('Not brought in')
  })

  it('approved work being brought in shows it is merging', () => {
    expect(
      processStatusOverlay(approvedRun({ mode: 'squash', status: 'integrating', at: 2 })),
    ).toEqual({
      label: 'Merging',
      semantic: 'working',
      title: PROCESS_STATUS_OVERLAY_TITLES.landing,
      runId: 'run-1',
    })
  })

  it('approved work being brought into a project without git of its own says so without git words', () => {
    expect(
      processStatusOverlay(approvedRun({ mode: 'merge', status: 'integrating', at: 2 }, true))
        ?.label,
    ).toBe('Bringing in')
  })

  it('approved work that landed yields NO overlay — the stored status stands', () => {
    expect(
      processStatusOverlay(approvedRun({ mode: 'squash', status: 'integrated', at: 2 })),
    ).toBeUndefined()
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
