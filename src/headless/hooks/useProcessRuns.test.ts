import { describe, expect, it } from 'vitest'
import type { ProcessRunStatus } from 'thefactory-tools/types'

import { PROCESS_RUN_ACTIVE_STATUSES, isProcessRunActive } from './useProcessRuns'

// Every status the union has, so a new status added upstream fails a case here
// rather than being silently miscategorised as History.
const ALL_STATUSES: ProcessRunStatus[] = [
  'pending',
  'running',
  'parked',
  'succeeded',
  'failed',
  'cancelled',
]

describe('isProcessRunActive', () => {
  it('treats pending, running and parked as Current (live)', () => {
    for (const status of ['pending', 'running', 'parked'] as ProcessRunStatus[]) {
      expect(isProcessRunActive({ status })).toBe(true)
    }
  })

  it('treats succeeded, failed and cancelled as History (terminal)', () => {
    for (const status of ['succeeded', 'failed', 'cancelled'] as ProcessRunStatus[]) {
      expect(isProcessRunActive({ status })).toBe(false)
    }
  })

  it('partitions the whole status union with no overlap and no gap', () => {
    const active = ALL_STATUSES.filter((s) => isProcessRunActive({ status: s }))
    const terminal = ALL_STATUSES.filter((s) => !isProcessRunActive({ status: s }))
    expect(active.length + terminal.length).toBe(ALL_STATUSES.length)
    expect(active).toEqual([...PROCESS_RUN_ACTIVE_STATUSES])
  })
})
