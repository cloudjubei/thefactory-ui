import { describe, expect, it } from 'vitest'
import type { ProcessAcceptedUnchecked, ProcessLedgerEntry } from 'thefactory-tools/types'

import {
  isProcessEntryAcceptedUnchecked,
  processAcceptedByList,
  processAcceptedByWord,
  processEntryAcceptedUnchecked,
  processStepAcceptedUnchecked,
} from './processAcceptedUnchecked'

const entry = (overrides: Partial<ProcessLedgerEntry> = {}): ProcessLedgerEntry => ({
  id: 'e1',
  stepId: 'verify',
  iteration: 1,
  status: 'done',
  outcome: 'passed',
  startedAt: 1000,
  endedAt: 2000,
  ...overrides,
})

const verifyByYou: ProcessAcceptedUnchecked = {
  stepId: 'verify',
  stepName: 'Verify',
  at: 1792430645641,
  decidedBy: 'person',
  note: '8 new-screen afters are filed under run 2419c65f.',
}
const reportByManager: ProcessAcceptedUnchecked = {
  stepId: 'report',
  stepName: 'Report',
  at: 1792431133893,
  decidedBy: 'manager',
}

/** A story's Fix step: its nested run succeeded over steps carried on past, as the driver stamps it. */
const fixStep = (accepted: ProcessAcceptedUnchecked[]) =>
  entry({
    stepId: 'fix',
    childRunId: '430fd523-2a94-45b3-8b29-7ed48dd42d60',
    summary: 'Accepted unchecked: Verify was carried on past by you, never proven. 6 of 6 steps.',
    acceptedUnchecked: accepted,
  })

describe('processAcceptedByWord', () => {
  it('names a person as you, the manager and an agent by their role', () => {
    expect(processAcceptedByWord('person')).toBe('you')
    expect(processAcceptedByWord('manager')).toBe('the manager')
    expect(processAcceptedByWord('agent')).toBe('an agent')
  })

  it('reads a decision recorded before it was attributed as a person’s', () => {
    expect(processAcceptedByWord(undefined)).toBe('you')
  })
})

describe('processAcceptedByList', () => {
  it('names one who accepted alone, and two joined by “and”, each once', () => {
    expect(processAcceptedByList(['the manager', 'the manager'])).toBe('the manager')
    expect(processAcceptedByList(['you', 'the manager', 'you'])).toBe('you and the manager')
  })

  it('reads an unknown word as yours, and nobody as you', () => {
    expect(processAcceptedByList([undefined, 'the manager'])).toBe('you and the manager')
    expect(processAcceptedByList([])).toBe('you')
  })

  it('lists three with commas before the “and”', () => {
    expect(processAcceptedByList(['you', 'the manager', 'an agent'])).toBe(
      'you, the manager and an agent',
    )
  })
})

describe('processEntryAcceptedUnchecked', () => {
  it('reads the steps the driver stamped on a passed process step', () => {
    expect(processEntryAcceptedUnchecked(fixStep([verifyByYou, reportByManager]), 'Fix')).toEqual([
      verifyByYou,
      reportByManager,
    ])
  })

  it('reads an unchecked attempt carried on past as the step itself, with who and their note', () => {
    const verify = entry({
      outcome: 'unchecked',
      override: {
        choice: 'continue',
        at: 5,
        decidedBy: 'manager',
        decidedVia: 'manager',
        note: 'Gate fixed since.',
      },
    })
    expect(processEntryAcceptedUnchecked(verify, 'Verify')).toEqual([
      {
        stepId: 'verify',
        stepName: 'Verify',
        at: 5,
        decidedBy: 'manager',
        note: 'Gate fixed since.',
      },
    ])
  })

  it('leaves out who and the note when the decision recorded neither', () => {
    const verify = entry({ outcome: 'unchecked', override: { choice: 'continue', at: 5 } })
    expect(processEntryAcceptedUnchecked(verify, 'Verify')).toEqual([
      { stepId: 'verify', stepName: 'Verify', at: 5 },
    ])
  })

  it.each([
    ['a plain pass', entry()],
    ['a passed process step with nothing stamped', entry({ stepId: 'fix', childRunId: 'c1' })],
    ['an unchecked attempt still parked', entry({ outcome: 'unchecked' })],
    [
      'an unchecked attempt sent to try again',
      entry({ outcome: 'unchecked', override: { choice: 'retry', at: 1 } }),
    ],
    [
      'a failed attempt carried on past',
      entry({ outcome: 'failed', override: { choice: 'continue', at: 1 } }),
    ],
    [
      'a running attempt',
      entry({ status: 'running', outcome: undefined, acceptedUnchecked: [verifyByYou] }),
    ],
    [
      'a failed process step that still carries a stamp',
      entry({ stepId: 'fix', outcome: 'failed', acceptedUnchecked: [verifyByYou] }),
    ],
  ])('is empty for %s', (_, e) => {
    expect(processEntryAcceptedUnchecked(e, 'Step')).toEqual([])
    expect(isProcessEntryAcceptedUnchecked(e)).toBe(false)
  })

  it('is empty for no attempt at all', () => {
    expect(processEntryAcceptedUnchecked(undefined, 'Step')).toEqual([])
    expect(isProcessEntryAcceptedUnchecked(undefined)).toBe(false)
  })
})

describe('processStepAcceptedUnchecked', () => {
  it('says which nested step you accepted, for a process step', () => {
    expect(
      processStepAcceptedUnchecked({ step: { name: 'Fix' }, latest: fixStep([verifyByYou]) }),
    ).toEqual({
      label: 'Accepted unchecked',
      line: 'Verify accepted by you — never proven',
      accepted: [verifyByYou],
    })
  })

  it('names each nested step and who accepted it when there are several', () => {
    const view = processStepAcceptedUnchecked({
      step: { name: 'Fix' },
      latest: fixStep([verifyByYou, reportByManager]),
    })
    expect(view?.line).toBe('Verify accepted by you, Report by the manager — never proven')
  })

  it('says only who accepted it for a step carried on past itself', () => {
    const view = processStepAcceptedUnchecked({
      step: { name: 'Report' },
      latest: entry({
        stepId: 'report',
        outcome: 'unchecked',
        override: { choice: 'continue', at: 9, decidedBy: 'manager' },
      }),
    })
    expect(view?.line).toBe('Accepted by the manager — never proven')
  })

  it('has nothing to say of a step a later pass went back over', () => {
    expect(
      processStepAcceptedUnchecked({
        step: { name: 'Fix' },
        latest: fixStep([verifyByYou]),
        requeued: true,
      }),
    ).toBeUndefined()
  })

  it('has nothing to say of a plain pass or of a step not yet run', () => {
    expect(processStepAcceptedUnchecked({ step: { name: 'Checks' }, latest: entry() })).toBe(
      undefined,
    )
    expect(processStepAcceptedUnchecked({ step: { name: 'Checks' } })).toBeUndefined()
  })
})
