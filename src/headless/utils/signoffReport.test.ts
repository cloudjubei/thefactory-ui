import { describe, expect, it } from 'vitest'
import type { ReportSections } from 'thefactory-tools/types'

import {
  reportBodyView,
  reportPreviewTiles,
  reportSectionsOf,
  reportTiles,
  signoffProofRows,
  signoffReportView,
} from './signoffReport'
import type { SignoffProofInput, SignoffReportInput } from './signoffReportTypes'
import type { SignoffWork } from './signoffWorkTypes'

const sections: ReportSections = {
  outcome: { headline: 'PDFs now read as text.', detail: 'Other binaries get one notice.' },
  howProven: [
    { text: '13,111 unit tests passed.', status: 'proven', source: 'tests' },
    { text: 'Build, types and format passed.', status: 'proven', source: 'checks' },
    { text: 'Code review approved.', status: 'proven', source: 'code-review' },
    { text: 'Verify was accepted by you.', status: 'unproven', source: 'verify' },
  ],
  decisions: ['PDF text is capped at 60,000 characters.', 'Text is cached by path.'],
  needsYou: ['Decide whether the logs are enough proof.'],
}

const NOT_MERGED =
  'Not merged. The work is still on the review branch and has not been merged into the feature branch or main.'

const input = (overrides: Partial<SignoffReportInput> = {}): SignoffReportInput => ({
  report: { text: '## Verdict\nDone.', ref: { reportSections: sections } },
  featureCount: 1,
  criteriaCount: 8,
  criteriaMet: { met: 8, total: 8 },
  featuresDelivered: { done: 1, total: 1 },
  took: { duration: '1h 42m', cost: '$0.00' },
  tabs: ['report', 'tests', 'build', 'code-review'],
  ...overrides,
})

describe('reportSectionsOf', () => {
  it('takes the sections the report filed', () => {
    expect(reportSectionsOf({ ref: { reportSections: sections } })).toEqual(sections)
  })

  it('drops a Needs you line that only restates the pending merge', () => {
    const filed = { ...sections, needsYou: [NOT_MERGED, ...sections.needsYou] }
    expect(reportSectionsOf({ ref: { reportSections: filed } })?.needsYou).toEqual(
      sections.needsYou,
    )
  })

  it('drops the pending-merge line from an older report read from its markdown', () => {
    const parsed = reportSectionsOf({
      text: `## Verdict\nDone right.\n\n## Left open\n- ${NOT_MERGED}\n`,
      ref: {},
    })
    expect(parsed?.needsYou).toEqual([])
  })

  it('reads an older report from its markdown', () => {
    const parsed = reportSectionsOf({
      text: '## Verdict\nDone right.\n\n## Left open\nNothing.\n',
      ref: {},
    })
    expect(parsed?.outcome.headline).toBe('Done right.')
    expect(parsed?.needsYou).toEqual([])
  })

  it('gives nothing without either', () => {
    expect(reportSectionsOf({ ref: {} })).toBeUndefined()
  })
})

describe('reportTiles', () => {
  it('says what was asked, delivered, the time and the cost', () => {
    expect(reportTiles(input()).map((t) => [t.label, t.value, t.sub, t.tone])).toEqual([
      ['Asked', '1 feature', '8 acceptance criteria', 'neutral'],
      ['Delivered', '8 of 8 met', 'acceptance criteria, per the code review', 'done'],
      ['Time', '1h 42m', undefined, 'neutral'],
      ['Cost', '$0.00', undefined, 'neutral'],
    ])
  })

  it('breaks the time and cost down when the runs’ work is known', () => {
    const MIN = 60_000
    const cost = {
      costUsd: 0,
      listCostUsd: 2,
      byModel: [
        {
          provider: 'anthropic',
          model: 'claude-opus-5-5',
          billing: 'subscription' as const,
          inputTokens: 1,
          outputTokens: 1,
          cacheReadTokens: 1,
          cacheWriteTokens: 1,
          costUsd: 0,
          listCostUsd: 2,
        },
      ],
    }
    const work: SignoffWork = {
      steps: [
        {
          key: 'Implement',
          label: 'Implement',
          workMs: 80 * MIN,
          parts: { thinking: 40 * MIN, tools: 40 * MIN, system: 0, checks: 0, other: 0 },
        },
      ],
      workMs: 80 * MIN,
      waitingMs: 60 * MIN,
      roles: [
        { role: 'developer', runs: 1, cost, models: [] },
        { role: 'verifier', runs: 1, cost: undefined, models: [] },
      ],
      cost,
      agentRuns: 2,
      models: [],
    }
    const [, , time, spend] = reportTiles(input({ work }))
    expect(time).toMatchObject({
      label: 'Time',
      value: '1h 20m of work',
      sub: '+ 1h 00m waiting for you',
    })
    expect(time.detail?.kind).toBe('time')
    expect(spend).toMatchObject({
      label: 'Cost',
      value: 'Unknown (subscription)',
      sub: 'subscription · list price $2.00',
    })
    expect(spend.detail?.kind).toBe('cost')
  })

  it('counts features delivered when no criteria were judged', () => {
    const tiles = reportTiles(
      input({ criteriaMet: undefined, featuresDelivered: { done: 1, total: 2 }, featureCount: 2 }),
    )
    expect(tiles[0].value).toBe('2 features')
    expect(tiles[1]).toMatchObject({ value: '1 of 2', sub: 'features done', tone: 'working' })
  })

  it('names one feature done in the singular', () => {
    expect(reportTiles(input({ criteriaMet: undefined }))[1]).toMatchObject({
      value: '1 of 1',
      sub: 'feature done',
      tone: 'done',
    })
  })

  it('tones a partial criteria tally as working', () => {
    expect(reportTiles(input({ criteriaMet: { met: 6, total: 8 } }))[1].tone).toBe('working')
  })

  it('leaves the criteria line out when the features carry none', () => {
    expect(reportTiles(input({ criteriaCount: 0 }))[0].sub).toBeUndefined()
    expect(reportTiles(input({ criteriaCount: 1 }))[0].sub).toBe('1 acceptance criterion')
  })

  it('says the time and cost that are known without the runs’ work, a dash for the rest', () => {
    const tiles = reportTiles(input({ took: { duration: '3m', cost: undefined } }))
    expect([tiles[2].value, tiles[3].value]).toEqual(['3m', '—'])
    expect(tiles[2].detail).toBeUndefined()
  })
})

describe('reportTiles from the acceptance criteria asked', () => {
  it('says how many of the asked criteria the review found met', () => {
    expect(
      reportTiles(
        input({ acceptance: { asked: 8, judged: 8, met: 8 }, criteriaMet: { met: 7, total: 7 } }),
      )[1],
    ).toMatchObject({ value: '8 of 8 met', tone: 'done' })
  })

  it('says how many asked criteria the review never judged, not a tally of its own list', () => {
    expect(
      reportTiles(
        input({ acceptance: { asked: 8, judged: 7, met: 7 }, criteriaMet: { met: 7, total: 7 } }),
      )[1],
    ).toMatchObject({
      value: '7 of 8 judged met',
      sub: '1 not judged · per the code review',
      tone: 'working',
    })
  })

  it('counts features done when the review judged none of what was asked', () => {
    expect(
      reportTiles(
        input({
          acceptance: { asked: 8, judged: 0, met: 0 },
          criteriaMet: { met: 3, total: 3 },
        }),
      )[1],
    ).toMatchObject({ value: '1 of 1', sub: 'feature done' })
  })

  it('falls back to the review’s tally when the features asked for no criteria', () => {
    expect(
      reportTiles(
        input({ acceptance: { asked: 0, judged: 0, met: 0 }, criteriaMet: { met: 3, total: 3 } }),
      )[1],
    ).toMatchObject({ value: '3 of 3 met' })
  })
})

const finalState: SignoffProofInput = {
  checks: [
    { id: 'tests', label: 'Tests', state: 'passed', detail: '13111/13111 passed' },
    { id: 'types', label: 'Type check', state: 'passed', detail: 'Command succeeded' },
    { id: 'format', label: 'Format', state: 'passed', detail: 'Command succeeded' },
    { id: 'build', label: 'Build', state: 'passed', detail: 'Command succeeded' },
    { id: 'lint', label: 'Lint', state: 'unconfigured', detail: 'No lint is set up' },
    { id: 'diff', label: 'Code review', state: 'passed', detail: 'Approved' },
  ],
  testTotals: { total: 13111, passed: 13111, failed: 0, skipped: 0 },
  codeReview: {
    word: 'Approved',
    line: 'All acceptance criteria are met and confirmed by running the code on the fixtures.',
    check: 'passed',
  },
  walkthrough: {
    word: 'Skipped',
    line: 'Nothing the story changed alters what users see, so the story was not walked through.',
    check: 'unchecked',
  },
  verify: [{ label: 'File tools', status: { tone: 'stuck', label: 'Verify failed' } }],
  tabs: ['report', 'tests', 'build', 'code-review'],
}

describe('signoffProofRows', () => {
  it('says where each kind of proof stands at the end, one line each, never the attempts before', () => {
    expect(signoffProofRows(finalState).map((r) => [r.text, r.status, r.tab])).toEqual([
      ['Type check, Format and Build passed', 'proven', 'build'],
      ['13,111 tests passed', 'proven', 'tests'],
      [
        'Code review: Approved — All acceptance criteria are met and confirmed by running the code on the fixtures.',
        'proven',
        'code-review',
      ],
      ['Verify failed', 'failed', undefined],
      [
        'Walkthrough: Skipped — Nothing the story changed alters what users see, so the story was not walked through.',
        'unproven',
        undefined,
      ],
    ])
  })

  it('names the failing checks and the failed tests', () => {
    const rows = signoffProofRows({
      ...finalState,
      checks: finalState.checks.map((c) =>
        c.id === 'types' ? { ...c, state: 'failed' as const, detail: '3 type errors' } : c,
      ),
      testTotals: { total: 13110, passed: 13108, failed: 2, skipped: 0 },
    })
    expect(rows.slice(0, 2).map((r) => [r.text, r.status])).toEqual([
      ['Type check failed — 3 type errors', 'failed'],
      ['2 of 13,110 tests failed', 'failed'],
    ])
  })

  it('counts several verified sections by outcome', () => {
    const rows = signoffProofRows({
      ...finalState,
      verify: [
        { label: 'A', status: { tone: 'done', label: 'Verify passed' } },
        { label: 'B', status: { tone: 'done', label: 'Verify passed' } },
        { label: 'C', status: { tone: 'review', label: 'Accepted by you' } },
      ],
    })
    expect(rows.find((r) => r.status !== 'proven' && r.text.includes('Verify'))).toMatchObject({
      text: 'Verify passed · 2 of 3 · Accepted by you · 1 of 3',
      status: 'unproven',
    })
  })

  it('leaves out a kind of proof the run never had', () => {
    const rows = signoffProofRows({
      checks: [],
      testTotals: undefined,
      codeReview: undefined,
      walkthrough: undefined,
      verify: [],
      tabs: [],
    })
    expect(rows).toEqual([])
  })
})

describe('signoffReportView', () => {
  it('lays the report out in its four sections', () => {
    const view = signoffReportView(input())
    expect(view.outcome).toMatchObject({
      title: 'Outcome',
      summary: 'PDFs now read as text.',
      body: { headline: 'PDFs now read as text.', detail: 'Other binaries get one notice.' },
      open: true,
    })
    expect(view.decisions).toMatchObject({
      summary: '2, e.g. PDF text is capped at 60,000 characters.',
      open: false,
    })
    expect(view.needsYou).toMatchObject({
      summary: '1 decision before you approve',
      open: true,
      attention: true,
    })
    expect(view.fallbackMarkdown).toBeUndefined()
    expect(view.markdown).toBe('## Verdict\nDone.')
  })

  it('links each proof line to the tab that holds its proof, when that tab exists', () => {
    const rows = signoffReportView(input({ tabs: ['tests', 'code-review'] })).howProven!.body
    expect(rows.map((r) => [r.mark, r.tab, r.tabLabel])).toEqual([
      ['✓', 'tests', 'Tests'],
      ['✓', undefined, undefined],
      ['✓', 'code-review', 'Code review'],
      ['!', undefined, undefined],
    ])
  })

  it('summarises how it was proven by the first gap', () => {
    expect(signoffReportView(input()).howProven!.summary).toBe(
      '3 of 4 proven — Verify was accepted by you.',
    )
  })

  it('says all were proven when none fell short', () => {
    const view = signoffReportView(
      input({
        report: {
          ref: { reportSections: { ...sections, howProven: [sections.howProven[0]] } },
        },
      }),
    )
    expect(view.howProven!.summary).toBe('All 1 proven')
  })

  it('marks a failed proof', () => {
    const view = signoffReportView(
      input({
        report: {
          ref: {
            reportSections: {
              ...sections,
              howProven: [{ text: 'Tests failed.', status: 'failed', source: 'tests' }],
            },
          },
        },
      }),
    )
    expect(view.howProven!.body[0]).toMatchObject({ mark: '✗', tone: 'stuck' })
  })

  it('leaves out how it was proven when the report says nothing of it', () => {
    const view = signoffReportView(
      input({ report: { ref: { reportSections: { ...sections, howProven: [] } } } }),
    )
    expect(view.howProven).toBeUndefined()
  })

  it('says nothing needs you, folded, when nothing does', () => {
    const view = signoffReportView(
      input({
        report: { ref: { reportSections: { ...sections, needsYou: [], decisions: [] } } },
      }),
    )
    expect(view.needsYou).toMatchObject({ summary: 'Nothing', open: false, attention: false })
    expect(view.decisions!.summary).toBe('None')
  })

  it('says a single decision itself', () => {
    const view = signoffReportView(
      input({ report: { ref: { reportSections: { ...sections, decisions: ['Only one.'] } } } }),
    )
    expect(view.decisions!.summary).toBe('Only one.')
  })

  it('keeps an unreadable report as its markdown, with the tiles', () => {
    const view = signoffReportView(input({ report: { text: 'Free-form notes.', ref: {} } }))
    expect(view.outcome).toBeUndefined()
    expect(view.fallbackMarkdown).toBe('Free-form notes.')
    expect(view.tiles).toHaveLength(4)
  })

  it('shows the tiles alone when no report was filed', () => {
    const view = signoffReportView(input({ report: undefined }))
    expect(view.fallbackMarkdown).toBeUndefined()
    expect(view.tiles).toHaveLength(4)
  })

  it('drops a blank outcome detail', () => {
    const view = signoffReportView(
      input({
        report: {
          ref: { reportSections: { ...sections, outcome: { headline: 'Done.', detail: ' ' } } },
        },
      }),
    )
    expect(view.outcome!.body.detail).toBeUndefined()
  })
})

describe('reportBodyView with the run’s final state', () => {
  const history: ReportSections = {
    ...sections,
    howProven: [
      { text: 'Checks #1 failed (2 of 13,110 tests).', status: 'failed', source: 'tests' },
      { text: 'Implement #1 stalled.', status: 'proven', source: 'other' },
    ],
  }

  it('shows how it was proven from the final state, never the report’s attempt history', () => {
    const view = reportBodyView(
      { ref: { reportSections: history } },
      finalState.tabs,
      signoffProofRows(finalState),
    )
    expect(view.howProven?.body.map((r) => r.text)).not.toContain('Implement #1 stalled.')
    expect(view.howProven?.body).toHaveLength(5)
    expect(view.howProven?.summary).toBe('3 of 5 proven — Verify failed')
  })

  it('shows the final state above a report that cannot be read as sections', () => {
    const view = reportBodyView(
      { text: 'free text', ref: {} },
      finalState.tabs,
      signoffProofRows(finalState),
    )
    expect(view.fallbackMarkdown).toBe('free text')
    expect(view.howProven?.body).toHaveLength(5)
  })

  it('summarises a section without its markdown marks', () => {
    const view = reportBodyView(
      {
        ref: {
          reportSections: {
            ...sections,
            outcome: { headline: '**Done**, with `searchFiles` slower.' },
            decisions: ['**Cached** failures too.'],
          },
        },
      },
      [],
    )
    expect(view.outcome?.summary).toBe('Done, with searchFiles slower.')
    expect(view.decisions?.summary).toBe('Cached failures too.')
  })
})

describe('reportBodyView', () => {
  it('lays out the sections alone, for a view with no tiles of its own', () => {
    const view = reportBodyView({ ref: { reportSections: sections } }, [])
    expect('tiles' in view).toBe(false)
    expect(view.howProven!.body.every((r) => r.tab === undefined)).toBe(true)
  })

  it('says nothing needs you when the only line was the pending merge', () => {
    const filed = { ...sections, needsYou: [NOT_MERGED] }
    expect(reportBodyView({ ref: { reportSections: filed } }, []).needsYou).toMatchObject({
      summary: 'Nothing',
      body: [],
      attention: false,
    })
  })

  it('has nothing to lay out without a report', () => {
    expect(reportBodyView(undefined, [])).toMatchObject({
      outcome: undefined,
      fallbackMarkdown: undefined,
    })
  })
})

describe('reportPreviewTiles', () => {
  it('says the outcome, how much is proven, decisions and what needs you', () => {
    expect(reportPreviewTiles(sections).map((t) => [t.label, t.value, t.tone])).toEqual([
      ['Outcome', 'PDFs now read as text.', 'neutral'],
      ['Proven', '3 of 4', 'working'],
      ['Decisions made', '2 made', 'neutral'],
      ['Needs you', '1 decision', 'working'],
    ])
  })

  it('reads all proven and nothing needed as done', () => {
    const tiles = reportPreviewTiles({
      ...sections,
      howProven: [sections.howProven[0]],
      needsYou: [],
    })
    expect(tiles[1]).toMatchObject({ value: 'All', tone: 'done' })
    expect(tiles[3]).toMatchObject({ value: 'Nothing', tone: 'done' })
  })

  it('says a dash when it names no proof', () => {
    expect(reportPreviewTiles({ ...sections, howProven: [] })[1]).toMatchObject({
      value: '—',
      tone: 'working',
    })
  })
})
