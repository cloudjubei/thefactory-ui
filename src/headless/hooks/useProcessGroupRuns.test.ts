import { describe, expect, it } from 'vitest'
import type { ProcessGroupRun } from 'thefactory-tools/types'
import { shouldTrackProcessGroupRunUpdate } from './useProcessGroupRuns'

const run = { id: 'g1', groupId: 'factory' } as ProcessGroupRun

describe('shouldTrackProcessGroupRunUpdate', () => {
  it('tracks an update of the group’s own runs, and of every group when unscoped', () => {
    expect(shouldTrackProcessGroupRunUpdate({ groupRunId: 'g1', run }, 'factory')).toBe(true)
    expect(shouldTrackProcessGroupRunUpdate({ groupRunId: 'g1', run })).toBe(true)
  })

  it('ignores another group’s run, and an update without a record', () => {
    expect(shouldTrackProcessGroupRunUpdate({ groupRunId: 'g1', run }, 'other')).toBe(false)
    expect(shouldTrackProcessGroupRunUpdate({ groupRunId: 'g1', deleted: true }, 'factory')).toBe(
      false,
    )
    expect(shouldTrackProcessGroupRunUpdate({ run }, 'factory')).toBe(false)
  })
})
