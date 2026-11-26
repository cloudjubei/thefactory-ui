import { describe, expect, it } from 'vitest'
import type {
  ProcessPark,
  ProcessParkChoice,
  ProcessResumeChoice,
  ProcessRun,
} from 'thefactory-tools/types'

import { processParkAnswersView } from './processParkAnswers'
import {
  optimisticAnsweredRun,
  optimisticMirrorRun,
  parkPendingAnswerKey,
  processAnswerPendingLine,
  processRunAnswering,
  processRunRecordIsStale,
  processRunShownWhileAnswering,
} from './processRunAnswer'
import { PROCESS_ANSWER_PENDING_FALLBACK } from './processRunAnswerConstants'

type RunInput = Partial<Omit<ProcessRun, 'park'>> & { park?: Partial<ProcessPark> }

const run = (over: RunInput = {}): ProcessRun =>
  ({
    id: 'r1',
    projectId: 'p',
    title: 'Feature',
    status: 'parked',
    plan: {
      steps: [
        { id: 'implement', name: 'Implement', kind: 'agent' },
        { id: 'checks', name: 'Checks', kind: 'check' },
      ],
    },
    ledger: [{ id: 'c1', stepId: 'checks', iteration: 2, status: 'done', outcome: 'failed' }],
    loopCounts: {},
    workBranch: { name: 'work/x', baseRef: 'main' },
    startedAt: 0,
    updatedAt: 10,
    park: { reason: 'step-failed', stepId: 'checks', message: 'Checks failed.', parkedAt: 5 },
    ...over,
  }) as unknown as ProcessRun

const gate = run({
  park: { reason: 'gate', stepId: 'checks', message: 'Approve?', parkedAt: 6 },
})

const choice = (c: ProcessParkChoice['choice'], extra: Partial<ProcessParkChoice> = {}) => ({
  choice: c,
  label: `${c} label`,
  detail: `${c} detail`,
  ...extra,
})

describe('optimisticAnsweredRun', () => {
  it('reads a stop answered with a way on as running at the step it stopped at, its stop gone', () => {
    const shown = optimisticAnsweredRun(
      run({ cursor: { stepId: 'checks', iteration: 2 } }),
      'retry',
    )
    expect(shown?.status).toBe('running')
    expect(shown && 'park' in shown).toBe(false)
    expect(shown?.cursor).toEqual({ stepId: 'checks', iteration: 2 })
  })

  it('puts the step it stopped at in front when the run kept no place, on its latest pass', () => {
    expect(optimisticAnsweredRun(run(), 'update-base')?.cursor).toEqual({
      stepId: 'checks',
      iteration: 2,
    })
    expect(optimisticAnsweredRun(run({ ledger: [] }), 'update-base')?.cursor).toEqual({
      stepId: 'checks',
      iteration: 1,
    })
  })

  it('keeps the run’s place when the stop names no step', () => {
    const stopped = run({
      cursor: { stepId: 'implement', iteration: 1 },
      park: { reason: 'budget-spent', message: 'Budget spent.', parkedAt: 5 },
    })
    expect(optimisticAnsweredRun(stopped, 'continue')?.cursor).toEqual({
      stepId: 'implement',
      iteration: 1,
    })
  })

  it('changes nothing else of the record and leaves the one it was given alone', () => {
    const stopped = run()
    const shown = optimisticAnsweredRun(stopped, 'recheck')
    expect(shown?.ledger).toBe(stopped.ledger)
    expect(shown?.updatedAt).toBe(stopped.updatedAt)
    expect(stopped.status).toBe('parked')
    expect(stopped.park?.parkedAt).toBe(5)
  })

  it.each<ProcessResumeChoice>([
    'continue',
    'retry',
    'allow',
    'allow-site',
    'resolved',
    'more-info',
    'update-base',
    'resolve-base-conflict',
    'send-to-developer',
    'recheck',
    'recapture',
    'accept-dropped-change',
  ])('assumes %s goes on', (answer) => {
    expect(optimisticAnsweredRun(run(), answer)?.status).toBe('running')
  })

  it.each<ProcessResumeChoice>([
    'abandon',
    'close-unmerged',
    'reject',
    'approve',
    'request-changes',
    'accept-with-follow-ups',
    'change-proof',
    'split-follow-up',
  ])('assumes nothing for %s, which may end the run or decide where it goes', (answer) => {
    expect(optimisticAnsweredRun(run(), answer)).toBeUndefined()
  })

  it('assumes nothing at a gate, whatever the answer', () => {
    expect(optimisticAnsweredRun(gate, 'continue')).toBeUndefined()
    expect(optimisticAnsweredRun(gate, 'retry')).toBeUndefined()
  })

  it('assumes nothing for a run that is not stopped, or whose stop is another run’s', () => {
    expect(optimisticAnsweredRun(run({ status: 'running', park: undefined }), 'retry')).toBe(
      undefined,
    )
    expect(
      optimisticAnsweredRun(
        run({ park: { reason: 'step-failed', message: 'm', parkedAt: 5, childRunId: 'c' } }),
        'retry',
      ),
    ).toBeUndefined()
  })
})

describe('processRunAnswering', () => {
  it('is the answer on its way with the stop it answers, while the run still holds that stop', () => {
    const stopped = run()
    expect(processRunAnswering(stopped, { choice: 'retry', parkedAt: 5 })).toEqual({
      choice: 'retry',
      parkedAt: 5,
      stopped,
    })
  })

  it('is nothing once the run moved on from that stop, or holds none', () => {
    expect(processRunAnswering(run(), { choice: 'retry', parkedAt: 4 })).toBeUndefined()
    expect(
      processRunAnswering(run({ status: 'running', park: undefined }), {
        choice: 'retry',
        parkedAt: 5,
      }),
    ).toBeUndefined()
    expect(processRunAnswering(undefined, { choice: 'retry', parkedAt: 5 })).toBeUndefined()
    expect(processRunAnswering(run(), undefined)).toBeUndefined()
  })
})

describe('processRunShownWhileAnswering', () => {
  it('shows the run going on while an answer that carries on is on its way', () => {
    const stopped = run()
    const answering = processRunAnswering(stopped, { choice: 'retry', parkedAt: 5 })
    expect(processRunShownWhileAnswering(stopped, answering)?.status).toBe('running')
  })

  it('shows the record as it is when nothing can be assumed, or nothing is on its way', () => {
    const stopped = run()
    const ending = processRunAnswering(stopped, { choice: 'abandon', parkedAt: 5 })
    expect(processRunShownWhileAnswering(stopped, ending)).toBe(stopped)
    expect(processRunShownWhileAnswering(stopped, undefined)).toBe(stopped)
    expect(processRunShownWhileAnswering(undefined, undefined)).toBeUndefined()
  })
})

describe('optimisticMirrorRun', () => {
  const parent = run({
    id: 'parent',
    plan: { steps: [{ id: 'feature', name: 'Feature', kind: 'process' }] } as ProcessRun['plan'],
    ledger: [],
    park: { reason: 'step-failed', stepId: 'feature', message: 'm', parkedAt: 5, childRunId: 'r1' },
  })

  it('reads the parent as going on while its nested run’s stop is shown answered', () => {
    const nested = optimisticAnsweredRun(run(), 'retry')
    const shown = optimisticMirrorRun(parent, nested)
    expect(shown.status).toBe('running')
    expect('park' in shown).toBe(false)
    expect(shown.cursor).toEqual({ stepId: 'feature', iteration: 1 })
  })

  it('leaves the parent as it is while the nested run still reads stopped, or is another run', () => {
    expect(optimisticMirrorRun(parent, run())).toBe(parent)
    expect(optimisticMirrorRun(parent, undefined)).toBe(parent)
    expect(optimisticMirrorRun(parent, { ...run(), id: 'other', status: 'running' })).toBe(parent)
  })

  it('leaves a parent stopped on its own question alone', () => {
    const own = run({ id: 'parent' })
    expect(optimisticMirrorRun(own, optimisticAnsweredRun(run(), 'retry'))).toBe(own)
  })
})

describe('processRunRecordIsStale', () => {
  it('is true only for a record older than the one held', () => {
    expect(processRunRecordIsStale({ updatedAt: 10 }, { updatedAt: 9 })).toBe(true)
    expect(processRunRecordIsStale({ updatedAt: 10 }, { updatedAt: 10 })).toBe(false)
    expect(processRunRecordIsStale({ updatedAt: 10 }, { updatedAt: 11 })).toBe(false)
  })

  it('takes any record when none is held, or either carries no time', () => {
    expect(processRunRecordIsStale(undefined, { updatedAt: 1 })).toBe(false)
    expect(processRunRecordIsStale({}, { updatedAt: 1 })).toBe(false)
    expect(processRunRecordIsStale({ updatedAt: 10 }, {})).toBe(false)
  })
})

describe('processAnswerPendingLine', () => {
  it('names the base an update brings in', () => {
    expect(processAnswerPendingLine({ choice: 'update-base' }, run())).toBe('Bringing main in…')
    expect(
      processAnswerPendingLine({ choice: 'update-base' }, run({ workBranch: undefined })),
    ).toBe('Bringing the base in…')
  })

  it('says what a known answer is doing', () => {
    expect(processAnswerPendingLine({ choice: 'retry' }, run())).toBe('Trying again…')
    expect(processAnswerPendingLine({ choice: 'abandon' }, run())).toBe('Stopping the run…')
  })

  it('falls back to carrying on for a way on a step offers, and any answer it has no words for', () => {
    expect(processAnswerPendingLine({ choice: 'retry', recovery: 'merge-anyway' }, run())).toBe(
      PROCESS_ANSWER_PENDING_FALLBACK,
    )
    expect(processAnswerPendingLine({ choice: 'continue' }, run())).toBe(
      PROCESS_ANSWER_PENDING_FALLBACK,
    )
    expect(PROCESS_ANSWER_PENDING_FALLBACK).toBe('Carrying on…')
  })
})

describe('parkPendingAnswerKey', () => {
  const rerun = { id: 'rerun', label: 'Re-run failed checks', detail: 'Run them.' }
  const offered: ProcessParkChoice[] = [
    choice('update-base'),
    choice('retry', { primary: true }),
    choice('recover', { recovery: rerun }),
    choice('continue'),
    choice('abandon'),
  ]

  it('is nothing while no answer is on its way', () => {
    expect(parkPendingAnswerKey(processParkAnswersView(offered), undefined)).toBeUndefined()
  })

  it('finds the answer in front, another answer, and a quiet one', () => {
    const view = processParkAnswersView(offered)
    expect(parkPendingAnswerKey(view, { choice: 'retry' })).toBe('retry')
    expect(parkPendingAnswerKey(view, { choice: 'update-base' })).toBe('update-base')
    expect(parkPendingAnswerKey(view, { choice: 'abandon' })).toBe('abandon')
  })

  it('tells a way on a step offers from trying again, by its id', () => {
    const view = processParkAnswersView(offered)
    expect(parkPendingAnswerKey(view, { choice: 'retry', recovery: 'rerun' })).toBe('recover:rerun')
    expect(parkPendingAnswerKey(view, { choice: 'retry', recovery: 'unknown' })).toBeUndefined()
  })

  it('prefers the answer in front among several on one choice', () => {
    const manager = {
      answers: [
        { choice: 'retry', label: 'Try again as it is' },
        { choice: 'retry', label: 'Try again with a hint', note: 'Use the fixture.' },
      ],
    } as Parameters<typeof processParkAnswersView>[1]
    const view = processParkAnswersView(offered, manager, 'retry:1')
    expect(view.lead?.key).toBe('retry:1')
    expect(parkPendingAnswerKey(view, { choice: 'retry' })).toBe('retry:1')
  })

  it('is nothing for an answer the stop does not offer', () => {
    expect(
      parkPendingAnswerKey(processParkAnswersView(offered), { choice: 'approve' }),
    ).toBeUndefined()
  })
})
