import { describe, expect, it } from 'vitest'
import {
  CAPTURE_RECORD_NOT_THE_TOOLS_REASON,
  CODE_REVIEW_APPROACH,
  EVIDENCE_FILE_CHANGED_REASON,
  EVIDENCE_RECORD_UNVOUCHED_REASON,
  FEATURE_REPORT_APPROACH,
} from 'thefactory-tools/constants'
import type {
  ProcessLedgerEntry,
  ProcessPlan,
  ProcessProofPair,
  ProcessVerifyProof,
} from 'thefactory-tools/types'

import type { ReviewEvidenceRef } from '../api/generated'
import { toEvidenceTile } from './reviewEvidenceView'
import { UNVOUCHED_LABEL, UNVOUCHED_RESTART_TEXT } from './reviewEvidenceViewConstants'
import type { EvidenceTile } from './reviewEvidenceViewTypes'
import {
  COUNTED_UNVOUCHED_VERDICT,
  REVIEWER_VERDICT_UNVOUCHED_LABEL,
  REVIEWER_VERDICT_UNVOUCHED_REASON,
  UNVOUCHED_BASIS_BANNER,
  UNVOUCHED_BASIS_SUMMARY,
  ATTEMPT_EMPTY,
  ATTEMPT_RUNNING_EMPTY,
  CAPTURE_LOAD_FAILED,
  CAPTURE_LOADING,
  CAPTURE_MISSING,
  DRY_FAKED_MISSING,
  DRY_LINE_TEXT,
  DRY_LINE_TOGGLE,
  NEW_SCREEN_ENTRY_NOTE,
  NEW_SCREEN_NOTE,
  NEW_SCREEN_PAIR_CHANGE,
  NOTHING_JUDGED,
  PAIR_COUNTED_VERDICT,
  PAIR_NOT_COUNTED_VERDICT,
} from './verifyProofConstants'
import {
  acceptedVerifyAttempt,
  captureBuildCaption,
  codeReviewVerdictNote,
  evidenceLoadState,
  featureVerifySectionProps,
  featureVerifyView,
  mergeEvidenceTiles,
  missingEvidenceIds,
  overlayPairsFor,
  pixelChangeLabel,
  proofChangeMarker,
  proofScreensPane,
  proofThumbnailFrame,
  reviewerVerdictNote,
  shortSha,
  storyProofNotice,
  verifyAttemptEvidence,
  verifyAttemptFacts,
  verifyAttempts,
  verifyAttemptStanding,
  verifyAttemptStatus,
  verifyGateLine,
  verifyProofHeader,
  verifyProofView,
  verifySectionProps,
} from './verifyProof'
import type { StoryProofSection, VerifyAttemptRun } from './verifyProofTypes'

const BASE = 'be10edd81166b5878c831d33ac7383850a7feefc'
const HEAD = '388321962476f808733fa3f379e94d14820b1679'
const SEAM = 'f00dcafe0123456789abcdef0123456789abcdef'

const ref = (over: Partial<ReviewEvidenceRef> & { id: string }): ReviewEvidenceRef =>
  ({
    runId: 'reviewed',
    projectId: 'p1',
    storyId: 's1',
    featureId: 'f1',
    kind: 'screenshot',
    path: `${over.id}.png`,
    mediaType: 'image/png',
    bytes: 10,
    createdAt: 1_000,
    ...over,
  }) as ReviewEvidenceRef

const tile = (over: Partial<ReviewEvidenceRef> & { id: string }): EvidenceTile =>
  toEvidenceTile(ref(over))

const pair = (over: Partial<ProcessProofPair> & { afterId: string }): ProcessProofPair => ({
  subject: over.afterId,
  beforeId: `before-of-${over.afterId}`,
  counted: false,
  ...over,
})

const proof = (over: Partial<ProcessVerifyProof> = {}): ProcessVerifyProof => ({
  pairs: [],
  newScreenIds: [],
  recordingIds: [],
  ...over,
})

describe('shortSha', () => {
  it('keeps the first eight characters of a commit', () => {
    expect(shortSha(BASE)).toBe('be10edd8')
    expect(shortSha('abc')).toBe('abc')
  })
})

describe('pixelChangeLabel', () => {
  it('says a pair was never measured rather than guessing', () => {
    expect(pixelChangeLabel(undefined, undefined)).toBe('Not measured')
  })

  it('calls a zero difference pixel-identical', () => {
    expect(pixelChangeLabel(0, 2_391_120)).toBe('Pixel-identical')
  })

  it('groups thousands and gives the share of the screen', () => {
    expect(pixelChangeLabel(219_902, 2_391_120)).toBe('219,902 px changed (9.2%)')
    expect(pixelChangeLabel(1_195_560, 2_391_120)).toBe('1,195,560 px changed (50%)')
  })

  it('does not round a tiny difference down to zero', () => {
    expect(pixelChangeLabel(92, 2_391_120)).toBe('92 px changed (<0.1%)')
  })

  it('leaves the share out when the screen size is unknown', () => {
    expect(pixelChangeLabel(500, undefined)).toBe('500 px changed')
  })
})

describe('verifyProofHeader', () => {
  it('reads a live pass as verified on live data, with no caveat to act on', () => {
    const h = verifyProofHeader(proof({ mode: 'live', baseSha: BASE, headSha: HEAD }), 'passed')
    expect(h).toMatchObject({
      mode: 'live',
      tone: 'done',
      title: 'Verified on live data',
      chip: 'Live data',
      unstated: false,
      dry: undefined,
      baseSha: 'be10edd8',
      headSha: '38832196',
      seams: [],
    })
  })

  it('says a dry pass in one quiet line, folding what was faked and the builds into rows', () => {
    const assumptions =
      'Faked eventStyles.typography.fontFamily = "McKinsey Sans"; the CMS must send it.'
    const h = verifyProofHeader(
      proof({
        mode: 'dry',
        dryAssumptions: `  ${assumptions}  `,
        baseSha: BASE,
        headSha: HEAD,
        seams: [SEAM],
      }),
      'passed',
    )
    expect(h.mode).toBe('dry')
    expect(h.tone).toBe('working')
    expect(h.title).toBe('Verified dry — not against the live backend')
    expect(h.chip).toBe('Dry run')
    expect(h.dryAssumptions).toBe(assumptions)
    expect(h.seams).toEqual(['f00dcafe'])
    expect(h.dry).toEqual({
      lead: 'Verified dry',
      text: DRY_LINE_TEXT,
      toggle: DRY_LINE_TOGGLE,
      rows: [
        { kind: 'text', label: 'Faked', text: assumptions },
        {
          kind: 'build',
          label: 'Built from',
          parts: [
            { kind: 'sha', sha: 'be10edd8' },
            { kind: 'word', text: 'with seam' },
            { kind: 'sha', sha: 'f00dcafe' },
            { kind: 'word', text: '→' },
            { kind: 'sha', sha: '38832196' },
          ],
        },
      ],
    })
  })

  it('still flags a dry verification whose reviewer never said what was faked', () => {
    const h = verifyProofHeader(proof({ mode: 'dry', dryAssumptions: '   ' }), 'passed')
    expect(h.dryAssumptions).toBeUndefined()
    expect(h.dry?.rows).toEqual([{ kind: 'text', label: 'Faked', text: DRY_FAKED_MISSING }])
  })

  it('names every seam, and leaves the arrow out when there is nothing before the branch', () => {
    const seams = verifyProofHeader(
      proof({ mode: 'dry', dryAssumptions: 'x', baseSha: BASE, seams: [SEAM, HEAD] }),
      'passed',
    )
    expect(seams.dry?.rows[1]).toEqual({
      kind: 'build',
      label: 'Built from',
      parts: [
        { kind: 'sha', sha: 'be10edd8' },
        { kind: 'word', text: 'with seams' },
        { kind: 'sha', sha: 'f00dcafe' },
        { kind: 'sha', sha: '38832196' },
      ],
    })
    const headOnly = verifyProofHeader(
      proof({ mode: 'dry', dryAssumptions: 'x', headSha: HEAD }),
      'passed',
    )
    expect(headOnly.dry?.rows[1]).toEqual({
      kind: 'build',
      label: 'Built from',
      parts: [{ kind: 'sha', sha: '38832196' }],
    })
  })

  it('does not call a failed attempt verified', () => {
    const h = verifyProofHeader(proof({ mode: 'dry', dryAssumptions: 'x' }), 'failed')
    expect(h.title).toBe('Checked dry — not against the live backend')
    expect(h.dry?.lead).toBe('Checked dry')
    expect(verifyProofHeader(proof({ mode: 'live' }), 'unchecked').title).toBe(
      'Checked on live data',
    )
  })

  it('never calls an attempt a person accepted verified', () => {
    const h = verifyProofHeader(proof({ mode: 'dry', dryAssumptions: 'x' }), 'accepted')
    expect(h.title).toBe('Checked dry — not against the live backend')
    expect(h.dry?.lead).toBe('Checked dry')
  })

  it('has no dry line for a proof on live data, or one that never named its data', () => {
    expect(verifyProofHeader(proof({ mode: 'live', dryAssumptions: 'x' }), 'passed').dry).toBe(
      undefined,
    )
    expect(verifyProofHeader(proof({ dryAssumptions: 'x' }), 'passed').dry).toBeUndefined()
  })

  it('flags an unstated data mode on an attempt that stands, so a collapsed header shows it', () => {
    for (const standing of ['passed', 'accepted'] as const) {
      const h = verifyProofHeader(proof(), standing)
      expect(h).toMatchObject({
        mode: 'unknown',
        tone: 'empty',
        title: 'The reviewer did not say whether this ran on live data',
        chip: 'Data not stated',
        unstated: true,
        baseSha: undefined,
        headSha: undefined,
      })
    }
  })

  it('does not flag the data mode of an attempt that did not stand', () => {
    for (const standing of ['failed', 'unchecked', 'running'] as const) {
      const h = verifyProofHeader(proof(), standing)
      expect(h.chip).toBeUndefined()
      expect(h.unstated).toBe(false)
    }
    expect(verifyProofHeader(proof({ mode: 'live' }), 'failed').chip).toBe('Live data')
  })
})

describe('verifyProofView', () => {
  const tiles: EvidenceTile[] = [
    tile({ id: 'b-home', phase: 'before', subject: 'home', createdAt: 10 }),
    tile({ id: 'a-home', phase: 'after', subject: 'home', createdAt: 20 }),
    tile({
      id: 'b-login',
      phase: 'before',
      subject: 'login-card',
      runId: 'baseline-run',
      createdAt: 5,
    }),
    tile({ id: 'a-login', phase: 'after', subject: 'login-card', createdAt: 21 }),
    tile({ id: 'b-covision', phase: 'before', subject: 'font-preview', createdAt: 11 }),
    tile({ id: 'a-preview', phase: 'after', subject: 'font-preview', createdAt: 22 }),
    tile({ id: 'a-roles', phase: 'after', subject: 'font-preview-roles', createdAt: 23 }),
    tile({
      id: 'rec-1',
      kind: 'recording',
      mediaType: 'video/mp4',
      createdAt: 24,
    }),
  ]

  const judged = proof({
    mode: 'dry',
    baseSha: BASE,
    headSha: HEAD,
    pairs: [
      pair({
        subject: 'home',
        beforeId: 'b-home',
        afterId: 'a-home',
        changedPixels: 0,
        totalPixels: 2_391_120,
        counted: false,
        reason: 'Pixel-identical — the change does not show here.',
      }),
      pair({
        subject: 'login-card',
        beforeId: 'b-login',
        afterId: 'a-login',
        changedPixels: 219_902,
        totalPixels: 2_391_120,
        sameScreen: 0.84,
        counted: true,
      }),
      pair({
        subject: 'font-preview',
        beforeId: 'b-covision',
        afterId: 'a-preview',
        changedPixels: 247_381,
        totalPixels: 2_391_120,
        sameScreen: 0,
        counted: false,
        reason: 'Different screens — only 0% of what is on screen is shared.',
      }),
    ],
    newScreenIds: ['a-roles'],
    recordingIds: ['rec-1', 'rec-gone'],
  })

  it('puts the counted pairs first, numbering every screen in the order the page shows it', () => {
    const v = verifyProofView(judged, tiles, { standing: 'passed' })
    expect(v.pairs.map((p) => p.subject)).toEqual(['login-card', 'home', 'font-preview'])
    expect(v.pairs.map((p) => p.index)).toEqual([1, 3, 4])
    expect(v.newScreens.map((s) => s.index)).toEqual([2])
    expect(v.countedCount).toBe(1)
    expect(v.restsOnScreens).toBe(true)
  })

  it('reads a counted pair as showing the change, with its measured difference', () => {
    const [counted] = verifyProofView(judged, tiles, { standing: 'passed' }).pairs
    expect(counted).toMatchObject({
      counted: true,
      verdict: PAIR_COUNTED_VERDICT,
      change: '219,902 px changed (9.2%)',
      sameScreen: '84% of on-screen elements shared',
      marker: '9%',
      missing: [],
      beforeAbsent: undefined,
      afterAbsent: undefined,
    })
  })

  it('resolves a before filed under ANOTHER run id — the shared baseline', () => {
    const [counted] = verifyProofView(judged, tiles, { standing: 'passed' }).pairs
    expect(counted.before?.ref.id).toBe('b-login')
    expect(counted.before?.ref.runId).toBe('baseline-run')
    expect(counted.after?.ref.id).toBe('a-login')
  })

  it('shows the gate’s own reason under each pair that did not count', () => {
    const [, identical, different] = verifyProofView(judged, tiles, { standing: 'passed' }).pairs
    expect(identical.verdict).toBe('Pixel-identical — the change does not show here.')
    expect(identical.change).toBe('Pixel-identical')
    expect(different.verdict).toBe('Different screens — only 0% of what is on screen is shared.')
    expect(different.sameScreen).toBe('0% of on-screen elements shared')
  })

  it.each([
    'The before was built from 388321…, not the base be10edd8.',
    'The reviewer’s approval does not name this screen.',
  ])('keeps a non-counted reason verbatim: %s', (reason) => {
    const v = verifyProofView(
      proof({ pairs: [pair({ afterId: 'a-home', beforeId: 'b-home', reason })] }),
      tiles,
    )
    expect(v.pairs[0].verdict).toBe(reason)
  })

  it('falls back to a plain "did not count" when the gate gave no reason', () => {
    const v = verifyProofView(
      proof({ pairs: [pair({ afterId: 'a-home', beforeId: 'b-home', reason: '  ' })] }),
      tiles,
    )
    expect(v.pairs[0].verdict).toBe(PAIR_NOT_COUNTED_VERDICT)
    expect(v.pairs[0].change).toBe('Not measured')
  })

  it('names the side whose capture is not in the evidence instead of dropping the pair', () => {
    const v = verifyProofView(
      proof({ pairs: [pair({ afterId: 'a-home', beforeId: 'b-vanished', counted: true })] }),
      tiles,
    )
    expect(v.pairs[0].before).toBeUndefined()
    expect(v.pairs[0].after?.ref.id).toBe('a-home')
    expect(v.pairs[0].missing).toEqual(['before'])
    expect(v.pairs[0].beforeAbsent).toBe(CAPTURE_MISSING)
    expect(v.pairs[0].afterAbsent).toBeUndefined()
  })

  it.each([
    ['loading', CAPTURE_LOADING],
    ['failed', CAPTURE_LOAD_FAILED],
  ] as const)(
    'does not call an absent capture missing while the evidence is %s',
    (evidence, label) => {
      const v = verifyProofView(
        proof({
          pairs: [pair({ afterId: 'a-gone', beforeId: 'b-home', counted: true })],
          newScreenIds: ['a-lost', 'a-roles'],
        }),
        tiles,
        { evidence },
      )
      expect(v.pairs[0].missing).toEqual([])
      expect(v.pairs[0].afterAbsent).toBe(label)
      expect(v.pairs[0].beforeAbsent).toBeUndefined()
      expect(v.newScreens.map((s) => s.absent)).toEqual([label, undefined])
    },
  )

  it('calls an absent new screen missing only once the evidence has loaded', () => {
    const v = verifyProofView(proof({ newScreenIds: ['a-lost'] }), tiles, { evidence: 'loaded' })
    expect(v.newScreens[0].absent).toBe(CAPTURE_MISSING)
  })

  it('lists a new screen the change adds, titled by what it is of', () => {
    const v = verifyProofView(judged, tiles, { standing: 'passed' })
    expect(v.newScreens).toHaveLength(1)
    expect(v.newScreens[0]).toMatchObject({
      id: 'a-roles',
      title: 'font-preview-roles',
      index: 2,
      absent: undefined,
    })
    expect(v.newScreens[0].tile?.ref.id).toBe('a-roles')
  })

  it('pages the overlay in page order — counted, new, then what did not count', () => {
    const v = verifyProofView(judged, tiles, { standing: 'passed', keyPrefix: 'f1::' })
    expect(v.screens.map((s) => s.title)).toEqual([
      'login-card',
      'font-preview-roles',
      'home',
      'font-preview',
    ])
    expect(v.screens.map((s) => s.class)).toEqual(['pair', 'new', 'pair', 'pair'])
    expect(v.screens.map((s) => s.index)).toEqual([1, 2, 3, 4])
    expect(v.screens[0].note).toBe(
      'Shows the change · 219,902 px changed (9.2%) · 84% of on-screen elements shared',
    )
    expect(v.screens[1].note).toBe(NEW_SCREEN_NOTE)
    expect(v.screens[2].note).toBe(
      'Pixel-identical — the change does not show here. · Pixel-identical',
    )
    expect(v.screens.every((s) => s.key.startsWith('f1::'))).toBe(true)
    expect(new Set(v.screens.map((s) => s.key)).size).toBe(4)
    expect(v.screens[0]).toMatchObject({ expectedBaseSha: 'be10edd8', expectedHeadSha: '38832196' })
    const byKey = new Map(v.screens.map((s) => [s.key, s.index]))
    for (const p of v.pairs) expect(byKey.get(p.key)).toBe(p.index)
    expect(byKey.get(v.newScreens[0].key)).toBe(v.newScreens[0].index)
  })

  it('keeps only the recordings it can show', () => {
    const v = verifyProofView(judged, tiles, { standing: 'passed' })
    expect(v.recordings.map((r) => r.ref.id)).toEqual(['rec-1'])
  })

  it('summarises a pass by what showed the change and what did not', () => {
    const v = verifyProofView(judged, tiles, { standing: 'passed' })
    expect(v.summary).toEqual({
      tone: 'done',
      text: '1 pair shows the change · 2 did not count · 1 new screen the change adds',
    })
  })

  it('says plainly when a failed attempt had no pair that showed the change', () => {
    const failed = proof({
      mode: 'live',
      pairs: [
        pair({
          afterId: 'a-home',
          beforeId: 'b-home',
          changedPixels: 0,
          reason: 'Pixel-identical',
        }),
        pair({ afterId: 'a-preview', beforeId: 'b-covision', reason: 'Different screens' }),
      ],
    })
    const v = verifyProofView(failed, tiles, { standing: 'failed' })
    expect(v.countedCount).toBe(0)
    expect(v.restsOnScreens).toBe(false)
    expect(v.summary).toEqual({ tone: 'stuck', text: 'No pair shows the change · 2 did not count' })
    expect(v.header?.title).toBe('Checked on live data')
  })

  it('says when no pair was filed at all, red only when the gate failed it', () => {
    const failed = verifyProofView(proof(), tiles, { standing: 'failed' })
    expect(failed.summary).toEqual({ tone: 'stuck', text: 'No before/after pair was filed' })
    expect(failed.screens).toEqual([])
    for (const standing of ['unchecked', 'accepted', 'running'] as const) {
      expect(verifyProofView(proof(), tiles, { standing }).summary).toEqual({
        tone: 'empty',
        text: 'No before/after pair was filed',
      })
    }
  })

  it('counts a new screen alone as proof on the reviewer’s approval', () => {
    const v = verifyProofView(proof({ newScreenIds: ['a-roles', 'a-lost'] }), tiles)
    expect(v.restsOnScreens).toBe(true)
    expect(v.summary).toEqual({
      tone: 'done',
      text: 'No before/after pair was filed · 2 new screens the change adds',
    })
    expect(v.newScreens[1]).toMatchObject({ id: 'a-lost', title: 'New screen', tile: undefined })
  })

  it('shows a pass that rested on no screen as a pass, with no data banner to call it unconfirmed', () => {
    const v = verifyProofView(proof(), tiles, { standing: 'passed' })
    expect(v.restsOnScreens).toBe(false)
    expect(v.header).toBeUndefined()
    expect(v.summary).toEqual({ tone: 'done', text: 'Passed without a before/after pair' })
  })

  it('keeps a no-screen pass green even beside pairs that did not count', () => {
    const v = verifyProofView(
      proof({ pairs: [pair({ afterId: 'a-home', beforeId: 'b-home', reason: 'Not named' })] }),
      tiles,
      { standing: 'passed' },
    )
    expect(v.summary).toEqual({
      tone: 'done',
      text: 'Passed without a before/after pair · 1 did not count',
    })
  })

  it('keeps the data banner of a no-screen pass whose reviewer did name the data', () => {
    const v = verifyProofView(proof({ mode: 'live', recordingIds: ['rec-1'] }), tiles, {
      standing: 'passed',
    })
    expect(v.header?.title).toBe('Verified on live data')
    expect(v.recordings.map((r) => r.ref.id)).toEqual(['rec-1'])
    expect(v.summary.tone).toBe('done')
  })

  it('keeps a flagged banner on a pass that rests on screens but never named its data', () => {
    const v = verifyProofView(proof({ newScreenIds: ['a-roles'] }), tiles, { standing: 'passed' })
    expect(v.header?.unstated).toBe(true)
    expect(v.header?.chip).toBe('Data not stated')
  })

  it('keeps the unstated-data banner on a screen-less attempt that did not pass', () => {
    expect(verifyProofView(proof(), tiles, { standing: 'unchecked' }).header?.mode).toBe('unknown')
    expect(verifyProofView(proof(), tiles, { standing: 'accepted' }).header?.unstated).toBe(true)
  })

  describe('a new screen shown against its entry point', () => {
    const entryTiles = [
      ...tiles,
      tile({ id: 'b-menu', phase: 'before', subject: 'font-preview-roles', createdAt: 12 }),
      tile({ id: 'b-settings', phase: 'before', subject: 'settings', createdAt: 13 }),
      tile({ id: 'a-settings', phase: 'after', subject: 'settings', createdAt: 25 }),
    ]
    const withEntry = proof({
      mode: 'live',
      pairs: [
        pair({
          subject: 'font-preview-roles',
          beforeId: 'b-menu',
          afterId: 'a-roles',
          changedPixels: 900_000,
          totalPixels: 2_391_120,
          sameScreen: 0.1,
          counted: true,
          newScreen: true,
        }),
        pair({ subject: 'login-card', beforeId: 'b-login', afterId: 'a-login', counted: true }),
        pair({
          subject: 'settings',
          beforeId: 'b-settings',
          afterId: 'a-settings',
          counted: false,
          newScreen: true,
          reason: 'It looks like a base capture — it is not new.',
        }),
      ],
      newScreenIds: ['a-roles', 'a-lost'],
    })

    it('shows a counted new-screen pair once, as a screen the change adds, beside its entry point', () => {
      const v = verifyProofView(withEntry, entryTiles, { standing: 'passed' })
      expect(v.pairs.map((p) => p.subject)).toEqual(['login-card', 'settings'])
      expect(v.countedCount).toBe(1)
      expect(v.newScreens.map((s) => [s.id, s.entryPoint?.ref.id])).toEqual([
        ['a-roles', 'b-menu'],
        ['a-lost', undefined],
      ])
      expect(v.summary.text).toBe(
        '1 pair shows the change · 1 did not count · 2 new screens the change adds',
      )
    })

    it('pages an entry point in as the before of its new screen, saying what it is', () => {
      const v = verifyProofView(withEntry, entryTiles, { standing: 'passed' })
      const roles = v.screens.find((s) => s.title === 'font-preview-roles')
      expect(roles).toMatchObject({ class: 'new', index: 2, note: NEW_SCREEN_ENTRY_NOTE })
      expect(roles?.before?.ref.id).toBe('b-menu')
      expect(roles?.after?.ref.id).toBe('a-roles')
      expect(v.screens.find((s) => s.key.endsWith('new:a-lost'))?.note).toBe(NEW_SCREEN_NOTE)
    })

    it('never measures a new screen against its entry point as if it were the same screen', () => {
      const [, settings] = verifyProofView(withEntry, entryTiles, { standing: 'passed' }).pairs
      expect(settings.newScreen).toBe(true)
      expect(settings.change).toBe(NEW_SCREEN_PAIR_CHANGE)
      expect(settings.sameScreen).toBeUndefined()
      expect(settings.marker).toBe('new')
      expect(settings.verdict).toBe('It looks like a base capture — it is not new.')
    })

    it('says an entry point is absent by the state of the evidence', () => {
      const v = verifyProofView(withEntry, tiles, { standing: 'passed', evidence: 'loading' })
      expect(v.newScreens[0].entryPoint).toBeUndefined()
      expect(v.newScreens[0].entryPointAbsent).toBe(CAPTURE_LOADING)
      expect(v.newScreens[1].entryPointAbsent).toBeUndefined()
    })
  })

  it('lists afters with no before as not counting, each with the gate’s reason, last in the pages', () => {
    const v = verifyProofView(
      proof({
        pairs: [pair({ afterId: 'a-home', beforeId: 'b-home', reason: 'Pixel-identical' })],
        newScreenIds: ['a-roles'],
        unpaired: [
          {
            subject: 'preview',
            afterId: 'a-preview',
            reason: 'No base capture under this subject.',
          },
          { subject: 'gone', afterId: 'a-gone', reason: 'No base capture under this subject.' },
        ],
      }),
      tiles,
      { standing: 'unchecked', keyPrefix: 'k::' },
    )
    expect(v.unpaired.map((u) => [u.subject, u.index, u.after?.ref.id, u.afterAbsent])).toEqual([
      ['preview', 3, 'a-preview', undefined],
      ['gone', 4, undefined, CAPTURE_MISSING],
    ])
    expect(v.unpaired[0].reason).toBe('No base capture under this subject.')
    expect(v.screens.map((s) => s.title)).toEqual([
      'font-preview-roles',
      'a-home',
      'preview',
      'gone',
    ])
    expect(v.screens[2]).toMatchObject({
      class: 'new',
      note: 'No base capture under this subject.',
    })
    expect(v.screens.every((s) => s.key.startsWith('k::'))).toBe(true)
    expect(v.summary.text).toBe(
      'No pair shows the change · 3 did not count · 1 new screen the change adds',
    )
  })

  it('says nothing was judged when the attempt ended before any evidence was, with no data banner', () => {
    const unjudged = proof({
      outcome: 'errored',
      reason: 'The reviewer never started.',
      reasons: ['The reviewer never started.'],
      judged: false,
    })
    const failed = verifyProofView(unjudged, tiles, { standing: 'failed' })
    expect(failed.header).toBeUndefined()
    expect(failed.summary).toEqual({ tone: 'stuck', text: NOTHING_JUDGED })
    expect(verifyProofView(unjudged, tiles, { standing: 'accepted' }).summary).toEqual({
      tone: 'empty',
      text: NOTHING_JUDGED,
    })
  })
})

describe('proofChangeMarker', () => {
  it('rounds the changed share of the screen to a whole percent', () => {
    expect(proofChangeMarker(192_556, 2_391_120)).toBe('8%')
    expect(proofChangeMarker(23_912, 2_391_120)).toBe('1%')
    expect(proofChangeMarker(2_381_000, 2_391_120)).toBe('100%')
  })

  it('never rounds a change under one percent down to nothing', () => {
    expect(proofChangeMarker(92, 2_391_120)).toBe('<1%')
    expect(proofChangeMarker(23_880, 2_391_120)).toBe('<1%')
  })

  it('says a measured zero as it is', () => {
    expect(proofChangeMarker(0, 2_391_120)).toBe('0%')
  })

  it('marks nothing it cannot measure', () => {
    expect(proofChangeMarker(undefined, 2_391_120)).toBeUndefined()
    expect(proofChangeMarker(500, undefined)).toBeUndefined()
    expect(proofChangeMarker(500, 0)).toBeUndefined()
  })
})

describe('proofScreensPane', () => {
  const tiles: EvidenceTile[] = [
    tile({ id: 'b-home', phase: 'before', subject: 'event-home', createdAt: 10 }),
    tile({ id: 'a-home', phase: 'after', subject: 'event-home', createdAt: 20 }),
    tile({ id: 'b-guide', phase: 'before', subject: 'event-guide-webview', createdAt: 11 }),
    tile({ id: 'a-guide', phase: 'after', subject: 'event-guide-webview', createdAt: 21 }),
    tile({ id: 'b-agenda', phase: 'before', subject: 'agenda', createdAt: 12 }),
    tile({ id: 'a-agenda', phase: 'after', subject: 'agenda', createdAt: 22 }),
    tile({ id: 'b-menu', phase: 'before', subject: 'font-preview', createdAt: 13 }),
    tile({ id: 'a-font', phase: 'after', subject: 'font-preview', createdAt: 23 }),
    tile({ id: 'a-launch', phase: 'after', subject: 'launch-font-preview', createdAt: 24 }),
  ]
  const passed = proof({
    mode: 'dry',
    baseSha: BASE,
    headSha: HEAD,
    pairs: [
      pair({
        subject: 'event-home',
        beforeId: 'b-home',
        afterId: 'a-home',
        changedPixels: 167_378,
        totalPixels: 2_391_120,
        sameScreen: 0.86,
        counted: true,
      }),
      pair({
        subject: 'agenda',
        beforeId: 'b-agenda',
        afterId: 'a-agenda',
        changedPixels: 0,
        totalPixels: 2_391_120,
        counted: false,
        reason: 'Pixel-identical — the change does not show here.',
      }),
      pair({
        subject: 'event-guide-webview',
        beforeId: 'b-guide',
        afterId: 'a-guide',
        changedPixels: 95_644,
        totalPixels: 2_391_120,
        sameScreen: 0.91,
        counted: true,
      }),
      pair({
        subject: 'font-preview',
        beforeId: 'b-menu',
        afterId: 'a-font',
        changedPixels: 900_000,
        totalPixels: 2_391_120,
        counted: true,
        newScreen: true,
      }),
    ],
    newScreenIds: ['a-font'],
    unpaired: [
      {
        subject: 'launch-font-preview',
        afterId: 'a-launch',
        reason: 'No base capture under this subject.',
      },
    ],
  })

  it('shows one thumbnail per proving pair, then each screen the change adds — nothing that did not count', () => {
    const v = verifyProofView(passed, tiles, { standing: 'passed', keyPrefix: 'f2::' })
    const pane = proofScreensPane(v)
    expect(pane.thumbnails.map((t) => [t.subject, t.marker])).toEqual([
      ['event-home', '7%'],
      ['event-guide-webview', '4%'],
      ['font-preview', 'new'],
    ])
    expect(pane.thumbnails.map((t) => t.screen.index)).toEqual([1, 2, 3])
    expect(pane.thumbnails.every((t) => t.screen.key === t.key)).toBe(true)
    expect(pane.thumbnails.map((t) => [t.before?.ref.id, t.after?.ref.id])).toEqual([
      ['b-home', 'a-home'],
      ['b-guide', 'a-guide'],
      ['b-menu', 'a-font'],
    ])
    expect(pane.hasBefore).toBe(true)
    expect(pane.saveAllLabel).toBe('Save 3 screens')
  })

  it('drops the summary line while thumbnails show the proof, and folds what did not count into one line', () => {
    const pane = proofScreensPane(verifyProofView(passed, tiles, { standing: 'passed' }))
    expect(pane.summary).toBeUndefined()
    expect(pane.notCounted).toEqual({
      count: 2,
      label: '2 more captures filed · not part of the proof',
    })
  })

  it('says one capture in the singular', () => {
    const one = proof({ ...passed, unpaired: [] })
    expect(
      proofScreensPane(verifyProofView(one, tiles, { standing: 'passed' })).notCounted,
    ).toEqual({ count: 1, label: '1 more capture filed · not part of the proof' })
  })

  it('has no fold when everything filed counted', () => {
    const clean = proof({ ...passed, pairs: passed.pairs.filter((p) => p.counted), unpaired: [] })
    const pane = proofScreensPane(verifyProofView(clean, tiles, { standing: 'passed' }))
    expect(pane.notCounted).toBeUndefined()
    expect(pane.thumbnails).toHaveLength(3)
  })

  it('keeps the attempt’s own line when no pair shows the change, folding the rest without "more"', () => {
    const failed = proof({
      mode: 'live',
      pairs: passed.pairs.map((p) => ({ ...p, counted: false, reason: 'Wrong base.' })),
      newScreenIds: [],
      unpaired: passed.unpaired,
    })
    const v = verifyProofView(failed, tiles, { standing: 'failed' })
    const pane = proofScreensPane(v)
    expect(pane.thumbnails).toEqual([])
    expect(pane.hasBefore).toBe(false)
    expect(pane.summary).toEqual(v.summary)
    expect(pane.summary?.text).toBe('No pair shows the change · 5 did not count')
    expect(pane.notCounted).toEqual({
      count: 5,
      label: '5 captures filed · not part of the proof',
    })
  })

  it('offers no before when every thumbnail is a new screen with no entry point', () => {
    const lone = proof({ mode: 'live', newScreenIds: ['a-launch'] })
    const pane = proofScreensPane(verifyProofView(lone, tiles, { standing: 'passed' }))
    expect(pane.thumbnails.map((t) => [t.subject, t.marker, t.before])).toEqual([
      ['launch-font-preview', 'new', undefined],
    ])
    expect(pane.hasBefore).toBe(false)
    expect(pane.saveAllLabel).toBe('Save 1 screen')
  })

  it('marks an unmeasured proving pair with nothing rather than a guess', () => {
    const unmeasured = proof({
      pairs: [
        pair({ subject: 'event-home', beforeId: 'b-home', afterId: 'a-home', counted: true }),
      ],
    })
    const [thumb] = proofScreensPane(
      verifyProofView(unmeasured, tiles, { standing: 'passed' }),
    ).thumbnails
    expect(thumb.marker).toBeUndefined()
  })

  it('carries why a side is absent while the evidence loads', () => {
    const [thumb] = proofScreensPane(
      verifyProofView(passed, [], { standing: 'passed', evidence: 'loading' }),
    ).thumbnails
    expect(thumb.before).toBeUndefined()
    expect(thumb.beforeAbsent).toBe(CAPTURE_LOADING)
    expect(
      proofScreensPane(verifyProofView(passed, [], { standing: 'passed', evidence: 'loading' }))
        .hasBefore,
    ).toBe(true)
    expect(thumb.afterAbsent).toBe(CAPTURE_LOADING)
  })
})

describe('proofThumbnailFrame', () => {
  const before = tile({ id: 'b', phase: 'before', subject: 'home' })
  const after = tile({ id: 'a', phase: 'after', subject: 'home' })
  const thumb = {
    before,
    after,
    beforeAbsent: undefined,
    afterAbsent: undefined,
  }

  it('shows the side the toggle names', () => {
    expect(proofThumbnailFrame(thumb, 'before')).toEqual({ tile: before, absent: undefined })
    expect(proofThumbnailFrame(thumb, 'after')).toEqual({ tile: after, absent: undefined })
  })

  it('says why a before is absent rather than showing the after in its place', () => {
    expect(
      proofThumbnailFrame({ ...thumb, before: undefined, beforeAbsent: CAPTURE_MISSING }, 'before'),
    ).toEqual({ tile: undefined, absent: CAPTURE_MISSING })
  })

  it('shows the after of a screen that has no before at all', () => {
    expect(proofThumbnailFrame({ ...thumb, before: undefined }, 'before')).toEqual({
      tile: after,
      absent: undefined,
    })
  })
})

const PLAN = {
  steps: [
    { id: 'implement', name: 'Implement', kind: 'agent', agentType: 'developer' },
    { id: 'verify', name: 'Verify', kind: 'agent', agentType: 'verifier' },
    { id: 'checks', name: 'Checks', kind: 'check' },
  ],
  loops: [],
} as unknown as ProcessPlan

const entry = (over: Partial<ProcessLedgerEntry> & { id: string }): ProcessLedgerEntry => ({
  stepId: 'verify',
  iteration: 1,
  status: 'done',
  startedAt: 0,
  ...over,
})

const implement = (id: string, runId: string, startedAt: number): ProcessLedgerEntry =>
  entry({ id, stepId: 'implement', runRef: { runId }, startedAt, endedAt: startedAt + 5 })

const verify = (
  id: string,
  outcome: ProcessLedgerEntry['outcome'],
  startedAt: number,
  over: Partial<ProcessLedgerEntry> = {},
): ProcessLedgerEntry =>
  entry({
    id,
    outcome,
    startedAt,
    endedAt: startedAt + 10,
    runRef: { runId: `${id}-agent` },
    ...over,
  })

const childRun = (ledger: ProcessLedgerEntry[], featureId = 'f1'): VerifyAttemptRun => ({
  featureId,
  plan: PLAN,
  ledger,
})

const accept = (choice: 'continue' | 'approve', note?: string) => ({
  override: { choice, at: 999, ...(note ? { note } : {}) },
})

describe('verifyAttemptStanding', () => {
  it.each([
    ['a running attempt', entry({ id: 'v', status: 'running' }), 'running'],
    ['a pass', verify('v', 'passed', 0), 'passed'],
    ['a pass a person also approved', verify('v', 'passed', 0, accept('approve')), 'passed'],
    ['a failure', verify('v', 'failed', 0), 'failed'],
    ['an errored step', verify('v', 'errored', 0), 'failed'],
    ['an unconfirmed proof', verify('v', 'unchecked', 0), 'unchecked'],
    ['a step that asked a question', verify('v', 'question', 0), 'unchecked'],
    ['an entry that never recorded an outcome', entry({ id: 'v' }), 'unchecked'],
    [
      'an unconfirmed proof a person carried on past',
      verify('v', 'unchecked', 0, accept('continue')),
      'accepted',
    ],
    ['a failure a person approved', verify('v', 'failed', 0, accept('approve')), 'accepted'],
    ['a question a person skipped past', verify('v', 'skipped', 0, accept('continue')), 'accepted'],
    [
      'a failure a person retried',
      verify('v', 'failed', 0, { override: { choice: 'retry', at: 1 } }),
      'failed',
    ],
    [
      'a failure a person sent back',
      verify('v', 'failed', 0, { override: { choice: 'request-changes', at: 1 } }),
      'failed',
    ],
    [
      'an unconfirmed proof a person abandoned',
      verify('v', 'unchecked', 0, { override: { choice: 'abandon', at: 1 } }),
      'unchecked',
    ],
    [
      'the gate’s own word on its proof over a ledger that moved on as passed',
      verify('v', 'passed', 0, { ...accept('continue'), proof: proof({ outcome: 'unchecked' }) }),
      'accepted',
    ],
    [
      'a failure the proof records even when the ledger says otherwise',
      verify('v', 'unchecked', 0, { proof: proof({ outcome: 'failed' }) }),
      'failed',
    ],
  ] as const)('reads %s', (_, e, standing) => {
    expect(verifyAttemptStanding(e)).toBe(standing)
  })
})

describe('verifyAttemptStatus', () => {
  it('says a person accepted it, never what the gate concluded', () => {
    expect(verifyAttemptStatus(verify('v', 'unchecked', 0, accept('continue')))).toEqual({
      tone: 'review',
      label: 'Accepted by you',
    })
    expect(verifyAttemptStatus(verify('v', 'failed', 0, accept('approve'))).label).toBe(
      'Accepted by you',
    )
  })

  it('otherwise reads the gate', () => {
    expect(verifyAttemptStatus(verify('v', 'passed', 0))).toEqual({
      tone: 'done',
      label: 'Verify passed',
    })
    expect(verifyAttemptStatus(verify('v', 'failed', 0))).toEqual({
      tone: 'stuck',
      label: 'Verify failed',
    })
    expect(verifyAttemptStatus(verify('v', 'unchecked', 0)).tone).toBe('review')
  })

  it('reads the gate’s own word from its proof, not the ledger that moved on', () => {
    expect(
      verifyAttemptStatus(verify('v', 'passed', 0, { proof: proof({ outcome: 'unchecked' }) })),
    ).toEqual({ tone: 'review', label: 'Not proven' })
  })
})

describe('verifyGateLine', () => {
  it('says what the gate concluded when a person accepted over it', () => {
    expect(
      verifyGateLine(
        verify('v', 'unchecked', 0, {
          ...accept('continue'),
          summary: '  The reviewer approved, but did not say whether it ran on live data.  ',
        }),
      ),
    ).toBe(
      'The gate could not confirm the proof: The reviewer approved, but did not say whether it ran on live data.',
    )
    expect(verifyGateLine(verify('v', 'failed', 0, accept('approve')))).toBe(
      'The gate did not pass it.',
    )
  })

  it('is the gate’s own words otherwise, and nothing when it gave none', () => {
    expect(verifyGateLine(verify('v', 'failed', 0, { summary: 'No pair shows the change.' }))).toBe(
      'No pair shows the change.',
    )
    expect(verifyGateLine(verify('v', 'passed', 0, { summary: '   ' }))).toBeUndefined()
  })
})

describe('verifyAttemptFacts', () => {
  it('gives the attempt’s own time and charge, with its unpriced tokens in the details only', () => {
    expect(
      verifyAttemptFacts(
        verify('v', 'passed', 1_000, {
          endedAt: 96_000,
          cost: { costUsd: 0.42, unpricedTokens: 1_200_000 },
        }),
      ),
    ).toEqual({
      durationLabel: '1m 35s',
      costLabel: '$0.42',
      cost: { costUsd: 0.42, unpricedTokens: 1_200_000 },
    })
  })

  it('shows a verifier on a subscription as $0.00', () => {
    const cost = { costUsd: 0, includedTokens: 1_308_171 }
    expect(
      verifyAttemptFacts(verify('v', 'passed', 1_000, { endedAt: 61_000, cost })).costLabel,
    ).toBe('$0.00')
  })

  it('leaves out what a still-running attempt has not measured', () => {
    expect(verifyAttemptFacts(entry({ id: 'v', status: 'running', startedAt: 5 }))).toEqual({
      durationLabel: undefined,
      costLabel: undefined,
    })
  })
})

describe('evidenceLoadState', () => {
  it('is failed whenever the listing failed, even over an earlier load', () => {
    expect(evidenceLoadState({ loaded: true, error: 'boom' })).toBe('failed')
    expect(evidenceLoadState({ loaded: false, error: 'boom' })).toBe('failed')
  })

  it('is loading until the first load lands, then loaded', () => {
    expect(evidenceLoadState({ loaded: false, error: undefined })).toBe('loading')
    expect(evidenceLoadState({ loaded: true, error: undefined })).toBe('loaded')
  })
})

describe('verifyAttempts', () => {
  it('lists only the verifier’s attempts, numbered in ledger order, each with where it filed', () => {
    const attempts = verifyAttempts(
      childRun([
        implement('i1', 'dev-1', 0),
        verify('v1', 'failed', 10),
        entry({ id: 'c1', stepId: 'checks', outcome: 'passed', startedAt: 25 }),
        implement('i2', 'dev-2', 30),
        verify('v2', 'passed', 40),
      ]),
    )
    expect(attempts.map((a) => [a.entry.id, a.attempt, a.total])).toEqual([
      ['v1', 1, 2],
      ['v2', 2, 2],
    ])
    expect(attempts[1].review).toEqual({ reviewedRunId: 'dev-2', filedSince: 40, filedUntil: 50 })
  })

  it('finds nothing in a run with no verify step', () => {
    const run = childRun([implement('i1', 'dev-1', 0)])
    expect(verifyAttempts({ ...run, plan: { ...PLAN, steps: [PLAN.steps[0]] } })).toEqual([])
  })
})

describe('acceptedVerifyAttempt', () => {
  it('takes the latest PASSED attempt, even when a later one failed', () => {
    const attempt = acceptedVerifyAttempt(
      childRun([
        implement('i1', 'dev-1', 0),
        verify('v1', 'failed', 10),
        verify('v2', 'passed', 30),
        verify('v3', 'failed', 50),
      ]),
    )
    expect(attempt?.entry.id).toBe('v2')
  })

  it('takes the attempt a person accepted over the gate, as the run moved on from it', () => {
    const attempt = acceptedVerifyAttempt(
      childRun([
        implement('i1', 'dev-1', 0),
        verify('v1', 'failed', 10),
        verify('v2', 'unchecked', 30, accept('continue')),
        verify('v3', 'failed', 50),
      ]),
    )
    expect(attempt?.entry.id).toBe('v2')
  })

  it('does not take an attempt a person only retried', () => {
    const attempt = acceptedVerifyAttempt(
      childRun([
        implement('i1', 'dev-1', 0),
        verify('v1', 'failed', 10, { override: { choice: 'retry', at: 20 } }),
        verify('v2', 'failed', 30),
      ]),
    )
    expect(attempt?.entry.id).toBe('v2')
  })

  it('falls back to the latest attempt when none passed, so a failure still shows why', () => {
    const attempt = acceptedVerifyAttempt(
      childRun([
        implement('i1', 'dev-1', 0),
        verify('v1', 'failed', 10),
        verify('v2', 'errored', 30),
      ]),
    )
    expect(attempt?.entry.id).toBe('v2')
  })

  it('shows a still-running attempt when nothing has passed yet', () => {
    const attempt = acceptedVerifyAttempt(
      childRun([
        implement('i1', 'dev-1', 0),
        verify('v1', 'failed', 10),
        entry({ id: 'v2', status: 'running', startedAt: 30 }),
      ]),
    )
    expect(attempt?.entry.id).toBe('v2')
  })

  it('is undefined when the run never verified', () => {
    expect(acceptedVerifyAttempt(childRun([implement('i1', 'dev-1', 0)]))).toBeUndefined()
  })
})

describe('verifyAttemptEvidence', () => {
  const review = { reviewedRunId: 'reviewed', filedSince: 100, filedUntil: 200 }
  const tiles: EvidenceTile[] = [
    tile({ id: 'b-base', phase: 'before', subject: 'home', runId: 'baseline-run', createdAt: 5 }),
    tile({ id: 'a-home', phase: 'after', subject: 'home', createdAt: 150 }),
    tile({ id: 'old-after', phase: 'after', subject: 'home', createdAt: 50 }),
    tile({
      id: 'rep-now',
      kind: 'report',
      mediaType: 'text/markdown',
      verdict: 'approved',
      verdictReason: 'The login card shows the new font.',
      createdAt: 190,
    }),
    tile({
      id: 'rep-old',
      kind: 'report',
      mediaType: 'text/markdown',
      verdict: 'changes-requested',
      createdAt: 60,
    }),
    tile({
      id: 'rep-elsewhere',
      kind: 'report',
      mediaType: 'text/markdown',
      runId: 'x',
      createdAt: 150,
    }),
    tile({ id: 'rec-filed', kind: 'recording', mediaType: 'video/mp4', createdAt: 160 }),
    tile({ id: 'rec-proof', kind: 'recording', mediaType: 'video/mp4', createdAt: 170 }),
  ]

  it('shows the gate’s proof, and only this attempt’s own report and verdict', () => {
    const ev = verifyAttemptEvidence(
      {
        entry: verify('v2', 'passed', 100, {
          proof: proof({
            mode: 'live',
            pairs: [
              pair({ beforeId: 'b-base', afterId: 'a-home', counted: true, changedPixels: 9 }),
            ],
            recordingIds: ['rec-proof'],
          }),
        }),
        review,
      },
      tiles,
      { keyPrefix: 'f1::' },
    )
    expect(ev.proof?.pairs[0].before?.ref.id).toBe('b-base')
    expect(ev.pairs.map((p) => p.key)).toEqual(ev.proof?.screens.map((s) => s.key))
    expect(ev.reports.map((r) => r.ref.id)).toEqual(['rep-now'])
    expect(ev.verdict).toEqual({
      verdict: 'approved',
      reason: 'The login card shows the new font.',
    })
  })

  it('keeps a recording the gate did not cover apart from the ones it did', () => {
    const ev = verifyAttemptEvidence(
      {
        entry: verify('v2', 'passed', 100, { proof: proof({ recordingIds: ['rec-proof'] }) }),
        review,
      },
      tiles,
    )
    expect(ev.recordings.map((r) => r.ref.id)).toEqual(['rec-proof'])
    expect(ev.uncountedRecordings.map((r) => r.ref.id)).toEqual(['rec-filed'])
  })

  it('counts none of a not-approved attempt’s recordings', () => {
    const ev = verifyAttemptEvidence(
      { entry: verify('v2', 'failed', 100, { proof: proof() }), review },
      tiles,
    )
    expect(ev.recordings).toEqual([])
    expect(ev.uncountedRecordings.map((r) => r.ref.id)).toEqual(['rec-filed', 'rec-proof'])
  })

  it('reads an absent capture by the state of the evidence', () => {
    const entryWithProof = verify('v2', 'passed', 100, {
      proof: proof({ pairs: [pair({ beforeId: 'b-gone', afterId: 'a-home', counted: true })] }),
    })
    const loading = verifyAttemptEvidence({ entry: entryWithProof, review }, tiles, {
      evidence: 'loading',
    })
    expect(loading.proof?.pairs[0].beforeAbsent).toBe(CAPTURE_LOADING)
    const loaded = verifyAttemptEvidence({ entry: entryWithProof, review }, tiles)
    expect(loaded.proof?.pairs[0].beforeAbsent).toBe(CAPTURE_MISSING)
  })

  it('falls back to the attempt’s own filings when the entry predates the proof record', () => {
    const ev = verifyAttemptEvidence({ entry: verify('v1', 'failed', 100), review }, tiles, {
      keyPrefix: 'k::',
    })
    expect(ev.proof).toBeUndefined()
    expect(ev.pairs).toHaveLength(1)
    expect(ev.pairs[0]).toMatchObject({ class: 'new', title: 'home' })
    expect(ev.pairs[0].after?.ref.id).toBe('a-home')
    expect(ev.pairs[0].key.startsWith('k::')).toBe(true)
    expect(ev.recordings.map((r) => r.ref.id)).toEqual(['rec-filed', 'rec-proof'])
    expect(ev.uncountedRecordings).toEqual([])
  })

  it('shows nothing filed when it cannot tell which run the attempt reviewed', () => {
    const ev = verifyAttemptEvidence(
      { entry: verify('v1', 'failed', 100), review: undefined },
      tiles,
    )
    expect(ev).toMatchObject({
      proof: undefined,
      pairs: [],
      reports: [],
      recordings: [],
      uncountedRecordings: [],
    })
    expect(ev.verdict).toBeUndefined()
  })

  it('still shows the proof of an attempt whose reviewer never filed', () => {
    const ev = verifyAttemptEvidence(
      {
        entry: verify('v1', 'failed', 100, {
          proof: proof({ pairs: [pair({ beforeId: 'b-base', afterId: 'a-home' })] }),
        }),
        review: undefined,
      },
      tiles,
    )
    expect(ev.proof?.pairs[0].after?.ref.id).toBe('a-home')
    expect(ev.pairs).toHaveLength(1)
  })
})

describe('featureVerifyView', () => {
  const tiles = [tile({ id: 'a-home', phase: 'after', subject: 'home', createdAt: 45 })]
  const run = childRun([
    implement('i1', 'dev-1', 0),
    verify('v1', 'failed', 10, { summary: '  No before/after pair on the preview screen.  ' }),
    verify('v2', 'failed', 20),
    implement('i2', 'dev-2', 30),
    verify('v3', 'passed', 40, {
      summary: '1 pair proves the change',
      proof: proof({ mode: 'dry' }),
    }),
  ])

  it('labels the accepted attempt by where it sits among its run’s attempts', () => {
    const view = featureVerifyView(acceptedVerifyAttempt(run)!, tiles, { keyPrefix: 'f1::' })
    expect(view.acceptedLabel).toBe('Verify attempt 3 of 3 — the one the gate passed')
    expect(view.standing).toBe('passed')
    expect(view.mode).toBe('dry')
    expect(view.dataUnstated).toBe(false)
    expect(view.accepted.status).toEqual({ tone: 'done', label: 'Verify passed' })
    expect(view.accepted.running).toBe(false)
    expect(view.accepted.notes).toEqual([
      { label: 'The gate passed it', reason: '1 pair proves the change', tone: 'done' },
    ])
    expect(view.accepted.entry.id).toBe('v3')
    expect(view.accepted.key).toBe('f1::v3::')
  })

  it('shows an attempt a person accepted as accepted by them, saying what the gate said', () => {
    const accepted = childRun([
      implement('i1', 'dev-1', 0),
      verify('v1', 'failed', 10),
      verify('v2', 'unchecked', 20, {
        ...accept('continue'),
        summary: 'The reviewer verified dry but did not say what was faked.',
        proof: proof({
          mode: 'dry',
          pairs: [pair({ afterId: 'a-home', beforeId: 'b-home', counted: true })],
        }),
      }),
    ])
    const view = featureVerifyView(acceptedVerifyAttempt(accepted)!, tiles)
    expect(view.standing).toBe('accepted')
    expect(view.acceptedLabel).toBe(
      'Verify attempt 2 of 2 — accepted by you; the gate could not confirm the proof',
    )
    expect(view.accepted.status).toEqual({ tone: 'review', label: 'Accepted by you' })
    expect(view.accepted.notes).toEqual([
      { label: 'Accepted by you', tone: 'review' },
      {
        label: 'The gate could not confirm the proof',
        reason: 'The reviewer verified dry but did not say what was faked.',
        tone: 'review',
      },
    ])
    expect(view.mode).toBe('dry')
    expect(view.accepted.evidence.proof?.header?.title).toBe(
      'Checked dry — not against the live backend',
    )
  })

  it('flags an accepted attempt whose reviewer never said what data it ran on', () => {
    const view = featureVerifyView(
      acceptedVerifyAttempt(
        childRun([
          implement('i1', 'dev-1', 0),
          verify('v1', 'failed', 10, { ...accept('approve'), proof: proof() }),
        ]),
      )!,
      tiles,
    )
    expect(view.acceptedLabel).toBe(
      'Verify attempt 1 of 1 — accepted by you; the gate did not pass it',
    )
    expect(view.dataUnstated).toBe(true)
    expect(view.accepted.evidence.proof?.header?.chip).toBe('Data not stated')
  })

  it('does not flag the data of a pass that rested on no screen', () => {
    const view = featureVerifyView(
      acceptedVerifyAttempt(
        childRun([implement('i1', 'dev-1', 0), verify('v1', 'passed', 10, { proof: proof() })]),
      )!,
      tiles,
    )
    expect(view.standing).toBe('passed')
    expect(view.mode).toBe('unknown')
    expect(view.dataUnstated).toBe(false)
  })

  it('flags a pass with no proof on record, since nothing says what data it ran on', () => {
    const view = featureVerifyView(
      acceptedVerifyAttempt(childRun([implement('i1', 'dev-1', 0), verify('v1', 'passed', 10)]))!,
      tiles,
    )
    expect(view.dataUnstated).toBe(true)
  })

  it('says when no attempt passed', () => {
    const lastOnly = featureVerifyView(
      acceptedVerifyAttempt(childRun([implement('i1', 'dev-1', 0), verify('v1', 'failed', 10)]))!,
      tiles,
    )
    expect(lastOnly.acceptedLabel).toBe('Verify attempt 1 of 1 — the latest; none passed')
    expect(lastOnly.standing).toBe('failed')
    expect(lastOnly.mode).toBe('unknown')
    expect(lastOnly.dataUnstated).toBe(false)
  })

  it('says the gate could not confirm the latest attempt when that is what it concluded', () => {
    const view = featureVerifyView(
      acceptedVerifyAttempt(
        childRun([implement('i1', 'dev-1', 0), verify('v1', 'unchecked', 10)]),
      )!,
      tiles,
    )
    expect(view.acceptedLabel).toBe(
      'Verify attempt 1 of 1 — the latest; the gate could not confirm the proof',
    )
  })

  it('says an attempt is still running', () => {
    const view = featureVerifyView(
      acceptedVerifyAttempt(
        childRun([
          implement('i1', 'dev-1', 0),
          entry({ id: 'v1', status: 'running', startedAt: 10 }),
        ]),
      )!,
      tiles,
    )
    expect(view.acceptedLabel).toBe('Verify attempt 1 of 1 — still running')
    expect(view.accepted.running).toBe(true)
    expect(view.standing).toBe('running')
  })

  it('reads captures by the state of the evidence it is handed', () => {
    const view = featureVerifyView(
      acceptedVerifyAttempt(
        childRun([
          implement('i1', 'dev-1', 0),
          verify('v1', 'passed', 10, { proof: proof({ newScreenIds: ['a-away'] }) }),
        ]),
      )!,
      tiles,
      { evidence: 'failed' },
    )
    expect(view.accepted.evidence.proof?.newScreens[0].absent).toBe(CAPTURE_LOAD_FAILED)
  })
})

describe('storyProofNotice', () => {
  const section = (over: Partial<StoryProofSection> & { label: string }): StoryProofSection => ({
    mode: 'live',
    standing: 'passed',
    dataUnstated: false,
    proofUnvouched: false,
    ...over,
  })

  it('names a feature whose proof now rests only on captures that cannot be vouched for', () => {
    expect(
      storyProofNotice([
        section({ label: 'Feature #1', proofUnvouched: true }),
        section({ label: 'Feature #2' }),
      ]),
    ).toEqual({
      tone: 'empty',
      text: 'Feature #1 rests only on captures that can’t be vouched for now — open it to see why; the next verify run captures them again.',
    })
  })

  it('names several such features naturally, beside the other flags, and never one that did not stand', () => {
    const notice = storyProofNotice([
      section({ label: 'Feature #1', proofUnvouched: true, mode: 'dry' }),
      section({ label: 'Feature #2', proofUnvouched: true }),
      section({ label: 'Feature #3', proofUnvouched: true, standing: 'failed' }),
    ])
    expect(notice?.tone).toBe('working')
    expect(notice?.text).toBe(
      'Feature #1 was verified dry — not against the live backend. Open it to see what the live backend must send. Feature #1 and Feature #2 rest only on captures that can’t be vouched for now — open each to see why; the next verify run captures them again.',
    )
  })

  it('names every feature that passed only on faked data', () => {
    expect(
      storyProofNotice([
        section({ label: 'Feature #1', mode: 'dry' }),
        section({ label: 'Feature #2' }),
        section({ label: 'Feature #3', mode: 'dry' }),
      ]),
    ).toEqual({
      tone: 'working',
      text: 'Feature #1 and Feature #3 were verified dry — not against the live backend. Open each to see what the live backend must send.',
    })
  })

  it('names a feature whose reviewer did not say what data it ran on', () => {
    expect(
      storyProofNotice([
        section({ label: 'Feature #1', mode: 'unknown', dataUnstated: true }),
        section({ label: 'Feature #2' }),
      ]),
    ).toEqual({
      tone: 'empty',
      text: 'The reviewer did not say whether Feature #1 ran on live data.',
    })
  })

  it('names a feature a person accepted without the gate passing it', () => {
    expect(
      storyProofNotice([
        section({ label: 'Feature #1' }),
        section({ label: 'Feature #2', standing: 'accepted', mode: 'unknown', dataUnstated: true }),
      ]),
    ).toEqual({
      tone: 'working',
      text: 'Feature #2 was accepted by you without the gate passing it — open it to see what the gate said. The reviewer did not say whether Feature #2 ran on live data.',
    })
  })

  it('names an accepted dry feature both ways, and several accepted features naturally', () => {
    const notice = storyProofNotice([
      section({ label: 'Feature #1', standing: 'accepted', mode: 'dry' }),
      section({ label: 'Feature #2', standing: 'accepted' }),
    ])
    expect(notice?.tone).toBe('working')
    expect(notice?.text).toBe(
      'Feature #1 and Feature #2 were accepted by you without the gate passing them — open each to see what the gate said. Feature #1 was verified dry — not against the live backend. Open it to see what the live backend must send.',
    )
  })

  it('joins dry and unstated, listing three names naturally', () => {
    const notice = storyProofNotice([
      section({ label: 'Feature #1', mode: 'dry' }),
      section({ label: 'Feature #2', mode: 'unknown', dataUnstated: true }),
      section({ label: 'Feature #3', mode: 'unknown', dataUnstated: true }),
      section({ label: 'Feature #4', mode: 'unknown', dataUnstated: true }),
    ])
    expect(notice?.tone).toBe('working')
    expect(notice?.text).toBe(
      'Feature #1 was verified dry — not against the live backend. Open it to see what the live backend must send. The reviewer did not say whether Feature #2, Feature #3 and Feature #4 ran on live data.',
    )
  })

  it('is silent when every standing feature ran live or needed no data, and ignores ones that did not stand', () => {
    expect(
      storyProofNotice([
        section({ label: 'Feature #1' }),
        section({ label: 'Feature #2', mode: 'unknown' }),
        section({ label: 'Feature #3', mode: 'dry', standing: 'failed' }),
        section({ label: 'Feature #4', mode: 'dry', standing: 'unchecked' }),
        section({ label: 'Feature #5', mode: 'unknown', standing: 'running', dataUnstated: true }),
      ]),
    ).toBeUndefined()
    expect(storyProofNotice([])).toBeUndefined()
  })
})

describe('missingEvidenceIds', () => {
  it('lists the proof’s captures the loaded evidence does not hold', () => {
    const loaded = [ref({ id: 'a-home' }), ref({ id: 'rec-1' })]
    expect(
      missingEvidenceIds(
        proof({
          pairs: [pair({ beforeId: 'b-base', afterId: 'a-home' })],
          newScreenIds: ['a-new'],
          recordingIds: ['rec-1'],
        }),
        loaded,
      ),
    ).toEqual(['b-base', 'a-new'])
  })

  it('also needs an after the gate shows with no before', () => {
    expect(
      missingEvidenceIds(
        proof({ unpaired: [{ subject: 'x', afterId: 'a-alone', reason: 'No base capture.' }] }),
        [],
      ),
    ).toEqual(['a-alone'])
  })

  it('needs nothing when there is no proof', () => {
    expect(missingEvidenceIds(undefined, [])).toEqual([])
  })
})

describe('mergeEvidenceTiles', () => {
  it('prefers the primary copy of an id and keeps what only the secondary holds', () => {
    const primary = [{ ...tile({ id: 'a' }), dataUri: 'data:story' }, tile({ id: 'b' })]
    const secondary = [{ ...tile({ id: 'a' }), dataUri: 'data:run' }, tile({ id: 'c' })]
    const merged = mergeEvidenceTiles(primary, secondary)
    expect(merged.map((t) => t.ref.id)).toEqual(['a', 'b', 'c'])
    expect(merged[0].dataUri).toBe('data:story')
  })
})

describe('reviewerVerdictNote', () => {
  it('tones an approval as done and anything else as stuck, keeping the reason', () => {
    expect(
      reviewerVerdictNote({ verdict: 'approved', reason: 'The card uses the new font.' }),
    ).toEqual({
      label: 'Reviewer · Approved',
      reason: 'The card uses the new font.',
      tone: 'done',
    })
    expect(reviewerVerdictNote({ verdict: 'changes-requested' })).toEqual({
      label: 'Reviewer · Changes requested',
      tone: 'stuck',
    })
    expect(reviewerVerdictNote({ verdict: 'rejected' }).tone).toBe('stuck')
  })
})

describe('overlayPairsFor', () => {
  const screen = (key: string) => ({ key, index: 1, title: key, class: 'pair' as const })
  const accepted = [screen('f1::v2::a'), screen('f1::v2::b')]
  const earlier = [screen('f1::v1::a')]
  const other = [screen('f2::v9::a')]

  it('pages only through the group the opened screen belongs to', () => {
    expect(overlayPairsFor([accepted, earlier, other], 'f1::v2::b')).toBe(accepted)
    expect(overlayPairsFor([accepted, earlier, other], 'f1::v1::a')).toBe(earlier)
  })

  it('is empty while nothing is open or the key is gone', () => {
    expect(overlayPairsFor([accepted], undefined)).toEqual([])
    expect(overlayPairsFor([accepted], 'gone')).toEqual([])
  })
})

describe('verifySectionProps', () => {
  const review = { reviewedRunId: 'reviewed', filedSince: 10, filedUntil: 20 }
  const report = (verdict: ReviewEvidenceRef['verdict'], verdictReason?: string) =>
    tile({
      id: 'rep',
      kind: 'report',
      mediaType: 'text/markdown',
      verdict,
      ...(verdictReason ? { verdictReason } : {}),
      createdAt: 15,
    })
  const recording = tile({ id: 'rec', kind: 'recording', mediaType: 'video/mp4', createdAt: 16 })
  const sectionFor = (e: ProcessLedgerEntry, tiles: EvidenceTile[]) =>
    verifySectionProps(e, verifyAttemptEvidence({ entry: e, review }, tiles))

  it('hands a section the proof, the reviewer’s note and what to say when it is empty', () => {
    const e = verify('v1', 'passed', 10, {
      summary: '1 before/after pair shows the change (home), approved by the reviewer.',
      proof: proof({ mode: 'live', newScreenIds: ['a-home'] }),
    })
    const props = sectionFor(e, [report('approved', 'Shown on the card.'), recording])
    expect(props.proof?.header?.mode).toBe('live')
    expect(props.notes).toEqual([
      { label: 'Reviewer · Approved', reason: 'Shown on the card.', tone: 'done' },
    ])
    expect(props.reports.map((r) => r.ref.id)).toEqual(['rep'])
    expect(props.uncountedRecordings.map((r) => r.ref.id)).toEqual(['rec'])
    expect(props.emptyLabel).toBe(ATTEMPT_EMPTY)
  })

  it('states the gate’s own basis for a pass that rested on no screen', () => {
    const e = verify('v1', 'passed', 10, {
      summary: 'The reviewer read the change and approved it.',
      proof: proof(),
    })
    expect(sectionFor(e, [report('approved')]).notes).toEqual([
      {
        label: 'The gate passed it',
        reason: 'The reviewer read the change and approved it.',
        tone: 'done',
      },
      { label: 'Reviewer · Approved', tone: 'done' },
    ])
  })

  it('says what the gate concluded when it did not pass, toned by how it ended', () => {
    const unchecked = verify('v1', 'unchecked', 10, {
      summary: 'The reviewer approved, but did not say whether it ran on live data.',
      proof: proof(),
    })
    expect(sectionFor(unchecked, [])).toMatchObject({
      notes: [
        {
          label: 'The gate could not confirm the proof',
          reason: 'The reviewer approved, but did not say whether it ran on live data.',
          tone: 'review',
        },
      ],
    })
    const failed = verify('v1', 'errored', 10, { summary: 'The reviewer never started.' })
    expect(sectionFor(failed, [])).toMatchObject({
      notes: [
        { label: 'The verify step errored', reason: 'The reviewer never started.', tone: 'stuck' },
      ],
    })
  })

  it('leads with a person’s acceptance and their own note, then what the gate said', () => {
    const e = verify('v1', 'unchecked', 10, {
      ...accept('continue', '  Checked it myself on staging.  '),
      summary: 'The reviewer did not say what was faked.',
      proof: proof(),
    })
    expect(sectionFor(e, [report('approved')]).notes).toEqual([
      {
        label: 'Accepted by you',
        reason: 'Your note: Checked it myself on staging.',
        tone: 'review',
      },
      {
        label: 'The reviewer approved, but the proof could not be confirmed',
        reason: 'The reviewer did not say what was faked.',
        tone: 'review',
      },
      { label: 'Reviewer · Approved', tone: 'done' },
    ])
  })

  it('lists every reason the gate could not confirm the proof, instead of one run-on line', () => {
    const e = verify('v1', 'unchecked', 10, {
      summary:
        'The reviewer approved, but the proof could not be confirmed — a person decides. home: Pixel-identical. The reviewer did not say whether it ran on live data.',
      proof: proof({
        outcome: 'unchecked',
        reasons: [
          'home: Pixel-identical.',
          ' The reviewer did not say whether it ran on live data. ',
          '',
        ],
      }),
    })
    expect(sectionFor(e, []).notes).toEqual([
      {
        label: 'The gate could not confirm the proof',
        details: [
          'home: Pixel-identical.',
          'The reviewer did not say whether it ran on live data.',
        ],
        tone: 'review',
      },
    ])
  })

  it('says the reviewer approved but the proof could not be confirmed, with every reason', () => {
    const e = verify('v1', 'unchecked', 10, {
      summary:
        'The reviewer approved, but the proof could not be confirmed — a person decides. home: Pixel-identical.',
      proof: proof({ outcome: 'unchecked', reasons: ['home: Pixel-identical.'] }),
    })
    expect(sectionFor(e, [report('approved')]).notes).toEqual([
      {
        label: 'The reviewer approved, but the proof could not be confirmed',
        details: ['home: Pixel-identical.'],
        tone: 'review',
      },
      { label: 'Reviewer · Approved', tone: 'done' },
    ])
    const accepted = verify('v1', 'unchecked', 10, {
      ...accept('continue'),
      proof: proof({ outcome: 'unchecked', reasons: ['home: Pixel-identical.'] }),
    })
    expect(sectionFor(accepted, [report('approved')]).notes.map((n) => n.label)).toEqual([
      'Accepted by you',
      'The reviewer approved, but the proof could not be confirmed',
      'Reviewer · Approved',
    ])
  })

  it('does not claim an approval the reviewer never gave', () => {
    const e = verify('v1', 'unchecked', 10, {
      summary: 'The reviewer filed only written notes (2), so nothing was actually captured.',
      proof: proof({ outcome: 'unchecked' }),
    })
    expect(sectionFor(e, [report('changes-requested')]).notes[0].label).toBe(
      'The gate could not confirm the proof',
    )
    expect(sectionFor(e, []).notes[0].label).toBe('The gate could not confirm the proof')
  })

  it('keeps a single reason as the line it is', () => {
    const e = verify('v1', 'failed', 10, {
      summary: 'The reviewer filed no evidence, so nothing was proven.',
      proof: proof({
        outcome: 'failed',
        reason: 'The reviewer filed no evidence, so nothing was proven.',
        reasons: ['The reviewer filed no evidence, so nothing was proven.'],
      }),
    })
    expect(sectionFor(e, []).notes).toEqual([
      {
        label: 'The gate did not pass it',
        reason: 'The reviewer filed no evidence, so nothing was proven.',
        tone: 'stuck',
      },
    ])
  })

  it('reads why an attempt that was never judged ended from its proof', () => {
    const e = verify('v1', 'errored', 10, {
      proof: proof({
        judged: false,
        reason: 'The reviewer never started.',
        reasons: ['The reviewer never started.'],
      }),
    })
    const props = verifySectionProps(e, verifyAttemptEvidence({ entry: e, review: undefined }, []))
    expect(props.notes).toEqual([
      { label: 'The verify step errored', reason: 'The reviewer never started.', tone: 'stuck' },
    ])
    expect(props.proof?.summary.text).toBe(NOTHING_JUDGED)
  })

  it('does not repeat the reviewer’s reason as the gate’s', () => {
    const e = verify('v1', 'failed', 10, {
      summary: 'The card still uses the old font.',
      proof: proof(),
    })
    expect(
      sectionFor(e, [report('changes-requested', 'The card still uses the old font.')]).notes,
    ).toEqual([
      { label: 'The gate did not pass it', tone: 'stuck' },
      {
        label: 'Reviewer · Changes requested',
        reason: 'The card still uses the old font.',
        tone: 'stuck',
      },
    ])
  })

  it('leaves out what the attempt does not have, and says a running one is not done', () => {
    const props = sectionFor(entry({ id: 'v1', status: 'running', startedAt: 10 }), [])
    expect('proof' in props).toBe(false)
    expect(props.notes).toEqual([])
    expect(props.emptyLabel).toBe(ATTEMPT_RUNNING_EMPTY)
  })
})

describe('featureVerifySectionProps', () => {
  it('adds which attempt is shown and offers none of the others', () => {
    const run = childRun([
      implement('i1', 'dev-1', 0),
      verify('v1', 'failed', 10),
      verify('v2', 'passed', 20, { proof: proof({ mode: 'dry', newScreenIds: ['a'] }) }),
    ])
    const props = featureVerifySectionProps(featureVerifyView(acceptedVerifyAttempt(run)!, []))
    expect(props.attemptLabel).toBe('Verify attempt 2 of 2 — the one the gate passed')
    expect(props.proof?.header?.mode).toBe('dry')
    expect('otherAttempts' in props).toBe(false)
  })

  it('hands the section only the latest report its attempt filed', () => {
    const run = childRun([implement('i1', 'dev-1', 0), verify('v1', 'passed', 10)])
    const reports = [
      tile({ id: 'first', runId: 'dev-1', kind: 'report', createdAt: 12 }),
      tile({ id: 'last', runId: 'dev-1', kind: 'report', createdAt: 18 }),
      tile({ id: 'middle', runId: 'dev-1', kind: 'report', createdAt: 15 }),
    ]
    const props = featureVerifySectionProps(featureVerifyView(acceptedVerifyAttempt(run)!, reports))
    expect(props.reports.map((r) => r.ref.id)).toEqual(['last'])
  })

  describe('the reviewer’s note', () => {
    const approved = (reason?: string) =>
      tile({
        id: 'verdict',
        runId: 'dev-1',
        kind: 'report',
        mediaType: 'text/markdown',
        verdict: 'approved',
        ...(reason ? { verdictReason: reason } : {}),
        createdAt: 15,
      })
    const changesRequested = tile({
      id: 'verdict',
      runId: 'dev-1',
      kind: 'report',
      mediaType: 'text/markdown',
      verdict: 'changes-requested',
      verdictReason: 'The card still uses the old font.',
      createdAt: 15,
    })
    const notesFor = (v: ProcessLedgerEntry, tiles: EvidenceTile[]) => {
      const run = childRun([implement('i1', 'dev-1', 0), v])
      return featureVerifySectionProps(featureVerifyView(acceptedVerifyAttempt(run)!, tiles)).notes
    }

    it('is left out when it only approves what the gate passed — the section’s line says so', () => {
      const onScreens = verify('v1', 'passed', 10, {
        summary: '1 before/after pair shows the change (home), approved by the reviewer.',
        proof: proof({ newScreenIds: ['a-home'] }),
      })
      expect(notesFor(onScreens, [approved('Shown on the card.')])).toEqual([])
      const onReading = verify('v1', 'passed', 10, {
        summary: 'The reviewer read the change and approved it.',
        proof: proof(),
      })
      expect(
        notesFor(onReading, [approved('The reviewer read the change and approved it.')]),
      ).toEqual([
        {
          label: 'The gate passed it',
          reason: 'The reviewer read the change and approved it.',
          tone: 'done',
        },
      ])
    })

    it('stays when the gate did not pass what the reviewer approved', () => {
      const unconfirmed = verify('v1', 'unchecked', 10, {
        proof: proof({ outcome: 'unchecked', reasons: ['home: Pixel-identical.'] }),
      })
      expect(notesFor(unconfirmed, [approved()]).map((n) => n.label)).toEqual([
        'The reviewer approved, but the proof could not be confirmed',
        'Reviewer · Approved',
      ])
      const failed = verify('v1', 'failed', 10, { summary: 'No pair shows the change.' })
      expect(notesFor(failed, [approved()]).map((n) => n.label)).toContain('Reviewer · Approved')
    })

    it('stays when a person accepted the attempt', () => {
      const accepted = verify('v1', 'unchecked', 10, { ...accept('continue'), proof: proof() })
      expect(notesFor(accepted, [approved()]).map((n) => n.label)).toEqual([
        'Accepted by you',
        'The reviewer approved, but the proof could not be confirmed',
        'Reviewer · Approved',
      ])
    })

    it('stays when the reviewer did not approve what the gate passed', () => {
      const passed = verify('v1', 'passed', 10, { proof: proof({ newScreenIds: ['a-home'] }) })
      expect(notesFor(passed, [changesRequested])).toEqual([
        {
          label: 'Reviewer · Changes requested',
          reason: 'The card still uses the old font.',
          tone: 'stuck',
        },
      ])
    })

    it('is still shown on the attempt itself, where it is the reviewer’s own record', () => {
      const e = verify('v1', 'passed', 10, { proof: proof({ newScreenIds: ['a-home'] }) })
      const review = { reviewedRunId: 'dev-1', filedSince: 10, filedUntil: 20 }
      expect(
        verifySectionProps(e, verifyAttemptEvidence({ entry: e, review }, [approved()])).notes,
      ).toEqual([{ label: 'Reviewer · Approved', tone: 'done' }])
    })
  })

  it('carries the acceptance of an attempt a person accepted, and what the gate said', () => {
    const run = childRun([
      implement('i1', 'dev-1', 0),
      verify('v1', 'failed', 10, { ...accept('approve'), summary: 'No pair shows the change.' }),
    ])
    const props = featureVerifySectionProps(featureVerifyView(acceptedVerifyAttempt(run)!, []))
    expect(props.notes).toEqual([
      { label: 'Accepted by you', tone: 'review' },
      { label: 'The gate did not pass it', reason: 'No pair shows the change.', tone: 'stuck' },
    ])
  })
})

describe('captureBuildCaption', () => {
  const built = (sha: string, dirty = false) =>
    tile({ id: 'b', build: { sha, dirty } } as Partial<ReviewEvidenceRef> & { id: string })

  it('captions a capture built from the expected commit with that commit alone', () => {
    expect(captureBuildCaption(built(BASE), 'be10edd8')).toEqual({
      builtSha: 'be10edd8',
      dirty: false,
      expectedSha: undefined,
    })
    expect(captureBuildCaption(built(BASE), BASE).expectedSha).toBeUndefined()
  })

  it('captions a capture built from another commit with its own, and the expectation apart', () => {
    expect(captureBuildCaption(built('deadbeef00112233'), BASE)).toEqual({
      builtSha: 'deadbeef',
      dirty: false,
      expectedSha: 'be10edd8',
    })
  })

  it('never borrows the expected commit for a capture with no build record', () => {
    expect(captureBuildCaption(tile({ id: 'web' }), 'be10edd8')).toEqual({
      builtSha: undefined,
      dirty: false,
      expectedSha: 'be10edd8',
    })
  })

  it('says a build with uncommitted changes is not exactly its commit', () => {
    expect(captureBuildCaption(built(BASE, true), 'be10edd8')).toEqual({
      builtSha: 'be10edd8',
      dirty: true,
      expectedSha: undefined,
    })
  })

  it('says nothing it does not know', () => {
    expect(captureBuildCaption(undefined, BASE)).toEqual({
      builtSha: undefined,
      dirty: false,
      expectedSha: undefined,
    })
    expect(captureBuildCaption(built(HEAD), undefined)).toEqual({
      builtSha: '38832196',
      dirty: false,
      expectedSha: undefined,
    })
  })
})

/**
 * A capture as the backend lists it once it cannot vouch for it — after a
 * restart, every earlier one: what the filer named and where it is stored,
 * with the reason, and no build, device, screen, comparison or verdict.
 */
const unvouchedTile = (
  over: Partial<ReviewEvidenceRef> & { id: string },
  reason: string = EVIDENCE_RECORD_UNVOUCHED_REASON,
): EvidenceTile =>
  tile({
    path: `.factory/artifacts/review/reviewed/${over.id}.png`,
    bytes: 618_269,
    unvouchedReason: reason,
    ...over,
  })

describe('verifyProofView, once the backend cannot vouch for the captures', () => {
  const vouched = (over: Partial<ReviewEvidenceRef> & { id: string }) =>
    tile({
      capturedOn: 'android · emulator-5554',
      build: { platform: 'android', sha: HEAD, dirty: false },
      ...over,
    })

  const passed = proof({
    mode: 'live',
    baseSha: BASE,
    headSha: HEAD,
    pairs: [
      pair({
        subject: 'login-card',
        beforeId: 'b-login',
        afterId: 'a-login',
        changedPixels: 219_902,
        totalPixels: 2_391_120,
        sameScreen: 0.84,
        counted: true,
      }),
      pair({
        subject: 'home',
        beforeId: 'b-home',
        afterId: 'a-home',
        changedPixels: 0,
        totalPixels: 2_391_120,
        counted: false,
        reason: 'Pixel-identical — the change does not show here.',
      }),
      pair({
        subject: 'font-preview-roles',
        beforeId: 'b-menu',
        afterId: 'a-roles',
        changedPixels: 900_000,
        totalPixels: 2_391_120,
        counted: true,
        newScreen: true,
      }),
    ],
    newScreenIds: ['a-roles', 'a-picker'],
  })

  const afterRestart: EvidenceTile[] = [
    unvouchedTile({ id: 'b-login', phase: 'before', subject: 'login-card', createdAt: 5 }),
    unvouchedTile({ id: 'a-login', phase: 'after', subject: 'login-card', createdAt: 21 }),
    unvouchedTile({ id: 'b-home', phase: 'before', subject: 'home', createdAt: 10 }),
    unvouchedTile({ id: 'a-home', phase: 'after', subject: 'home', createdAt: 20 }),
    unvouchedTile({ id: 'b-menu', phase: 'before', subject: 'font-preview-roles', createdAt: 12 }),
    unvouchedTile({ id: 'a-roles', phase: 'after', subject: 'font-preview-roles', createdAt: 23 }),
    unvouchedTile({ id: 'a-picker', phase: 'after', subject: 'font-picker', createdAt: 24 }),
  ]

  it('never shows a pair the gate counted as showing the change once a side cannot be vouched for', () => {
    const v = verifyProofView(passed, afterRestart, { standing: 'passed' })
    expect(v.pairs.some((p) => p.counted)).toBe(false)
    expect(v.pairs.some((p) => p.verdict === PAIR_COUNTED_VERDICT)).toBe(false)
    expect(v.countedCount).toBe(0)
    expect(v.newScreens).toEqual([])
  })

  it('groups what the gate counted with what did not count, first, saying the gate counted it then', () => {
    const v = verifyProofView(passed, afterRestart, { standing: 'passed' })
    expect(v.pairs.map((p) => [p.subject, p.verdict])).toEqual([
      ['login-card', COUNTED_UNVOUCHED_VERDICT],
      ['font-preview-roles', COUNTED_UNVOUCHED_VERDICT],
      ['home', 'Pixel-identical — the change does not show here.'],
    ])
    expect(v.pairs.map((p) => p.unvouched?.text)).toEqual([
      UNVOUCHED_RESTART_TEXT.capture,
      UNVOUCHED_RESTART_TEXT.capture,
      UNVOUCHED_RESTART_TEXT.capture,
    ])
    expect(v.pairs[1]).toMatchObject({ newScreen: true, change: NEW_SCREEN_PAIR_CHANGE })
    expect(v.unpaired.map((u) => [u.subject, u.reason, u.unvouched?.cause])).toEqual([
      ['font-picker', COUNTED_UNVOUCHED_VERDICT, 'restart'],
    ])
  })

  it('keeps each image, and pages the overlay in the order the page shows it', () => {
    const v = verifyProofView(passed, afterRestart, { standing: 'passed', keyPrefix: 'f1::' })
    expect(v.pairs[0].before?.ref.id).toBe('b-login')
    expect(v.pairs[0].after?.ref.id).toBe('a-login')
    expect(v.screens.map((s) => [s.index, s.title])).toEqual([
      [1, 'login-card'],
      [2, 'font-preview-roles'],
      [3, 'home'],
      [4, 'font-picker'],
    ])
    expect(v.screens[0].note).toBe(
      `${COUNTED_UNVOUCHED_VERDICT} · 219,902 px changed (9.2%) · 84% of on-screen elements shared`,
    )
    expect(v.screens.every((s) => s.unvouched?.cause === 'restart')).toBe(true)
    expect(new Set(v.screens.map((s) => s.key)).size).toBe(4)
    const byKey = new Map(v.screens.map((s) => [s.key, s.index]))
    for (const p of v.pairs) expect(byKey.get(p.key)).toBe(p.index)
    for (const u of v.unpaired) expect(byKey.get(u.key)).toBe(u.index)
  })

  it('says in the banner and the summary that nothing it rested on can be vouched for', () => {
    const v = verifyProofView(passed, afterRestart, { standing: 'passed' })
    expect(v.restsOnScreens).toBe(true)
    expect(v.header?.unvouched).toEqual({
      chip: UNVOUCHED_LABEL,
      text: UNVOUCHED_BASIS_BANNER.restart,
    })
    expect(v.header?.title).toBe('Verified on live data')
    expect(v.summary).toEqual({
      tone: 'empty',
      text: `${UNVOUCHED_BASIS_SUMMARY} · 4 did not count`,
    })
  })

  it('does not blame a restart when what it rested on was changed on the host', () => {
    const changed = afterRestart.map((t) =>
      t.ref.id === 'a-login'
        ? tile({ ...t.ref, unvouchedReason: EVIDENCE_FILE_CHANGED_REASON })
        : t,
    )
    const v = verifyProofView(passed, changed, { standing: 'passed' })
    expect(v.header?.unvouched?.text).toBe(UNVOUCHED_BASIS_BANNER.other)
    expect(v.pairs[0].unvouched?.text).toContain(EVIDENCE_FILE_CHANGED_REASON)
  })

  it('does not blame a restart when only a pair’s BEFORE was changed on the host', () => {
    const changedBefore = afterRestart.map((t) =>
      t.ref.id === 'b-login'
        ? tile({ ...t.ref, unvouchedReason: EVIDENCE_FILE_CHANGED_REASON })
        : t,
    )
    const v = verifyProofView(passed, changedBefore, { standing: 'passed' })
    expect(v.header?.unvouched?.text).toBe(UNVOUCHED_BASIS_BANNER.other)
    expect(v.pairs[0].unvouched?.cause).toBe('file-changed')
    expect(v.pairs[0].unvouched?.text).toContain(EVIDENCE_FILE_CHANGED_REASON)
    expect(v.screens[0].unvouched?.text).toContain(EVIDENCE_FILE_CHANGED_REASON)
  })

  it('still rests on what can be vouched for, with no banner, when only some of it cannot', () => {
    const partly = [
      ...afterRestart.filter((t) => t.ref.id !== 'b-login' && t.ref.id !== 'a-login'),
      vouched({ id: 'b-login', phase: 'before', subject: 'login-card', createdAt: 5 }),
      vouched({ id: 'a-login', phase: 'after', subject: 'login-card', createdAt: 21 }),
    ]
    const v = verifyProofView(passed, partly, { standing: 'passed' })
    expect(v.header?.unvouched).toBeUndefined()
    expect(v.pairs[0]).toMatchObject({
      subject: 'login-card',
      counted: true,
      verdict: PAIR_COUNTED_VERDICT,
      unvouched: undefined,
    })
    expect(v.summary).toEqual({
      tone: 'done',
      text: '1 pair shows the change · 3 did not count',
    })
  })

  it('does not count one unvouched side any more than two', () => {
    const oneSide = [
      ...afterRestart.filter((t) => t.ref.id !== 'a-login'),
      vouched({ id: 'a-login', phase: 'after', subject: 'login-card', createdAt: 21 }),
    ]
    const [login] = verifyProofView(passed, oneSide, { standing: 'passed' }).pairs
    expect(login).toMatchObject({ counted: false, verdict: COUNTED_UNVOUCHED_VERDICT })
    expect(login.unvouched?.cause).toBe('restart')
  })

  it('keeps a new screen whose entry point cannot be vouched for out of the screens the change adds', () => {
    const entryOnly = [
      ...afterRestart.filter((t) => t.ref.id !== 'a-roles' && t.ref.id !== 'a-picker'),
      vouched({ id: 'a-roles', phase: 'after', subject: 'font-preview-roles', createdAt: 23 }),
      vouched({ id: 'a-picker', phase: 'after', subject: 'font-picker', createdAt: 24 }),
    ]
    const v = verifyProofView(passed, entryOnly, { standing: 'passed' })
    expect(v.newScreens.map((s) => s.id)).toEqual(['a-picker'])
    expect(v.pairs.find((p) => p.afterId === 'a-roles')).toMatchObject({
      counted: false,
      verdict: COUNTED_UNVOUCHED_VERDICT,
    })
    expect(v.header?.unvouched).toBeUndefined()
  })

  it('never takes a capture that has not loaded yet for one that cannot be vouched for', () => {
    const v = verifyProofView(passed, [], { standing: 'passed', evidence: 'loading' })
    expect(v.pairs[0]).toMatchObject({ subject: 'login-card', counted: true, unvouched: undefined })
    expect(v.newScreens.map((s) => s.id)).toEqual(['a-roles', 'a-picker'])
    expect(v.header?.unvouched).toBeUndefined()
  })

  it('keeps the gate’s reason on an after it never counted, and says why it cannot be vouched for', () => {
    const v = verifyProofView(
      proof({
        unpaired: [
          {
            subject: 'preview',
            afterId: 'a-preview',
            reason: 'No base capture under this subject.',
          },
        ],
      }),
      [unvouchedTile({ id: 'a-preview', phase: 'after', subject: 'preview' })],
      { standing: 'failed' },
    )
    expect(v.unpaired[0].reason).toBe('No base capture under this subject.')
    expect(v.unpaired[0].unvouched?.text).toBe(UNVOUCHED_RESTART_TEXT.capture)
    expect(v.screens[0].unvouched?.cause).toBe('restart')
    expect(v.header?.unvouched).toBeUndefined()
  })
})

describe('verifyAttemptEvidence, once the backend cannot vouch for the filings', () => {
  const review = { reviewedRunId: 'reviewed', filedSince: 100, filedUntil: 200 }
  const report = (over: Partial<ReviewEvidenceRef> & { id: string }) =>
    tile({ kind: 'report', mediaType: 'text/markdown', createdAt: 190, ...over })

  it('says the reviewer’s verdict is not shown when the filings it rode on cannot be vouched for', () => {
    const tiles = [
      unvouchedTile({ id: 'a-home', phase: 'after', subject: 'home', createdAt: 150 }),
      report({ id: 'rep', unvouchedReason: EVIDENCE_RECORD_UNVOUCHED_REASON }),
    ]
    const entryPassed = verify('v1', 'passed', 100, {
      proof: proof({ pairs: [pair({ beforeId: 'b-gone', afterId: 'a-home', counted: true })] }),
    })
    const ev = verifyAttemptEvidence({ entry: entryPassed, review }, tiles)
    expect(ev.verdict).toBeUndefined()
    expect(ev.verdictUnvouched).toBe(true)
    expect(verifySectionProps(entryPassed, ev).notes).toContainEqual({
      label: REVIEWER_VERDICT_UNVOUCHED_LABEL,
      reason: REVIEWER_VERDICT_UNVOUCHED_REASON,
      tone: 'review',
    })
  })

  it('shows a verdict the backend still vouches for, and no such note', () => {
    const tiles = [
      unvouchedTile({ id: 'a-home', phase: 'after', subject: 'home', createdAt: 150 }),
      report({ id: 'rep', verdict: 'approved', verdictReason: 'The login card shows it.' }),
    ]
    const ev = verifyAttemptEvidence({ entry: verify('v1', 'failed', 100), review }, tiles)
    expect(ev.verdictUnvouched).toBe(false)
    const labels = verifySectionProps(verify('v1', 'failed', 100), ev).notes.map((n) => n.label)
    expect(labels).toContain('Reviewer · Approved')
    expect(labels).not.toContain(REVIEWER_VERDICT_UNVOUCHED_LABEL)
  })

  it('never shows an older approval as the reviewer’s conclusion once a newer report lost its verdict', () => {
    const tiles = [
      report({ id: 'r2', createdAt: 190, unvouchedReason: EVIDENCE_FILE_CHANGED_REASON }),
      report({
        id: 'r1',
        createdAt: 150,
        verdict: 'approved',
        verdictReason: 'Looks right',
      }),
    ]
    const failed = verify('v1', 'failed', 100)
    const ev = verifyAttemptEvidence({ entry: failed, review }, tiles)
    expect(ev.verdict).toBeUndefined()
    expect(ev.verdictUnvouched).toBe(true)
    const notes = verifySectionProps(failed, ev).notes
    expect(notes.map((n) => n.label)).not.toContain('Reviewer · Approved')
    expect(notes).toContainEqual({
      label: REVIEWER_VERDICT_UNVOUCHED_LABEL,
      reason: REVIEWER_VERDICT_UNVOUCHED_REASON,
      tone: 'review',
    })
  })

  it('says nothing about a verdict when only a capture’s own record was not the tool’s — its filing kept every verdict', () => {
    const tiles = [
      unvouchedTile(
        { id: 'a-home', phase: 'after', subject: 'home', createdAt: 150 },
        CAPTURE_RECORD_NOT_THE_TOOLS_REASON,
      ),
    ]
    const ev = verifyAttemptEvidence({ entry: verify('v1', 'failed', 100), review }, tiles)
    expect(ev.verdictUnvouched).toBe(false)
  })

  it('reads the same in an entry from before the gate recorded its proof, pairs marked', () => {
    const tiles = [
      unvouchedTile({ id: 'b-home', phase: 'before', subject: 'home', createdAt: 120 }),
      unvouchedTile({ id: 'a-home', phase: 'after', subject: 'home', createdAt: 150 }),
    ]
    const ev = verifyAttemptEvidence({ entry: verify('v1', 'failed', 100), review }, tiles)
    expect(ev.proof).toBeUndefined()
    expect(ev.verdictUnvouched).toBe(true)
    expect(ev.pairs[0]).toMatchObject({ class: 'pair', title: 'home' })
    expect(ev.pairs[0].unvouched?.cause).toBe('restart')
  })
})

describe('featureVerifyView, once its proof cannot be vouched for', () => {
  it('flags a feature whose accepted proof rests only on captures that cannot be vouched for', () => {
    const run = childRun([
      implement('i1', 'dev-1', 0),
      verify('v1', 'passed', 10, { proof: proof({ mode: 'live', newScreenIds: ['a-new'] }) }),
    ])
    const flagged = featureVerifyView(acceptedVerifyAttempt(run)!, [
      unvouchedTile({ id: 'a-new', phase: 'after', subject: 'picker' }),
    ])
    expect(flagged.proofUnvouched).toBe(true)
    const clear = featureVerifyView(acceptedVerifyAttempt(run)!, [
      tile({ id: 'a-new', phase: 'after', subject: 'picker', capturedOn: 'ios · iPhone 16' }),
    ])
    expect(clear.proofUnvouched).toBe(false)
  })

  it('never flags a feature whose proof is not on record', () => {
    const run = childRun([implement('i1', 'dev-1', 0), verify('v1', 'passed', 10)])
    expect(featureVerifyView(acceptedVerifyAttempt(run)!, []).proofUnvouched).toBe(false)
  })
})

describe('captureBuildCaption, for a capture that cannot be vouched for', () => {
  it('says so in place of a build, keeping the commit it had to come from', () => {
    expect(
      captureBuildCaption(unvouchedTile({ id: 'a-home', phase: 'after', subject: 'home' }), HEAD),
    ).toEqual({
      builtSha: undefined,
      dirty: false,
      expectedSha: '38832196',
      unvouched: UNVOUCHED_LABEL,
    })
  })
})

describe('verifyAttemptEvidence, beside a code review filed under the reviewed run', () => {
  const review = { reviewedRunId: 'reviewed', filedSince: 100 }
  const tiles: EvidenceTile[] = [
    tile({
      id: 'rep',
      kind: 'report',
      mediaType: 'text/markdown',
      verdict: 'approved',
      createdAt: 150,
    }),
    tile({
      id: 'code-review',
      kind: 'report',
      approach: CODE_REVIEW_APPROACH,
      mediaType: 'text/markdown',
      verdict: 'changes-requested',
      verdictReason: 'The new font is never loaded on Android.',
      createdAt: 400,
    }),
    tile({
      id: 'feature-report',
      kind: 'report',
      approach: FEATURE_REPORT_APPROACH,
      mediaType: 'text/markdown',
      createdAt: 500,
    }),
  ]

  it('keeps the code review and the step reports out of the verifier’s report and verdict', () => {
    for (const entry of [
      verify('v1', 'passed', 100, { proof: proof() }),
      verify('v1', 'passed', 100),
    ]) {
      const ev = verifyAttemptEvidence({ entry, review }, tiles)
      expect(ev.reports.map((r) => r.ref.id)).toEqual(['rep'])
      expect(ev.verdict).toEqual({ verdict: 'approved' })
    }
  })

  it('reads no reviewer verdict when only the code review concluded', () => {
    const ev = verifyAttemptEvidence(
      { entry: verify('v1', 'passed', 100), review },
      tiles.filter((t) => t.ref.id !== 'rep'),
    )
    expect(ev.reports).toEqual([])
    expect(ev.verdict).toBeUndefined()
    expect(ev.verdictUnvouched).toBe(false)
  })
})

describe('codeReviewVerdictNote', () => {
  it('says the code review’s verdict as the reviewer’s is said', () => {
    expect(codeReviewVerdictNote({ verdict: 'approved' })).toEqual({
      label: 'Code review · Approved',
      tone: 'done',
    })
    expect(
      codeReviewVerdictNote({ verdict: 'changes-requested', reason: 'Missing a test.' }),
    ).toEqual({
      label: 'Code review · Changes requested',
      reason: 'Missing a test.',
      tone: 'stuck',
    })
  })
})
