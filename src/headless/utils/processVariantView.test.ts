import { describe, expect, it } from 'vitest'
import type { ProcessRun, ReviewEvidenceRef } from 'thefactory-tools/types'

import {
  isProcessReportAccepted,
  isProcessVariantRun,
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
  processId: 'try-variant',
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
    processId: 'try-variants',
    title: 'Compare versions',
    status: 'running',
    input: { inputValues: {} },
    plan: {
      definitionId: 'try-variants',
      definitionScope: 'global',
      definitionVersion: 1,
      name: 'Try variants',
      frozenAt: 0,
      loops: [],
      inputs: [{ name: 'variants', label: 'Versions', kind: 'variants', fields: [] }],
      steps: [
        variantStep('a', 'Version A'),
        variantStep('b', 'Version B', false),
        { id: 'final-review', name: 'Final review', kind: 'agent', agentType: 'reviewer' },
        { id: 'sign-off', name: 'Sign-off', kind: 'gate' },
      ],
    },
    ledger: [
      {
        id: 'e1',
        stepId: 'variants:a',
        attempt: 1,
        status: 'running',
        startedAt: 1,
        childRunId: 'c1',
      },
      {
        id: 'e2',
        stepId: 'variants:b',
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

const recorded = (...labels: string[]) => labels.map((label, at) => ref(`r${at + 1}`, { label }))

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
  it('makes a lane per variant, each by its run and what it filed last', () => {
    const view = processVariantLanes(
      run(),
      [
        group('root', undefined, 'running', []),
        group('c1', 'variants:a', 'running', recorded('Opened the form', 'Saved it')),
        group('c2', 'variants:b', 'parked', recorded('Opened the form')),
      ],
      0,
    )
    expect(view).toEqual({
      heading: 'Versions',
      sub: '2 at once',
      lanes: expect.any(Array),
      ended: 0,
    })
    const [a, b] = view.lanes
    expect(a).toMatchObject({
      id: 'a',
      label: 'Version A',
      stepId: 'variants:a',
      status: 'running',
      line: 'Saved it',
      runId: 'c1',
      badge: { label: 'Running', tone: 'running' },
    })
    expect(b).toMatchObject({ id: 'b', status: 'parked', runId: 'c2' })
    expect(b!.badge).toEqual({ label: 'Needs you', tone: 'on_hold' })
  })

  it('says what was filed last, a report or a recording, in the order filed', () => {
    const refs = [
      ref('r5', { kind: 'report', label: 'Notes so far' }),
      ref('r2', { label: 'First screen' }),
    ]
    const view = processVariantLanes(run(), [group('c1', 'variants:a', 'running', refs)], 0)
    expect(view.lanes[0]!.line).toBe('Notes so far')
  })

  it('falls back on a filing’s caption when its label is blank', () => {
    const lineOf = (tile: ProcessRunEvidenceGroupView['tiles'][number]) =>
      processVariantLanes(
        run(),
        [{ ...group('c1', 'variants:a', 'running', [tile.ref]), tiles: [tile] }],
        0,
      ).lanes[0]!.line
    expect(lineOf({ ref: ref('r1', { label: ' ' }), caption: 'Clip' })).toBe('Clip')
    expect(lineOf({ ref: ref('r1'), caption: '' })).toBe('Starting')
  })

  it('leaves out a code review and logs from what a lane says it filed', () => {
    const refs = [
      ref('r1', { label: 'First screen' }),
      ref('r2', { kind: 'report', label: 'Code review', approach: 'code-review' }),
      ref('r3', { kind: 'log', label: 'Step log', mediaType: 'text/plain' }),
    ]
    const view = processVariantLanes(run(), [group('c1', 'variants:a', 'running', refs)], 0)
    expect(view.lanes[0]!.line).toBe('First screen')
  })

  it('says a variant that filed nothing yet is starting', () => {
    const view = processVariantLanes(run(), [group('c1', 'variants:a', 'running', [])], 0)
    expect(view.lanes[0]!.line).toBe('Starting')
  })

  it('names the stop a parked variant is on when its run reflects it', () => {
    const view = processVariantLanes(
      run({
        park: { stepId: 'variants:b', childRunId: 'c2', message: 'The code never came' },
      } as Partial<ProcessRun>),
      [group('c2', 'variants:b', 'parked', recorded('Opened the form'))],
      0,
    )
    expect(view.lanes[1]!.line).toBe('The code never came')
  })

  it('says a variant needs you when the stop shown is another’s', () => {
    const view = processVariantLanes(run(), [group('c2', 'variants:b', 'parked', [])], 0)
    expect(view.lanes[1]!.line).toBe('Stopped here. It needs you.')
  })

  it('reads a finished variant by its last report', () => {
    const report = ref('r9', { kind: 'report', label: 'Review' })
    const view = processVariantLanes(
      run(),
      [group('c1', 'variants:a', 'succeeded', [...recorded('First screen'), report])],
      0,
    )
    expect(view.lanes[0]).toMatchObject({ status: 'done', line: 'Finding of r9' })
    expect(view.ended).toBe(1)
  })

  it('says a finished variant finished when nothing it filed says more', () => {
    const view = processVariantLanes(run(), [group('c1', 'variants:a', 'succeeded', [])], 0)
    expect(view.lanes[0]!.line).toBe('Finished')
  })

  it('prefers what the step said it came to', () => {
    const base = run()
    const finished = {
      ...base,
      ledger: [
        { ...base.ledger[0]!, status: 'done', outcome: 'passed', summary: ' Passed 1 of 3 ' },
      ],
    } as ProcessRun
    const view = processVariantLanes(finished, [group('c1', 'variants:a', 'succeeded', [])], 0)
    expect(view.lanes[0]!.line).toBe('Passed 1 of 3')
  })

  it('shows a variant not started yet as queued', () => {
    const view = processVariantLanes(run({ ledger: [] }), [], 0)
    expect(view.lanes[0]).toMatchObject({ status: 'queued', line: 'Not started', runId: undefined })
    expect(view.lanes[0]!.badge.label).toBe('Queued')
  })

  it('takes a lane’s run from its step when nothing was filed yet', () => {
    const view = processVariantLanes(run(), [], 0)
    expect(view.lanes.map((lane) => [lane.runId, lane.status])).toEqual([
      ['c1', 'running'],
      ['c2', 'running'],
    ])
  })

  it('reads a run’s own status into its lane', () => {
    const statuses = (['pending', 'cancelled', 'failed'] as const).map(
      (status) =>
        processVariantLanes(run(), [group('c1', 'variants:a', status, [])], 0).lanes[0]!.status,
    )
    expect(statuses).toEqual(['running', 'stopped', 'stopped'])
    const queued = processVariantLanes(
      run({ ledger: [] }),
      [group('c1', 'variants:a', 'pending', [])],
      0,
    )
    expect(queued.lanes[0]!.status).toBe('queued')
  })

  it('says what stopped a variant, or that it stopped', () => {
    const base = run()
    const stopped = {
      ...base,
      ledger: [{ ...base.ledger[0]!, status: 'failed', summary: 'Exit code 1' }, base.ledger[1]!],
    } as ProcessRun
    const view = processVariantLanes(
      stopped,
      [group('c1', 'variants:a', 'failed', []), group('c2', 'variants:b', 'cancelled', [])],
      0,
    )
    expect(view.lanes.map((lane) => lane.line)).toEqual(['Exit code 1', 'Stopped'])
    expect(view.ended).toBe(2)
  })

  it('reads the refs and a patch off the variant, short', () => {
    const view = processVariantLanes(run(), [], 0)
    expect(view.lanes[0]!.facts.map((f) => [f.kind, f.text])).toEqual([
      ['ref', '4e1c9a2'],
      ['patch', 'Patch'],
    ])
    expect(view.lanes[1]!.facts).toEqual([])
  })

  it('skips values that are not refs', () => {
    const odd = variantStep('a', 'Version A')
    const values = {
      note: 'text',
      refs: [{ role: 'web' }, { role: 'api', ref: 'abcdef0123', patch: '' }],
    }
    const plan = { ...run().plan, steps: [{ ...odd, subject: { ...odd.subject, values } }] }
    const view = processVariantLanes(run({ plan } as Partial<ProcessRun>), [], 0)
    expect(view.lanes[0]!.facts.map((f) => [f.kind, f.text])).toEqual([['ref', 'abcdef0123']])
  })

  it('takes the later attempt of a step, not one it replaced', () => {
    const view = processVariantLanes(
      run(),
      [
        group('old', 'variants:a', 'failed', [], { replaced: true }),
        group('new', 'variants:a', 'running', []),
      ],
      0,
    )
    expect(view.lanes[0]).toMatchObject({ runId: 'new', status: 'running' })
  })

  it('counts only what the backend vouches for as proof', () => {
    const view = processVariantLanes(
      run(),
      [
        group('c1', 'variants:a', 'running', [
          ...recorded('First', 'Second'),
          ref('r3', { label: 'Third', unvouchedReason: 'Seal lost' }),
          ref('r4', { label: 'Fourth', inline: true }),
        ]),
      ],
      0,
    )
    expect(view.lanes[0]!.proof).toEqual({ count: 2, total: 4 })
    expect(view.lanes[0]!.chip).toEqual({ label: 'Walkthrough · 2 of 4', state: 'unchecked' })
  })

  it('marks the walkthrough chip passed when every recording counts, flagged when parked short', () => {
    const whole = processVariantLanes(
      run(),
      [group('c1', 'variants:a', 'running', recorded('First'))],
      0,
    )
    expect(whole.lanes[0]!.chip.state).toBe('passed')
    const parked = processVariantLanes(
      run(),
      [group('c2', 'variants:b', 'parked', [ref('r1', { unvouchedReason: 'x' })])],
      0,
    )
    expect(parked.lanes[1]!.chip.state).toBe('flagged')
  })

  it('carries what a variant’s step cost and how long it worked', () => {
    const base = run()
    const costed = {
      ...base,
      totals: {
        workMs: 120_000,
        at: 0,
        ticking: false,
        costUsd: 1.5,
        steps: { 'variants:a': { workMs: 120_000, costUsd: 1.5, time: { workMs: 120_000 } } },
      },
      ledger: [
        { ...base.ledger[0]!, status: 'done', outcome: 'passed', endedAt: 120_001 },
        base.ledger[1]!,
      ],
    } as unknown as ProcessRun
    const view = processVariantLanes(costed, [], 0)
    expect(view.lanes[0]!.time).toBeDefined()
    expect(view.lanes[0]!.cost).toBeDefined()
    expect(view.lanes[1]!.time).toBeUndefined()
  })
})

describe('processVariantReport', () => {
  const report = ref('r30', { kind: 'report', label: 'Final report' })
  const post = ref('r31', { kind: 'report', label: 'The post' })
  const groups = [
    group('root', undefined, 'parked', [report, post]),
    group('c1', 'variants:a', 'succeeded', [
      ref('r2', { label: 'Second screen' }),
      ref('r1', { label: 'First screen' }),
      ref('r9', { kind: 'report', label: 'Review' }),
      ref('r4', { kind: 'report', label: 'Notes' }),
    ]),
    group('c2', 'variants:b', 'succeeded', recorded('Only screen')),
  ]

  it('tells the final report from the post', () => {
    const view = processVariantReport(run(), groups, 0)
    expect(view.reportTile?.ref.id).toBe('r30')
    expect(view.post?.ref.id).toBe('r31')
    expect(view.waiting).toBeUndefined()
    expect(view.report?.fallbackMarkdown).toContain('Finding of r30')
  })

  it('leads with what the report concluded', () => {
    const body = { outcome: { headline: 'Version B passed every check' } }
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
    expect(view.headline).toBe('Version B passed every check')
    expect(view.report?.outcome?.summary).toBe('Version B passed every check')
  })

  it('leads with the run’s name when no report is filed', () => {
    expect(processVariantReport(run(), [], 0).headline).toBe('Compare versions')
  })

  it('says how many are still to finish before the report comes', () => {
    const view = processVariantReport(
      run(),
      [group('c1', 'variants:a', 'succeeded', []), group('c2', 'variants:b', 'running', [])],
      0,
    )
    expect(view.report).toBeUndefined()
    expect(view.waiting?.sub).toBe('1 of 2 variants still to finish')
    expect(view.waiting?.line).toContain('What is filed so far is below.')
  })

  it('says so when every variant ended and no report was filed', () => {
    const view = processVariantReport(
      run(),
      [group('c1', 'variants:a', 'succeeded', []), group('c2', 'variants:b', 'failed', [])],
      0,
    )
    expect(view.waiting).toEqual({ sub: '', line: 'No final report was filed.' })
  })

  it('files each variant’s recordings and reports under it, in the order filed, by their own labels', () => {
    const view = processVariantReport(run(), groups, 0)
    const [a, b] = view.sections
    expect(a!.recordings.map((r) => [r.tile.ref.label, r.label])).toEqual([
      ['First screen', 'Proof'],
      ['Second screen', 'Proof'],
    ])
    expect(a!.findings.map((f) => f.title)).toEqual(['Notes', 'Review'])
    expect(a!.findings[0]!.text).toContain('Finding of r4')
    expect(a!.findingsNote).toBeUndefined()
    expect(a!.tiles.map((t) => t.ref.id)).toEqual(['r2', 'r1', 'r9', 'r4'])
    expect(b!.findings).toEqual([])
    expect(b!.findingsNote).toBeUndefined()
  })

  it('calls a report with no label a report', () => {
    const view = processVariantReport(
      run(),
      [group('c1', 'variants:a', 'running', [ref('r1', { kind: 'report', label: ' ' })])],
      0,
    )
    expect(view.sections[0]!.findings[0]!.title).toBe('Report')
  })

  it('says a report shows once filed while a variant works, and nothing of a section with no run', () => {
    const view = processVariantReport(
      run(),
      [group('c1', 'variants:a', 'running', recorded('First'))],
      0,
    )
    expect(view.sections[0]!.findingsNote).toBe('Shows here once one is filed.')
    expect(view.sections[1]!.tiles).toEqual([])
  })

  it('says why a recording does not count', () => {
    const view = processVariantReport(
      run(),
      [
        group('c1', 'variants:a', 'running', [
          ref('r5', { label: 'Fifth', unvouchedReason: 'Seal lost' }),
          ref('r6', { label: 'Sixth', inline: true }),
        ]),
      ],
      0,
    )
    expect(view.sections[0]!.recordings.map((r) => [r.proof, r.label, r.title])).toEqual([
      [false, 'Not proof', 'Seal lost'],
      [false, 'Not proof', ''],
    ])
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
      ['Asked', '2 variants', undefined],
      ['Proven', '3 of 3 recordings', 'Each reached the end'],
      ['Time', '—', undefined],
      ['Cost', '—', undefined],
    ])
    expect(view.tiles[1]!.tone).toBe('done')
    expect(view.verdict).toMatchObject({ key: 'proven', hollow: false })
    expect(view.tally).toEqual({ label: '3/3', title: '3 of 3 recordings count as proof' })
  })

  it('says one variant in the singular', () => {
    const one = run({ plan: { ...run().plan, steps: [run().plan.steps[0]!] } })
    expect(processVariantReport(one, [], 0).tiles[0]!.value).toBe('1 variant')
  })

  it('leaves a partial proof short of whole', () => {
    const view = processVariantReport(
      run(),
      [
        group('c1', 'variants:a', 'running', [
          ...recorded('First'),
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
      text: 'Version A: 1 of 2 recordings count',
      status: 'unproven',
      mark: '!',
    })
    expect(view.verdict.key).toBe('partly')
  })

  it('says how many fall short once every variant ended', () => {
    const view = processVariantReport(
      run(),
      [
        group('c1', 'variants:a', 'succeeded', [ref('r3', { unvouchedReason: 'x' })]),
        group('c2', 'variants:b', 'succeeded', recorded('Only')),
      ],
      0,
    )
    expect(view.tiles[1]?.sub).toBe('1 does not count')
    const two = processVariantReport(
      run(),
      [
        group('c1', 'variants:a', 'succeeded', [
          ref('r3', { unvouchedReason: 'x' }),
          ref('r4', { unvouchedReason: 'y' }),
        ]),
        group('c2', 'variants:b', 'succeeded', []),
      ],
      0,
    )
    expect(two.tiles[1]?.sub).toBe('2 do not count')
  })

  it('has nothing to count when nothing was recorded', () => {
    const view = processVariantReport(run(), [], 0)
    expect(view.verdict).toMatchObject({ key: 'not-run', hollow: true })
    expect(view.tally).toBeUndefined()
  })

  it('lines proof up per variant, each only once it filed something', () => {
    const view = processVariantReport(run(), groups, 0)
    expect(view.proofRows.map((r) => r.text)).toEqual([
      'Version A: every recording counts',
      'Version B: every recording counts',
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
    const one = processVariantLanes(run(), [group('c1', 'variants:a', 'succeeded', [])], 0)
    expect(processVariantJoinLine(one)).toBe('Waits for the rest')
  })
})
