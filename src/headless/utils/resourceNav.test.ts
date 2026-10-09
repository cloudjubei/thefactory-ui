import { describe, it, expect } from 'vitest'
import { resolveResourceNav } from './resourceNav'
import type { ResourceLink } from 'thefactory-tools/types'

describe('resolveResourceNav', () => {
  it('maps a design link to the project’s Design tab, on its screen and item', () => {
    expect(resolveResourceNav({ kind: 'design', projectId: 'p 1' })).toEqual({
      type: 'path',
      path: '/projects/p%201/design',
    })
    expect(resolveResourceNav({ kind: 'design', projectId: 'p1', screenId: 's1' })).toEqual({
      type: 'path',
      path: '/projects/p1/design?screen=s1',
    })
    expect(
      resolveResourceNav({ kind: 'design', projectId: 'p1', screenId: 's1', itemId: 'i/1' }),
    ).toEqual({ type: 'path', path: '/projects/p1/design?screen=s1&item=i%2F1' })
  })

  it('maps a project link to the project route', () => {
    expect(resolveResourceNav({ kind: 'project', projectId: 'p1' })).toEqual({
      type: 'path',
      path: '/projects/p1',
    })
  })

  it('maps a story link to the story route', () => {
    expect(resolveResourceNav({ kind: 'story', projectId: 'p1', storyId: 's2' })).toEqual({
      type: 'path',
      path: '/projects/p1/stories/s2',
    })
  })

  it('maps a feature link to its story route (no standalone feature route)', () => {
    expect(
      resolveResourceNav({ kind: 'feature', projectId: 'p1', storyId: 's2', featureId: 'f3' }),
    ).toEqual({ type: 'path', path: '/projects/p1/stories/s2' })
  })

  it('maps an app deep-link to the app tab with a view+params query', () => {
    expect(
      resolveResourceNav({ kind: 'app', projectId: 'p1', view: 'runs', params: { run: 'abc' } }),
    ).toEqual({ type: 'path', path: '/projects/p1/app?view=runs&run=abc' })
  })

  it('maps an app deep-link with no view/params to the bare app tab', () => {
    expect(resolveResourceNav({ kind: 'app', projectId: 'p1' })).toEqual({
      type: 'path',
      path: '/projects/p1/app',
    })
  })

  it('percent-encodes app query keys and values', () => {
    expect(
      resolveResourceNav({ kind: 'app', projectId: 'p1', view: 'x y', params: { 'a b': 'c&d' } }),
    ).toEqual({ type: 'path', path: '/projects/p1/app?view=x%20y&a%20b=c%26d' })
  })

  it('encodes reserved characters in id segments', () => {
    expect(resolveResourceNav({ kind: 'story', projectId: 'p/1', storyId: 's 2' })).toEqual({
      type: 'path',
      path: '/projects/p%2F1/stories/s%202',
    })
  })

  it('returns the chat context for a chat link (client encodes its own URL)', () => {
    const link: ResourceLink = {
      kind: 'chat',
      context: { type: 'STORY', projectId: 'p1', storyId: 's2' },
    }
    expect(resolveResourceNav(link)).toEqual({
      type: 'chat',
      context: { type: 'STORY', projectId: 'p1', storyId: 's2' },
    })
  })

  it('opens a note in its project’s notes, and a file in its project’s files', () => {
    expect(resolveResourceNav({ kind: 'note', projectId: 'p1', noteId: 'n1' })).toEqual({
      type: 'path',
      path: '/projects/p1/notes?note=n1',
    })
    expect(resolveResourceNav({ kind: 'file', projectId: 'p1', path: 'docs/a b.md' })).toEqual({
      type: 'path',
      path: '/projects/p1/files/docs/a%20b.md',
    })
  })

  it('opens a group’s note in that group’s notes', () => {
    expect(resolveResourceNav({ kind: 'groupNote', groupId: 'g 1', noteId: 'n1' })).toEqual({
      type: 'path',
      path: '/groups/g%201/notes?note=n1',
    })
  })
})
