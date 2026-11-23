import { describe, expect, it } from 'vitest'

import { processRunEntryOf } from './processRunEntry'

describe('processRunEntryOf', () => {
  it('opens a feature’s run inside the story run it belongs to, drilled into', () => {
    expect(processRunEntryOf({ id: 'feature', parentRunId: 'story' }, 'feature')).toEqual({
      rootId: 'story',
      stack: ['feature'],
    })
  })

  it('opens a top run, a variant and a run not yet loaded where it was asked for', () => {
    expect(processRunEntryOf({ id: 'story' }, 'story')).toEqual({ rootId: 'story', stack: [] })
    expect(
      processRunEntryOf(
        { id: 'variant', parentRunId: 'story', variant: { index: 1 } as never },
        'variant',
      ),
    ).toEqual({ rootId: 'variant', stack: [] })
    expect(processRunEntryOf(undefined, 'feature')).toEqual({ rootId: 'feature', stack: [] })
  })
})
