import { describe, expect, it } from 'vitest'
import { liveRunToShow } from './liveRunHandoff'

describe('liveRunToShow', () => {
  it('shows the run that is live', () => {
    expect(liveRunToShow({ live: 'r2', held: 'r1', persistedRunIds: new Set() })).toBe('r2')
  })

  it('keeps showing a run that just ended until a message carries it', () => {
    expect(liveRunToShow({ live: undefined, held: 'r1', persistedRunIds: new Set() })).toBe('r1')
  })

  it('lets go once the persisted reply carries the run', () => {
    expect(
      liveRunToShow({ live: undefined, held: 'r1', persistedRunIds: new Set(['r1']) }),
    ).toBeUndefined()
  })

  it('shows nothing when nothing was live', () => {
    expect(liveRunToShow({ live: undefined, held: undefined, persistedRunIds: new Set() })).toBe(
      undefined,
    )
  })
})
