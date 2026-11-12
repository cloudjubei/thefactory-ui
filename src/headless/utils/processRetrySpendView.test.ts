import { describe, expect, it } from 'vitest'
import type { ProcessParkChoice, ProcessRun, ProcessSpendCapOffer } from 'thefactory-tools/types'

import {
  processRetrySpendAmount,
  processRetrySpendPick,
  processRetrySpendReady,
  processRetrySpendStart,
  processRetrySpendView,
} from './processRetrySpendView'
import {
  PROCESS_RETRY_SPEND_HINT,
  PROCESS_RETRY_SPEND_LABEL,
  PROCESS_RETRY_SPEND_TOO_LOW,
} from './processRetrySpendViewConstants'

const STEP: ProcessSpendCapOffer = { cap: 'step', currentUsd: 2, suggestedUsd: 4 }
const WHOLE: ProcessSpendCapOffer = { cap: 'run', currentUsd: 10, suggestedUsd: 20 }

const stoppedRun = (spendStop?: Record<string, unknown>) =>
  ({
    park: { reason: 'spend-limit', stepId: 'review', message: 'm', parkedAt: 1 },
    ledger: [
      {
        id: 'e1',
        stepId: 'review',
        iteration: 1,
        status: 'done',
        startedAt: 0,
        ...(spendStop ? { agentStop: 'spend-limit', spendStop } : {}),
      },
    ],
  }) as unknown as ProcessRun

const STEP_RUN = stoppedRun({ cap: 'step', capUsd: 2, attemptUsd: 2.31 })
const WHOLE_RUN = stoppedRun({ cap: 'run', capUsd: 10, attemptUsd: 3.4, runUsd: 10.12 })

describe('processRetrySpendStart', () => {
  it('starts from the offered raise, in plain dollars', () => {
    expect(processRetrySpendStart(STEP)).toBe('4')
    expect(processRetrySpendStart({ ...STEP, suggestedUsd: 4.625 })).toBe('4.63')
  })
})

describe('processRetrySpendAmount', () => {
  it('reads an amount above what was spent', () => {
    expect(processRetrySpendAmount(' 3.5 ', 2.31)).toBe(3.5)
  })

  it.each(['', '  ', 'lots', '2.31', '1', '-4', 'Infinity'])(
    'reads %j as no amount when $2.31 was spent',
    (text) => {
      expect(processRetrySpendAmount(text, 2.31)).toBeUndefined()
    },
  )
})

describe('processRetrySpendView', () => {
  it('names the step’s raise for the retried attempt, with what it spent', () => {
    expect(processRetrySpendView(STEP_RUN, STEP, '4')).toEqual({
      label: PROCESS_RETRY_SPEND_LABEL.step,
      hint: PROCESS_RETRY_SPEND_HINT.step('$2.31', '$2.00'),
      unit: '$',
      text: '4',
    })
  })

  it('names the run’s new limit, with what the run spent', () => {
    expect(processRetrySpendView(WHOLE_RUN, WHOLE, '20')).toEqual({
      label: PROCESS_RETRY_SPEND_LABEL.run,
      hint: PROCESS_RETRY_SPEND_HINT.run('$10.12', '$10.00'),
      unit: '$',
      text: '20',
    })
  })

  it('says an amount at or below what was spent cannot be used', () => {
    expect(processRetrySpendView(WHOLE_RUN, WHOLE, '10.12').error).toBe(
      PROCESS_RETRY_SPEND_TOO_LOW('$10.12'),
    )
    expect(processRetrySpendView(STEP_RUN, STEP, 'x').error).toBe(
      PROCESS_RETRY_SPEND_TOO_LOW('$2.31'),
    )
  })

  it('counts from the limit reached when the stop was not kept', () => {
    expect(processRetrySpendView(stoppedRun(), STEP, '2').error).toBe(
      PROCESS_RETRY_SPEND_TOO_LOW('$2.00'),
    )
    expect(processRetrySpendView(stoppedRun(), STEP, '2.5').error).toBeUndefined()
  })
})

describe('processRetrySpendPick', () => {
  it('keeps what was typed and the amount it comes to', () => {
    expect(processRetrySpendPick({ retryMode: 'fresh' }, STEP_RUN, STEP, '6')).toEqual({
      retryMode: 'fresh',
      spendText: '6',
      spendUsd: 6,
    })
  })

  it('drops the amount once the text is no longer one', () => {
    expect(processRetrySpendPick({ spendText: '6', spendUsd: 6 }, STEP_RUN, STEP, '1')).toEqual({
      spendText: '1',
    })
  })
})

describe('processRetrySpendReady', () => {
  const choice = (spendCap?: ProcessSpendCapOffer): ProcessParkChoice => ({
    choice: 'retry',
    label: 'Allow more and try again',
    detail: 'd',
    ...(spendCap ? { spendCap } : {}),
  })

  it('is ready with an amount, or for a retry that raises no spend', () => {
    expect(processRetrySpendReady(choice(STEP), { spendUsd: 4 })).toBe(true)
    expect(processRetrySpendReady(choice(), {})).toBe(true)
  })

  it('holds a spend raise back until its amount can be used', () => {
    expect(processRetrySpendReady(choice(STEP), { spendText: '1' })).toBe(false)
  })
})
