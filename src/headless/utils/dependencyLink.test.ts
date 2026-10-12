import { describe, expect, it } from 'vitest'
import { dependencyResourceLink } from './dependencyLink'

describe('dependencyResourceLink', () => {
  it('links a feature dependency to the feature, not just its story', () => {
    expect(
      dependencyResourceLink({ kind: 'feature', storyId: 's1', featureId: 'f2' }, 'p1'),
    ).toEqual({ kind: 'feature', projectId: 'p1', storyId: 's1', featureId: 'f2' })
  })

  it('links a story dependency to the story', () => {
    expect(dependencyResourceLink({ kind: 'story', storyId: 's1' }, 'p1')).toEqual({
      kind: 'story',
      projectId: 'p1',
      storyId: 's1',
    })
  })

  it('has no link for a missing dependency', () => {
    expect(dependencyResourceLink({ kind: 'missing' }, 'p1')).toBeUndefined()
  })

  it('has no link without a project', () => {
    for (const projectId of [undefined, null, '']) {
      expect(dependencyResourceLink({ kind: 'story', storyId: 's1' }, projectId)).toBeUndefined()
    }
  })
})
