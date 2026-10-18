import { describe, expect, it } from 'vitest'
import type { ProcessRun, ProcessStepOutcome } from 'thefactory-tools/types'
import { AGENT_RUN_TYPES, PROCESS_STEP_KINDS } from 'thefactory-tools/constants'
import { emptyProcessTimeBreakdown } from 'thefactory-tools/utils'
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
  processLoopSenders,
  isProcessRunAtSignOff,
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
  processStepAgentTypeOfRun,
  processStepFinishedView,
  processRunPersonEnding,
} from './processView'

const NO_TIME = emptyProcessTimeBreakdown()

const TOKEN_STATUSES = [
  'empty',
  'done',
  'running',
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

  it('says each status in the short words the whole app shares', () => {
    expect(
      Object.fromEntries(Object.entries(PROCESS_RUN_STATUS_VIEW).map(([k, v]) => [k, v.label])),
    ).toEqual({
      pending: 'Starting',
      running: 'Running',
      parked: 'Needs you',
      succeeded: 'Done',
      failed: 'Failed',
      cancelled: 'Cancelled',
    })
  })

  it('shows a running run in its own running blue — never the green of a finished one', () => {
    expect(PROCESS_LIVE_TONE).toBe('running')
    expect(PROCESS_RUN_STATUS_VIEW.running.tone).toBe('running')
    expect(PROCESS_RUN_STATUS_VIEW.succeeded.tone).toBe('done')
  })

  it('keeps every other run status off the running tone', () => {
    const others = (
      Object.keys(PROCESS_RUN_STATUS_VIEW) as (keyof typeof PROCESS_RUN_STATUS_VIEW)[]
    )
      .filter((status) => status !== 'running')
      .map((status) => PROCESS_RUN_STATUS_VIEW[status].tone)
    expect(others).not.toContain('running')
  })
})

describe('processStepTone', () => {
  it('leaves a step that has not run without emphasis', () => {
    expect(processStepTone('pending', undefined)).toBe('empty')
  })

  it('shows a running step in the running tone, whatever a previous attempt ended as', () => {
    expect(processStepTone('running', 'failed')).toBe('running')
    expect(processStepTone('running', 'passed')).toBe('running')
    expect(processStepTone('running', undefined)).toBe('running')
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
  it('says a run at its gate is ready to sign off, and NOT the decision — that belongs in the pipeline', () => {
    const label = processRunChipLabel(
      run({
        status: 'parked',
        park: { reason: 'gate', message: 'Approve the merge?', parkedAt: 0 },
      }),
      0,
    )
    expect(label).toBe('Sign off · 0/2 steps')
  })

  it('says any other park needs the person, without the question it asks', () => {
    const label = processRunChipLabel(
      run({
        status: 'parked',
        park: { reason: 'step-waiting', stepId: 'a', message: 'Which branch?', parkedAt: 0 },
      }),
      0,
    )
    expect(label).toBe('Needs you · 0/2 steps')
  })

  it('counts only the steps that actually got past', () => {
    expect(processRunChipLabel(run({ ledger: [passed('a')] }), 0)).toBe('Running · 1/2 steps')
  })

  it('reads as done for a succeeded run', () => {
    expect(processRunChipLabel(run({ status: 'succeeded' }), 0)).toBe('Done · 0/2 steps')
  })

  it('reads as failed for a run that broke', () => {
    expect(processRunChipLabel(run({ status: 'failed' }), 0)).toBe('Failed · 0/2 steps')
  })

  it('reads as starting for a run that has not begun its first step', () => {
    expect(processRunChipLabel(run({ status: 'pending' }), 0)).toBe('Starting · 0/2 steps')
  })

  it('names the decision of a run a person ended, not that it stopped', () => {
    expect(processRunChipLabel(decided('reject'), 0)).toBe('Rejected · 2/3 steps')
  })

  it('says only "Cancelled" — a step count on abandoned work is noise', () => {
    expect(processRunChipLabel(run({ status: 'cancelled' }), 0)).toBe('Cancelled')
  })
})

describe('the waiting outcome', () => {
  it('reads as waiting on the person rather than a failure', () => {
    expect(PROCESS_OUTCOME_VIEW.waiting.label).toBe('waiting on you')
  })

  it('is visually distinct from both a failure and an unmeasured step', () => {
    expect(PROCESS_OUTCOME_VIEW.waiting.tone).not.toBe(PROCESS_OUTCOME_VIEW.failed.tone)
    expect(PROCESS_OUTCOME_VIEW.waiting.tone).not.toBe(PROCESS_OUTCOME_VIEW.unchecked.tone)
  })

  it('does not count toward progress', () => {
    const ledger = [
      {
        id: 'a',
        stepId: 'a',
        iteration: 1,
        status: 'done' as const,
        outcome: 'waiting' as const,
        startedAt: 0,
      },
    ]
    expect(processRunChipLabel(run({ ledger }), 0)).toBe('Running · 0/2 steps')
  })
})

describe('processRunSpend', () => {
  const totals = (over: Partial<NonNullable<ProcessRun['totals']>> = {}) => ({
    workMs: 0,
    time: NO_TIME,
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

  const planSpend = {
    provider: 'anthropic',
    model: 'claude-opus-5-5',
    billing: 'subscription' as const,
    inputTokens: 36,
    outputTokens: 6_623,
    cacheReadTokens: 1_248_888,
    cacheWriteTokens: 52_624,
    costUsd: 0,
  }

  it('says a run a subscription paid for has an unknown charge, never a $0.00 that reads as free', () => {
    const r = run({
      totals: totals({ costUsd: 0, includedTokens: 1_308_171, byModel: [planSpend] }),
    })
    expect(processRunSpend(r)?.label).toBe('Unknown (subscription)')
  })

  it('keeps a run read without its models at the $0.00 its totals say', () => {
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

  it('names a subscription’s unknown share beside the cap, not as $0.00 spent of it', () => {
    const planSpend = {
      provider: 'cursor',
      model: 'composer-2.5',
      billing: 'subscription' as const,
      inputTokens: 5_825,
      outputTokens: 860,
      cacheReadTokens: 8_016,
      cacheWriteTokens: 0,
      costUsd: 0,
    }
    const capped = run({
      budget: { spendUsdCap: 5 },
      totals: totals({ costUsd: 0, includedTokens: 14_701, byModel: [planSpend] }),
    })
    expect(processRunSpend(capped)).toEqual({
      spent: 0,
      cap: 5,
      label: 'Unknown (subscription) · cap $5.00',
      title: 'Spent against the cap',
    })
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
  const attempts = (...ms: number[]) =>
    ms.map((workMs, i) => ({ entryId: `e${i}`, workMs, time: NO_TIME }))

  it('is the ledger total when nothing is running, whatever the clock says', () => {
    const r = run({
      totals: { workMs: 9 * MIN, time: NO_TIME, ticking: false, at: 100, steps: {} },
    })
    expect(processRunWorkMs(r, 100 + 60 * MIN)).toBe(9 * MIN)
  })

  it('carries the clock on from when the totals were read while a step runs', () => {
    const r = run({ totals: { workMs: 9 * MIN, time: NO_TIME, ticking: true, at: 100, steps: {} } })
    expect(processRunWorkMs(r, 100 + 2 * MIN)).toBe(11 * MIN)
  })

  it('is unknown for a run read without totals', () => {
    expect(processRunWorkMs(run(), 0)).toBeUndefined()
    expect(processRunWorkLabel(run(), 0)).toBeUndefined()
  })

  it('labels the live work time', () => {
    const r = run({ totals: { workMs: 9 * MIN, time: NO_TIME, ticking: true, at: 0, steps: {} } })
    expect(processRunWorkLabel(r, 90_000)).toBe('10m 30s')
  })

  it('sums EVERY attempt of a step — three verifier runs, not the last one', () => {
    const r = run({
      totals: {
        workMs: 43 * MIN,
        time: NO_TIME,
        ticking: false,
        at: 0,
        steps: {
          b: { workMs: 43 * MIN, time: NO_TIME, attempts: attempts(21 * MIN, 13 * MIN, 9 * MIN) },
        },
      },
    })
    const state = { step: verifyStep, latest: { status: 'done' as const } }
    expect(processStepWorkMs(r, state, 99 * MIN)).toBe(43 * MIN)
  })

  it('ticks only the step whose attempt is running, on top of its earlier attempts', () => {
    const r = run({
      totals: {
        workMs: 38 * MIN,
        time: NO_TIME,
        ticking: true,
        at: 10,
        steps: {
          a: { workMs: 8 * MIN, time: NO_TIME, attempts: attempts(8 * MIN) },
          b: { workMs: 30 * MIN, time: NO_TIME, attempts: attempts(21 * MIN, 9 * MIN) },
        },
      },
    })
    const running = { step: verifyStep, latest: { status: 'running' as const } }
    const finished = { step: { ...verifyStep, id: 'a' }, latest: { status: 'done' as const } }
    expect(processStepWorkMs(r, running, 10 + MIN)).toBe(31 * MIN)
    expect(processStepWorkMs(r, finished, 10 + MIN)).toBe(8 * MIN)
  })

  it('is unknown for a step that has not run', () => {
    const r = run({ totals: { workMs: 0, time: NO_TIME, ticking: false, at: 0, steps: {} } })
    expect(processStepWorkMs(r, { step: verifyStep }, 0)).toBeUndefined()
  })

  it('never ticks a gate: waiting on a person is not work', () => {
    const r = run({
      totals: {
        workMs: 0,
        time: NO_TIME,
        ticking: false,
        at: 0,
        steps: { g: { workMs: 0, time: NO_TIME, attempts: attempts(0) } },
      },
    })
    const waiting = { step: gateStep, latest: { status: 'running' as const } }
    expect(processStepWorkMs(r, waiting, 5 * MIN)).toBe(0)
  })

  it("labels a step's spend across its attempts", () => {
    const r = run({
      totals: {
        workMs: 0,
        time: NO_TIME,
        ticking: false,
        at: 0,
        steps: {
          b: {
            workMs: 0,
            time: NO_TIME,
            costUsd: 1.25,
            unpricedTokens: 4_000,
            attempts: attempts(0, 0),
          },
        },
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
      park: { reason: 'step-waiting', stepId: 'a', message: '', parkedAt: 0 },
      ledger: [entry('a', { runId: 'r1', chatContextId: '/projects/p/stories/s' })],
    })
    expect(parkedRunRef(r)?.runId).toBe('r1')
  })

  it('takes the NEWEST attempt when a step ran more than once', () => {
    const r = run({
      park: { reason: 'step-waiting', stepId: 'a', message: '', parkedAt: 0 },
      ledger: [
        entry('a', { runId: 'old', chatContextId: '/x' }),
        entry('a', { runId: 'new', chatContextId: '/y' }),
      ],
    })
    expect(parkedRunRef(r)?.runId).toBe('new')
  })

  it('refuses a ref with no chat to open — a CTA that does nothing is worse than none', () => {
    const r = run({
      park: { reason: 'step-waiting', stepId: 'a', message: '', parkedAt: 0 },
      ledger: [entry('a', { runId: 'r1' })],
    })
    expect(parkedRunRef(r)).toBeUndefined()
  })

  it('ignores a run belonging to a different step', () => {
    const r = run({
      park: { reason: 'step-waiting', stepId: 'a', message: '', parkedAt: 0 },
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

  it('reads a failed step whose Try again went to the checks first as rechecked, not failed', () => {
    const state = { ...st({ outcome: 'errored' }), rechecked: { stepId: 'checks' } }
    expect(processNodeState(state, undefined)).toBe('rechecked')
  })

  it('still reads a rechecked step a later pass went back over as next', () => {
    const state = { ...st({ outcome: 'failed', requeued: true }), rechecked: { stepId: 'checks' } }
    expect(processNodeState(state, undefined)).toBe('requeued')
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

  it('draws a rechecked step as queued — its failure is not the open verdict', () => {
    expect(processNodeTone('rechecked', false)).toBe('queued')
  })

  it('draws a working step in the running tone, gate or not — never the done green', () => {
    expect(processNodeTone('working', false)).toBe('running')
    expect(processNodeTone('working', true)).toBe('running')
    expect(processNodeTone('done', false)).toBe('done')
  })

  it('only ever names a status the package has tokens for', () => {
    const states = [
      'done',
      'working',
      'failed',
      'parked',
      'queued',
      'skipped',
      'requeued',
      'rechecked',
    ] as const
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
  it('draws running work as a blue ring that spins, and finished work as a filled green check', () => {
    expect(processNodeLook('working', false, 1)).toEqual({
      tone: 'running',
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

  it('draws what has not run yet — including a requeued or rechecked step — as a dashed, numbered outline', () => {
    for (const s of ['queued', 'requeued', 'skipped', 'rechecked'] as const) {
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
    steps: [
      { id: 'implement', kind: 'agent' as const },
      { id: 'verify', kind: 'agent' as const },
    ],
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
    step: { id: 'verify' },
    entries: [],
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

describe('processNodeBadge and processNodeSummary — a Try again sent to the checks first', () => {
  const plan = {
    steps: [
      { id: 'resolve', kind: 'agent' as const },
      { id: 'checks', kind: 'check' as const },
    ],
    loops: [],
  }
  const resolve = (rechecked: { stepId: string; checkedSha?: string }) => ({
    step: { id: 'resolve' },
    entries: [],
    attempts: 9,
    requeued: false,
    outcome: 'errored' as const,
    rechecked,
    latest: { summary: 'Agent run finished: aborted.' },
  })

  it('says the retry went to the checks first because the branch changed, on which commit', () => {
    expect(
      processNodeSummary(resolve({ stepId: 'checks', checkedSha: '597e5bd94b535a943a5' })),
    ).toEqual({
      text: 'Try again ran the checks first — branch changed (597e5bd9)',
      muted: true,
    })
  })

  it('says so without a commit while the checks have not recorded one', () => {
    expect(processNodeSummary(resolve({ stepId: 'checks' }))?.text).toBe(
      'Try again ran the checks first — branch changed',
    )
  })

  it('names the attempt that ran, not one coming', () => {
    expect(processNodeBadge(resolve({ stepId: 'checks' }), { plan })).toBe('attempt 9')
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
    steps: [
      { id: 'i', kind: 'agent' as const },
      { id: 'v', kind: 'agent' as const },
      { id: 'r', kind: 'agent' as const },
    ],
    loops: [
      { id: 'fix', from: 'v', to: 'i', when: ['failed'] as ProcessStepOutcome[], maxIterations: 3 },
    ],
  }
  it('says nothing on the first pass — a "1 of 3" on every step is noise', () => {
    expect(processIterationBadge(1, 'v', { plan })).toBeUndefined()
  })
  it('names the attempt and the cap once a loop has fired', () => {
    expect(processIterationBadge(2, 'v', { plan })).toBe('attempt 2 of 3')
  })
  it('drops the cap when the plan does not loop', () => {
    expect(processIterationBadge(2, 'v', { plan: { steps: plan.steps, loops: [] } })).toBe(
      'attempt 2',
    )
  })
  it('drops the cap on a step no loop goes back over', () => {
    expect(processIterationBadge(2, 'r', { plan })).toBe('attempt 2')
  })
  it('drops the cap once a person’s retries ran the step past it — never "attempt 12 of 7"', () => {
    expect(processIterationBadge(4, 'v', { plan })).toBe('attempt 4')
  })
  it('counts the attempts the user granted at an exhausted loop into the cap', () => {
    expect(processIterationBadge(4, 'v', { plan, iterationGrants: { fix: 1 } })).toBe(
      'attempt 4 of 4',
    )
  })
  it('drops the cap on a step a person sends work back over at a gate — their requests have no limit', () => {
    const story = {
      steps: [
        { id: 'fix', kind: 'process' as const, onlyWhenSentBack: true },
        { id: 'code-review', kind: 'judge' as const },
        { id: 'sign-off', kind: 'gate' as const },
      ],
      loops: [
        {
          id: 'auto-fix',
          from: 'code-review',
          to: 'fix',
          when: ['failed'] as ProcessStepOutcome[],
          maxIterations: 3,
        },
        {
          id: 'fix-findings',
          from: 'sign-off',
          to: 'fix',
          when: ['failed'] as ProcessStepOutcome[],
          maxIterations: 3,
        },
      ],
    }
    expect(processIterationBadge(6, 'fix', { plan: story })).toBe('attempt 6')
  })
  it('keeps the cap on the same plan when the step the edge leaves is not a person', () => {
    const story = {
      steps: [
        { id: 'fix', kind: 'process' as const, onlyWhenSentBack: true },
        { id: 'sign-off', kind: 'check' as const },
      ],
      loops: [
        {
          id: 'fix-findings',
          from: 'sign-off',
          to: 'fix',
          when: ['failed'] as ProcessStepOutcome[],
          maxIterations: 3,
        },
      ],
    }
    expect(processIterationBadge(2, 'fix', { plan: story })).toBe('attempt 2 of 2')
  })
  it('ignores a grant for a loop the plan does not have', () => {
    expect(processIterationBadge(2, 'v', { plan, iterationGrants: { other: 5 } })).toBe(
      'attempt 2 of 3',
    )
  })

  describe('a step two loops go back over — a feature reviewed before it is verified', () => {
    const feature = {
      steps: [
        { id: 'implement', kind: 'agent' as const },
        { id: 'code-review', kind: 'judge' as const },
        { id: 'verify', kind: 'agent' as const },
        { id: 'report', kind: 'report' as const },
      ],
      loops: [
        {
          id: 'review-fix',
          from: 'code-review',
          to: 'implement',
          when: ['failed'] as ProcessStepOutcome[],
          maxIterations: 3,
        },
        {
          id: 'fix',
          from: 'verify',
          to: 'implement',
          when: ['failed'] as ProcessStepOutcome[],
          maxIterations: 3,
        },
      ],
    }
    it('caps a step both loops re-run at every pass either can send back', () => {
      expect(processIterationBadge(4, 'implement', { plan: feature })).toBe('attempt 4 of 5')
      expect(processIterationBadge(4, 'code-review', { plan: feature })).toBe('attempt 4 of 5')
    })
    it('caps a step only one loop re-runs at that loop’s passes', () => {
      expect(processIterationBadge(2, 'verify', { plan: feature })).toBe('attempt 2 of 3')
    })
    it('adds each loop’s grants only to the steps it goes back over', () => {
      const run = { plan: feature, iterationGrants: { 'review-fix': 2 } }
      expect(processIterationBadge(6, 'implement', run)).toBe('attempt 6 of 7')
      expect(processIterationBadge(2, 'verify', run)).toBe('attempt 2 of 3')
    })
  })
})

describe('processNodeBadge — a step that runs only when work is sent back to it', () => {
  const plan = {
    steps: [
      { id: 'features', name: 'Features', kind: 'process' as const },
      { id: 'fix', name: 'Fix', kind: 'process' as const, onlyWhenSentBack: true },
      { id: 'code-review', name: 'Code review', kind: 'judge' as const },
      { id: 'sign-off', name: 'Sign-off', kind: 'gate' as const },
    ],
    loops: [
      {
        id: 'auto-fix',
        from: 'code-review',
        to: 'fix',
        when: ['failed'] as ProcessStepOutcome[],
        maxIterations: 3,
      },
      {
        id: 'fix-findings',
        from: 'sign-off',
        to: 'fix',
        when: ['failed'] as ProcessStepOutcome[],
        maxIterations: 3,
      },
    ],
  }
  const passedThrough = { outcome: 'skipped' as const }
  const sentBack = (loop: string) => ({ viaLoopId: loop })
  const fix = (entries: { viaLoopId?: string; outcome?: ProcessStepOutcome }[]) => ({
    step: { id: 'fix', onlyWhenSentBack: true },
    attempts: entries.length,
    requeued: false,
    entries,
  })

  it('does not count the time it was only passed through', () => {
    expect(processNodeBadge(fix([passedThrough, sentBack('auto-fix')]), { plan })).toBeUndefined()
  })
  it('counts the passes a send-back ran, with no cap while a person can send it back at sign-off', () => {
    expect(
      processNodeBadge(fix([passedThrough, sentBack('auto-fix'), sentBack('fix-findings')]), {
        plan,
      }),
    ).toBe('attempt 2')
  })
})

describe('processLoopSenders', () => {
  const plan = (loops: { id: string; from: string }[]) => ({
    steps: [
      { id: 'implement', name: 'Implement' },
      { id: 'code-review', name: 'Code review' },
      { id: 'verify', name: 'Verify' },
    ],
    loops: loops.map((l) => ({
      ...l,
      to: 'implement',
      when: ['failed'] as ProcessStepOutcome[],
      maxIterations: 3,
    })),
  })
  const both = plan([
    { id: 'fix', from: 'verify' },
    { id: 'review-fix', from: 'code-review' },
  ])

  it('says nothing while no loop has fired', () => {
    expect(processLoopSenders({ plan: both, loopCounts: {} })).toBeUndefined()
    expect(processLoopSenders({ plan: both, loopCounts: { fix: 0 } })).toBeUndefined()
  })
  it('names the code review when it is what sent the work back', () => {
    expect(processLoopSenders({ plan: both, loopCounts: { 'review-fix': 1 } })).toBe('Code review')
  })
  it('names the verify when it is what sent the work back', () => {
    expect(processLoopSenders({ plan: both, loopCounts: { fix: 2 } })).toBe('Verify')
  })
  it('names every step that sent it back, in plan order', () => {
    expect(processLoopSenders({ plan: both, loopCounts: { fix: 1, 'review-fix': 1 } })).toBe(
      'Code review and Verify',
    )
  })
  it('ignores a count for a loop the plan does not have', () => {
    expect(processLoopSenders({ plan: both, loopCounts: { gone: 3 } })).toBeUndefined()
  })
})

describe('processRunBadge', () => {
  it('a run parked on the gate is sign off (review)', () => {
    const r = run({
      status: 'parked',
      park: { reason: 'gate', stepId: 'b', message: '', parkedAt: 0 },
    })
    expect(processRunBadge(r, 0)).toEqual({ label: 'Sign off', tone: 'review' })
  })
  it('a run parked on an agent waiting on the person needs you (on-hold)', () => {
    const r = run({
      status: 'parked',
      park: { reason: 'step-waiting', stepId: 'a', message: '', parkedAt: 0 },
    })
    expect(processRunBadge(r, 0)).toEqual({ label: 'Needs you', tone: 'on_hold' })
  })
  it('a run waiting on work elsewhere is waiting (queued) — it starts by itself, nobody needs to act', () => {
    const r = run({
      status: 'parked',
      park: { reason: 'waiting-on-blockers', stepId: 'a', message: '', parkedAt: 0 },
    })
    expect(processRunBadge(r, 0)).toEqual({ label: 'Waiting', tone: 'queued' })
  })
  it('falls through to the plain status view when not parked', () => {
    expect(processRunBadge(run({ status: 'running' }), 0)).toEqual(PROCESS_RUN_STATUS_VIEW.running)
  })
  it('says an approved run whose work did not land is not merged, not simply done', () => {
    const r = run({
      status: 'succeeded',
      workBranch: { name: 'factory/x', baseRef: 'main', baseSha: 'a'.repeat(40) },
      plan: {
        ...run({}).plan,
        steps: [...run({}).plan.steps, { id: 'g', name: 'G', kind: 'gate' }],
      },
      ledger: [
        {
          id: 'e',
          stepId: 'g',
          iteration: 1,
          status: 'done',
          startedAt: 0,
          override: { choice: 'approve', at: 1, integration: 'merge' },
        },
      ],
      integration: { mode: 'merge', status: 'failed', error: 'conflict', at: 2 },
    })
    expect(processRunBadge(r, 0)).toEqual({ label: 'Not merged', tone: 'on_hold' })
  })
})

/** A run a person ended at its gate `g`, the way the driver records the decision. */
function decided(
  choice: 'request-changes' | 'reject' | 'abandon' | 'close-unmerged',
  note?: string,
  over: Partial<ProcessRun> = {},
): ProcessRun {
  const base = run({})
  return run({
    status: 'failed',
    plan: {
      ...base.plan,
      steps: [...base.plan.steps, { id: 'g', name: 'Sign-off', kind: 'gate' }],
    },
    ledger: [
      passed('a'),
      passed('b'),
      {
        id: 'g',
        stepId: 'g',
        iteration: 1,
        status: 'done',
        outcome: 'failed',
        startedAt: 0,
        override: { choice, at: 1, ...(note ? { note } : {}) },
      },
    ],
    ...over,
  })
}

describe('processRunPersonEnding', () => {
  it('names a request for changes, where it was made and what was asked', () => {
    expect(processRunPersonEnding(decided('request-changes', 'Fix the format.'))).toEqual({
      choice: 'request-changes',
      label: 'Changes requested',
      tone: 'on_hold',
      line: 'Changes requested at Sign-off — “Fix the format.”',
    })
  })

  it('names a rejection, as an ending a person chose rather than a failure', () => {
    expect(processRunPersonEnding(decided('reject'))).toEqual({
      choice: 'reject',
      label: 'Rejected',
      tone: 'empty',
      line: 'Rejected at Sign-off.',
    })
  })

  it('names a run a person stopped as abandoned, with their words', () => {
    expect(processRunPersonEnding(decided('abandon', 'Not now.'))?.line).toBe(
      'Abandoned at Sign-off — “Not now.”',
    )
    expect(processRunPersonEnding(decided('abandon'))?.label).toBe('Abandoned')
  })

  it('is nothing for a run that failed with nobody deciding', () => {
    expect(processRunPersonEnding(run({ status: 'failed', ledger: [passed('a')] }))).toBeUndefined()
  })

  it('names a run a person closed without merging, where they closed it', () => {
    expect(
      processRunPersonEnding(decided('close-unmerged', undefined, { status: 'cancelled' })),
    ).toEqual({
      choice: 'close-unmerged',
      label: 'Closed without merging',
      tone: 'empty',
      line: 'Closed without merging at Sign-off.',
    })
  })

  it('is nothing for a closed run taken back up and stopped again', () => {
    const stopped = decided('close-unmerged', undefined, {
      status: 'cancelled',
      revivals: [{ stoppedAt: 3, at: 4 }],
    })
    expect(processRunPersonEnding(stopped)).toBeUndefined()
  })

  it.each(['succeeded', 'cancelled', 'running', 'parked'] as const)(
    'is nothing for a run that is %s',
    (status) => {
      expect(processRunPersonEnding(decided('reject', undefined, { status }))).toBeUndefined()
    },
  )

  it('only ever names a status the package has tokens for', () => {
    for (const choice of ['request-changes', 'reject', 'abandon'] as const) {
      expect(TOKEN_STATUSES).toContain(processRunPersonEnding(decided(choice))?.tone)
    }
  })
})

describe('processRunBadge — a stop its agent manager has', () => {
  const turn = { runId: 'r', parkedAt: 0, signature: 's', startedAt: 10, chatContextId: 'c' }
  const stopped = (over: Partial<ProcessRun>, reason: 'step-failed' | 'gate' = 'step-failed') =>
    run({ status: 'parked', park: { reason, message: 'm', parkedAt: 0 }, ...over })

  it('reads “Manager on it” in the running tone while the manager is on it', () => {
    expect(processRunBadge(stopped({ manager: { turn } }), 20)).toEqual({
      label: 'Manager on it',
      tone: 'running',
    })
    expect(processRunChipLabel(stopped({ manager: { turn } }, 'gate'), 20)).toBe(
      'Manager on it · 0/2 steps',
    )
  })

  it('reads “Needs you” or “Sign off” once the stop is the person’s', () => {
    const stale = 10 + 3 * 60 * 60 * 1000
    expect(processRunBadge(stopped({ manager: { turn } }), stale).label).toBe('Needs you')
    expect(processRunBadge(stopped({ manager: { turn } }, 'gate'), stale).label).toBe('Sign off')
  })

  it('carries the manager’s line on the chat card in place of the pending decision', () => {
    const card = processRunCardView(stopped({ manager: { turn } }), 20)
    expect(card.badge.label).toBe('Manager on it')
    expect(card.body?.text).toMatch(/^Manager: looking at /)
    expect(processRunCardView(stopped({}), 20).body?.text).toBe(
      '1 decision pending — answer it in the run',
    )
  })
})

describe('processRunBadge — a run a person ended', () => {
  it('says the person’s decision, never "Failed"', () => {
    expect(processRunBadge(decided('request-changes', 'x'), 0)).toEqual({
      label: 'Changes requested',
      tone: 'on_hold',
    })
    expect(processRunBadge(decided('reject'), 0).label).toBe('Rejected')
    expect(processRunBadge(decided('abandon'), 0).label).toBe('Abandoned')
  })

  it('still says Failed for a run that failed on its own', () => {
    expect(processRunBadge(run({ status: 'failed' }), 0)).toEqual(PROCESS_RUN_STATUS_VIEW.failed)
  })
})

describe('processRunCardView', () => {
  it('ended by a person: says their decision in the strip, in its own tone', () => {
    const view = processRunCardView(decided('request-changes', 'Fix the format.'), 0)
    expect(view.badge.label).toBe('Changes requested')
    expect(view.body).toEqual({
      text: 'Changes requested at Sign-off — “Fix the format.”',
      tone: 'on_hold',
    })
  })

  it('failed on its own: no strip, as before', () => {
    expect(processRunCardView(run({ status: 'failed' }), 0).body).toBeUndefined()
  })

  it('running: shows the current step and no decision strip', () => {
    const r = run({
      status: 'running',
      cursor: { stepId: 'a', iteration: 1 },
      ledger: [{ id: 'a', stepId: 'a', iteration: 1, status: 'running', startedAt: 0 }],
    })
    const view = processRunCardView(r, 0)
    expect(view.sub).toBe('A')
    expect(view.body).toBeUndefined()
    expect(view.cta).toMatch(/open the pipeline/i)
  })

  it('parked: says a decision is pending and points into the run — never answers it here', () => {
    const r = run({
      status: 'parked',
      cursor: { stepId: 'a', iteration: 1 },
      park: { reason: 'step-waiting', stepId: 'a', message: 'q', parkedAt: 0 },
      ledger: [{ id: 'a', stepId: 'a', iteration: 1, status: 'running', startedAt: 0 }],
    })
    const view = processRunCardView(r, 0)
    expect(view.body?.text).toMatch(/decision pending/i)
    expect(view.body?.text).toMatch(/in the run/i)
    expect(view.badge.tone).toBe('on_hold')
  })

  it('a gate park reads as sign-off, not a generic decision', () => {
    const r = run({
      status: 'parked',
      park: { reason: 'gate', stepId: 'b', message: '', parkedAt: 0 },
    })
    expect(processRunCardView(r, 0).body?.text).toMatch(/sign off/i)
  })

  it('finished: leaves an honest step-count summary to talk about', () => {
    const r = run({ status: 'succeeded', ledger: [passed('a'), passed('b')] })
    const view = processRunCardView(r, 0)
    expect(view.body).toEqual({ text: 'Done · 2 of 2 steps', tone: 'done' })
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

describe('processStepAgentTypeOfRun', () => {
  const run = {
    plan: {
      steps: [
        {
          id: 'implement',
          name: 'Implement and prove',
          kind: 'agent',
          agentType: 'developer-verifier',
        },
        { id: 'code-review', name: 'Code review', kind: 'judge' },
      ],
    },
    ledger: [
      { id: 'e1', stepId: 'implement', runRef: { runId: 'orch-1', chatContextId: 'chat-dev' } },
      {
        id: 'e2',
        stepId: 'code-review',
        runRef: { runId: 'review-1', chatContextId: 'chat-review' },
      },
    ],
  } as unknown as ProcessRun

  it('names the role of the step whose chat the run belongs to', () => {
    expect(processStepAgentTypeOfRun(run, { runId: 'cli-1', chatContextId: 'chat-dev' })).toBe(
      'developer-verifier',
    )
  })

  it('matches the step’s own run id when the chat is not known', () => {
    expect(processStepAgentTypeOfRun(run, { runId: 'orch-1' })).toBe('developer-verifier')
  })

  it('is undefined for a step that runs no agent, or a run the process does not hold', () => {
    expect(processStepAgentTypeOfRun(run, { runId: 'review-1' })).toBeUndefined()
    expect(processStepAgentTypeOfRun(run, { runId: 'other', chatContextId: 'x' })).toBeUndefined()
  })
})

describe('processStepFinishedView', () => {
  it('hands a developer’s change to the verifier', () => {
    expect(processStepFinishedView({ changedFiles: true, role: 'developer' }).kind).toBe('handoff')
  })

  it('never says a developer-verifier handed its work on — it proved it itself', () => {
    const view = processStepFinishedView({ changedFiles: true, role: 'developer-verifier' })
    expect(view.kind).toBe('selfProven')
    expect(view.title).not.toMatch(/handed to Verify/)
  })

  it('reads as a hand-off while the role is not yet known, and as finished when nothing changed', () => {
    expect(processStepFinishedView({ changedFiles: true }).kind).toBe('handoff')
    expect(processStepFinishedView({ changedFiles: false, role: 'verifier' }).kind).toBe('finished')
  })
})

describe('isProcessRunAtSignOff', () => {
  const plan = (gateKind?: 'design') => ({
    definitionId: 'd',
    definitionScope: 'global' as const,
    definitionVersion: 1,
    name: 'P',
    steps: [
      { id: 'work', name: 'Work', kind: 'agent' as const },
      { id: 'gate', name: 'Gate', kind: 'gate' as const, ...(gateKind ? { gateKind } : {}) },
    ],
    loops: [],
    frozenAt: 0,
  })
  const at = (over: Partial<ProcessRun>) =>
    run({
      status: 'parked',
      storyId: 's1',
      plan: plan(),
      park: { reason: 'gate', stepId: 'gate', message: '', parkedAt: 0 },
      ...over,
    })

  it('is a story run stopped at its sign-off gate', () => {
    expect(isProcessRunAtSignOff(at({}))).toBe(true)
  })

  it('is never a design approval, a mirrored stop, another step, or a run with no story', () => {
    expect(isProcessRunAtSignOff(at({ plan: plan('design') }))).toBe(false)
    expect(
      isProcessRunAtSignOff(
        at({ park: { reason: 'gate', stepId: 'gate', message: '', parkedAt: 0, childRunId: 'c' } }),
      ),
    ).toBe(false)
    expect(
      isProcessRunAtSignOff(
        at({ park: { reason: 'gate', stepId: 'work', message: '', parkedAt: 0 } }),
      ),
    ).toBe(false)
    expect(isProcessRunAtSignOff(at({ storyId: undefined }))).toBe(false)
    expect(isProcessRunAtSignOff(at({ status: 'running', park: undefined }))).toBe(false)
  })
})
