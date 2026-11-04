import { describe, expect, it } from 'vitest'
import type { ProcessGroupRun } from 'thefactory-tools/types'

import { applyGroupSignOffUpdate } from './useGroupSignOffCounts'

const park = { reason: 'sign-off', message: 'm', parkedAt: 1 } as const
const waiting = (id: string, over: Partial<ProcessGroupRun> = {}): ProcessGroupRun =>
  ({ id, groupId: 'g', status: 'parked', legs: [], startedAt: 1, park, ...over }) as ProcessGroupRun

describe('applyGroupSignOffUpdate', () => {
  it('takes in a group run that came to its sign-off', () => {
    const run = waiting('a')
    expect(applyGroupSignOffUpdate([], { groupRunId: 'a', run })).toEqual([run])
    expect(applyGroupSignOffUpdate(undefined, { groupRunId: 'a', run })).toEqual([run])
  })

  it('replaces the record of one already held, so a run is never there twice', () => {
    const failed = waiting('a', {
      park: { reason: 'sign-off-failed', message: 'm', parkedAt: 2 },
    })
    expect(applyGroupSignOffUpdate([waiting('a')], { groupRunId: 'a', run: failed })).toEqual([
      failed,
    ])
  })

  it('drops one the person answered, one that ended and one that went to another stop', () => {
    const prev = [waiting('a')]
    const leftBy = (over: Partial<ProcessGroupRun>) =>
      applyGroupSignOffUpdate(prev, { groupRunId: 'a', run: waiting('a', over) })
    expect(leftBy({ status: 'running', park: undefined })).toEqual([])
    expect(leftBy({ status: 'succeeded' })).toEqual([])
    expect(leftBy({ park: { reason: 'leg-failed', message: 'm', parkedAt: 2 } })).toEqual([])
  })

  it('drops a deleted run', () => {
    expect(applyGroupSignOffUpdate([waiting('a')], { groupRunId: 'a', deleted: true })).toEqual([])
  })

  it('gives the same list back when nothing changes for it, so nothing draws again', () => {
    const prev = [waiting('a')]
    const running = waiting('b', { status: 'running', park: undefined })
    expect(applyGroupSignOffUpdate(prev, { groupRunId: 'b', run: running })).toBe(prev)
    expect(applyGroupSignOffUpdate(prev, { groupRunId: 'b', deleted: true })).toBe(prev)
    expect(applyGroupSignOffUpdate(prev, { run: waiting('c') })).toBe(prev)
    expect(applyGroupSignOffUpdate(undefined, { groupRunId: 'b', run: running })).toBeUndefined()
  })
})
