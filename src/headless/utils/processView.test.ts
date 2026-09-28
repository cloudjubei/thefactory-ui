import { describe, expect, it } from 'vitest'
import type { ProcessRun, ProcessStepOutcome } from 'thefactory-tools/types'
import { AGENT_RUN_TYPES, PROCESS_STEP_KINDS } from 'thefactory-tools/constants'
import {
  PROCESS_OUTCOME_VIEW,
  PROCESS_RUN_STATUS_VIEW,
  processRunChipLabel,
  processStepTone,
  processRunSpend,
  PROCESS_KIND_BLURB,
  copyProcessDefinition,
  blankProcessDefinition,
  blankProcessStep,
  isProcessFork,
  parkedRunRef,
  processStepName,
  processRunChain,
  processScopeLabel,
  processNodeState,
  processNodeTone,
  processNodeGlyph,
  formatProcessDuration,
  processIterationBadge,
  processRunBadge,
  processRunCardView,
  hasIsolatedAttempts,
  verifyReviewStatus,
  processAttemptLeaf,
  processLeafReview,
  isProcessLeafOpenable,
  latestOpenableAttempt,
  PROCESS_LIVE_TONE,
  processNodeLook,
  processNodeBadge,
  processNodeSummary,
  processRunWorkMs,
  processRunWorkLabel,
  processStepWorkMs,
  processStepCostLabel,
  processStepCostTitle,
} from './processView'

const TOKEN_STATUSES = [
  'empty',
  'done',
  'working',
  'stuck',
  'blocked',
  'queued',
  'on_hold',
  'review',
] as const

function run(over: Partial<ProcessRun> = {}): ProcessRun {
  return {
    id: 'r',
    projectId: 'p',
    title: 'Story',
    plan: {
      definitionId: 'd',
      definitionScope: 'global',
      definitionVersion: 1,
      name: 'D',
      steps: [
        { id: 'a', name: 'A', kind: 'agent', agentType: 'developer' },
        { id: 'b', name: 'B', kind: 'report' },
      ],
      loops: [],
      frozenAt: 0,
    },
    status: 'running',
    loopCounts: {},
    ledger: [],
    startedAt: 0,
    updatedAt: 0,
    ...over,
  }
}

const passed = (stepId: string) => ({
  id: stepId,
  stepId,
  iteration: 1,
  status: 'done' as const,
  outcome: 'passed' as const,
  startedAt: 0,
})

describe('PROCESS_OUTCOME_VIEW', () => {
  it('only ever names a status the package has tokens for', () => {
    for (const [outcome, view] of Object.entries(PROCESS_OUTCOME_VIEW)) {
      expect(TOKEN_STATUSES, outcome).toContain(view.tone)
    }
  })

  it('keeps "nothing checked" visually distinct from "did not pass"', () => {
    expect(PROCESS_OUTCOME_VIEW.unchecked.tone).not.toBe(PROCESS_OUTCOME_VIEW.failed.tone)
  })

  it('covers every outcome the engine can produce', () => {
    const outcomes: ProcessStepOutcome[] = ['passed', 'failed', 'unchecked', 'skipped', 'errored']
    for (const outcome of outcomes) expect(PROCESS_OUTCOME_VIEW[outcome]).toBeDefined()
  })
})

describe('PROCESS_RUN_STATUS_VIEW', () => {
  it('only ever names a status the package has tokens for', () => {
    for (const [status, view] of Object.entries(PROCESS_RUN_STATUS_VIEW)) {
      expect(TOKEN_STATUSES, status).toContain(view.tone)
    }
  })

  it('says a parked run is waiting for the user rather than that it is running', () => {
    expect(PROCESS_RUN_STATUS_VIEW.parked.label).toMatch(/waiting for you/i)
  })

  it('shows a running run in the SAME green as a finished one — live work is good news', () => {
    expect(PROCESS_RUN_STATUS_VIEW.running.tone).toBe(PROCESS_LIVE_TONE)
    expect(PROCESS_LIVE_TONE).toBe(PROCESS_RUN_STATUS_VIEW.succeeded.tone)
  })
})

describe('processStepTone', () => {
  it('leaves a step that has not run without emphasis', () => {
    expect(processStepTone('pending', undefined)).toBe('empty')
  })

  it('shows a running step in the live green, whatever a previous attempt ended as', () => {
    expect(processStepTone('running', 'failed')).toBe(PROCESS_LIVE_TONE)
  })

  it('takes its tone from the outcome once the step is done', () => {
    expect(processStepTone('done', 'passed')).toBe('done')
    expect(processStepTone('done', 'errored')).toBe('stuck')
  })

  it('does not claim a done step succeeded when it recorded no outcome', () => {
    expect(processStepTone('done', undefined)).toBe('empty')
  })
})

describe('processRunChipLabel', () => {
  it('says a decision is pending, and NOT which one — that belongs in the pipeline', () => {
    const label = processRunChipLabel(
      run({ status: 'parked', park: { reason: 'gate', message: 'Sign off?', parkedAt: 0 } }),
    )
    expect(label).toMatch(/decision is pending/i)
    expect(label).not.toMatch(/sign off/i)
  })

  it('counts only the steps that actually got past', () => {
    expect(processRunChipLabel(run({ ledger: [passed('a')] }))).toBe('Running · 1/2 steps')
  })

  it('reads as finished for a succeeded run', () => {
    expect(processRunChipLabel(run({ status: 'succeeded' }))).toMatch(/^Finished/)
  })

  it('reads as stopped for a failed run', () => {
    expect(processRunChipLabel(run({ status: 'failed' }))).toMatch(/^Stopped/)
  })

  it('says only "Cancelled" — a step count on abandoned work is noise', () => {
    expect(processRunChipLabel(run({ status: 'cancelled' }))).toBe('Cancelled')
  })
})

describe('the question outcome', () => {
  it('reads as a question rather than a failure', () => {
    expect(PROCESS_OUTCOME_VIEW.question.label).toMatch(/question/i)
  })

  it('is visually distinct from both a failure and an unmeasured step', () => {
    expect(PROCESS_OUTCOME_VIEW.question.tone).not.toBe(PROCESS_OUTCOME_VIEW.failed.tone)
    expect(PROCESS_OUTCOME_VIEW.question.tone).not.toBe(PROCESS_OUTCOME_VIEW.unchecked.tone)
  })

  it('does not count toward progress', () => {
    const ledger = [
      {
        id: 'a',
        stepId: 'a',
        iteration: 1,
        status: 'done' as const,
        outcome: 'question' as const,
        startedAt: 0,
      },
    ]
    expect(processRunChipLabel(run({ ledger }))).toBe('Running · 0/2 steps')
  })
})

describe('processRunSpend', () => {
  const totals = (over: Partial<NonNullable<ProcessRun['totals']>> = {}) => ({
    workMs: 0,
    ticking: false,
    at: 0,
    steps: {},
    ...over,
  })

  it('says nothing for a run that was never capped and never measured', () => {
    expect(processRunSpend(run({ totals: totals() }))).toBeUndefined()
  })

  it('shows spend against the cap', () => {
    const r = run({ budget: { spendUsdCap: 5 }, totals: totals({ costUsd: 1.5 }) })
    expect(processRunSpend(r)?.label).toBe('$1.50 of $5.00')
  })

  it('folds a granted raise into the ceiling, and says it was raised', () => {
    const r = run({
      budget: { spendUsdCap: 5 },
      budgetGrants: { spendUsdCap: 5 },
      totals: totals({ costUsd: 6 }),
    })
    expect(processRunSpend(r)?.label).toBe('$6.00 of $10.00 (raised)')
  })

  it('shows spend alone when the run is uncapped', () => {
    expect(processRunSpend(run({ totals: totals({ costUsd: 2 }) }))?.label).toBe('$2.00')
  })

  it('reads a capped run that has spent nothing yet as zero, not unknown', () => {
    expect(processRunSpend(run({ budget: { spendUsdCap: 5 }, totals: totals() }))?.label).toBe(
      '$0.00 of $5.00',
    )
  })

  it('reads the ledger totals, not the counter the driver stamps between steps', () => {
    const r = run({ spentUsd: 0.19, totals: totals({ costUsd: 30.25 }) })
    expect(processRunSpend(r)?.spent).toBe(30.25)
  })

  it('keeps the chip to dollars: unpriced tokens belong in its details, never on it', () => {
    const r = run({ totals: totals({ costUsd: 0.5, unpricedTokens: 12_345 }) })
    expect(processRunSpend(r)?.label).toBe('$0.50')
    expect(processRunSpend(run({ totals: totals({ unpricedTokens: 800 }) }))?.label).toBe(
      'No known price',
    )
  })

  it('keeps the cap label dollars only, whatever went unpriced', () => {
    const r = run({
      budget: { spendUsdCap: 5 },
      totals: totals({ costUsd: 1.5, unpricedTokens: 12_345 }),
    })
    expect(processRunSpend(r)?.label).toBe('$1.50 of $5.00')
  })

  it('shows a run a subscription covered as a real $0.00', () => {
    const r = run({ totals: totals({ costUsd: 0, includedTokens: 1_308_171 }) })
    expect(processRunSpend(r)?.label).toBe('$0.00')
  })

  it("never reads a capped run's unknown charge as the $0.00 a plan-covered run shows", () => {
    const unpriced = {
      provider: 'openai',
      model: 'gpt-5.5-codex',
      billing: 'metered' as const,
      inputTokens: 40_120,
      outputTokens: 3_010,
      cacheReadTokens: 6_870,
      cacheWriteTokens: 0,
    }
    const capped = run({
      budget: { spendUsdCap: 5 },
      totals: totals({ unpricedTokens: 50_000, byModel: [unpriced] }),
    })
    expect(processRunSpend(capped)).toEqual({
      cap: 5,
      label: 'No known price · cap $5.00',
      title: 'Spent against the cap',
    })
    const raised = run({
      budget: { spendUsdCap: 5 },
      budgetGrants: { spendUsdCap: 5 },
      totals: totals({ unpricedTokens: 50_000, byModel: [unpriced] }),
    })
    expect(processRunSpend(raised)?.label).toBe('No known price · cap $10.00 (raised)')
    const covered = run({
      budget: { spendUsdCap: 5 },
      totals: totals({ costUsd: 0, includedTokens: 50_000 }),
    })
    expect(processRunSpend(covered)?.label).toBe('$0.00 of $5.00')
  })

  it('titles its details by whether a cap stands against the spend', () => {
    expect(processRunSpend(run({ totals: totals({ costUsd: 2 }) }))?.title).toBe('Spent so far')
    expect(
      processRunSpend(run({ budget: { spendUsdCap: 5 }, totals: totals({ costUsd: 2 }) }))?.title,
    ).toBe('Spent against the cap')
  })
})

describe('processStepCostTitle', () => {
  it('names the step, and every attempt when there was more than one', () => {
    expect(processStepCostTitle('Verify', 1)).toBe('Verify')
    expect(processStepCostTitle('Verify', 3)).toBe('Verify · all 3 attempts')
  })
})

describe('run and step work time', () => {
  const MIN = 60_000
  const verifyStep = { id: 'b', name: 'Verify', kind: 'agent' as const, agentType: 'developer' }
  const gateStep = { id: 'g', name: 'Sign-off', kind: 'gate' as const }
  const attempts = (...ms: number[]) => ms.map((workMs, i) => ({ entryId: `e${i}`, workMs }))

  it('is the ledger total when nothing is running, whatever the clock says', () => {
    const r = run({ totals: { workMs: 9 * MIN, ticking: false, at: 100, steps: {} } })
    expect(processRunWorkMs(r, 100 + 60 * MIN)).toBe(9 * MIN)
  })

  it('carries the clock on from when the totals were read while a step runs', () => {
    const r = run({ totals: { workMs: 9 * MIN, ticking: true, at: 100, steps: {} } })
    expect(processRunWorkMs(r, 100 + 2 * MIN)).toBe(11 * MIN)
  })

  it('is unknown for a run read without totals', () => {
    expect(processRunWorkMs(run(), 0)).toBeUndefined()
    expect(processRunWorkLabel(run(), 0)).toBeUndefined()
  })

  it('labels the live work time', () => {
    const r = run({ totals: { workMs: 9 * MIN, ticking: true, at: 0, steps: {} } })
    expect(processRunWorkLabel(r, 90_000)).toBe('10m 30s')
  })

  it('sums EVERY attempt of a step — three verifier runs, not the last one', () => {
    const r = run({
      totals: {
        workMs: 43 * MIN,
        ticking: false,
        at: 0,
        steps: { b: { workMs: 43 * MIN, attempts: attempts(21 * MIN, 13 * MIN, 9 * MIN) } },
      },
    })
    const state = { step: verifyStep, latest: { status: 'done' as const } }
    expect(processStepWorkMs(r, state, 99 * MIN)).toBe(43 * MIN)
  })

  it('ticks only the step whose attempt is running, on top of its earlier attempts', () => {
    const r = run({
      totals: {
        workMs: 38 * MIN,
        ticking: true,
        at: 10,
        steps: {
          a: { workMs: 8 * MIN, attempts: attempts(8 * MIN) },
          b: { workMs: 30 * MIN, attempts: attempts(21 * MIN, 9 * MIN) },
        },
      },
    })
    const running = { step: verifyStep, latest: { status: 'running' as const } }
    const finished = { step: { ...verifyStep, id: 'a' }, latest: { status: 'done' as const } }
    expect(processStepWorkMs(r, running, 10 + MIN)).toBe(31 * MIN)
    expect(processStepWorkMs(r, finished, 10 + MIN)).toBe(8 * MIN)
  })

  it('is unknown for a step that has not run', () => {
    const r = run({ totals: { workMs: 0, ticking: false, at: 0, steps: {} } })
    expect(processStepWorkMs(r, { step: verifyStep }, 0)).toBeUndefined()
  })

  it('never ticks a gate: waiting on a person is not work', () => {
    const r = run({
      totals: {
        workMs: 0,
        ticking: false,
        at: 0,
        steps: { g: { workMs: 0, attempts: attempts(0) } },
      },
    })
    const waiting = { step: gateStep, latest: { status: 'running' as const } }
    expect(processStepWorkMs(r, waiting, 5 * MIN)).toBe(0)
  })

  it("labels a step's spend across its attempts", () => {
    const r = run({
      totals: {
        workMs: 0,
        ticking: false,
        at: 0,
        steps: { b: { workMs: 0, costUsd: 1.25, unpricedTokens: 4_000, attempts: attempts(0, 0) } },
      },
    })
    expect(processStepCostLabel(r, 'b')).toBe('$1.25')
    expect(processStepCostLabel(r, 'a')).toBeUndefined()
  })
})

describe('processRunChain', () => {
  it('reads as the chain a user would describe out loud', () => {
    expect(processRunChain(run())).toBe('A → B')
  })

  it('says so rather than returning an empty string for a plan with no steps', () => {
    // Reachable: `no-steps` is a real park reason, so a run whose plan froze to
    // zero steps exists and this is its chip's second line.
    const empty = run()
    empty.plan.steps = []
    expect(processRunChain(empty)).toBe('No steps')
  })
})

describe('parkedRunRef', () => {
  const entry = (stepId: string, runRef?: { runId: string; chatContextId?: string }) => ({
    id: stepId,
    stepId,
    iteration: 1,
    status: 'done' as const,
    startedAt: 0,
    ...(runRef ? { runRef } : {}),
  })

  it('finds the run the parked step owns', () => {
    const r = run({
      park: { reason: 'step-question', stepId: 'a', message: '', parkedAt: 0 },
      ledger: [entry('a', { runId: 'r1', chatContextId: '/projects/p/stories/s' })],
    })
    expect(parkedRunRef(r)?.runId).toBe('r1')
  })

  it('takes the NEWEST attempt when a step ran more than once', () => {
    const r = run({
      park: { reason: 'step-question', stepId: 'a', message: '', parkedAt: 0 },
      ledger: [
        entry('a', { runId: 'old', chatContextId: '/x' }),
        entry('a', { runId: 'new', chatContextId: '/y' }),
      ],
    })
    expect(parkedRunRef(r)?.runId).toBe('new')
  })

  it('refuses a ref with no chat to open — a CTA that does nothing is worse than none', () => {
    const r = run({
      park: { reason: 'step-question', stepId: 'a', message: '', parkedAt: 0 },
      ledger: [entry('a', { runId: 'r1' })],
    })
    expect(parkedRunRef(r)).toBeUndefined()
  })

  it('ignores a run belonging to a different step', () => {
    const r = run({
      park: { reason: 'step-question', stepId: 'a', message: '', parkedAt: 0 },
      ledger: [entry('b', { runId: 'r1', chatContextId: '/x' })],
    })
    expect(parkedRunRef(r)).toBeUndefined()
  })

  it('finds nothing when the run is not parked', () => {
    expect(
      parkedRunRef(run({ ledger: [entry('a', { runId: 'r1', chatContextId: '/x' })] })),
    ).toBeUndefined()
  })
})

describe('the editor helpers both peers share', () => {
  it('describes every step kind the engine declares', () => {
    for (const kind of PROCESS_STEP_KINDS) {
      expect(PROCESS_KIND_BLURB[kind], kind).toBeTruthy()
    }
  })

  it('labels a project copy of a shared process as an override', () => {
    const d = { id: 'x', name: 'X', steps: [], loops: [], version: 1, updatedAt: 0 }
    expect(processScopeLabel({ ...d, scope: 'project', shadowsGlobal: true })).toBe(
      'OVERRIDES SHARED',
    )
    expect(processScopeLabel({ ...d, scope: 'project' })).toBe('THIS PROJECT')
    expect(processScopeLabel({ ...d, scope: 'global' })).toBe('SHARED')
  })

  it('resets the version on a copy — it has no history of its own', () => {
    const original = {
      id: 'feature-default',
      name: 'Feature',
      steps: [],
      loops: [],
      version: 7,
      updatedAt: 0,
    }
    expect(copyProcessDefinition(original)).toMatchObject({
      id: 'feature-default-copy',
      name: 'Feature (copy)',
      version: 1,
    })
  })

  it('names a step by its display name, falling back to the id it cannot find', () => {
    // A loop is described as "Verify → Implement". A missing id printed raw is
    // still the truth about a definition whose loop points nowhere.
    const d = {
      id: 'x',
      name: 'X',
      steps: [{ id: 'verify', name: 'Verify', kind: 'agent' as const }],
      loops: [],
      version: 1,
      updatedAt: 0,
    }
    expect(processStepName(d, 'verify')).toBe('Verify')
    expect(processStepName(d, 'ghost')).toBe('ghost')
  })

  it('builds a blank step the editor can save without further edits', () => {
    const step = blankProcessStep(2)
    expect(step).toEqual({ id: 'step-2', name: 'Step 2', kind: 'agent', agentType: 'developer' })
    // The default role has to be a REAL one: an agent step naming a role that
    // does not exist is refused at execution time.
    expect(AGENT_RUN_TYPES).toContain(step.agentType)
  })

  it('builds a blank definition that already has one step, not an empty plan', () => {
    // A plan that froze to zero steps parks immediately on `no-steps`, so the
    // editor's "new" must not start there.
    const blank = blankProcessDefinition()
    expect(blank.steps).toHaveLength(1)
    expect(blank.version).toBe(1)
    expect(blank.loops).toEqual([])
    expect(blank.id).toBe('')
  })

  it('keeps saying "this will fork" while the user renames the id mid-edit', () => {
    // A lookup-based rule made the explanation vanish at exactly the moment the
    // user was doing the thing it explains.
    const draft = {
      id: 'renamed-by-the-user',
      name: 'X',
      steps: [],
      loops: [],
      version: 1,
      updatedAt: 0,
      scope: 'global' as const,
    }
    expect(isProcessFork(draft)).toBe(true)
  })
})

describe('processNodeState', () => {
  const st = (
    over: Partial<{
      status: 'pending' | 'running' | 'done'
      outcome: ProcessStepOutcome
      requeued: boolean
    }>,
  ) => ({
    step: { id: 'x' },
    status: over.status ?? 'done',
    outcome: over.outcome,
    requeued: over.requeued ?? false,
  })

  it('reads a step a retry has gone back over as coming NEXT — not as the failure it no longer is', () => {
    expect(processNodeState(st({ outcome: 'failed', requeued: true }), undefined)).toBe('requeued')
  })

  it('still reads a step the run is parked on as parked, requeued or not', () => {
    expect(processNodeState(st({ outcome: 'failed', requeued: true }), 'x')).toBe('parked')
  })

  it('marks the parked step parked, above every other signal', () => {
    // Even a step recorded as running reads as parked when the run sits on it.
    expect(processNodeState(st({ status: 'running' }), 'x')).toBe('parked')
  })

  it('reads running / pending / passed straight through', () => {
    expect(processNodeState(st({ status: 'running' }), undefined)).toBe('working')
    expect(processNodeState(st({ status: 'pending' }), undefined)).toBe('queued')
    expect(processNodeState(st({ status: 'done', outcome: 'passed' }), undefined)).toBe('done')
  })

  it('treats failed, errored and unchecked as a failed node — none of them is "done"', () => {
    for (const outcome of ['failed', 'errored', 'unchecked'] as const) {
      expect(processNodeState(st({ status: 'done', outcome }), undefined)).toBe('failed')
    }
  })

  it('keeps a skipped step distinct from a passed one', () => {
    expect(processNodeState(st({ status: 'done', outcome: 'skipped' }), undefined)).toBe('skipped')
  })
})

describe('processNodeTone', () => {
  it('a parked GATE is ready-for-you (review); any other park is waiting (on-hold)', () => {
    expect(processNodeTone('parked', true)).toBe('review')
    expect(processNodeTone('parked', false)).toBe('on_hold')
  })

  it('draws a requeued step as queued — never the red of a failure', () => {
    expect(processNodeTone('requeued', false)).toBe('queued')
  })

  it('draws a working step in the live green', () => {
    expect(processNodeTone('working', false)).toBe(PROCESS_LIVE_TONE)
  })

  it('only ever names a status the package has tokens for', () => {
    const states = ['done', 'working', 'failed', 'parked', 'queued', 'skipped', 'requeued'] as const
    for (const s of states) {
      expect(TOKEN_STATUSES, s).toContain(processNodeTone(s, false))
      expect(TOKEN_STATUSES, s).toContain(processNodeTone(s, true))
    }
  })
})

describe('processNodeGlyph', () => {
  it('shows a verdict glyph where there is one, else the ordinal', () => {
    expect(processNodeGlyph('done', 2)).toBe('✓')
    expect(processNodeGlyph('failed', 2)).toBe('!')
    expect(processNodeGlyph('parked', 2)).toBe('?')
    expect(processNodeGlyph('queued', 2)).toBe('2')
    expect(processNodeGlyph('working', 3)).toBe('3')
    expect(processNodeGlyph('requeued', 2)).toBe('2')
  })
})

describe('processNodeLook', () => {
  it('draws running work as a green ring that spins, and finished work as a filled green check', () => {
    expect(processNodeLook('working', false, 1)).toEqual({
      tone: PROCESS_LIVE_TONE,
      shape: 'ring',
      spin: true,
      glyph: '1',
    })
    expect(processNodeLook('done', false, 1)).toEqual({
      tone: 'done',
      shape: 'solid',
      spin: false,
      glyph: '✓',
    })
  })

  it('never spins anything that is not running', () => {
    for (const s of ['done', 'failed', 'parked', 'queued', 'skipped', 'requeued'] as const) {
      expect(processNodeLook(s, false, 2).spin).toBe(false)
    }
  })

  it('draws what has not run yet — including a requeued step — as a dashed, numbered outline', () => {
    for (const s of ['queued', 'requeued', 'skipped'] as const) {
      expect(processNodeLook(s, false, 3)).toMatchObject({ shape: 'dashed', glyph: '3' })
    }
  })

  it('keeps a failure and a decision as filled marks with their glyph', () => {
    expect(processNodeLook('failed', false, 2)).toMatchObject({
      shape: 'solid',
      glyph: '!',
      tone: 'stuck',
    })
    expect(processNodeLook('parked', true, 2)).toMatchObject({
      shape: 'solid',
      glyph: '?',
      tone: 'review',
    })
  })
})

describe('processNodeBadge and processNodeSummary — a requeued step', () => {
  const plan = {
    loops: [
      {
        id: 'fix',
        from: 'verify',
        to: 'implement',
        when: ['failed'] as ProcessStepOutcome[],
        maxIterations: 3,
      },
    ],
  }
  const verify = (
    over: Partial<{ attempts: number; requeued: boolean; outcome: ProcessStepOutcome }>,
  ) => ({
    attempts: over.attempts ?? 3,
    requeued: over.requeued ?? true,
    ...(over.outcome ? { outcome: over.outcome } : {}),
    latest: { summary: 'No before/after pair on the preview screen.' },
  })

  it('names the attempt that is coming, marked next', () => {
    expect(processNodeBadge(verify({}), { plan, iterationGrants: { fix: 1 } })).toBe(
      'attempt 4 of 4 · next',
    )
  })

  it('keeps the plain attempt badge for a step that is not requeued', () => {
    expect(processNodeBadge(verify({ requeued: false }), { plan })).toBe('attempt 3 of 3')
  })

  it('says the last attempt did not pass, as history rather than as the verdict', () => {
    expect(processNodeSummary(verify({ outcome: 'failed' }))).toEqual({
      text: 'Attempt 3 did not pass: No before/after pair on the preview screen.',
      muted: true,
    })
  })

  it("shows a current step's summary as it is", () => {
    expect(processNodeSummary(verify({ requeued: false, outcome: 'failed' }))).toEqual({
      text: 'No before/after pair on the preview screen.',
      muted: false,
    })
  })
})

describe('formatProcessDuration', () => {
  it('writes durations the way the design does', () => {
    expect(formatProcessDuration(44_000)).toBe('44s')
    expect(formatProcessDuration(6 * 60_000 + 12_000)).toBe('6m 12s')
    expect(formatProcessDuration(1 * 60_000 + 4_000)).toBe('1m 04s')
    expect(formatProcessDuration(63 * 60_000 + 5_000)).toBe('1h 03m')
  })
  it('never goes negative', () => {
    expect(formatProcessDuration(-5)).toBe('0s')
  })
})

describe('processIterationBadge', () => {
  const plan = {
    loops: [
      { id: 'fix', from: 'v', to: 'i', when: ['failed'] as ProcessStepOutcome[], maxIterations: 3 },
    ],
  }
  it('says nothing on the first pass — a "1 of 3" on every step is noise', () => {
    expect(processIterationBadge(1, { plan })).toBeUndefined()
  })
  it('names the attempt and the cap once a loop has fired', () => {
    expect(processIterationBadge(2, { plan })).toBe('attempt 2 of 3')
  })
  it('drops the cap when the plan does not loop', () => {
    expect(processIterationBadge(2, { plan: { loops: [] } })).toBe('attempt 2')
  })
  it('counts the attempts the user granted at an exhausted loop into the cap', () => {
    expect(processIterationBadge(4, { plan, iterationGrants: { fix: 1 } })).toBe('attempt 4 of 4')
  })
  it('ignores a grant for a loop the plan does not have', () => {
    expect(processIterationBadge(2, { plan, iterationGrants: { other: 5 } })).toBe('attempt 2 of 3')
  })
})

describe('processRunBadge', () => {
  it('a run parked on the gate is ready-for-you (review)', () => {
    const r = run({
      status: 'parked',
      park: { reason: 'gate', stepId: 'b', message: '', parkedAt: 0 },
    })
    expect(processRunBadge(r)).toEqual({ label: 'Ready for you', tone: 'review' })
  })
  it('a run parked on a question is waiting-for-you (on-hold)', () => {
    const r = run({
      status: 'parked',
      park: { reason: 'step-question', stepId: 'a', message: '', parkedAt: 0 },
    })
    expect(processRunBadge(r)).toEqual({ label: 'Waiting for you', tone: 'on_hold' })
  })
  it('falls through to the plain status view when not parked', () => {
    expect(processRunBadge(run({ status: 'running' }))).toEqual(PROCESS_RUN_STATUS_VIEW.running)
  })
})

describe('processRunCardView', () => {
  it('running: shows the current step and no decision strip', () => {
    const r = run({
      status: 'running',
      cursor: { stepId: 'a', iteration: 1 },
      ledger: [{ id: 'a', stepId: 'a', iteration: 1, status: 'running', startedAt: 0 }],
    })
    const view = processRunCardView(r)
    expect(view.sub).toBe('A')
    expect(view.body).toBeUndefined()
    expect(view.cta).toMatch(/open the pipeline/i)
  })

  it('parked: says a decision is pending and points into the run — never answers it here', () => {
    const r = run({
      status: 'parked',
      cursor: { stepId: 'a', iteration: 1 },
      park: { reason: 'step-question', stepId: 'a', message: 'q', parkedAt: 0 },
      ledger: [{ id: 'a', stepId: 'a', iteration: 1, status: 'running', startedAt: 0 }],
    })
    const view = processRunCardView(r)
    expect(view.body?.text).toMatch(/decision pending/i)
    expect(view.body?.text).toMatch(/in the run/i)
    expect(view.badge.tone).toBe('on_hold')
  })

  it('a gate park reads as sign-off, not a generic decision', () => {
    const r = run({
      status: 'parked',
      park: { reason: 'gate', stepId: 'b', message: '', parkedAt: 0 },
    })
    expect(processRunCardView(r).body?.text).toMatch(/sign off/i)
  })

  it('finished: leaves an honest step-count summary to talk about', () => {
    const r = run({ status: 'succeeded', ledger: [passed('a'), passed('b')] })
    const view = processRunCardView(r)
    expect(view.body?.tone).toBe('done')
    expect(view.body?.text).toMatch(/finished/i)
  })
})

describe('hasIsolatedAttempts', () => {
  const at = (chatContextId?: string) => ({
    runRef: chatContextId ? { runId: `r-${chatContextId}`, chatContextId } : undefined,
  })

  it('is true when every attempt is its own chat — a verifier runs fresh each time', () => {
    expect(hasIsolatedAttempts([at('v1'), at('v2'), at('v3')])).toBe(true)
  })

  it('is false when the attempts share ONE chat — a developer fix loop resumes it', () => {
    // The live McKinsey run: implement attempts 1–3 all carried agent 70f31f39.
    expect(hasIsolatedAttempts([at('dev'), at('dev'), at('dev')])).toBe(false)
  })

  it('is false when any two attempts share a chat, even if another is fresh', () => {
    expect(hasIsolatedAttempts([at('dev-a'), at('dev-b'), at('dev-b')])).toBe(false)
  })

  it('is false for a single attempt — there is nothing to choose between', () => {
    expect(hasIsolatedAttempts([at('v1')])).toBe(false)
    expect(hasIsolatedAttempts([])).toBe(false)
  })

  it('leaves out an attempt that has not attached a chat yet, rather than hiding the chips', () => {
    expect(hasIsolatedAttempts([at('v1'), at('v2'), at(undefined)])).toBe(true)
    expect(hasIsolatedAttempts([at('v1'), at(undefined)])).toBe(false)
  })
})

describe('verifyReviewStatus', () => {
  it('reads a running attempt as in progress, whatever its outcome field says', () => {
    expect(verifyReviewStatus({ status: 'running' })).toEqual({
      tone: 'review',
      label: 'Verifying…',
    })
  })

  it('tones each settled outcome the way the sign-off does', () => {
    expect(verifyReviewStatus({ status: 'done', outcome: 'passed' }).tone).toBe('done')
    expect(verifyReviewStatus({ status: 'done', outcome: 'failed' })).toEqual({
      tone: 'stuck',
      label: 'Verify failed',
    })
    expect(verifyReviewStatus({ status: 'done', outcome: 'errored' }).tone).toBe('stuck')
    expect(verifyReviewStatus({ status: 'done', outcome: 'unchecked' })).toEqual({
      tone: 'review',
      label: 'Not proven',
    })
  })
})

describe('the pipeline leaf model', () => {
  const plan = {
    definitionId: 'feature',
    definitionScope: 'global' as const,
    definitionVersion: 1,
    name: 'Feature',
    steps: [
      { id: 'implement', name: 'Implement', kind: 'agent' as const, agentType: 'developer' },
      { id: 'verify', name: 'Verify', kind: 'agent' as const, agentType: 'verifier' },
    ],
    loops: [],
    frozenAt: 0,
  }
  const dev = {
    id: 'implement-1',
    stepId: 'implement',
    iteration: 1,
    status: 'done' as const,
    startedAt: 0,
    endedAt: 10,
    runRef: { runId: 'dev-1', chatContextId: 'chat-dev' },
  }
  const ver = {
    id: 'verify-1',
    stepId: 'verify',
    iteration: 1,
    status: 'done' as const,
    startedAt: 10,
    endedAt: 20,
    // A verifier ref can arrive without a chat key — its proof still opens.
    runRef: { runId: 'ver-1' },
  }
  const r = run({ plan, ledger: [dev, ver] })

  it('numbers an attempt only when the step ran more than once', () => {
    expect(processAttemptLeaf(ver, 'Verify', { index: 3, total: 3 })?.title).toBe(
      'Verify · attempt 3',
    )
    expect(processAttemptLeaf(ver, 'Verify', { index: 1, total: 1 })?.title).toBe('Verify')
    expect(processAttemptLeaf(ver, 'Verify')).toMatchObject({
      entryId: 'verify-1',
      ref: { runId: 'ver-1' },
    })
    expect(processAttemptLeaf(undefined, 'Verify')).toBeUndefined()
    expect(processAttemptLeaf({ ...ver, runRef: undefined }, 'Verify')).toBeUndefined()
  })

  it("reads a verify leaf's proof from the run as it is now", () => {
    const leaf = processAttemptLeaf(ver, 'Verify')!
    expect(processLeafReview(r, leaf)).toMatchObject({
      scope: { reviewedRunId: 'dev-1', filedSince: 10, filedUntil: 20 },
      entry: { id: 'verify-1' },
    })
    // Still running when opened, finished now: the live run wins.
    const later = run({ plan, ledger: [dev, { ...ver, endedAt: 99 }] })
    expect(processLeafReview(later, leaf)?.scope.filedUntil).toBe(99)
  })

  it('has no proof for a developer leaf or a leaf with no entry', () => {
    expect(processLeafReview(r, processAttemptLeaf(dev, 'Implement')!)).toBeUndefined()
    // A question leaf opened from a park carries no entry.
    expect(processLeafReview(r, {})).toBeUndefined()
    expect(processLeafReview(r, { entryId: 'gone' })).toBeUndefined()
  })

  it('opens a verify leaf even with no chat; any other only with a chat and a way to show it', () => {
    const verLeaf = processAttemptLeaf(ver, 'Verify')
    const devLeaf = processAttemptLeaf(dev, 'Implement')
    expect(isProcessLeafOpenable(r, verLeaf, false)).toBe(true)
    expect(isProcessLeafOpenable(r, devLeaf, true)).toBe(true)
    expect(isProcessLeafOpenable(r, devLeaf, false)).toBe(false)
    expect(isProcessLeafOpenable(r, { ...devLeaf!, ref: { runId: 'dev-1' } }, true)).toBe(false)
    expect(isProcessLeafOpenable(r, undefined, true)).toBe(false)
  })
})

describe('latestOpenableAttempt', () => {
  const plan = {
    definitionId: 'f',
    definitionScope: 'global' as const,
    definitionVersion: 1,
    name: 'F',
    steps: [
      { id: 'implement', name: 'Implement', kind: 'agent' as const, agentType: 'developer' },
      { id: 'verify', name: 'Verify', kind: 'agent' as const, agentType: 'verifier' },
    ],
    loops: [],
    frozenAt: 0,
  }
  const dev = {
    id: 'd1',
    stepId: 'implement',
    iteration: 1,
    status: 'done' as const,
    startedAt: 0,
    endedAt: 5,
    runRef: { runId: 'dev', chatContextId: 'c-dev' },
  }
  const v1 = {
    id: 'v1',
    stepId: 'verify',
    iteration: 1,
    status: 'done' as const,
    outcome: 'failed' as const,
    startedAt: 5,
    endedAt: 9,
    runRef: { runId: 'ver-1', chatContextId: 'c-v1' },
  }
  const v2NoRun = {
    id: 'v2',
    stepId: 'verify',
    iteration: 2,
    status: 'done' as const,
    outcome: 'unchecked' as const,
    startedAt: 10,
    endedAt: 11,
  }

  it('opens the newest attempt when it has something to open', () => {
    const v2 = { ...v2NoRun, runRef: { runId: 'ver-2', chatContextId: 'c-v2' } }
    const r = run({ plan, ledger: [dev, v1, v2] })
    expect(latestOpenableAttempt(r, [v1, v2], 'Verify', true)).toMatchObject({
      entryId: 'v2',
      title: 'Verify · attempt 2',
    })
  })

  it('falls back to the newest attempt that DID attach a run — the proof stays reachable', () => {
    const r = run({ plan, ledger: [dev, v1, v2NoRun] })
    expect(latestOpenableAttempt(r, [v1, v2NoRun], 'Verify', false)).toMatchObject({
      entryId: 'v1',
      title: 'Verify · attempt 1',
    })
  })

  it('is undefined when no attempt has anything to open', () => {
    const r = run({ plan, ledger: [v2NoRun] })
    expect(latestOpenableAttempt(r, [v2NoRun], 'Verify', true)).toBeUndefined()
    expect(latestOpenableAttempt(r, [], 'Verify', true)).toBeUndefined()
  })
})
