import { describe, expect, it } from 'vitest'
import {
  isLazyReferenceScope,
  referenceGroupId,
  referencedProjectId,
  referenceProjectsToLoad,
} from './referenceScope'

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

describe('isLazyReferenceScope', () => {
  it('is lazy for a chat over every project — the general chat', () => {
    expect(isLazyReferenceScope({})).toBe(true)
    expect(isLazyReferenceScope({ projectId: null, groupId: null })).toBe(true)
  })

  it('is not lazy for a project or group chat, or with no scope at all', () => {
    expect(isLazyReferenceScope({ projectId: 'p1' })).toBe(false)
    expect(isLazyReferenceScope({ groupId: 'g1' })).toBe(false)
    expect(isLazyReferenceScope(undefined)).toBe(false)
  })
})

describe('referenceProjectsToLoad', () => {
  const scope = ['p1', 'p2', 'p3']

  it('loads every project of a scope that is not lazy', () => {
    expect(referenceProjectsToLoad(scope, false, new Set())).toEqual(scope)
  })

  it('loads only the wanted projects of a lazy scope, in scope order', () => {
    expect(referenceProjectsToLoad(scope, true, new Set(['p3', 'p1', 'elsewhere']))).toEqual([
      'p1',
      'p3',
    ])
    expect(referenceProjectsToLoad(scope, true, new Set())).toEqual([])
  })
})

describe('referencedProjectId', () => {
  it('reads the project a stored reference names', () => {
    expect(
      referencedProjectId({
        type: 'reference',
        reference: { kind: 'story', projectId: 'p2', storyId: 's' },
      }),
    ).toBe('p2')
  })

  it('reads the project a typed reference names', () => {
    expect(
      referencedProjectId({
        type: 'typed',
        typed: { kind: 'position', projectId: 'p3', story: 2 },
      }),
    ).toBe('p3')
  })

  it('reads the project a link names, a chat link through its context', () => {
    expect(referencedProjectId({ kind: 'note', projectId: 'p4', noteId: 'n' })).toBe('p4')
    expect(
      referencedProjectId({ kind: 'chat', context: { type: 'PROJECT', projectId: 'p5' } }),
    ).toBe('p5')
  })

  it('names no project for what belongs to none', () => {
    expect(
      referencedProjectId({ type: 'reference', reference: { kind: 'attachment', path: 'a' } }),
    ).toBeUndefined()
    expect(
      referencedProjectId({
        type: 'reference',
        reference: { kind: 'groupNote', groupId: 'g', noteId: 'n' },
      }),
    ).toBeUndefined()
    expect(
      referencedProjectId({ type: 'typed', typed: { kind: 'groupHandle', name: 'x' } }),
    ).toBeUndefined()
    expect(
      referencedProjectId({ kind: 'chat', context: { type: 'GROUP', groupId: 'g' } }),
    ).toBeUndefined()
  })
})
