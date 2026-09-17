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
} from './processView'

const TOKEN_STATUSES = ['empty', 'done', 'working', 'stuck', 'blocked', 'queued'] as const

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
})

describe('processStepTone', () => {
  it('leaves a step that has not run without emphasis', () => {
    expect(processStepTone('pending', undefined)).toBe('empty')
  })

  it('shows a running step as working, whatever a previous attempt ended as', () => {
    expect(processStepTone('running', 'failed')).toBe('working')
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
  it('says nothing for a run that was never capped and never measured', () => {
    expect(processRunSpend(run())).toBeUndefined()
  })

  it('shows spend against the cap', () => {
    const r = run({ budget: { spendUsdCap: 5 }, spentUsd: 1.5 })
    expect(processRunSpend(r)?.label).toBe('$1.50 of $5.00')
  })

  it('folds a granted raise into the ceiling, and says it was raised', () => {
    const r = run({ budget: { spendUsdCap: 5 }, budgetGrants: { spendUsdCap: 5 }, spentUsd: 6 })
    expect(processRunSpend(r)?.label).toBe('$6.00 of $10.00 (raised)')
  })

  it('shows spend alone when the run is uncapped', () => {
    expect(processRunSpend(run({ spentUsd: 2 }))?.label).toBe('$2.00')
  })

  it('reads a capped run that has spent nothing yet as zero, not unknown', () => {
    expect(processRunSpend(run({ budget: { spendUsdCap: 5 } }))?.label).toBe('$0.00 of $5.00')
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
