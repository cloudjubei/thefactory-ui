import { describe, expect, it } from 'vitest'
import type { ProcessRun, ProcessRunStatus } from 'thefactory-tools/types'

import {
  PROCESS_RUN_ACTIVE_STATUSES,
  isProcessRunActive,
  shouldTrackProcessRunUpdate,
} from './useProcessRuns'

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

// Fixtures vary in SHAPE (root vs child, scoped vs cross-project, absent run),
// so each guard is exercised independently — a mutation dropping any one is caught.
const rootRun = (over: Partial<ProcessRun> = {}): ProcessRun =>
  ({
    id: 'root-1',
    projectId: 'p1',
    status: 'parked',
    parentRunId: null,
    ...over,
  }) as ProcessRun

describe('shouldTrackProcessRunUpdate', () => {
  it('tracks a ROOT run for the scoped project', () => {
    expect(
      shouldTrackProcessRunUpdate({ runId: 'root-1', projectId: 'p1', run: rootRun() }, 'p1'),
    ).toBe(true)
  })

  it('IGNORES a child run — its parent already represents the process (the badge double-count)', () => {
    const child = rootRun({ id: 'child-9', parentRunId: 'root-1' })
    expect(
      shouldTrackProcessRunUpdate({ runId: 'child-9', projectId: 'p1', run: child }, 'p1'),
    ).toBe(false)
  })

  it('ignores an update for another project when scoped', () => {
    const foreign = rootRun({ id: 'root-2', projectId: 'p2' })
    expect(
      shouldTrackProcessRunUpdate({ runId: 'root-2', projectId: 'p2', run: foreign }, 'p1'),
    ).toBe(false)
  })

  it('tracks any project when UNSCOPED (the nav badge sums across projects)', () => {
    const other = rootRun({ id: 'root-2', projectId: 'p2' })
    expect(shouldTrackProcessRunUpdate({ runId: 'root-2', projectId: 'p2', run: other })).toBe(true)
    // ...but a child is still a child, scoped or not.
    const child = rootRun({ id: 'c', projectId: 'p2', parentRunId: 'root-2' })
    expect(shouldTrackProcessRunUpdate({ runId: 'c', projectId: 'p2', run: child })).toBe(false)
  })

  it('ignores a malformed event with no run payload', () => {
    expect(shouldTrackProcessRunUpdate({ runId: 'x' }, 'p1')).toBe(false)
    expect(shouldTrackProcessRunUpdate({ run: rootRun() }, 'p1')).toBe(false)
  })
})
