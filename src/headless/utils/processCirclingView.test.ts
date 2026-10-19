import { describe, expect, it } from 'vitest'
import type { ProcessCircling, ProcessManagerEscalation, ProcessRun } from 'thefactory-tools/types'

import {
  processCirclingRecommendation,
  processCirclingView,
  processParkCirclingView,
  processStepCirclingView,
} from './processCirclingView'
import { PROCESS_CIRCLING_LABEL, PROCESS_CIRCLING_RECOMMENDS } from './processCirclingViewConstants'

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

const RECOMMENDATION = 'Add the missing fixture, then try again with a note pointing at it.'

const escalation = (over: Partial<ProcessManagerEscalation> = {}): ProcessManagerEscalation => ({
  runId: 'run-1',
  parkedAt: 1,
  at: 2,
  signature: 's',
  why: 'circling',
  what: CIRCLING.summary,
  found: 'It reruns the same failing test.',
  tried: [],
  recommendation: RECOMMENDATION,
  ...over,
})

type Stopped = Pick<ProcessRun, 'id' | 'park' | 'manager'>

const parked = (
  park: Partial<NonNullable<ProcessRun['park']>> | undefined,
  over: Partial<Stopped> = {},
): Stopped => ({
  id: 'run-1',
  park: park
    ? { reason: 'turn-limit', stepId: 'implement', message: 'm', parkedAt: 1, ...park }
    : undefined,
  ...over,
})

describe('processCirclingView', () => {
  it('names the flag and says how it ran out as a sentence, with its evidence', () => {
    expect(processCirclingView(CIRCLING)).toEqual({
      label: PROCESS_CIRCLING_LABEL,
      headline: 'Ran out of turns (50 of 50); changed nothing.',
      evidence: ['Turns: 50 of 50', 'Work branch: no new commit'],
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
    expect(view?.evidence).toContain('The manager had tried it again')
  })

  it('carries the manager’s recommendation under its heading', () => {
    expect(processCirclingView(CIRCLING, RECOMMENDATION)?.recommendation).toEqual({
      heading: PROCESS_CIRCLING_RECOMMENDS,
      text: RECOMMENDATION,
    })
    expect(PROCESS_CIRCLING_RECOMMENDS).toBe('Going in circles — the manager recommends')
  })

  it('carries no recommendation when there is none, or only blanks', () => {
    expect(processCirclingView(CIRCLING)).not.toHaveProperty('recommendation')
    expect(processCirclingView(CIRCLING, '  ')).not.toHaveProperty('recommendation')
  })

  it('is nothing without a flag', () => {
    expect(processCirclingView(undefined)).toBeUndefined()
    expect(processCirclingView(undefined, RECOMMENDATION)).toBeUndefined()
  })
})

describe('processCirclingRecommendation', () => {
  it('reads the manager’s recommendation for this stop off the top-level run', () => {
    const root = { manager: { escalation: escalation() } }
    expect(processCirclingRecommendation(root, parked({ circling: CIRCLING }))).toBe(RECOMMENDATION)
  })

  it('reads a nested run’s stop from the root’s record', () => {
    const root = { manager: { escalation: escalation({ runId: 'child' }) } }
    const nested = parked({ circling: CIRCLING }, { id: 'child' })
    expect(processCirclingRecommendation(root, nested)).toBe(RECOMMENDATION)
  })

  it('reads the nested run’s recommendation on a parent’s mirror of its stop', () => {
    const root = { manager: { escalation: escalation({ runId: 'child', parkedAt: 7 }) } }
    const mirror = parked({ childRunId: 'child', circling: CIRCLING })
    expect(processCirclingRecommendation(root, mirror)).toBe(RECOMMENDATION)
  })

  it.each([
    ['another run’s stop', escalation({ runId: 'other' })],
    ['an earlier stop of this run', escalation({ parkedAt: 0 })],
  ])('reads nothing for %s', (_label, handed) => {
    expect(
      processCirclingRecommendation(
        { manager: { escalation: handed } },
        parked({ circling: CIRCLING }),
      ),
    ).toBeUndefined()
  })

  it('reads nothing with the manager off, before it handed the stop on, or on a stop not flagged', () => {
    const stop = parked({ circling: CIRCLING })
    expect(processCirclingRecommendation(undefined, stop)).toBeUndefined()
    expect(processCirclingRecommendation({}, stop)).toBeUndefined()
    expect(
      processCirclingRecommendation({ manager: { escalation: escalation() } }, parked({})),
    ).toBeUndefined()
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

  it('adds the recommendation from the run’s own record, or the root’s given', () => {
    const own = parked({ circling: CIRCLING }, { manager: { escalation: escalation() } })
    expect(processParkCirclingView(own)?.recommendation?.text).toBe(RECOMMENDATION)
    const nested = parked({ circling: CIRCLING }, { id: 'child' })
    const root = { manager: { escalation: escalation({ runId: 'child' }) } }
    expect(processParkCirclingView(nested, root)?.recommendation?.text).toBe(RECOMMENDATION)
    expect(processParkCirclingView(nested)).not.toHaveProperty('recommendation')
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
