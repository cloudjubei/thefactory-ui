import { describe, expect, it } from 'vitest'
import type {
  ModelSpend,
  ProcessLedgerEntry,
  ProcessPlanStep,
  ProcessStepTotals,
  ProcessTimeBreakdown,
} from 'thefactory-tools/types'

import { signoffCostView, signoffTimeView, signoffWorkOf } from './signoffWork'
import type { StorySignoffProcessRun } from './storySignoffTypes'
import type { SignoffWork, SignoffWorkScope } from './signoffWorkTypes'

const MIN = 60_000

function time(parts: Partial<ProcessTimeBreakdown> = {}): ProcessTimeBreakdown {
  return {
    thinkingMs: 0,
    toolMs: 0,
    systemMs: 0,
    otherMs: 0,
    runningMs: 0,
    waitingMs: 0,
    tools: [],
    ...parts,
  }
}

function spend(model: string, billing: ModelSpend['billing'], list: number): ModelSpend {
  return {
    provider: 'anthropic',
    model,
    billing,
    inputTokens: 10,
    outputTokens: 20,
    cacheReadTokens: 30,
    cacheWriteTokens: 40,
    costUsd: billing === 'metered' ? list : 0,
    listCostUsd: list,
  }
}

function stepTotals(
  workMs: number,
  parts: Partial<ProcessTimeBreakdown> = {},
  byModel: ModelSpend[] = [],
): ProcessStepTotals {
  const list = byModel.reduce((n, s) => n + (s.listCostUsd ?? 0), 0)
  const cost = byModel.reduce((n, s) => n + (s.costUsd ?? 0), 0)
  return {
    workMs,
    time: time(parts),
    attempts: [],
    ...(byModel.length > 0 ? { byModel, listCostUsd: list, costUsd: cost } : {}),
  }
}

const step = (id: string, name: string, kind: ProcessPlanStep['kind'], agentType?: string) =>
  ({ id, name, kind, ...(agentType ? { agentType } : {}) }) as ProcessPlanStep

const entry = (stepId: string, withRun: boolean, n = 0) =>
  ({
    id: `${stepId}-${n}`,
    stepId,
    iteration: n,
    status: 'done',
    startedAt: 0,
    ...(withRun ? { runRef: { runId: `${stepId}-run-${n}` } } : {}),
  }) as ProcessLedgerEntry

function run(
  id: string,
  steps: ProcessPlanStep[],
  totals: Record<string, ProcessStepTotals> | undefined,
  ledger: ProcessLedgerEntry[],
  waitingMs = 0,
): StorySignoffProcessRun {
  return {
    id,
    plan: { steps } as StorySignoffProcessRun['plan'],
    ledger,
    startedAt: 0,
    ...(totals
      ? {
          totals: {
            workMs: 0,
            time: time({ waitingMs }),
            ticking: false,
            at: 0,
            steps: totals,
          },
        }
      : {}),
  }
}

const opus = (list: number) => spend('claude-opus-5-5', 'subscription', list)
const OPUS = { runner: 'cli' as const, cli: 'claude-code', model: 'opus' }
const SONNET = { runner: 'cli' as const, cli: 'claude-code', model: 'sonnet' }

const featureA = run(
  'fa',
  [
    step('implement', 'Implement', 'agent', 'developer'),
    step('checks', 'Checks', 'check'),
    step('code-review', 'Code review', 'judge'),
    step('verify', 'Verify', 'agent', 'verifier'),
  ],
  {
    implement: stepTotals(30 * MIN, { thinkingMs: 10 * MIN, toolMs: 12 * MIN, systemMs: 5 * MIN }, [
      opus(4),
    ]),
    checks: stepTotals(20 * MIN, { systemMs: 20 * MIN }),
    'code-review': stepTotals(10 * MIN, { thinkingMs: 6 * MIN, systemMs: 4 * MIN }, [opus(2)]),
    verify: stepTotals(10 * MIN, { thinkingMs: 5 * MIN, toolMs: 5 * MIN }, [opus(1.5)]),
  },
  [
    entry('implement', true),
    entry('implement', true, 1),
    entry('checks', false),
    entry('code-review', true),
    entry('verify', true),
    entry('verify', false, 1),
  ],
  2 * MIN,
)

const featureB = run(
  'fb',
  [step('implement', 'Implement', 'agent', 'developer'), step('report', 'Report', 'report')],
  { implement: stepTotals(10 * MIN, { thinkingMs: 10 * MIN }, [opus(1)]) },
  [entry('implement', true), entry('report', true)],
)

const storyRun = run(
  'story',
  [
    step('features:a', 'Feature A', 'process'),
    step('report', 'Report', 'report'),
    step('fix', 'Fix', 'process'),
    step('sign-off', 'Sign-off', 'gate'),
  ],
  {
    'features:a': stepTotals(70 * MIN, { thinkingMs: 70 * MIN }),
    report: stepTotals(5 * MIN, { thinkingMs: 2 * MIN }, [opus(0.5)]),
    'sign-off': stepTotals(0, { waitingMs: 600 * MIN }),
  },
  [entry('features:a', false), entry('report', true), entry('sign-off', false)],
  600 * MIN,
)

const scope = (over: Partial<SignoffWorkScope> = {}): SignoffWorkScope => ({
  storyRun,
  featureRuns: new Map([
    ['a', featureA],
    ['b', featureB],
  ]),
  fixPasses: [],
  ...over,
})

describe('signoffWorkOf', () => {
  it('is nothing without a scope', () => {
    expect(signoffWorkOf(undefined)).toBeUndefined()
  })

  it('is nothing when none of the runs carries totals', () => {
    const bare = run('x', [step('implement', 'Implement', 'agent')], undefined, [])
    expect(
      signoffWorkOf({ storyRun: bare, featureRuns: new Map([['a', bare]]), fixPasses: [] }),
    ).toBeUndefined()
  })

  it('adds up each step by its name across the runs, the story run’s nested and gate steps left out', () => {
    const work = signoffWorkOf(scope())!
    expect(work.steps.map((s) => [s.label, s.workMs / MIN])).toEqual([
      ['Implement', 40],
      ['Checks', 20],
      ['Code review', 10],
      ['Verify', 10],
      ['Report', 5],
    ])
    expect(work.workMs).toBe(85 * MIN)
  })

  it('counts a checks step’s time as checks, whatever part the totals put it in', () => {
    const checks = signoffWorkOf(scope())!.steps.find((s) => s.label === 'Checks')!
    expect(checks.parts).toEqual({ thinking: 0, tools: 0, system: 0, checks: 20 * MIN, other: 0 })
  })

  it('puts work no part placed in other, so the parts add up to the step', () => {
    const report = signoffWorkOf(scope())!.steps.find((s) => s.label === 'Report')!
    expect(report.parts).toEqual({
      thinking: 2 * MIN,
      tools: 0,
      system: 0,
      checks: 0,
      other: 3 * MIN,
    })
  })

  it('puts a step whose totals say nothing of where its time went all in other', () => {
    const old = run(
      'old',
      [step('implement', 'Implement', 'agent', 'developer')],
      { implement: { workMs: 7 * MIN, attempts: [] } as unknown as ProcessStepTotals },
      [entry('implement', true)],
    )
    const work = signoffWorkOf({
      storyRun: undefined,
      featureRuns: new Map([['a', old]]),
      fixPasses: [],
    })!
    expect(work.steps[0].parts).toEqual({
      thinking: 0,
      tools: 0,
      system: 0,
      checks: 0,
      other: 7 * MIN,
    })
  })

  it('reads waiting from every run’s parks, never from a step', () => {
    expect(signoffWorkOf(scope())!.waitingMs).toBe(602 * MIN)
  })

  it('reads the fix passes’ runs too', () => {
    const fix = run(
      'fix1',
      [step('implement', 'Implement', 'agent', 'fixer')],
      { implement: stepTotals(4 * MIN, { toolMs: 4 * MIN }, [opus(0.25)]) },
      [entry('implement', true)],
      MIN,
    )
    const work = signoffWorkOf(
      scope({
        fixPasses: [{ run: fix, pass: 1, stepName: 'Fix', sentBy: undefined, note: undefined }],
      }),
    )!
    expect(work.steps[0]).toMatchObject({ label: 'Implement', workMs: 44 * MIN })
    expect(work.roles.find((r) => r.role === 'fixer')).toMatchObject({ runs: 1 })
    expect(work.waitingMs).toBe(603 * MIN)
  })

  it('splits spend by agent role, priciest first, counting the agent runs each started', () => {
    const work = signoffWorkOf(scope())!
    expect(work.roles.map((r) => [r.role, r.runs, r.cost?.listCostUsd])).toEqual([
      ['developer', 3, 5],
      ['judge', 1, 2],
      ['verifier', 1, 1.5],
      ['report', 2, 0.5],
    ])
    expect(work.agentRuns).toBe(7)
    expect(work.cost?.listCostUsd).toBe(9)
  })

  it('names the model a record ran on by its spend when it kept no launch', () => {
    const work = signoffWorkOf(scope())!
    expect(work.models).toEqual([
      { tool: undefined, tag: 'CLI', model: 'claude-opus-5-5', effort: undefined },
    ])
    expect(work.roles[0].models).toEqual(work.models)
  })

  it('names each attempt on the model it was launched on, the earlier model kept after a switch', () => {
    const before = { ...entry('implement', true), model: OPUS, cost: { byModel: [opus(1)] } }
    const after = {
      ...entry('implement', true, 1),
      model: SONNET,
      cost: { byModel: [spend('claude-sonnet-5', 'subscription', 1)] },
    }
    const switched = {
      ...run(
        'sw',
        [step('implement', 'Implement', 'agent', 'developer')],
        { implement: stepTotals(4 * MIN, {}, [opus(1)]) },
        [before, after],
      ),
      input: { runner: 'cli', cliRunner: { cli: 'claude-code', model: 'opus' } },
    }
    const work = signoffWorkOf({
      storyRun: undefined,
      featureRuns: new Map([['a', switched]]),
      fixPasses: [],
    })!
    expect(work.models.map((m) => [m.tag, m.tool, m.model, m.requested])).toEqual([
      ['CLI', 'claude-code', 'claude-opus-5-5', 'opus'],
      ['CLI', 'claude-code', 'claude-sonnet-5', 'sonnet'],
    ])
  })

  it('names a step on its launch’s model when its attempts kept no spend of their own', () => {
    const launched = {
      ...run(
        'l',
        [step('implement', 'Implement', 'agent', 'developer')],
        { implement: stepTotals(4 * MIN, {}, [opus(1)]) },
        [entry('implement', true)],
      ),
      input: { runner: 'cli', cliRunner: { cli: 'claude-code', model: 'opus' } },
    }
    const work = signoffWorkOf({
      storyRun: undefined,
      featureRuns: new Map([['a', launched]]),
      fixPasses: [],
    })!
    expect(work.roles[0].models).toEqual([
      {
        tool: 'claude-code',
        tag: 'CLI',
        model: 'claude-opus-5-5',
        requested: 'opus',
        effort: undefined,
      },
    ])
  })

  it('names a step that priced nothing on the model it was launched on', () => {
    const launched = {
      ...run(
        'l',
        [step('implement', 'Implement', 'agent', 'developer')],
        { implement: stepTotals(4 * MIN) },
        [entry('implement', true)],
      ),
      input: { runner: 'cli', cliRunner: { cli: 'codex', model: 'gpt-5' } },
    }
    const work = signoffWorkOf({
      storyRun: undefined,
      featureRuns: new Map([['a', launched]]),
      fixPasses: [],
    })!
    expect(work.models).toEqual([{ tool: 'codex', tag: 'CLI', model: 'gpt-5', effort: undefined }])
  })
})

const work = (over: Partial<SignoffWork> = {}): SignoffWork => ({
  ...signoffWorkOf(scope())!,
  ...over,
})

describe('signoffTimeView', () => {
  it('says the work, its bar, and the waiting apart from it', () => {
    const view = signoffTimeView(work())!
    expect(view.headline).toBe('1h 25m of work')
    expect(view.waiting).toBe('+ 10h 02m waiting for you')
    expect(view.waitingLegend).toBe('Waiting for you 10h 02m (not counted)')
    expect(view.segments.reduce((n, s) => n + s.fraction, 0)).toBeCloseTo(1)
  })

  it('lists in the legend only the parts that have time, in bar order', () => {
    expect(signoffTimeView(work())!.legend.map((s) => [s.label, s.value])).toEqual([
      ['Agents thinking', '33m 00s'],
      ['Agents’ tools', '17m 00s'],
      ['System', '9m 00s'],
      ['Checks', '20m 00s'],
      ['Not accounted for', '6m 00s'],
    ])
  })

  it('draws every step’s bar on the whole sign-off’s scale', () => {
    const rows = signoffTimeView(work())!.rows
    expect(rows.map((r) => [r.label, r.total])).toEqual([
      ['Implement', '40m 00s'],
      ['Checks', '20m 00s'],
      ['Code review', '10m 00s'],
      ['Verify', '10m 00s'],
      ['Report', '5m 00s'],
    ])
    const checks = rows[1].segments
    expect(checks).toEqual([
      { part: 'checks', label: 'Checks', value: '20m 00s', fraction: 20 / 85 },
    ])
  })

  it('says no waiting when nobody was waited on', () => {
    const view = signoffTimeView(work({ waitingMs: 0 }))!
    expect(view.waiting).toBeUndefined()
    expect(view.waitingLegend).toBeUndefined()
  })

  it('is nothing when there is neither work nor waiting', () => {
    expect(signoffTimeView(work({ steps: [], workMs: 0, waitingMs: 0 }))).toBeUndefined()
  })
})

describe('signoffCostView', () => {
  it('says what was billed, how, the list price, and the runs and models behind it', () => {
    const view = signoffCostView(work())!
    expect(view.headline).toBe('$0.00 billed')
    expect(view.billing).toBe('subscription · list price $9.00')
    expect(view.runs).toBe('7 agent runs')
    expect(view.models.map((m) => m.model)).toEqual(['claude-opus-5-5'])
    expect(view.note).toMatch(/^Billed on your subscription/)
  })

  it('breaks the list price down by agent role, bars on the priciest one’s scale', () => {
    expect(signoffCostView(work())!.rows.map(({ models: _models, ...row }) => row)).toEqual([
      { key: 'developer', label: 'Developer · 3 runs', amount: '$5.00', fraction: 1 },
      { key: 'judge', label: 'Code reviewer · 1 run', amount: '$2.00', fraction: 0.4 },
      { key: 'verifier', label: 'Verifier · 1 run', amount: '$1.50', fraction: 0.3 },
      { key: 'report', label: 'Report writer · 2 runs', amount: '$0.50', fraction: 0.1 },
    ])
  })

  it('names the models each role ran on as chips, never as a raw id in the label', () => {
    const sonnet = { tool: 'claude-code', tag: 'CLI' as const, model: 'sonnet', effort: undefined }
    const roles = work().roles.map((r) => (r.role === 'judge' ? { ...r, models: [sonnet] } : r))
    const rows = signoffCostView(work({ roles }))!.rows
    expect(rows.find((r) => r.key === 'judge')?.models).toEqual([sonnet])
    expect(rows.every((r) => !r.label.includes('claude'))).toBe(true)
  })

  it('shows a single agent run’s model and token split instead of roles', () => {
    const cost = { byModel: [opus(1)], listCostUsd: 1, costUsd: 0 }
    const view = signoffCostView(
      work({ agentRuns: 1, cost, roles: [{ role: 'developer', runs: 1, cost, models: [] }] }),
    )!
    expect(view.rows).toEqual([])
    expect(view.runs).toBe('1 agent run')
    expect(view.tokens).toEqual({
      model: { tool: undefined, tag: 'CLI', model: 'claude-opus-5-5', effort: undefined },
      rows: [
        { label: 'Input', value: '10' },
        { label: 'Output', value: '20' },
        { label: 'Cache read', value: '30' },
        { label: 'Cache write', value: '40' },
      ],
    })
  })

  it('says the billing is mixed when a subscription and an API key both paid', () => {
    const cost = {
      byModel: [opus(1), spend('gpt-6', 'metered', 2)],
      listCostUsd: 3,
      costUsd: 2,
    }
    const view = signoffCostView(work({ cost }))!
    expect(view.headline).toBe('$2.00 billed')
    expect(view.billing).toBe('mixed billing · list price $3.00')
    expect(view.models.map((m) => m.model)).toEqual(['claude-opus-5-5'])
    expect(view.note).toMatch(/^Part of this ran on a subscription/)
  })

  it('is nothing when no cost was measured', () => {
    expect(signoffCostView(work({ cost: undefined }))).toBeUndefined()
  })

  it('names the priced models when the work kept none of its own', () => {
    const cost = { byModel: [opus(1), spend('gpt-6', 'metered', 2)], listCostUsd: 3, costUsd: 2 }
    expect(signoffCostView(work({ cost, models: [] }))!.models).toEqual([
      { tool: undefined, tag: 'CLI', model: 'claude-opus-5-5', effort: undefined },
      { tool: undefined, tag: 'API', model: 'gpt-6', effort: undefined },
    ])
  })

  it('shows a single run’s tokens under the model it ran on', () => {
    const cost = { byModel: [opus(1)], listCostUsd: 1, costUsd: 0 }
    const ran = {
      tool: 'claude-code',
      tag: 'CLI' as const,
      model: 'claude-opus-5-5',
      effort: undefined,
    }
    const view = signoffCostView(
      work({
        agentRuns: 1,
        cost,
        models: [ran],
        roles: [{ role: 'developer', runs: 1, cost, models: [ran] }],
      }),
    )!
    expect(view.tokens?.model).toEqual(ran)
  })
})
