import { describe, expect, it } from 'vitest'
import type { ProcessRun, ReviewEvidenceRef } from 'thefactory-tools/types'

import {
  isProcessReportAccepted,
  isProcessVariantRun,
  processVariantDayOf,
  processVariantHeading,
  processVariantJoinLine,
  processVariantLanes,
  processVariantReport,
  processVariantRunView,
} from './processVariantView'
import type { ProcessRunEvidenceGroupView } from './processVariantViewTypes'
import { processRunStripEntries } from './stepsStrip'

const variantStep = (id: string, title: string, refs = true) => ({
  id: `variants:${id}`,
  name: title,
  kind: 'process' as const,
  processId: 'compare-variant',
  fanOut: 'variants',
  subject: {
    kind: 'variant' as const,
    id,
    title,
    input: 'variants',
    ...(refs
      ? { values: { refs: [{ role: 'web', ref: '4e1c9a2b7f001122', patch: 'diff' }] } }
      : {}),
  },
})

const run = (over: Partial<ProcessRun> = {}): ProcessRun =>
  ({
    id: 'root',
    projectId: 'p',
    processId: 'compare-variants',
    title: 'Sign-up trial',
    status: 'running',
    input: { inputValues: { days: 14 } },
    plan: {
      definitionId: 'compare-variants',
      definitionScope: 'global',
      definitionVersion: 1,
      name: 'Compare variants',
      frozenAt: 0,
      loops: [],
      inputs: [
        { name: 'variants', label: 'Versions', kind: 'variants', fields: [] },
        { name: 'days', label: 'Days', kind: 'number' },
      ],
      steps: [
        variantStep('current', 'Current'),
        variantStep('short', 'Short sign-up', false),
        { id: 'final-review', name: 'Final review', kind: 'agent', agentType: 'final-reviewer' },
        { id: 'sign-off', name: 'Sign-off', kind: 'gate' },
      ],
    },
    ledger: [
      {
        id: 'e1',
        stepId: 'variants:current',
        attempt: 1,
        status: 'running',
        startedAt: 1,
        childRunId: 'c1',
      },
      {
        id: 'e2',
        stepId: 'variants:short',
        attempt: 1,
        status: 'running',
        startedAt: 1,
        childRunId: 'c2',
      },
    ],
    ...over,
  }) as unknown as ProcessRun

const ref = (id: string, over: Partial<ReviewEvidenceRef> = {}): ReviewEvidenceRef =>
  ({
    id,
    kind: 'recording',
    path: `p/${id}`,
    mediaType: 'video/mp4',
    createdAt: Number(id.replace(/\D/g, '') || 0),
    ...over,
  }) as ReviewEvidenceRef

const group = (
  runId: string,
  stepId: string | undefined,
  status: ProcessRun['status'],
  refs: ReviewEvidenceRef[],
  over: Partial<ProcessRunEvidenceGroupView> = {},
): ProcessRunEvidenceGroupView => ({
  runId,
  ...(stepId ? { stepId } : {}),
  label: runId,
  status,
  evidence: refs,
  tiles: refs.map((one) => ({
    ref: one,
    caption: one.label ?? one.kind,
    ...(one.kind === 'report' ? { text: `# ${one.label}\n\nFinding of ${one.id}` } : {}),
  })),
  ...over,
})

const days = (...n: number[]) => n.map((day) => ref(`r${day}`, { label: `Day ${day}: opened it` }))

describe('processVariantDayOf', () => {
  it('reads the last day a label names', () => {
    expect(processVariantDayOf('Day 3: opened it')).toBe(3)
    expect(processVariantDayOf('Week 1 · days 1–7')).toBe(7)
    expect(processVariantDayOf('days 8 to 14')).toBe(14)
    expect(processVariantDayOf('Birthday 3')).toBeUndefined()
    expect(processVariantDayOf(undefined)).toBeUndefined()
  })
})

describe('isProcessVariantRun', () => {
  it('is true for a run that fans out over variants only', () => {
    expect(isProcessVariantRun(run())).toBe(true)
    const steps = [{ id: 'a', name: 'A', kind: 'agent' as const }]
    expect(isProcessVariantRun(run({ plan: { ...run().plan, steps } }))).toBe(false)
  })
})

describe('processVariantHeading', () => {
  it('calls them what the input is called', () => {
    expect(processVariantHeading(run())).toBe('Versions')
    expect(processVariantHeading(run({ plan: { ...run().plan, inputs: [] } }))).toBe('Variants')
  })
})

describe('processVariantLanes', () => {
  it('reads how far each variant got from its recordings', () => {
    const view = processVariantLanes(
      run(),
      [
        group('root', undefined, 'running', []),
        group('c1', 'variants:current', 'running', days(1, 2, 3)),
        group('c2', 'variants:short', 'parked', days(1, 2, 3, 4, 5)),
      ],
      0,
    )
    expect(view).toMatchObject({ heading: 'Versions', sub: '2 at once', days: 14, ended: 0 })
    expect(view.weekLabels).toEqual(['Week 1', 'Week 2'])
    const [current, short] = view.lanes
    expect(current).toMatchObject({
      status: 'running',
      lived: 3,
      dayLine: 'Day 4 of 14',
      line: 'Day 3: opened it',
      runId: 'c1',
    })
    expect(current!.weeks[0]!.cells.map((c) => c.look).slice(0, 5)).toEqual([
      'lived',
      'lived',
      'lived',
      'today',
      'to-come',
    ])
    expect(short).toMatchObject({ status: 'parked', dayLine: 'Day 6 of 14' })
    expect(short!.badge).toEqual({ label: 'Needs you', tone: 'on_hold' })
    expect(short!.weeks[0]!.cells[5]!.look).toBe('parked')
  })

  it('names the stop a parked variant is on when its run reflects it', () => {
    const view = processVariantLanes(
      run({
        park: { stepId: 'variants:short', childRunId: 'c2', message: 'The code never came' },
      } as Partial<ProcessRun>),
      [group('c2', 'variants:short', 'parked', days(1))],
      0,
    )
    expect(view.lanes[1]!.line).toBe('The code never came')
  })

  it('says a variant needs you when the stop shown is another’s', () => {
    const view = processVariantLanes(run(), [group('c2', 'variants:short', 'parked', [])], 0)
    expect(view.lanes[1]!.line).toBe('Stopped here. It needs you.')
  })

  it('counts recordings as days when none names one', () => {
    const refs = [ref('r1', { label: 'Morning' }), ref('r2', { label: 'Evening' })]
    const view = processVariantLanes(run(), [group('c1', 'variants:current', 'running', refs)], 0)
    expect(view.lanes[0]!.lived).toBe(2)
    expect(view.lanes[0]!.line).toBe('Evening')
  })

  it('shows a finished variant as every day lived, with its review filed', () => {
    const review = ref('r9', { kind: 'report', label: 'Review' })
    const view = processVariantLanes(
      run(),
      [group('c1', 'variants:current', 'succeeded', [...days(1), review])],
      0,
    )
    const lane = view.lanes[0]!
    expect(lane).toMatchObject({ status: 'done', lived: 14, dayLine: 'Day 14 of 14' })
    expect(lane.line).toBe('Finding of r9')
    expect(lane.weeks.at(-1)!.review).toBe('done')
    expect(view.ended).toBe(1)
  })

  it('prefers what the step said it came to', () => {
    const base = run()
    const finished = {
      ...base,
      ledger: [{ ...base.ledger[0]!, status: 'done', outcome: 'passed', summary: 'Met 1 of 3' }],
    } as ProcessRun
    const view = processVariantLanes(
      finished,
      [group('c1', 'variants:current', 'succeeded', [])],
      0,
    )
    expect(view.lanes[0]!.line).toBe('Met 1 of 3')
  })

  it('marks the review under way once the last day is lived', () => {
    const refs = days(14)
    const view = processVariantLanes(run(), [group('c1', 'variants:current', 'running', refs)], 0)
    expect(view.lanes[0]!.line).toBe('In review')
    expect(view.lanes[0]!.weeks.at(-1)!.review).toBe('now')
    expect(view.lanes[0]!.weeks[0]!.review).toBeUndefined()
  })

  it('follows reviews filed week by week', () => {
    const refs = [...days(7), ref('r20', { kind: 'report', label: 'Review of week 1' })]
    const view = processVariantLanes(run(), [group('c1', 'variants:current', 'running', refs)], 0)
    expect(view.lanes[0]!.weeks.map((w) => w.review)).toEqual(['done', 'wait'])
  })

  it('keeps an odd number of days in the right rows', () => {
    const view = processVariantLanes(
      run({ input: { inputValues: { days: 9 } } }),
      [group('c1', 'variants:current', 'running', [])],
      0,
    )
    expect(view.lanes[0]!.weeks.map((w) => w.cells.length)).toEqual([7, 2])
  })

  it('has no cells when the launch names no days', () => {
    const view = processVariantLanes(run({ input: {} }), [], 0)
    expect(view).toMatchObject({ days: undefined, weekLabels: [] })
    expect(view.lanes[0]).toMatchObject({ weeks: [], dayLine: undefined, status: 'running' })
  })

  it('shows a variant not started yet as queued', () => {
    const view = processVariantLanes(run({ ledger: [] }), [], 0)
    expect(view.lanes[0]).toMatchObject({ status: 'queued', line: 'Not started', runId: undefined })
    expect(view.lanes[0]!.weeks[0]!.cells[0]!.look).toBe('to-come')
  })

  it('ends a stopped variant at the day it reached', () => {
    const view = processVariantLanes(
      run(),
      [group('c1', 'variants:current', 'cancelled', days(1, 2))],
      0,
    )
    expect(view.lanes[0]).toMatchObject({ status: 'stopped', lived: 2 })
    expect(view.lanes[0]!.weeks[0]!.cells[2]!.look).toBe('to-come')
    expect(view.ended).toBe(1)
  })

  it('reads the refs and a patch off the variant, short', () => {
    const view = processVariantLanes(run(), [], 0)
    expect(view.lanes[0]!.facts.map((f) => [f.kind, f.text])).toEqual([
      ['ref', '4e1c9a2'],
      ['patch', 'Patch'],
    ])
    expect(view.lanes[1]!.facts).toEqual([])
  })

  it('takes the later attempt of a step, not one it replaced', () => {
    const view = processVariantLanes(
      run(),
      [
        group('old', 'variants:current', 'failed', [], { replaced: true }),
        group('new', 'variants:current', 'running', []),
      ],
      0,
    )
    expect(view.lanes[0]).toMatchObject({ runId: 'new', status: 'running' })
  })

  it('counts only what the backend vouches for as proof', () => {
    const view = processVariantLanes(
      run(),
      [
        group('c1', 'variants:current', 'running', [
          ...days(1, 2),
          ref('r3', { label: 'Day 3', unvouchedReason: 'Seal lost' }),
          ref('r4', { label: 'Day 4', inline: true }),
        ]),
      ],
      0,
    )
    expect(view.lanes[0]!.proof).toEqual({ count: 2, total: 4 })
  })
})

describe('processVariantReport', () => {
  const report = ref('r30', { kind: 'report', label: 'Final report' })
  const post = ref('r31', { kind: 'report', label: 'The post' })
  const groups = [
    group('root', undefined, 'parked', [report, post]),
    group('c1', 'variants:current', 'succeeded', [
      ...days(1, 2),
      ref('r9', { kind: 'report', label: 'Review' }),
    ]),
    group('c2', 'variants:short', 'succeeded', days(1)),
  ]

  it('tells the final report from the post', () => {
    const view = processVariantReport(run(), groups, 0)
    expect(view.reportTile?.ref.id).toBe('r30')
    expect(view.post?.ref.id).toBe('r31')
    expect(view.waiting).toBeUndefined()
    expect(view.report?.fallbackMarkdown).toContain('Finding of r30')
  })

  it('leads with what the report concluded', () => {
    const body = { outcome: { headline: 'Short sign-up met all 3 goals' } }
    const filed = {
      ...groups[0]!,
      tiles: [
        {
          ref: {
            ...report,
            reportSections: {
              ...body,
              howProven: [],
              decisions: [],
              needsYou: [],
            },
          },
          caption: 'Final report',
        },
      ],
    } as ProcessRunEvidenceGroupView
    const view = processVariantReport(run(), [filed, ...groups.slice(1)], 0)
    expect(view.headline).toBe('Short sign-up met all 3 goals')
    expect(view.report?.outcome?.summary).toBe('Short sign-up met all 3 goals')
  })

  it('leads with the run’s name when no report is filed', () => {
    expect(processVariantReport(run(), [], 0).headline).toBe('Sign-up trial')
  })

  it('says how many are still to finish before the report comes', () => {
    const view = processVariantReport(
      run(),
      [
        group('c1', 'variants:current', 'succeeded', []),
        group('c2', 'variants:short', 'running', []),
      ],
      0,
    )
    expect(view.report).toBeUndefined()
    expect(view.waiting?.sub).toBe('1 of 2 variants still to finish')
    expect(view.waiting?.line).toContain('What is filed so far is below.')
  })

  it('says so when every variant ended and no report was filed', () => {
    const view = processVariantReport(
      run(),
      [
        group('c1', 'variants:current', 'succeeded', []),
        group('c2', 'variants:short', 'failed', []),
      ],
      0,
    )
    expect(view.waiting).toEqual({ sub: '', line: 'No final report was filed.' })
  })

  it('files each variant’s recordings and findings under it', () => {
    const view = processVariantReport(run(), groups, 0)
    const [current, short] = view.sections
    expect(current!.recordings.map((r) => r.label)).toEqual([
      'Proof · reached day 1',
      'Proof · reached day 2',
    ])
    expect(current!.findings).toMatchObject([{ title: 'Review', text: expect.any(String) }])
    expect(current!.findingsNote).toBeUndefined()
    expect(short!.findings).toEqual([])
  })

  it('says why a recording does not count', () => {
    const view = processVariantReport(
      run(),
      [
        group('c1', 'variants:current', 'running', [
          ref('r5', { label: 'Day 5', unvouchedReason: 'Seal lost' }),
        ]),
      ],
      0,
    )
    expect(view.sections[0]!.recordings[0]).toMatchObject({
      proof: false,
      label: 'Not proof',
      title: 'Seal lost',
    })
  })

  it('shows the day being recorded and when the findings come', () => {
    const view = processVariantReport(
      run(),
      [group('c1', 'variants:current', 'running', days(2))],
      0,
    )
    expect(view.sections[0]).toMatchObject({
      recordingNow: true,
      findingsNote: 'After the days end.',
    })
  })

  it('stops expecting a recording once the days are lived', () => {
    const view = processVariantReport(
      run(),
      [group('c1', 'variants:current', 'running', days(14))],
      0,
    )
    expect(view.sections[0]).toMatchObject({
      recordingNow: false,
      findingsNote: 'The findings show here once the review is filed.',
    })
  })

  it('keeps recordings no variant filed, whatever step did', () => {
    const view = processVariantReport(
      run(),
      [
        group('root', undefined, 'parked', [ref('r40', { label: 'Check' })]),
        group('other', 'final-review', 'succeeded', [ref('r41')]),
        group('gone', 'final-review', 'failed', [ref('r42')], { replaced: true }),
      ],
      0,
    )
    expect(view.recordings.map((r) => r.tile.ref.id)).toEqual(['r40', 'r41'])
    expect(view.proof).toEqual({ count: 2, total: 2 })
  })

  it('says what was asked and what was proven on its tiles', () => {
    const view = processVariantReport(run(), groups, 0)
    expect(view.tiles.map((t) => [t.label, t.value, t.sub])).toEqual([
      ['Asked', '2 variants', '14 days each'],
      ['Proven', '3 of 3 recordings', 'Each reached the end'],
      ['Time', '—', undefined],
      ['Cost', '—', undefined],
    ])
    expect(view.tiles[1]!.tone).toBe('done')
  })

  it('leaves a partial proof short of whole', () => {
    const view = processVariantReport(
      run(),
      [
        group('c1', 'variants:current', 'running', [
          ...days(1),
          ref('r3', { unvouchedReason: 'x' }),
        ]),
      ],
      0,
    )
    expect(view.tiles[1]).toMatchObject({
      value: '1 of 2 recordings',
      sub: 'So far',
      tone: 'working',
    })
    expect(view.proofRows[0]).toMatchObject({
      text: 'Current: 1 of 2 recordings count',
      status: 'unproven',
      mark: '!',
    })
  })

  it('says how many fall short once every variant ended', () => {
    const view = processVariantReport(
      run(),
      [
        group('c1', 'variants:current', 'succeeded', [ref('r3', { unvouchedReason: 'x' })]),
        group('c2', 'variants:short', 'succeeded', days(1)),
      ],
      0,
    )
    expect(view.tiles[1]?.sub).toBe('1 does not count')
  })

  it('lines proof up per variant, each only once it filed something', () => {
    const view = processVariantReport(run(), groups, 0)
    expect(view.proofRows.map((r) => r.text)).toEqual([
      'Current: every recording counts',
      'Short sign-up: every recording counts',
    ])
    expect(view.report?.howProven?.summary).toBe('3 of 3 recordings count as proof')
  })

  it('works for a run with no variants at all', () => {
    const plain = run({ plan: { ...run().plan, steps: [] } })
    const view = processVariantReport(plain, [group('root', undefined, 'parked', [report])], 0)
    expect(view.sections).toEqual([])
    expect(view.reportTile?.ref.id).toBe('r30')
  })
})

describe('processRunStripEntries', () => {
  it('folds a run’s variants into one step', () => {
    const entries = processRunStripEntries(run())
    expect(entries.map((e) => e.label)).toEqual([
      'Versions · 2 at once',
      'Final review',
      'Sign-off',
    ])
    expect(entries[0]!.phase).toBe('current')
  })

  it('calls the step done only when every variant is', () => {
    const base = run()
    const ledger = [
      { ...base.ledger[0]!, status: 'done', outcome: 'passed' },
      base.ledger[1]!,
    ] as ProcessRun['ledger']
    expect(processRunStripEntries({ ...base, ledger })[0]!.phase).toBe('current')
  })

  it('leaves a run with no variants as it was', () => {
    const plain = run({ plan: { ...run().plan, steps: [{ id: 'a', name: 'A', kind: 'agent' }] } })
    expect(processRunStripEntries(plain).map((e) => e.label)).toEqual(['A'])
  })
})

describe('processVariantRunView', () => {
  it('opens on the lanes while the run works, the report once it is decided on', () => {
    expect(processVariantRunView({ status: 'running' }, false, undefined)).toBe('lanes')
    expect(processVariantRunView({ status: 'parked' }, true, undefined)).toBe('report')
    expect(processVariantRunView({ status: 'succeeded' }, false, undefined)).toBe('report')
  })

  it('keeps what the person picked', () => {
    expect(processVariantRunView({ status: 'parked' }, true, 'lanes')).toBe('lanes')
    expect(processVariantRunView({ status: 'running' }, false, 'report')).toBe('report')
  })
})

describe('isProcessReportAccepted', () => {
  it('says so of a run of variants that ended with nothing merged', () => {
    expect(isProcessReportAccepted(run({ status: 'succeeded' }))).toBe(true)
    const onBase = { status: 'already-landed' } as ProcessRun['integration']
    expect(isProcessReportAccepted(run({ status: 'succeeded', integration: onBase }))).toBe(true)
  })

  it('stays quiet while it runs, or when work did merge', () => {
    expect(isProcessReportAccepted(run())).toBe(false)
    const merged = { status: 'integrated' } as ProcessRun['integration']
    expect(isProcessReportAccepted(run({ status: 'succeeded', integration: merged }))).toBe(false)
  })

  it('is never said of a run with no variants', () => {
    const plain = run({ status: 'succeeded', plan: { ...run().plan, steps: [] } })
    expect(isProcessReportAccepted(plain)).toBe(false)
  })
})

describe('processVariantJoinLine', () => {
  it('says what the next step waits for', () => {
    expect(processVariantJoinLine(processVariantLanes(run(), [], 0))).toBe(
      'Waits for all 2 variants',
    )
    const one = processVariantLanes(run(), [group('c1', 'variants:current', 'succeeded', [])], 0)
    expect(processVariantJoinLine(one)).toBe('Waits for the rest')
  })
})
