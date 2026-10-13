import { describe, expect, it } from 'vitest'
import type { ProcessRun } from 'thefactory-tools/types'

import { applyProcessRunUpdate, shouldTrackProcessRunUpdate } from './useProcessRuns'

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

describe('applyProcessRunUpdate', () => {
  const run = (id: string, startedAt: number, over: Partial<ProcessRun> = {}): ProcessRun =>
    rootRun({ id, startedAt, ...over } as Partial<ProcessRun>)

  it('puts a new root run in, newest first', () => {
    const prev = [run('b', 20), run('a', 10)]
    const next = applyProcessRunUpdate(
      prev,
      { runId: 'c', projectId: 'p1', run: run('c', 15) },
      'p1',
    )
    expect(next?.map((r) => r.id)).toEqual(['b', 'c', 'a'])
  })

  it('replaces a run it holds in place of the old copy', () => {
    const prev = [run('a', 10, { status: 'running' })]
    const next = applyProcessRunUpdate(
      prev,
      { runId: 'a', projectId: 'p1', run: run('a', 10, { status: 'parked' }) },
      undefined,
    )
    expect(next).toHaveLength(1)
    expect(next?.[0].status).toBe('parked')
  })

  it('drops a deleted run, scoped or not', () => {
    const prev = [run('a', 10), run('b', 5)]
    expect(
      applyProcessRunUpdate(prev, { runId: 'a', deleted: true }, 'p9')?.map((r) => r.id),
    ).toEqual(['b'])
  })

  it('keeps the same list when the update is not for it', () => {
    const prev = [run('a', 10)]
    expect(
      applyProcessRunUpdate(
        prev,
        { runId: 'x', projectId: 'p2', run: run('x', 1, { projectId: 'p2' }) },
        'p1',
      ),
    ).toBe(prev)
    expect(
      applyProcessRunUpdate(
        prev,
        { runId: 'c', run: run('c', 1, { parentRunId: 'a' }) },
        undefined,
      ),
    ).toBe(prev)
    expect(applyProcessRunUpdate(prev, { runId: 'gone', deleted: true }, undefined)).toBe(prev)
  })

  it('starts a list from nothing when a run arrives before the first read', () => {
    expect(
      applyProcessRunUpdate(undefined, { runId: 'a', run: run('a', 1) }, undefined)?.map(
        (r) => r.id,
      ),
    ).toEqual(['a'])
    expect(
      applyProcessRunUpdate(undefined, { runId: 'a', deleted: true }, undefined),
    ).toBeUndefined()
  })
})
