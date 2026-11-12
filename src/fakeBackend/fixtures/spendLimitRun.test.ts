import { describe, expect, it } from 'vitest'
import { PROCESS_SPEND_LIMIT_PARK_MESSAGE } from 'thefactory-tools/constants'
import { processRunParkChoices } from 'thefactory-tools/utils'

import { fakeSpendLimitRun } from './spendLimitRun'

describe('fakeSpendLimitRun', () => {
  it('parks with the words the engine writes for each limit', () => {
    expect(fakeSpendLimitRun('step').park?.message).toBe(
      PROCESS_SPEND_LIMIT_PARK_MESSAGE('Final review', {
        cap: 'step',
        capUsd: 2,
        attemptUsd: 2.31,
      }),
    )
    expect(fakeSpendLimitRun('run').park?.message).toBe(
      PROCESS_SPEND_LIMIT_PARK_MESSAGE('Final review', {
        cap: 'run',
        capUsd: 10,
        attemptUsd: 3.4,
        runUsd: 10.12,
      }),
    )
  })

  it('stops on the final review at the step’s own limit, offering twice it for that attempt', () => {
    const run = fakeSpendLimitRun('step')
    expect(run.park?.message).toBe(
      'Final review reached the $2.00 spend limit for one step before it finished — it spent $2.31.',
    )
    expect(processRunParkChoices(run)[0]).toMatchObject({
      choice: 'retry',
      spendCap: { cap: 'step', currentUsd: 2, suggestedUsd: 4 },
    })
  })

  it('stops on the final review at the run’s limit, offering it raised', () => {
    const run = fakeSpendLimitRun('run')
    expect(run.park?.message).toContain('the run’s $10.00 spend limit')
    expect(processRunParkChoices(run)[0]?.spendCap).toEqual({
      cap: 'run',
      currentUsd: 10,
      suggestedUsd: 20,
    })
  })
})
