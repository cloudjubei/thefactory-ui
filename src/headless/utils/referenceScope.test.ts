import { describe, expect, it } from 'vitest'
import { referenceGroupId } from './referenceScope'

describe('referenceGroupId', () => {
  const projects = [
    { id: 'be', mainGroupId: 'osc' },
    { id: 'loose', mainGroupId: null },
  ]

  it('reaches a group chat’s own group', () => {
    expect(referenceGroupId({ groupId: 'osc' }, projects)).toBe('osc')
  })

  it('reaches a project chat’s main group', () => {
    expect(referenceGroupId({ projectId: 'be' }, projects)).toBe('osc')
  })

  it('reaches no group from a project in none, an unknown project, or no scope', () => {
    expect(referenceGroupId({ projectId: 'loose' }, projects)).toBeUndefined()
    expect(referenceGroupId({ projectId: 'gone' }, projects)).toBeUndefined()
    expect(referenceGroupId({}, projects)).toBeUndefined()
    expect(referenceGroupId(undefined, projects)).toBeUndefined()
  })
})
