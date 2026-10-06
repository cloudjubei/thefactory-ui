import { describe, expect, it } from 'vitest'
import type { ProcessRun } from 'thefactory-tools/types'

import { shouldTrackProcessRunUpdate } from './useProcessRuns'

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
