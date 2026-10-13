import { describe, expect, it } from 'vitest'

import type { ProcessGroupLeg } from 'thefactory-tools/types'

import type { CheckMethodRow, ReviewTab } from './checkMethodTypes'
import {
  acceptanceCriteriaLines,
  evidenceChipForTab,
  isEvidenceChipSelected,
  signoffAttentionItems,
  signoffEvidenceChips,
  signoffFeatureRow,
  signoffFeaturesDelivered,
  signoffMergeHold,
  signoffProofChips,
  signoffRequestOutcome,
} from './signoffPage'
import type { ScreenPair } from './reviewEvidenceViewTypes'

const row = (overrides: Partial<CheckMethodRow> & Pick<CheckMethodRow, 'id'>): CheckMethodRow => ({
  label: overrides.id,
  noun: overrides.id,
  setupVerb: 'set it up',
  state: 'passed',
  tone: 'positive',
  detail: `${overrides.id} detail`,
  durationLabel: undefined,
  output: undefined,
  fill: 'run',
  action: { kind: 'open-proof', tab: 'build' },
  checkIds: [],
  ...overrides,
})

const tab = (id: ReviewTab['id']): ReviewTab => ({ id, label: id, count: undefined })

describe('acceptanceCriteriaLines', () => {
  it('reads one criterion per line, bullets and numbering dropped', () => {
    expect(acceptanceCriteriaLines('- reads PDFs\n2. caches\n* [x] flags binaries\n\n')).toEqual([
      'reads PDFs',
      'caches',
      'flags binaries',
    ])
  })

  it('keeps a single paragraph as one criterion', () => {
    expect(acceptanceCriteriaLines('Works offline.')).toEqual(['Works offline.'])
  })

  it('has none without text', () => {
    expect(acceptanceCriteriaLines(undefined)).toEqual([])
  })
})

describe('signoffAttentionItems', () => {
  it('names a section accepted over its gate, with where to see what Verify said', () => {
    expect(
      signoffAttentionItems([
        { id: 'f1', dependency: 's.f1', label: 'f1', mode: 'live', standing: 'accepted' },
      ]),
    ).toEqual([
      {
        key: 'f1-0',
        sectionId: 'f1',
        dependency: 's.f1',
        label: 'f1',
        text: 'was accepted by you without its Verify step passing.',
        action: 'See what Verify said',
      },
    ])
  })

  it('names a section verified dry', () => {
    const items = signoffAttentionItems([
      { id: 'f2', dependency: undefined, label: 'Fix · pass 1', mode: 'dry', standing: 'passed' },
    ])
    expect(items.map((i) => i.text)).toEqual(['was verified dry — not against the live backend.'])
  })

  it('gives both lines for an accepted, dry section', () => {
    expect(
      signoffAttentionItems([
        { id: 'f', dependency: undefined, label: 'f', mode: 'dry', standing: 'accepted' },
      ]),
    ).toHaveLength(2)
  })

  it('leaves out a passed live section and one that did not stand', () => {
    expect(
      signoffAttentionItems([
        { id: 'a', dependency: undefined, label: 'a', mode: 'live', standing: 'passed' },
        { id: 'b', dependency: undefined, label: 'b', mode: 'dry', standing: 'failed' },
      ]),
    ).toEqual([])
  })
})

describe('signoffEvidenceChips', () => {
  const order = [
    'report',
    'screens',
    'walkthrough',
    'tests',
    'build',
    'code-review',
    'changes',
  ] as const

  it('opens a checked method on its tab and puts what was not checked last', () => {
    const chips = signoffEvidenceChips(
      [
        row({
          id: 'lint',
          state: 'unconfigured',
          action: { kind: 'request', purpose: 'setup', approachId: undefined },
        }),
        row({ id: 'tests', action: { kind: 'open-proof', tab: 'tests' } }),
        row({ id: 'build' }),
        row({ id: 'report', action: { kind: 'open-proof', tab: 'report' } }),
      ],
      [tab('report'), tab('tests'), tab('build')],
      order,
    )
    expect(chips.map((c) => [c.key, c.target.kind])).toEqual([
      ['report', 'tab'],
      ['tests', 'tab'],
      ['build', 'tab'],
      ['lint', 'missing'],
    ])
  })

  it('explains a missing method in its own words', () => {
    const [chip] = signoffEvidenceChips(
      [row({ id: 'uitests', label: 'UI tests', state: 'unconfigured', detail: 'No UI tests.' })],
      [],
      order,
    )
    expect(chip.target).toEqual({
      kind: 'missing',
      title: 'UI tests — not set up',
      text: 'No UI tests.',
    })
  })

  it('opens the code review for a reviewed change when there is a Code review tab', () => {
    const chips = signoffEvidenceChips(
      [row({ id: 'diff', action: { kind: 'open-proof', tab: 'changes' } })],
      [tab('code-review')],
      order,
    )
    expect(chips[0].target).toEqual({ kind: 'tab', tab: 'code-review' })
  })

  it('explains a reviewed change when no tab holds it', () => {
    const chips = signoffEvidenceChips(
      [row({ id: 'diff', action: { kind: 'open-proof', tab: 'changes' } })],
      [],
      order,
    )
    expect(chips[0].target.kind).toBe('missing')
  })

  it('does not send an unreviewed change to the Code review tab', () => {
    const chips = signoffEvidenceChips(
      [row({ id: 'diff', state: 'unchecked', action: { kind: 'run' } })],
      [tab('code-review')],
      order,
    )
    expect(chips.map((c) => c.key)).toEqual(['tab-code-review', 'diff'])
  })

  it('gives a tab no check stands for a chip of its own, in tab order', () => {
    const chips = signoffEvidenceChips(
      [row({ id: 'tests', action: { kind: 'open-proof', tab: 'tests' } })],
      [tab('tests'), tab('report')],
      order,
    )
    expect(chips.map((c) => [c.key, c.row.id, c.row.label])).toEqual([
      ['tab-report', 'report', 'Report'],
      ['tests', 'tests', 'tests'],
    ])
  })
})

describe('isEvidenceChipSelected', () => {
  const chips = signoffEvidenceChips(
    [row({ id: 'build' }), row({ id: 'types' }), row({ id: 'lint', state: 'unconfigured' })],
    [tab('build')],
    ['build'],
  )

  it('selects the first tab when nothing was picked', () => {
    expect(isEvidenceChipSelected(chips[0], undefined, chips)).toBe(true)
  })

  it('selects chips sharing a tab together', () => {
    expect(isEvidenceChipSelected(chips[1], 'build', chips)).toBe(true)
  })

  it('selects a missing chip alone', () => {
    expect(isEvidenceChipSelected(chips[2], 'lint', chips)).toBe(true)
    expect(isEvidenceChipSelected(chips[0], 'lint', chips)).toBe(false)
  })

  it('selects nothing when there are no chips', () => {
    expect(isEvidenceChipSelected(chips[0], undefined, [])).toBe(false)
  })
})

describe('evidenceChipForTab', () => {
  it('finds the chip that opens a tab', () => {
    const chips = signoffEvidenceChips(
      [row({ id: 'tests', action: { kind: 'open-proof', tab: 'tests' } })],
      [tab('tests')],
      ['tests'],
    )
    expect(evidenceChipForTab(chips, 'tests')?.key).toBe('tests')
    expect(evidenceChipForTab(chips, 'build')).toBeUndefined()
  })
})

describe('signoffProofChips', () => {
  it('marks each plan kind by how it stands', () => {
    expect(
      signoffProofChips([
        { kind: 'unit-tests', label: 'Unit tests', word: 'Met', detail: '10 new', tone: 'done' },
        { kind: 'checks', label: 'Checks', word: 'Not met', detail: 'build failed', tone: 'stuck' },
        { kind: 'manual', label: 'Manual', word: 'Yours', detail: 'check it', tone: 'neutral' },
        {
          kind: 'code-review',
          label: 'Code review',
          word: 'Unchecked',
          detail: 'x',
          tone: 'review',
        },
      ]).map((c) => [c.label, c.mark, c.tone, c.detail]),
    ).toEqual([
      ['Unit tests', '✓', 'done', 'Met — 10 new'],
      ['Checks', '✗', 'stuck', 'Not met — build failed'],
      ['Manual', '•', 'neutral', 'Yours — check it'],
      ['Code review', '○', 'review', 'Unchecked — x'],
    ])
  })

  it('has none for a run launched without a plan', () => {
    expect(signoffProofChips(undefined)).toEqual([])
  })
})

describe('signoffFeatureRow', () => {
  const base = {
    key: 'f1',
    dependency: 's.f1',
    label: '#1.1',
    title: 'Read PDFs',
    proofPlan: undefined,
    acceptance: '- a\n- b',
    judgement: undefined,
    criteriaMet: undefined,
    status: { tone: 'done' as const, label: 'Verify passed' },
    facts: { costLabel: undefined, durationLabel: undefined },
  }

  it('counts the asked criteria the review found met', () => {
    expect(
      signoffFeatureRow({ ...base, judgement: { asked: 2, judged: 2, met: 1 } }).criteriaLine,
    ).toBe('1 of 2 criteria met')
  })

  it('says how many asked criteria the review did not judge, whatever its own tally says', () => {
    expect(
      signoffFeatureRow({
        ...base,
        judgement: { asked: 2, judged: 1, met: 1 },
        criteriaMet: { met: 7, total: 7 },
      }).criteriaLine,
    ).toBe('1 of 2 criteria judged met · 1 not judged')
  })

  it('takes the review’s own tally only for a feature that asked for no criteria', () => {
    expect(
      signoffFeatureRow({ ...base, acceptance: undefined, criteriaMet: { met: 3, total: 3 } })
        .criteriaLine,
    ).toBe('3 of 3 criteria met')
  })

  it('counts the criteria asked for otherwise', () => {
    const view = signoffFeatureRow(base)
    expect(view.criteria).toEqual(['a', 'b'])
    expect(view.criteriaLine).toBe('2 acceptance criteria')
  })

  it('names a single criterion in the singular, and none when there are none', () => {
    expect(signoffFeatureRow({ ...base, acceptance: 'one' }).criteriaLine).toBe(
      '1 acceptance criterion',
    )
    expect(signoffFeatureRow({ ...base, acceptance: undefined }).criteriaLine).toBeUndefined()
  })
})

describe('signoffRequestOutcome', () => {
  const pair = (counted: boolean): ScreenPair => ({
    key: 'fix::viewer-overview',
    index: 1,
    title: 'Viewer Overview — thefactory-knowledge (self)',
    class: 'pair',
    counted,
  })
  const fix = {
    sectionId: 'fix:e9de08df',
    label: 'Fix · pass 3',
    sentBy: 'sign-off' as const,
    note: 'Show me the viewer’s Overview on screen, before and after',
    proofPlan: undefined,
    unmetRequest: undefined,
  }

  it('says the person’s request is met, with the before/after pairs its verify counted', () => {
    expect(signoffRequestOutcome(fix, { standing: 'passed', pairs: [pair(true)] })).toEqual({
      sectionId: 'fix:e9de08df',
      label: 'Fix · pass 3',
      state: 'met',
      text: 'Your request “Show me the viewer’s Overview on screen, before and after” is met — 1 before/after pair',
      pairs: [pair(true)],
    })
  })

  it('counts only the pairs the gate counted', () => {
    const outcome = signoffRequestOutcome(fix, {
      standing: 'passed',
      pairs: [pair(true), { ...pair(false), key: 'other' }],
    })
    expect(outcome?.pairs).toHaveLength(1)
  })

  it('says why the request is not met when the fix found it unmet', () => {
    expect(
      signoffRequestOutcome(
        { ...fix, unmetRequest: 'the viewer has no Overview route yet' },
        { standing: 'passed', pairs: [pair(true)] },
      ),
    ).toMatchObject({
      state: 'unmet',
      text: 'Your request “Show me the viewer’s Overview on screen, before and after” is not met: the viewer has no Overview route yet',
      pairs: [],
    })
  })

  it('names the proof asked for when the person wrote no note', () => {
    expect(
      signoffRequestOutcome(
        {
          ...fix,
          note: undefined,
          proofPlan: [
            {
              kind: 'ui-before-after',
              label: 'Before/after screens',
              tone: 'done',
              word: 'Met',
              detail: '',
            },
          ],
        },
        { standing: 'passed', pairs: [] },
      )?.text,
    ).toBe('Your request for before/after screens is met')
  })

  it('says nothing for a pass nobody asked for, or one whose verify has not passed', () => {
    expect(
      signoffRequestOutcome({ ...fix, sentBy: 'code-review' }, { standing: 'passed', pairs: [] }),
    ).toBeUndefined()
    expect(signoffRequestOutcome(fix, { standing: 'failed', pairs: [] })).toBeUndefined()
    expect(signoffRequestOutcome(fix, undefined)).toBeUndefined()
  })
})

describe('signoffFeaturesDelivered', () => {
  it('counts every feature that ran and did not fail', () => {
    expect(signoffFeaturesDelivered({ total: 4, failed: 1, notRun: 1 })).toEqual({
      done: 2,
      total: 4,
    })
  })
})

describe('signoffMergeHold', () => {
  const leg = (
    id: string,
    status: ProcessGroupLeg['status'],
    dependsOn: string[] = [],
  ): ProcessGroupLeg => ({ id, projectId: id, storyId: `s-${id}`, title: id, dependsOn, status })
  const nameOf = (id: string) => `thefactory-${id}`

  it('says nothing when every leg it depends on is merged', () => {
    const group = { legs: [leg('tools', 'integrated'), leg('ui', 'at-sign-off', ['tools'])] }
    expect(signoffMergeHold(group, 'ui', nameOf)).toBeUndefined()
  })

  it('says nothing for a leg that depends on nothing', () => {
    expect(
      signoffMergeHold({ legs: [leg('tools', 'at-sign-off')] }, 'tools', nameOf),
    ).toBeUndefined()
  })

  it('names the one project it waits on, and where it stands', () => {
    const group = { legs: [leg('backend', 'running'), leg('ui', 'at-sign-off', ['backend'])] }
    expect(signoffMergeHold(group, 'ui', nameOf)).toEqual({
      reason: 'Merges after thefactory-backend is merged',
      waitingOn: [{ key: 'backend', name: 'thefactory-backend', status: 'running', tone: 'done' }],
    })
  })

  it('lists several projects it waits on', () => {
    const group = {
      legs: [
        leg('a', 'blocked'),
        leg('b', 'at-sign-off'),
        leg('c', 'integrated'),
        leg('ui', 'at-sign-off', ['a', 'b', 'c']),
      ],
    }
    const hold = signoffMergeHold(group, 'ui', nameOf)
    expect(hold?.reason).toBe('Merges after thefactory-a and thefactory-b are merged')
    expect(hold?.waitingOn.map((l) => l.status)).toEqual(['waiting on another project', 'sign off'])
  })
})
