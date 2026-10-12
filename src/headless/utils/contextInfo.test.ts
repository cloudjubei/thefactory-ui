import { describe, expect, it } from 'vitest'
import { contextInfoStory } from './contextInfo'

describe('contextInfoStory', () => {
  it('uses the chat context’s own story and feature first', () => {
    expect(
      contextInfoStory({ storyId: 's1', featureId: 'f1' }, { storyId: 's2', featureId: 'f2' }),
    ).toEqual({ storyId: 's1', featureId: 'f1' })
  })

  it('never pairs the context’s story with the run’s feature', () => {
    expect(contextInfoStory({ storyId: 's1' }, { storyId: 's2', featureId: 'f2' })).toEqual({
      storyId: 's1',
    })
  })

  it('falls back to the run’s story and feature', () => {
    expect(contextInfoStory({}, { storyId: 's2', featureId: 'f2' })).toEqual({
      storyId: 's2',
      featureId: 'f2',
    })
    expect(contextInfoStory({}, { storyId: 's2' })).toEqual({ storyId: 's2' })
  })

  it('ignores a feature that has no story', () => {
    expect(contextInfoStory({ featureId: 'f1' }, { featureId: 'f2' })).toEqual({})
  })

  it('is empty without a story anywhere', () => {
    expect(contextInfoStory({}, undefined)).toEqual({})
    expect(contextInfoStory({}, null)).toEqual({})
  })
})
