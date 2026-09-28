import {
  CAPTURE_RECORD_NOT_THE_TOOLS_REASON,
  CODE_REVIEW_APPROACH,
  EVIDENCE_FILE_CHANGED_REASON,
  EVIDENCE_RECORD_UNVOUCHED_REASON,
  FEATURE_REPORT_APPROACH,
  FINAL_REPORT_APPROACH,
} from 'thefactory-tools/constants'
import { describe, expect, it } from 'vitest'
import {
  comparisonPairFacts,
  evidenceUnvouched,
  evidenceViewerImages,
  groupEvidence,
  isReadableNote,
  notesToRead,
  fileNameSlug,
  isViewableImage,
  latestReport,
  pairUnvouched,
  recordedEvidenceUnvouched,
  screenPairFileStem,
  screenPairMeta,
  screenPairs,
  summarizeEvidence,
  toEvidenceTile,
  evidenceFiledWithin,
  reviewerVerdict,
  codeReviewVerdict,
  isVerifierFiling,
  orderReports,
  reportAuthor,
  reportProvenance,
  runReports,
} from './reviewEvidenceView'
import {
  SCREEN_PAIR_CAPTURING_META,
  SCREEN_PAIR_FACT,
  SCREEN_PAIR_META,
  SCREEN_PAIR_UNVOUCHED_META,
  UNVOUCHED_LABEL,
  UNVOUCHED_RESTART_TEXT,
  UNVOUCHED_SIDE_LEAD,
} from './reviewEvidenceViewConstants'
import type { ScreenPair } from './reviewEvidenceViewTypes'
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

describe('evidenceFiledWithin', () => {
  const tiles = [5, 10, 15, 20, 25].map((createdAt) =>
    toEvidenceTile(ref({ id: `e${createdAt}`, createdAt })),
  )

  it("keeps only one attempt's filings, both ends inclusive", () => {
    expect(evidenceFiledWithin(tiles, { since: 10, until: 20 }).map((t) => t.ref.id)).toEqual([
      'e10',
      'e15',
      'e20',
    ])
  })

  it('is open-ended while the attempt is still running', () => {
    expect(evidenceFiledWithin(tiles, { since: 15 }).map((t) => t.ref.id)).toEqual([
      'e15',
      'e20',
      'e25',
    ])
  })
})

describe('reviewerVerdict', () => {
  it('takes the NEWEST verdict, as the gate does', () => {
    expect(
      reviewerVerdict([
        ref({ id: 'a', createdAt: 1, verdict: 'approved' }),
        ref({ id: 'b', createdAt: 9, verdict: 'changes-requested', verdictReason: ' login wall ' }),
        ref({ id: 'c', createdAt: 5 }),
      ]),
    ).toEqual({
      state: 'concluded',
      verdict: { verdict: 'changes-requested', reason: 'login wall' },
    })
  })

  it('omits an empty reason, and reads none when nobody concluded anything', () => {
    expect(reviewerVerdict([ref({ verdict: 'approved', verdictReason: '  ' })])).toEqual({
      state: 'concluded',
      verdict: { verdict: 'approved' },
    })
    expect(reviewerVerdict([ref(), ref({ id: 'x', kind: 'report' })])).toEqual({ state: 'none' })
  })
})

describe('notesToRead', () => {
  const note = (id: string, mediaType = 'text/markdown') =>
    ref({ id, kind: 'report', mediaType, path: `${id}.md` })

  it('reads only the notes not already held or on their way', () => {
    const found = [note('n1'), note('n2', 'application/json'), note('n3'), ref({ id: 'shot' })]
    expect(notesToRead(found, new Set(['n1'])).map((r) => r.id)).toEqual(['n2', 'n3'])
  })

  it('reads nothing on a re-pull once every note is held', () => {
    const found = [note('n1'), note('n2')]
    expect(notesToRead(found, new Set(['n1', 'n2']))).toEqual([])
  })

  it('never reads an image or a recording as a note', () => {
    expect(
      notesToRead(
        [ref({ id: 'shot' }), ref({ id: 'rec', kind: 'recording', mediaType: 'video/mp4' })],
        new Set(),
      ),
    ).toEqual([])
  })
})

/**
 * An item as the backend lists it once it cannot vouch for it — the shape
 * `unvouchedEvidence` returns: what the filer named and where it is stored, the
 * reason, and nothing a capture tool or reviewer claimed (no build, device,
 * screen, comparison or verdict).
 */
const listedUnvouched = (
  over: Partial<ReviewEvidenceRef> & { id: string; unvouchedReason: string },
): ReviewEvidenceRef => ({
  runId: 'd5d6ac74-69c3-41d8-ac2b-9bbaa3703b42',
  projectId: 'p1',
  storyId: 's1',
  featureId: 'f1',
  kind: 'screenshot',
  path: `.factory/artifacts/review/d5d6ac74-69c3-41d8-ac2b-9bbaa3703b42/${over.id}.png`,
  label: 'Onsite debug — login',
  phase: 'after',
  subject: 'onsite-login',
  mediaType: 'image/png',
  bytes: 618_269,
  createdAt: 1_790_156_833_451,
  ...over,
})

describe('evidenceUnvouched', () => {
  it('says the restart case calmly, as a capture the next verify run takes again', () => {
    expect(
      evidenceUnvouched(
        listedUnvouched({ id: 'shot', unvouchedReason: EVIDENCE_RECORD_UNVOUCHED_REASON }),
      ),
    ).toEqual({
      cause: 'restart',
      label: UNVOUCHED_LABEL,
      text: UNVOUCHED_RESTART_TEXT.capture,
    })
  })

  it('words a recording as captured again, and a report or log as filed again', () => {
    const restart = (kind: ReviewEvidenceRef['kind'], mediaType: string) =>
      evidenceUnvouched(
        listedUnvouched({
          id: kind,
          kind,
          mediaType,
          unvouchedReason: EVIDENCE_RECORD_UNVOUCHED_REASON,
        }),
      )?.text
    expect(restart('recording', 'video/mp4')).toBe(UNVOUCHED_RESTART_TEXT.capture)
    expect(restart('report', 'text/markdown')).toBe(UNVOUCHED_RESTART_TEXT.filing)
    expect(restart('log', 'text/plain')).toBe(UNVOUCHED_RESTART_TEXT.filing)
  })

  it.each([
    [EVIDENCE_FILE_CHANGED_REASON, 'file-changed'],
    [CAPTURE_RECORD_NOT_THE_TOOLS_REASON, 'capture-record'],
  ] as const)(
    'gives a changed or forged record the backend’s own words, never the restart wording',
    (reason, cause) => {
      const note = evidenceUnvouched(listedUnvouched({ id: 'shot', unvouchedReason: reason }))
      expect(note).toEqual({ cause, label: UNVOUCHED_LABEL, text: reason })
      expect(note?.text).not.toBe(UNVOUCHED_RESTART_TEXT.capture)
    },
  )

  it('shows a reason it does not know verbatim rather than dropping it', () => {
    expect(
      evidenceUnvouched(
        listedUnvouched({ id: 'shot', unvouchedReason: '  The seal key rotated.  ' }),
      ),
    ).toEqual({ cause: 'other', label: UNVOUCHED_LABEL, text: 'The seal key rotated.' })
  })

  it('is undefined for an item the backend vouches for, or a blank reason', () => {
    expect(evidenceUnvouched(ref({ capturedOn: 'android · emulator-5554' }))).toBeUndefined()
    expect(evidenceUnvouched(ref({ unvouchedReason: '   ' }))).toBeUndefined()
  })
})

describe('toEvidenceTile, for an item the backend cannot vouch for', () => {
  it('keeps the filer’s caption and says why nothing else is said about it', () => {
    const t = toEvidenceTile(
      listedUnvouched({ id: 'shot', unvouchedReason: EVIDENCE_RECORD_UNVOUCHED_REASON }),
    )
    expect(t.caption).toBe('Onsite debug — login')
    expect(t.unvouched?.cause).toBe('restart')
  })

  it('adds nothing to an item the backend vouches for', () => {
    expect('unvouched' in toEvidenceTile(ref({ capturedOn: 'ios · iPhone 16' }))).toBe(false)
  })
})

describe('pairUnvouched', () => {
  const restart = toEvidenceTile(
    listedUnvouched({
      id: 'b',
      phase: 'before',
      unvouchedReason: EVIDENCE_RECORD_UNVOUCHED_REASON,
    }),
  )
  const changed = toEvidenceTile(
    listedUnvouched({ id: 'a', unvouchedReason: EVIDENCE_FILE_CHANGED_REASON }),
  )
  const vouched = toEvidenceTile(ref({ id: 'v', capturedOn: 'android · emulator-5554' }))

  it('takes the after’s changed file as the cause over a before’s restart, saying both', () => {
    const u = pairUnvouched({ before: restart, after: changed })
    expect(u?.cause).toBe('file-changed')
    expect(u?.text).toBe(
      `${UNVOUCHED_SIDE_LEAD.before} ${UNVOUCHED_RESTART_TEXT.capture} ${UNVOUCHED_SIDE_LEAD.after} ${EVIDENCE_FILE_CHANGED_REASON}`,
    )
  })

  it('falls back to the before, whichever side it is', () => {
    expect(pairUnvouched({ before: restart, after: vouched })?.cause).toBe('restart')
    expect(pairUnvouched({ before: vouched, after: changed })?.cause).toBe('file-changed')
  })

  it('is undefined when both sides are vouched for, or absent', () => {
    expect(pairUnvouched({ before: vouched, after: vouched })).toBeUndefined()
    expect(pairUnvouched({})).toBeUndefined()
  })

  it('says one reason once when both sides share it', () => {
    const otherRestart = toEvidenceTile(
      listedUnvouched({ id: 'a2', unvouchedReason: EVIDENCE_RECORD_UNVOUCHED_REASON }),
    )
    expect(pairUnvouched({ before: restart, after: otherRestart })).toEqual({
      cause: 'restart',
      label: UNVOUCHED_LABEL,
      text: UNVOUCHED_RESTART_TEXT.capture,
    })
  })

  it('never lets an after’s restart explain away a before whose file changed', () => {
    const changedBefore = toEvidenceTile(
      listedUnvouched({ id: 'b', phase: 'before', unvouchedReason: EVIDENCE_FILE_CHANGED_REASON }),
    )
    const restartAfter = toEvidenceTile(
      listedUnvouched({ id: 'a', unvouchedReason: EVIDENCE_RECORD_UNVOUCHED_REASON }),
    )
    expect(pairUnvouched({ before: changedBefore, after: restartAfter })).toEqual({
      cause: 'file-changed',
      label: UNVOUCHED_LABEL,
      text: `${UNVOUCHED_SIDE_LEAD.before} ${EVIDENCE_FILE_CHANGED_REASON} ${UNVOUCHED_SIDE_LEAD.after} ${UNVOUCHED_RESTART_TEXT.capture}`,
    })
  })

  it('keeps a before’s foreign capture record beside an after filed before the restart', () => {
    const foreignBefore = toEvidenceTile(
      listedUnvouched({
        id: 'b',
        phase: 'before',
        unvouchedReason: CAPTURE_RECORD_NOT_THE_TOOLS_REASON,
      }),
    )
    const u = pairUnvouched({ before: foreignBefore, after: restart })
    expect(u?.cause).toBe('capture-record')
    expect(u?.text).toContain(CAPTURE_RECORD_NOT_THE_TOOLS_REASON)
  })

  it('names both sides, the after’s cause leading, when neither is a restart', () => {
    const changedBefore = toEvidenceTile(
      listedUnvouched({ id: 'b', phase: 'before', unvouchedReason: EVIDENCE_FILE_CHANGED_REASON }),
    )
    const foreignAfter = toEvidenceTile(
      listedUnvouched({ id: 'a', unvouchedReason: CAPTURE_RECORD_NOT_THE_TOOLS_REASON }),
    )
    expect(pairUnvouched({ before: changedBefore, after: foreignAfter })).toEqual({
      cause: 'capture-record',
      label: UNVOUCHED_LABEL,
      text: `${UNVOUCHED_SIDE_LEAD.before} ${EVIDENCE_FILE_CHANGED_REASON} ${UNVOUCHED_SIDE_LEAD.after} ${CAPTURE_RECORD_NOT_THE_TOOLS_REASON}`,
    })
  })
})

describe('recordedEvidenceUnvouched', () => {
  /** What `recordReviewEvidence` returns: the filed item's listing. */
  const filed = {
    id: 'ev-1',
    runId: 'run1',
    projectId: 'p1',
    kind: 'screenshot',
    path: '.factory/artifacts/review/run1/ev-1.png',
    label: 'Login, after',
    phase: 'after',
    subject: 'login',
    mediaType: 'image/png',
    bytes: 618_269,
    sha256: '9f2c4e0b7a1d3c5e8f60a2b4c6d8e0f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d3',
    createdAt: 1_790_156_833_451,
  }

  it('says why a filing whose capture record was not the tool’s never counts', () => {
    expect(
      recordedEvidenceUnvouched({ ...filed, unvouchedReason: CAPTURE_RECORD_NOT_THE_TOOLS_REASON }),
    ).toEqual({
      cause: 'capture-record',
      label: UNVOUCHED_LABEL,
      text: CAPTURE_RECORD_NOT_THE_TOOLS_REASON,
    })
  })

  it('words a restart by the kind the tool filed', () => {
    const restart = (kind: string) =>
      recordedEvidenceUnvouched({
        ...filed,
        kind,
        unvouchedReason: EVIDENCE_RECORD_UNVOUCHED_REASON,
      })?.text
    expect(restart('recording')).toBe(UNVOUCHED_RESTART_TEXT.capture)
    expect(restart('report')).toBe(UNVOUCHED_RESTART_TEXT.filing)
  })

  it('is undefined for a filing the backend vouches for, a failed call or no result', () => {
    expect(recordedEvidenceUnvouched(filed)).toBeUndefined()
    expect(recordedEvidenceUnvouched({ error: 'sourcePath does not exist' })).toBeUndefined()
    expect(recordedEvidenceUnvouched(undefined)).toBeUndefined()
    expect(recordedEvidenceUnvouched(null)).toBeUndefined()
    expect(recordedEvidenceUnvouched('filed')).toBeUndefined()
    expect(recordedEvidenceUnvouched({ ...filed, unvouchedReason: 42 })).toBeUndefined()
  })
})

describe('screenPairs, with captures the backend cannot vouch for', () => {
  const restartReason = { unvouchedReason: EVIDENCE_RECORD_UNVOUCHED_REASON }

  it('keeps an unvouched pair as the pair it is, marked so it never reads as proof', () => {
    const pairs = screenPairs(
      groupEvidence(
        [
          listedUnvouched({ id: 'b', phase: 'before', createdAt: 1, ...restartReason }),
          ref({ id: 'a', subject: 'onsite-login', phase: 'after', createdAt: 2 }),
        ].map(toEvidenceTile),
      ),
    )
    expect(pairs).toHaveLength(1)
    expect(pairs[0].class).toBe('pair')
    expect(pairs[0].before?.ref.id).toBe('b')
    expect(pairs[0].unvouched?.text).toBe(UNVOUCHED_RESTART_TEXT.capture)
  })

  it('marks a lone unvouched capture too', () => {
    const [single] = screenPairs(
      groupEvidence([
        toEvidenceTile(listedUnvouched({ id: 'x', phase: undefined, ...restartReason })),
      ]),
    )
    expect(single.class).toBe('single')
    expect(single.unvouched?.cause).toBe('restart')
  })

  it('leaves a vouched pair unmarked', () => {
    const pairs = screenPairs(
      groupEvidence(
        [
          ref({ id: 'b', subject: 'login', phase: 'before', createdAt: 1 }),
          ref({ id: 'a', subject: 'login', phase: 'after', createdAt: 2 }),
          ref({ id: 's', createdAt: 3 }),
        ].map(toEvidenceTile),
      ),
    )
    expect(pairs.some((p) => 'unvouched' in p)).toBe(false)
  })
})

describe('screenPairMeta', () => {
  const pair = (over: Partial<ScreenPair> = {}): ScreenPair => ({
    key: 'k',
    index: 1,
    title: 'login',
    class: 'pair',
    ...over,
  })
  const unvouched = {
    cause: 'restart' as const,
    label: UNVOUCHED_LABEL,
    text: UNVOUCHED_RESTART_TEXT.capture,
  }

  it('names the class of a tile the backend vouches for', () => {
    expect(screenPairMeta(pair({ class: 'removed' }), { capturing: false })).toBe(
      SCREEN_PAIR_META.removed,
    )
  })

  it('says a tile cannot be vouched for in place of its class', () => {
    expect(screenPairMeta(pair({ unvouched }), { capturing: false })).toBe(
      SCREEN_PAIR_UNVOUCHED_META,
    )
  })

  it('draws no conclusion at all while the capture is still running', () => {
    expect(screenPairMeta(pair({ unvouched, class: 'new' }), { capturing: true })).toBe(
      SCREEN_PAIR_CAPTURING_META,
    )
  })
})

describe('comparisonPairFacts', () => {
  const base: ScreenPair = { key: 'k', index: 1, title: 'login', class: 'new' }

  it('says what the pair is when the gate left no note', () => {
    expect(comparisonPairFacts(base)).toEqual([SCREEN_PAIR_FACT.new])
  })

  it('leads with the gate’s note over the class’s generic line', () => {
    expect(comparisonPairFacts({ ...base, note: 'Shows the change · 92 px changed' })).toEqual([
      'Shows the change · 92 px changed',
    ])
  })

  it('adds why a side cannot be vouched for, in full', () => {
    expect(
      comparisonPairFacts({
        ...base,
        class: 'pair',
        note: 'The gate counted this when it ran — it can’t be vouched for now · 92 px changed',
        unvouched: {
          cause: 'file-changed',
          label: UNVOUCHED_LABEL,
          text: EVIDENCE_FILE_CHANGED_REASON,
        },
      }),
    ).toEqual([
      'The gate counted this when it ran — it can’t be vouched for now · 92 px changed',
      EVIDENCE_FILE_CHANGED_REASON,
    ])
  })
})

describe('reviewerVerdict, over a listing the backend cannot vouch for', () => {
  const report = (over: Partial<ReviewEvidenceRef> & { id: string; unvouchedReason: string }) =>
    listedUnvouched({
      kind: 'report',
      mediaType: 'text/markdown',
      path: `.factory/artifacts/review/d5d6ac74-69c3-41d8-ac2b-9bbaa3703b42/${over.id}.md`,
      phase: undefined,
      subject: undefined,
      ...over,
    })

  it('reads unvouched, never none, since the backend drops a verdict it cannot vouch for', () => {
    expect(
      reviewerVerdict([report({ id: 'rep', unvouchedReason: EVIDENCE_RECORD_UNVOUCHED_REASON })]),
    ).toEqual({ state: 'unvouched' })
  })

  it('never offers an older verdict as the conclusion over a newer filing that lost its own', () => {
    expect(
      reviewerVerdict([
        report({ id: 'r2', createdAt: 300, unvouchedReason: EVIDENCE_FILE_CHANGED_REASON }),
        ref({
          id: 'r1',
          kind: 'report',
          createdAt: 200,
          verdict: 'approved',
          verdictReason: 'Looks right',
        }),
      ]),
    ).toEqual({ state: 'unvouched' })
  })

  it('reads it unvouched when that filing landed in the same millisecond — neither is newer', () => {
    const verdict = ref({ id: 'r1', kind: 'report', createdAt: 300, verdict: 'approved' })
    const lost = report({ id: 'r2', createdAt: 300, unvouchedReason: EVIDENCE_FILE_CHANGED_REASON })
    expect(reviewerVerdict([verdict, lost])).toEqual({ state: 'unvouched' })
    expect(reviewerVerdict([lost, verdict])).toEqual({ state: 'unvouched' })
  })

  it('keeps a verdict filed after every filing that lost its own', () => {
    expect(
      reviewerVerdict([
        report({ id: 'r1', createdAt: 100, unvouchedReason: EVIDENCE_RECORD_UNVOUCHED_REASON }),
        ref({ id: 'r2', kind: 'report', createdAt: 200, verdict: 'changes-requested' }),
      ]),
    ).toEqual({ state: 'concluded', verdict: { verdict: 'changes-requested' } })
  })

  it('keeps an older verdict over a newer capture whose own record was not the tool’s — that filing kept any verdict', () => {
    expect(
      reviewerVerdict([
        listedUnvouched({
          id: 'shot',
          createdAt: 300,
          unvouchedReason: CAPTURE_RECORD_NOT_THE_TOOLS_REASON,
        }),
        ref({ id: 'r1', kind: 'report', createdAt: 200, verdict: 'approved' }),
      ]),
    ).toEqual({ state: 'concluded', verdict: { verdict: 'approved' } })
  })
})

describe('latestReport', () => {
  it('keeps only the newest report, wherever it sits in the listing', () => {
    const reports = [
      toEvidenceTile(ref({ id: 'middle', kind: 'report', createdAt: 150 })),
      toEvidenceTile(ref({ id: 'newest', kind: 'report', createdAt: 300 })),
      toEvidenceTile(ref({ id: 'oldest', kind: 'report', createdAt: 100 })),
    ]
    expect(latestReport(reports).map((t) => t.ref.id)).toEqual(['newest'])
  })

  it('has nothing to show when nothing was filed', () => {
    expect(latestReport([])).toEqual([])
  })
})

describe('reportAuthor', () => {
  it('routes a report by the approach it was filed under', () => {
    expect(reportAuthor(ref({ kind: 'report', approach: CODE_REVIEW_APPROACH }))).toBe(
      'code-review',
    )
    expect(reportAuthor(ref({ kind: 'report', approach: FINAL_REPORT_APPROACH }))).toBe(
      'final-report',
    )
    expect(reportAuthor(ref({ kind: 'report', approach: FEATURE_REPORT_APPROACH }))).toBe(
      'feature-report',
    )
  })

  it('reads every other report as the verifier’s — as every report was before', () => {
    expect(reportAuthor(ref({ kind: 'report' }))).toBe('verifier')
    expect(reportAuthor(ref({ kind: 'report', approach: 'code-explanation' }))).toBe('verifier')
  })
})

describe('isVerifierFiling', () => {
  it('keeps every capture and the verifier’s report', () => {
    expect(isVerifierFiling(ref({ kind: 'screenshot', approach: CODE_REVIEW_APPROACH }))).toBe(true)
    expect(isVerifierFiling(ref({ kind: 'report', approach: 'code-explanation' }))).toBe(true)
    expect(isVerifierFiling(ref({ kind: 'report' }))).toBe(true)
  })

  it('never counts a step’s own report as the verifier’s', () => {
    for (const approach of [CODE_REVIEW_APPROACH, FINAL_REPORT_APPROACH, FEATURE_REPORT_APPROACH]) {
      expect(isVerifierFiling(ref({ kind: 'report', approach }))).toBe(false)
    }
  })
})

describe('reviewerVerdict, beside a code review filed under the same run', () => {
  it('never reads the code review’s verdict as the reviewer’s', () => {
    expect(
      reviewerVerdict([
        ref({ id: 'ver', kind: 'report', createdAt: 1, verdict: 'approved' }),
        ref({
          id: 'cr',
          kind: 'report',
          approach: CODE_REVIEW_APPROACH,
          createdAt: 9,
          verdict: 'changes-requested',
          verdictReason: 'Missing test',
        }),
      ]),
    ).toEqual({ state: 'concluded', verdict: { verdict: 'approved' } })
  })

  it('reads none when only a code review concluded anything', () => {
    expect(
      reviewerVerdict([
        ref({ kind: 'report', approach: CODE_REVIEW_APPROACH, verdict: 'approved' }),
      ]),
    ).toEqual({ state: 'none' })
  })
})

describe('codeReviewVerdict', () => {
  const review = (over: Partial<ReviewEvidenceRef>) =>
    ref({ kind: 'report', approach: CODE_REVIEW_APPROACH, mediaType: 'text/markdown', ...over })

  it('takes the newest code review’s verdict, trimmed', () => {
    expect(
      codeReviewVerdict([
        review({ id: 'a', createdAt: 1, verdict: 'changes-requested', verdictReason: 'x' }),
        review({ id: 'b', createdAt: 5, verdict: 'approved', verdictReason: '  Clean.  ' }),
      ]),
    ).toEqual({ state: 'concluded', verdict: { verdict: 'approved', reason: 'Clean.' } })
  })

  it('ignores the verifier’s verdict, however new', () => {
    expect(
      codeReviewVerdict([
        review({ id: 'cr', createdAt: 1, verdict: 'changes-requested' }),
        ref({ id: 'ver', kind: 'report', createdAt: 9, verdict: 'approved' }),
      ]),
    ).toEqual({ state: 'concluded', verdict: { verdict: 'changes-requested' } })
    expect(codeReviewVerdict([ref({ kind: 'report', verdict: 'approved' })])).toEqual({
      state: 'none',
    })
  })

  it('reads unvouched when the newest code review lost its verdict', () => {
    expect(
      codeReviewVerdict([
        review({ id: 'a', createdAt: 1, verdict: 'approved' }),
        review({ id: 'b', createdAt: 5, unvouchedReason: EVIDENCE_RECORD_UNVOUCHED_REASON }),
      ]),
    ).toEqual({ state: 'unvouched' })
  })
})

describe('latestReport, among a step’s own reports', () => {
  it('keeps the verifier’s newest report, never a newer code review or step report', () => {
    const reports = [
      toEvidenceTile(ref({ id: 'ver', kind: 'report', createdAt: 100 })),
      toEvidenceTile(
        ref({ id: 'cr', kind: 'report', approach: CODE_REVIEW_APPROACH, createdAt: 300 }),
      ),
      toEvidenceTile(
        ref({ id: 'final', kind: 'report', approach: FINAL_REPORT_APPROACH, createdAt: 400 }),
      ),
      toEvidenceTile(
        ref({ id: 'feat', kind: 'report', approach: FEATURE_REPORT_APPROACH, createdAt: 500 }),
      ),
    ]
    expect(latestReport(reports).map((t) => t.ref.id)).toEqual(['ver'])
  })

  it('has nothing to show when only a step filed a report', () => {
    expect(
      latestReport([toEvidenceTile(ref({ kind: 'report', approach: CODE_REVIEW_APPROACH }))]),
    ).toEqual([])
  })
})

describe('orderReports', () => {
  const tile = (id: string, createdAt: number, approach?: string) =>
    toEvidenceTile(ref({ id, kind: 'report', createdAt, ...(approach ? { approach } : {}) }))

  it('leads with the step’s own report, then the rest newest first', () => {
    expect(
      orderReports([
        tile('ver-old', 1),
        tile('feat', 2, FEATURE_REPORT_APPROACH),
        tile('ver-new', 9),
      ]).map((t) => t.ref.id),
    ).toEqual(['feat', 'ver-new', 'ver-old'])
    expect(
      orderReports([tile('ver', 5), tile('final', 1, FINAL_REPORT_APPROACH)]).map((t) => t.ref.id),
    ).toEqual(['final', 'ver'])
  })

  it('keeps plain newest-first order when no step filed a report', () => {
    expect(orderReports([tile('a', 1), tile('c', 3), tile('b', 2)]).map((t) => t.ref.id)).toEqual([
      'c',
      'b',
      'a',
    ])
  })
})

describe('runReports', () => {
  it('keeps a run’s reports, never its code review or the story’s final report', () => {
    const tiles = [
      toEvidenceTile(ref({ id: 'shot', kind: 'screenshot' })),
      toEvidenceTile(ref({ id: 'ver', kind: 'report' })),
      toEvidenceTile(ref({ id: 'feat', kind: 'report', approach: FEATURE_REPORT_APPROACH })),
      toEvidenceTile(ref({ id: 'cr', kind: 'report', approach: CODE_REVIEW_APPROACH })),
      toEvidenceTile(ref({ id: 'final', kind: 'report', approach: FINAL_REPORT_APPROACH })),
    ]
    expect(runReports(tiles).map((t) => t.ref.id)).toEqual(['ver', 'feat'])
  })
})

describe('reportProvenance', () => {
  it('credits the step that wrote each report, and the verifier only its own', () => {
    const said = (approach?: string) =>
      reportProvenance(ref({ kind: 'report', ...(approach ? { approach } : {}) }))
    expect(said()).toContain('verifier agent')
    for (const approach of [FINAL_REPORT_APPROACH, FEATURE_REPORT_APPROACH]) {
      expect(said(approach)).toContain('report step')
      expect(said(approach)).toContain('record')
      expect(said(approach)).not.toContain('The verifier agent wrote')
    }
    expect(said(CODE_REVIEW_APPROACH)).toContain('code review step')
  })
})
