import { describe, expect, it } from 'vitest'
import type { ParsedReference, ReferenceDescription } from 'thefactory-tools/types'
import { referencedRunId, storyChipLabel } from './referenceTargets'

describe('referencedRunId', () => {
  it('reads the run a run reference or a run link points at, and nothing else', () => {
    expect(referencedRunId({ type: 'reference', reference: { kind: 'run', runId: 'r1' } })).toBe(
      'r1',
    )
    expect(
      referencedRunId({ type: 'link', link: { kind: 'run', projectId: 'p', runId: 'r2' } }),
    ).toBe('r2')
    expect(
      referencedRunId({ type: 'reference', reference: { kind: 'story', storyId: 's' } }),
    ).toBeUndefined()
    expect(
      referencedRunId({ type: 'link', link: { kind: 'project', projectId: 'p' } }),
    ).toBeUndefined()
    expect(
      referencedRunId({ type: 'typed', typed: { kind: 'position', story: 1 } }),
    ).toBeUndefined()
  })
})

describe('storyChipLabel', () => {
  const describing =
    (description: ReferenceDescription | undefined) => (parsed: ParsedReference) => {
      expect(parsed).toEqual({
        type: 'reference',
        reference: { kind: 'story', projectId: 'p', storyId: 's' },
      })
      return description
    }

  it('names a story by its number and title, as its chip reads', () => {
    expect(
      storyChipLabel(describing({ kind: 'story', label: '#8', title: 'Fixture rework' }), 'p', 's'),
    ).toBe('#8 Fixture rework')
    expect(storyChipLabel(describing({ kind: 'story', label: '#8' }), 'p', 's')).toBe('#8')
  })

  it('names nothing the chat cannot find or is still looking up', () => {
    expect(storyChipLabel(describing(undefined), 'p', 's')).toBeUndefined()
    expect(
      storyChipLabel(describing({ kind: 'story', label: '#?', missing: true }), 'p', 's'),
    ).toBeUndefined()
    expect(
      storyChipLabel(describing({ kind: 'story', label: '…', loading: true }), 'p', 's'),
    ).toBeUndefined()
  })
})
