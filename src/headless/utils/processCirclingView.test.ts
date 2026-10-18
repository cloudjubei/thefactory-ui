import { describe, expect, it } from 'vitest'
import type { ProcessCircling, ProcessRun } from 'thefactory-tools/types'

import {
  circlingRetryTakesNote,
  processCirclingView,
  processParkCirclingView,
  processStepCirclingView,
} from './processCirclingView'
import {
  PROCESS_CIRCLING_HINT,
  PROCESS_CIRCLING_HINT_AFTER_MANAGER,
  PROCESS_CIRCLING_LABEL,
} from './processCirclingViewConstants'

const CIRCLING: ProcessCircling = {
  summary: 'Going in circles: ran out of turns (50 of 50); changed nothing.',
  signals: ['no-change'],
  ranOut: true,
  turnsUsed: 50,
  maxTurns: 50,
  changed: false,
  streak: 1,
  at: 1,
}

const parked = (park: Partial<NonNullable<ProcessRun['park']>> | undefined) =>
  ({
    park: park
      ? { reason: 'turn-limit', stepId: 'implement', message: 'm', parkedAt: 1, ...park }
      : undefined,
  }) as Pick<ProcessRun, 'park'>

describe('processCirclingView', () => {
  it('names the flag and says how it ran out as a sentence, with its evidence', () => {
    expect(processCirclingView(CIRCLING)).toEqual({
      label: PROCESS_CIRCLING_LABEL,
      headline: 'Ran out of turns (50 of 50); changed nothing.',
      evidence: ['Turns: 50 of 50', 'Work branch: no new commit'],
      hint: PROCESS_CIRCLING_HINT,
      afterManager: false,
    })
  })

  it('says the manager’s retry went round too once it did', () => {
    const view = processCirclingView({
      ...CIRCLING,
      signals: ['again'],
      streak: 2,
      afterRetry: true,
      afterManager: true,
    })
    expect(view?.headline).toBe(
      'Ran out of turns (50 of 50) 2 times in a row, even after the manager’s retry.',
    )
    expect(view?.hint).toBe(PROCESS_CIRCLING_HINT_AFTER_MANAGER)
    expect(view?.afterManager).toBe(true)
  })

  it('is nothing without a flag', () => {
    expect(processCirclingView(undefined)).toBeUndefined()
  })
})

describe('processParkCirclingView', () => {
  it('reads the flag on the run’s stop, its own or a mirror', () => {
    expect(processParkCirclingView(parked({ circling: CIRCLING }))?.label).toBe(
      PROCESS_CIRCLING_LABEL,
    )
    expect(
      processParkCirclingView(parked({ childRunId: 'child', circling: CIRCLING }))?.headline,
    ).toBe('Ran out of turns (50 of 50); changed nothing.')
  })

  it('is nothing at a stop on no such attempt, or a run not stopped', () => {
    expect(processParkCirclingView(parked({}))).toBeUndefined()
    expect(processParkCirclingView(parked(undefined))).toBeUndefined()
  })
})

describe('processStepCirclingView', () => {
  it('reads the step’s newest attempt', () => {
    expect(
      processStepCirclingView(parked(undefined), 'implement', { circling: CIRCLING }),
    ).toBeDefined()
  })

  it('reads the park’s mirror for the step it is on', () => {
    const mirror = parked({ stepId: 'features:f1', childRunId: 'child', circling: CIRCLING })
    expect(processStepCirclingView(mirror, 'features:f1', {})).toBeDefined()
    expect(processStepCirclingView(mirror, 'implement', {})).toBeUndefined()
  })

  it('is nothing for a step whose newest attempt did not go in circles', () => {
    expect(processStepCirclingView(parked({}), 'implement', undefined)).toBeUndefined()
  })
})

describe('circlingRetryTakesNote', () => {
  it('asks for a note only on a retry that needs a change', () => {
    expect(circlingRetryTakesNote({ choice: 'retry', changeRequired: true })).toBe(true)
    expect(circlingRetryTakesNote({ choice: 'retry' })).toBe(false)
    expect(circlingRetryTakesNote({ choice: 'continue', changeRequired: true })).toBe(false)
  })
})
