import { describe, expect, it } from 'vitest'
import {
  evidenceViewerImages,
  groupEvidence,
  isReadableNote,
  isViewableImage,
  summarizeEvidence,
  toEvidenceTile,
} from './reviewEvidenceView'
import type { ReviewEvidenceRef } from '../api/generated'

const ref = (over: Partial<ReviewEvidenceRef> = {}): ReviewEvidenceRef =>
  ({
    id: 'e1',
    runId: 'r1',
    projectId: 'p1',
    kind: 'screenshot',
    path: 'x.png',
    mediaType: 'image/png',
    bytes: 10,
    createdAt: 1,
    ...over,
  }) as ReviewEvidenceRef

describe('isViewableImage', () => {
  it('is true only for images', () => {
    expect(isViewableImage(ref())).toBe(true)
    expect(isViewableImage(ref({ mediaType: 'video/mp4' }))).toBe(false)
    expect(isViewableImage(ref({ mediaType: 'text/markdown' }))).toBe(false)
  })
})

describe('isReadableNote', () => {
  it('is true for text/markdown/json notes (so their text is fetched + shown inline)', () => {
    expect(isReadableNote(ref({ mediaType: 'text/markdown' }))).toBe(true)
    expect(isReadableNote(ref({ mediaType: 'text/plain' }))).toBe(true)
    expect(isReadableNote(ref({ mediaType: 'application/json' }))).toBe(true)
  })
  it('is false for images (those render as pictures, not text)', () => {
    expect(isReadableNote(ref({ mediaType: 'image/png' }))).toBe(false)
  })
})

describe('toEvidenceTile', () => {
  it('prefers the label, then the phase, then the kind', () => {
    expect(toEvidenceTile(ref({ label: 'Settings, after' })).caption).toBe('Settings, after')
    expect(toEvidenceTile(ref({ phase: 'before' })).caption).toBe('Before')
    expect(toEvidenceTile(ref({ kind: 'recording' })).caption).toBe('recording')
  })

  it('ignores a blank label rather than rendering an empty caption', () => {
    expect(toEvidenceTile(ref({ label: '   ', phase: 'after' })).caption).toBe('After')
  })
})

describe('groupEvidence', () => {
  it('pairs before/after of the same subject — the pair IS the answer', () => {
    const groups = groupEvidence([
      toEvidenceTile(ref({ id: 'a', subject: 'settings', phase: 'before' })),
      toEvidenceTile(ref({ id: 'b', subject: 'settings', phase: 'after' })),
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0]?.before?.ref.id).toBe('a')
    expect(groups[0]?.after?.ref.id).toBe('b')
  })

  it('keeps unpaired items rather than forcing them into a comparison', () => {
    const groups = groupEvidence([
      toEvidenceTile(ref({ id: 'a', subject: 'settings', phase: 'after' })),
      toEvidenceTile(ref({ id: 'loose' })),
    ])
    const loose = groups.find((g) => g.key === '__loose__')
    expect(loose?.singles.map((t) => t.ref.id)).toEqual(['loose'])
    expect(groups.find((g) => g.key === 'settings')?.before).toBeUndefined()
  })

  it('does not let a SECOND after silently replace the first', () => {
    // Two afters is new evidence, not a correction — dropping one would hide it.
    const groups = groupEvidence([
      toEvidenceTile(ref({ id: 'a1', subject: 's', phase: 'after' })),
      toEvidenceTile(ref({ id: 'a2', subject: 's', phase: 'after' })),
    ])
    expect(groups[0]?.after?.ref.id).toBe('a1')
    expect(groups[0]?.singles.map((t) => t.ref.id)).toEqual(['a2'])
  })

  it('needs BOTH subject and phase to pair', () => {
    const groups = groupEvidence([
      toEvidenceTile(ref({ id: 'a', subject: 's' })),
      toEvidenceTile(ref({ id: 'b', phase: 'after' })),
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0]?.key).toBe('__loose__')
  })

  it('is empty for no evidence', () => {
    expect(groupEvidence([])).toEqual([])
  })
})

describe('summarizeEvidence', () => {
  it('counts by kind', () => {
    expect(summarizeEvidence([ref(), ref({ kind: 'screenshot' }), ref({ kind: 'report' })])).toBe(
      '2 screenshots · 1 report',
    )
  })

  it('says so plainly when there is nothing', () => {
    expect(summarizeEvidence([])).toBe('No evidence recorded')
  })
})

describe('evidenceViewerImages', () => {
  const tile = (id: string, caption: string, dataUri?: string) => ({
    ref: ref({ id }),
    caption,
    ...(dataUri ? { dataUri } : {}),
  })

  it('orders before → after → singles and phase-prefixes the pair', () => {
    const images = evidenceViewerImages({
      key: 'login',
      title: 'login',
      before: tile('b', 'Login screen', 'data:image/png;base64,BB'),
      after: tile('a', 'Login screen', 'data:image/png;base64,AA'),
      singles: [tile('s', 'Stray shot', 'data:image/png;base64,SS')],
    })
    expect(images.map((i) => i.id)).toEqual(['b', 'a', 's'])
    expect(images[0].caption).toBe('Before — Login screen')
    expect(images[1].caption).toBe('After — Login screen')
    // A single carries no phase prefix — it is not half of a comparison.
    expect(images[2].caption).toBe('Stray shot')
  })

  it('skips items whose bytes never loaded, so the viewer never opens on a blank frame', () => {
    const images = evidenceViewerImages({
      key: 'k',
      title: 'k',
      before: tile('b', 'no bytes yet'),
      after: tile('a', 'loaded', 'data:image/png;base64,AA'),
      singles: [tile('s', 'a note with no image')],
    })
    expect(images.map((i) => i.id)).toEqual(['a'])
  })

  it('returns nothing for a group with no loaded images', () => {
    expect(evidenceViewerImages({ key: 'k', title: 'k', singles: [] })).toEqual([])
  })
})
