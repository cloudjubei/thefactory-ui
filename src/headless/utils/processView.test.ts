import { describe, expect, it } from 'vitest'
import type { ProcessRun, ProcessStepOutcome } from 'thefactory-tools/types'
import {
  PROCESS_OUTCOME_VIEW,
  PROCESS_RUN_STATUS_VIEW,
  processRunChipLabel,
  processStepTone,
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
