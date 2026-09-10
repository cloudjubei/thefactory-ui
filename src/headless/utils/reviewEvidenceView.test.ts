import { describe, expect, it } from 'vitest'
import {
  evidenceViewerImages,
  groupEvidence,
  isReadableNote,
  fileNameSlug,
  isViewableImage,
  screenPairFileStem,
  screenPairs,
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

describe('screenPairs', () => {
  const tiles = (...refs: ReviewEvidenceRef[]) => groupEvidence(refs.map(toEvidenceTile))

  it('a before and an after of one subject become one pair tile', () => {
    const pairs = screenPairs(
      tiles(
        ref({ id: 'a', subject: 'login', phase: 'before', createdAt: 5 }),
        ref({ id: 'b', subject: 'login', phase: 'after', createdAt: 6 }),
      ),
    )
    expect(pairs).toHaveLength(1)
    expect(pairs[0].class).toBe('pair')
    expect(pairs[0].before?.ref.id).toBe('a')
    expect(pairs[0].after?.ref.id).toBe('b')
    expect(pairs[0].title).toBe('login')
  })

  it('an after with no before is new; a before with no after is removed', () => {
    const pairs = screenPairs(
      tiles(
        ref({ id: 'a', subject: 'onboarding', phase: 'after', createdAt: 1 }),
        ref({ id: 'b', subject: 'legacy', phase: 'before', createdAt: 2 }),
      ),
    )
    expect(pairs.map((p) => p.class)).toEqual(['new', 'removed'])
  })

  it('an unphased screenshot is a single tile of its own', () => {
    const pairs = screenPairs(tiles(ref({ id: 'a', createdAt: 1 })))
    expect(pairs).toHaveLength(1)
    expect(pairs[0].class).toBe('single')
    expect(pairs[0].key).toBe('a')
  })

  it('leaves written reports out — a report is not a screen', () => {
    const pairs = screenPairs(
      tiles(
        ref({ id: 'a', kind: 'report', mediaType: 'text/markdown', subject: 's', phase: 'after' }),
        ref({ id: 'b', kind: 'report', mediaType: 'text/markdown' }),
      ),
    )
    expect(pairs).toEqual([])
  })

  it('orders by first capture time and numbers from 1', () => {
    const pairs = screenPairs(
      tiles(
        ref({ id: 'late', subject: 'settings', phase: 'after', createdAt: 30 }),
        ref({ id: 'early', createdAt: 10 }),
        ref({ id: 'mid-b', subject: 'login', phase: 'before', createdAt: 20 }),
        ref({ id: 'mid-a', subject: 'login', phase: 'after', createdAt: 25 }),
      ),
    )
    expect(pairs.map((p) => [p.index, p.key])).toEqual([
      [1, 'early'],
      [2, 'login'],
      [3, 'settings'],
    ])
  })

  it("takes a pair's time from its earliest side, not its latest", () => {
    const pairs = screenPairs(
      tiles(
        ref({ id: 'x', createdAt: 15 }),
        ref({ id: 'b', subject: 'login', phase: 'before', createdAt: 10 }),
        ref({ id: 'a', subject: 'login', phase: 'after', createdAt: 20 }),
      ),
    )
    expect(pairs.map((p) => p.key)).toEqual(['login', 'x'])
  })
})

describe('screenPairFileStem', () => {
  it('leads with the zero-padded index so a saved set sorts in walkthrough order', () => {
    expect(screenPairFileStem({ index: 3, title: 'Login' })).toBe('03-login')
  })

  it('keeps a two-digit index unpadded past ten', () => {
    expect(screenPairFileStem({ index: 12, title: 'Login' })).toBe('12-login')
  })

  it('replaces every run of non-alphanumerics with a single dash', () => {
    expect(screenPairFileStem({ index: 1, title: 'Login  /  SSO' })).toBe('01-login-sso')
  })

  it('never emits a path separator, whatever the screen was called', () => {
    expect(screenPairFileStem({ index: 1, title: 'a/b\\c' })).not.toMatch(/[/\\]/)
  })

  it('trims leading and trailing dashes rather than emitting a dotfile-ish name', () => {
    expect(screenPairFileStem({ index: 2, title: '  !Login!  ' })).toBe('02-login')
  })

  it('lowercases so two casings of one screen cannot collide on a case-insensitive disk', () => {
    expect(screenPairFileStem({ index: 4, title: 'LogIn' })).toBe('04-login')
  })

  it('falls back to the index alone when the title has nothing usable left', () => {
    expect(screenPairFileStem({ index: 5, title: '///' })).toBe('05')
  })
})

describe('fileNameSlug', () => {
  it('replaces every run of non-alphanumerics with a single dash', () => {
    expect(fileNameSlug('Login  /  SSO')).toBe('login-sso')
  })

  it('never emits a path separator, whatever the label was', () => {
    expect(fileNameSlug('a/b\\c')).not.toMatch(/[/\\]/)
  })

  it('trims leading and trailing dashes rather than emitting a dotfile-ish name', () => {
    expect(fileNameSlug('  !Login!  ')).toBe('login')
  })

  it('lowercases so two casings cannot collide on a case-insensitive disk', () => {
    expect(fileNameSlug('LogIn')).toBe('login')
  })

  it('returns the fallback when nothing usable survives', () => {
    expect(fileNameSlug('///', 'report')).toBe('report')
  })

  it('returns an empty string when nothing survives and no fallback was given', () => {
    expect(fileNameSlug('///')).toBe('')
  })
})
