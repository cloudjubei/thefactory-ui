import { describe, expect, it } from 'vitest'
import type { ProcessRun } from 'thefactory-tools/types'

import { processStatusOverlay } from './processStatusOverlay'

const run = (over: Partial<ProcessRun>): Pick<ProcessRun, 'id' | 'status' | 'park'> =>
  ({ id: 'run-1', status: 'running', ...over }) as Pick<ProcessRun, 'id' | 'status' | 'park'>

describe('processStatusOverlay', () => {
  it('parked at the SIGN-OFF gate → Review, linking to the run', () => {
    const o = processStatusOverlay(run({ status: 'parked', park: { reason: 'gate' } as never }))
    expect(o).toEqual({ label: 'Review', semantic: 'review', runId: 'run-1' })
  })

  it('parked for any OTHER reason → Blocked (it is stuck, not awaiting sign-off)', () => {
    // A step-failed / step-question / step-errored park is not a sign-off — the
    // Review word must be reserved for the gate, or "Review" would mean "stuck".
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

  it('a finished (succeeded / cancelled) or absent run yields NO overlay — the stored status stands', () => {
    expect(processStatusOverlay(run({ status: 'succeeded' }))).toBeUndefined()
    expect(processStatusOverlay(run({ status: 'cancelled' }))).toBeUndefined()
    expect(processStatusOverlay(undefined)).toBeUndefined()
  })

  it('parked with no park record at all falls back to Blocked, never Review', () => {
    expect(processStatusOverlay(run({ status: 'parked' }))?.label).toBe('Blocked')
  })
})
