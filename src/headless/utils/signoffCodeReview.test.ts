import { describe, expect, it } from 'vitest'
import type { CodeReviewSections } from 'thefactory-tools/types'

import {
  codeReviewFindingGroups,
  codeReviewFindingPlace,
  codeReviewFindingTitle,
  codeReviewFindingsSummary,
  codeReviewPreview,
  codeReviewSectionsOf,
  codeReviewVerdictBadge,
  codeReviewVerdictOf,
  codeReviewView,
  codeReviewWhere,
} from './signoffCodeReview'

const sections: CodeReviewSections = {
  verdict: {
    headline: 'Nothing blocks merging.',
    detail: 'One helper serves every read.',
    worthALook: 'search parses every PDF in the tree.',
  },
  findings: [
    { severity: 'nit', where: 'scripts/smoke.mjs', text: 'A smoke script ships.' },
    { severity: 'minor', where: 'FileTools.ts · searchFilesFs', text: 'Search parses every PDF.' },
    { severity: 'minor', text: 'Failures are cached too.' },
  ],
  criteria: [
    { text: 'PDF text with page markers', status: 'met', where: 'wholeFileView' },
    { text: 'Large PDFs truncated', status: 'partly' },
  ],
  evidence: { shows: 'Ran the helper on 4 fixtures.', unproven: 'Did not re-run the suite.' },
}

const tile = (overrides: object = {}) => ({
  text: undefined as string | undefined,
  ref: { verdict: 'approved' as const, reviewSections: sections, ...overrides },
})

describe('codeReviewSectionsOf', () => {
  it('takes the sections the reviewer filed', () => {
    expect(codeReviewSectionsOf(tile())).toBe(sections)
  })

  it('reads an older review from its markdown', () => {
    const parsed = codeReviewSectionsOf({
      text: '## Verdict\nApproved. Fine.\n\n## Findings\n- minor · a.ts:1 — slow\n',
      ref: {},
    })
    expect(parsed?.verdict.headline).toBe('Approved.')
    expect(parsed?.findings).toEqual([{ severity: 'minor', where: 'a.ts:1', text: 'slow' }])
  })

  it('gives nothing for a review with neither', () => {
    expect(codeReviewSectionsOf({ text: undefined, ref: {} })).toBeUndefined()
  })

  it('gives nothing for markdown that is not a review', () => {
    expect(codeReviewSectionsOf({ text: 'Just some notes.', ref: {} })).toBeUndefined()
  })
})

describe('codeReviewVerdictBadge', () => {
  it('reads an approval', () => {
    expect(codeReviewVerdictBadge({ verdict: 'approved' }).label).toBe('Approved')
  })

  it('reads a request for changes as one', () => {
    expect(codeReviewVerdictBadge({ verdict: 'changes-requested' })).toMatchObject({
      label: 'Changes requested',
      tone: 'stuck',
    })
  })

  it('reads a proof it could not get apart from a defect', () => {
    expect(
      codeReviewVerdictBadge({ verdict: 'changes-requested', verdictCause: 'proof-impossible' }),
    ).toMatchObject({ key: 'proof-impossible', tone: 'review' })
  })

  it('reads a rejection', () => {
    expect(codeReviewVerdictBadge({ verdict: 'rejected' }).key).toBe('rejected')
  })

  it('says when there is no verdict', () => {
    expect(codeReviewVerdictBadge({}).key).toBe('none')
  })
})

describe('codeReviewVerdictOf', () => {
  const restarted = {
    text: '## Verdict\nApproved. The change routes every read through one helper.\n\n## Findings\n- **minor** · `src/file/FileTools.ts` (searchFilesFs) — Search parses every PDF.\n',
    ref: {},
  }

  it('takes the verdict the run recorded over the filing’s own', () => {
    expect(
      codeReviewVerdictOf(
        { ...restarted, ref: { verdict: 'approved' as const } },
        { verdict: 'changes-requested', cause: 'proof-impossible' },
      ),
    ).toEqual({ verdict: 'changes-requested', verdictCause: 'proof-impossible' })
  })

  it('takes the filing’s verdict when the run recorded none', () => {
    expect(codeReviewVerdictOf({ text: undefined, ref: { verdict: 'rejected' as const } })).toEqual(
      { verdict: 'rejected' },
    )
  })

  it('reads the headline only when the filing lost its verdict and nothing was recorded', () => {
    expect(codeReviewVerdictOf(restarted)).toEqual({ verdict: 'approved' })
    expect(codeReviewView(restarted)?.verdict.label).toBe('Approved')
  })

  it('reads a request for changes from a bold headline', () => {
    expect(
      codeReviewVerdictOf({
        text: '## Verdict\n**Changes requested.** The cache never expires.\n',
        ref: {},
      }),
    ).toEqual({ verdict: 'changes-requested' })
  })

  it('says no verdict when the headline names none', () => {
    expect(codeReviewVerdictOf({ text: '## Verdict\nNothing blocks merging.\n', ref: {} })).toEqual(
      {},
    )
  })
})

describe('codeReviewWhere', () => {
  it('draws one backticked span as code, without its backticks', () => {
    expect(codeReviewWhere('`src/file/fileHelpers.ts`')).toEqual({
      code: true,
      text: 'src/file/fileHelpers.ts',
    })
  })

  it('draws a bare token as code', () => {
    expect(codeReviewWhere(' scripts/file-tools-pdf-smoke.mjs ')).toEqual({
      code: true,
      text: 'scripts/file-tools-pdf-smoke.mjs',
    })
  })

  it('keeps a mixed place as inline markdown', () => {
    expect(codeReviewWhere('`src/file/FileTools.ts` (searchFilesFs)')).toEqual({
      code: false,
      text: '`src/file/FileTools.ts` (searchFilesFs)',
    })
  })

  it('is nothing for a blank place', () => {
    expect(codeReviewWhere('  ')).toBeUndefined()
    expect(codeReviewWhere(undefined)).toBeUndefined()
  })
})

describe('codeReviewFindingsSummary', () => {
  it('counts each severity that has findings, worst first', () => {
    expect(codeReviewFindingsSummary(sections)).toBe('2 minor · 1 nit')
  })

  it('says None when nothing was found', () => {
    expect(codeReviewFindingsSummary({ ...sections, findings: [] })).toBe('None')
  })

  it('pluralises blockers and nits', () => {
    expect(
      codeReviewFindingsSummary({
        ...sections,
        findings: [
          { severity: 'blocker', text: 'a' },
          { severity: 'blocker', text: 'b' },
          { severity: 'nit', text: 'c' },
          { severity: 'nit', text: 'd' },
        ],
      }),
    ).toBe('2 blockers · 2 nits')
  })
})

describe('codeReviewView', () => {
  it('is absent when the review cannot be read as sections', () => {
    expect(codeReviewView({ text: 'free text', ref: {} })).toBeUndefined()
  })

  it('orders findings worst first', () => {
    const view = codeReviewView(tile())!
    expect(view.findings.map((f) => f.severity)).toEqual(['minor', 'minor', 'nit'])
  })

  it('splits each finding into its file, symbol, title and explanation', () => {
    const view = codeReviewView(tile())!
    expect(view.findings[0]).toMatchObject({
      place: { file: 'FileTools.ts', symbol: 'searchFilesFs' },
      title: 'Search parses every PDF',
      text: '',
    })
    expect(view.findings[1].place.file).toBeUndefined()
  })

  it('keeps a title the reviewer gave, and the whole explanation under it', () => {
    const view = codeReviewView(
      tile({
        reviewSections: {
          ...sections,
          findings: [{ severity: 'major', title: 'Cache leaks', text: 'It is never cleared.' }],
        },
      }),
    )!
    expect(view.findings[0]).toMatchObject({ title: 'Cache leaks', text: 'It is never cleared.' })
  })

  it('tiles every severity and the criteria tally', () => {
    const view = codeReviewView(tile())!
    expect(view.tiles.map((t) => [t.key, t.count, t.tone])).toEqual([
      ['blocker', '0', 'neutral'],
      ['major', '0', 'neutral'],
      ['minor', '2', 'working'],
      ['nit', '1', 'neutral'],
      ['criteria', '1/2', 'working'],
    ])
  })

  it('tones a full criteria tally done', () => {
    const view = codeReviewView(
      tile({
        reviewSections: { ...sections, criteria: [{ text: 'x', status: 'met' as const }] },
      }),
    )!
    expect(view.tiles.at(-1)).toMatchObject({ count: '1/1', tone: 'done' })
    expect(view.criteriaSummary).toBe('1 of 1 met')
  })

  it('leaves the criteria tile out when no criteria were listed', () => {
    const view = codeReviewView(tile({ reviewSections: { ...sections, criteria: [] } }))!
    expect(view.tiles.some((t) => t.key === 'criteria')).toBe(false)
    expect(view.criteriaSummary).toBe('None listed')
    expect(view.criteriaMet).toBeUndefined()
  })

  it('labels and marks each criterion by its status', () => {
    const view = codeReviewView(tile())!
    expect(view.criteria.map((c) => [c.mark, c.statusLabel, c.tone, c.where])).toEqual([
      ['✓', 'met', 'done', { code: true, text: 'wholeFileView' }],
      ['◐', 'partly', 'working', undefined],
    ])
  })

  it('marks a criterion not met with a cross', () => {
    const view = codeReviewView(
      tile({
        reviewSections: { ...sections, criteria: [{ text: 'x', status: 'not-met' as const }] },
      }),
    )!
    expect(view.criteria[0]).toMatchObject({ mark: '✗', tone: 'stuck' })
  })

  it('lists what the evidence shows and leaves unproven, one entry per line', () => {
    const view = codeReviewView(
      tile({
        reviewSections: {
          ...sections,
          evidence: { shows: '- Ran it.\n- Logged it.', unproven: 'The widget.\n\nThe iOS app.' },
        },
      }),
    )!
    expect(view.showsItems).toEqual(['Ran it.', 'Logged it.'])
    expect(view.unproven).toEqual({ state: 'listed', items: ['The widget.', 'The iOS app.'] })
  })

  it('reads a filed blank unproven as the reviewer saying nothing is', () => {
    const view = codeReviewView(
      tile({ reviewSections: { ...sections, evidence: { shows: 'Ran it.', unproven: ' ' } } }),
    )!
    expect(view.unproven).toEqual({ state: 'none' })
  })

  it.each(['None.', 'nothing', 'N/A'])('reads "%s" as nothing left unproven', (said) => {
    const view = codeReviewView(
      tile({ reviewSections: { ...sections, evidence: { shows: 'Ran it.', unproven: said } } }),
    )!
    expect(view.unproven).toEqual({ state: 'none' })
  })

  it('says an older review read from markdown never stated what it left unproven', () => {
    const view = codeReviewView({
      text: '## Verdict\nApproved.\n\n## Evidence\n**Shows:** the screen\n',
      ref: {},
    })!
    expect(view.showsItems).toEqual(['the screen'])
    expect(view.unproven).toEqual({ state: 'unstated' })
  })

  it('summarises the evidence as what it shows and what it leaves', () => {
    expect(codeReviewView(tile())!.evidenceSummary).toBe(
      'Ran the helper on 4 fixtures. · Did not re-run the suite.',
    )
  })

  it('summarises the evidence without its markdown marks', () => {
    const view = codeReviewView(
      tile({
        reviewSections: {
          ...sections,
          evidence: { shows: 'Ran `readFileForAgent` on **4** fixtures.', unproven: '' },
        },
      }),
    )!
    expect(view.evidenceSummary).toBe('Ran readFileForAgent on 4 fixtures.')
  })

  it('summarises one-sided evidence by the side it has', () => {
    const view = codeReviewView(
      tile({ reviewSections: { ...sections, evidence: { shows: '', unproven: 'Nothing ran.' } } }),
    )!
    expect(view.evidenceSummary).toBe('Nothing ran.')
  })

  it('drops a blank detail and worth-a-look', () => {
    const view = codeReviewView(
      tile({
        reviewSections: { ...sections, verdict: { headline: 'Ok.', detail: ' ', worthALook: '' } },
      }),
    )!
    expect(view.detail).toBeUndefined()
    expect(view.worthALook).toBeUndefined()
  })

  it('keeps the markdown for a download', () => {
    expect(codeReviewView({ ...tile(), text: '## Verdict\nOk.' })!.markdown).toBe('## Verdict\nOk.')
  })
})

describe('codeReviewFindingPlace', () => {
  it.each<[string | undefined, object]>([
    [
      'FileTools.ts · searchFilesFs',
      { file: 'FileTools.ts', line: undefined, symbol: 'searchFilesFs', prose: undefined },
    ],
    ['src/a.ts:12', { file: 'src/a.ts', line: '12', symbol: undefined, prose: undefined }],
    ['a.ts:4-9', { file: 'a.ts', line: '4-9', symbol: undefined, prose: undefined }],
    [
      '`fileHelpers.ts › extractPdfCached`',
      { file: 'fileHelpers.ts', line: undefined, symbol: 'extractPdfCached', prose: undefined },
    ],
    [
      'scripts/smoke.mjs',
      { file: 'scripts/smoke.mjs', line: undefined, symbol: undefined, prose: undefined },
    ],
    [
      '`extractPdfCached`',
      { file: undefined, line: undefined, symbol: 'extractPdfCached', prose: undefined },
    ],
    [
      'the widget fallback',
      { file: undefined, line: undefined, symbol: undefined, prose: 'the widget fallback' },
    ],
    [undefined, { file: undefined, line: undefined, symbol: undefined, prose: undefined }],
    ['  ', { file: undefined, line: undefined, symbol: undefined, prose: undefined }],
  ])('reads %j', (where, place) => {
    expect(codeReviewFindingPlace(where)).toEqual(place)
  })
})

describe('codeReviewFindingTitle', () => {
  it('keeps the reviewer’s own title over the explanation', () => {
    expect(
      codeReviewFindingTitle({ title: ' Cache leaks ', text: 'Never cleared. Ever.' }),
    ).toEqual({ title: 'Cache leaks', text: 'Never cleared. Ever.' })
  })

  it.each<[string, { title: string; text: string }]>([
    [
      'Search parses every PDF. Cap the size.',
      { title: 'Search parses every PDF', text: 'Cap the size.' },
    ],
    [
      'Failures are cached — a transient failure sticks.',
      { title: 'Failures are cached', text: 'a transient failure sticks.' },
    ],
    ['A smoke script ships.', { title: 'A smoke script ships', text: '' }],
    ['Calls `readFile` twice. Slow.', { title: 'Calls `readFile` twice', text: 'Slow.' }],
    ['e.g. readFile runs twice. Slow.', { title: 'e.g. readFile runs twice', text: 'Slow.' }],
    ['Reads FileTools.ts twice', { title: 'Reads FileTools.ts twice', text: '' }],
  ])('reads a title from the first clause of "%s"', (text, expected) => {
    expect(codeReviewFindingTitle({ text })).toEqual(expected)
  })

  it('clips a first clause too long for a title and keeps the whole explanation', () => {
    const text =
      'A content search now parses every PDF in the tree whose name does not match the query, up to sixty seconds per parse. Cap it.'
    const got = codeReviewFindingTitle({ text })
    expect(got.title.endsWith('…')).toBe(true)
    expect(got.title.length).toBeLessThanOrEqual(64)
    expect(got.text).toBe(text)
  })

  it('has no title for a finding that only named its place', () => {
    expect(codeReviewFindingTitle({ text: '' })).toEqual({ title: '', text: '' })
  })
})

describe('codeReviewFindingGroups', () => {
  const findings = codeReviewView(
    tile({
      reviewSections: {
        ...sections,
        findings: [
          { severity: 'major', where: 'a.ts:3', text: 'Leaks.' },
          { severity: 'nit', where: 'b.ts', text: 'Rename.' },
          { severity: 'minor', where: 'a.ts · run', text: 'Slow.' },
          { severity: 'nit', text: 'Noisy warning.' },
        ],
      },
    }),
  )!.findings

  it('groups by severity, worst first, with the nits folded', () => {
    const groups = codeReviewFindingGroups(findings, 'severity', undefined)
    expect(groups.map((g) => [g.title, g.count, g.defaultOpen, g.tone])).toEqual([
      ['Major', '1 finding', true, 'stuck'],
      ['Minor', '1 finding', true, 'working'],
      ['Nits', '2 findings', false, 'neutral'],
    ])
  })

  it('opens the nits when they are all there is', () => {
    const nits = findings.filter((f) => f.severity === 'nit')
    expect(codeReviewFindingGroups(nits, 'severity', undefined)[0].defaultOpen).toBe(true)
  })

  it('groups by file in the order the worst finding names them, the fileless last', () => {
    const groups = codeReviewFindingGroups(findings, 'file', undefined)
    expect(groups.map((g) => [g.title, g.rows.map((r) => r.severity), g.defaultOpen])).toEqual([
      ['a.ts', ['major', 'minor'], true],
      ['b.ts', ['nit'], true],
      ['Not tied to one file', ['nit'], true],
    ])
  })

  it('shows one severity alone when filtered', () => {
    expect(codeReviewFindingGroups(findings, 'severity', 'nit').map((g) => g.title)).toEqual([
      'Nits',
    ])
    expect(codeReviewFindingGroups(findings, 'file', 'nit').map((g) => g.title)).toEqual([
      'b.ts',
      'Not tied to one file',
    ])
  })

  it('opens a filtered severity even when it is the nits', () => {
    expect(codeReviewFindingGroups(findings, 'severity', 'nit')[0].defaultOpen).toBe(true)
  })

  it('is empty when nothing was found', () => {
    expect(codeReviewFindingGroups([], 'file', undefined)).toEqual([])
  })
})

describe('codeReviewPreview', () => {
  it('carries the badge, one line and the counts', () => {
    const preview = codeReviewPreview(codeReviewView(tile())!)
    expect(preview.verdict.label).toBe('Approved')
    expect(preview.line).toBe(
      'Nothing blocks merging. Worth a look: search parses every PDF in the tree.',
    )
    expect(preview.chips.map((c) => c.label)).toEqual(['2 minor', '1 nit', '1/2 criteria'])
  })

  it('says the headline alone without a worth-a-look', () => {
    const view = codeReviewView(
      tile({ reviewSections: { ...sections, verdict: { headline: 'Fine.' }, criteria: [] } }),
    )!
    const preview = codeReviewPreview(view)
    expect(preview.line).toBe('Fine.')
    expect(preview.chips.some((c) => c.key === 'criteria')).toBe(false)
  })

  it('tones a full criteria chip done', () => {
    const view = codeReviewView(
      tile({ reviewSections: { ...sections, criteria: [{ text: 'x', status: 'met' as const }] } }),
    )!
    expect(codeReviewPreview(view).chips.at(-1)).toMatchObject({ tone: 'done' })
  })
})
