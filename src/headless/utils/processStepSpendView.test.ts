import { describe, expect, it } from 'vitest'
import type { ProcessRun } from 'thefactory-tools/types'

import { processRunStepSpendChip } from './processStepSpendView'
import { PROCESS_STEP_SPEND_TITLE } from './processStepSpendViewConstants'

const run = (over: Partial<ProcessRun> = {}) =>
  ({ budget: undefined, ledger: [], ...over }) as unknown as ProcessRun

describe('processRunStepSpendChip', () => {
  it('shows the most one step may spend, in dollars', () => {
    expect(processRunStepSpendChip(run({ budget: { stepSpendUsdCap: 2 } }))).toEqual({
      label: '$2.00 a step',
      title: PROCESS_STEP_SPEND_TITLE,
    })
  })

  it('shows nothing for a run whose steps may spend as they need', () => {
    expect(processRunStepSpendChip(run())).toBeUndefined()
    expect(processRunStepSpendChip(run({ budget: { spendUsdCap: 10 } }))).toBeUndefined()
  })
})
