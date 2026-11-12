import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { useState } from 'react'
import type { ProcessRun } from 'thefactory-tools/types'
import { processRunParkChoices } from 'thefactory-tools/utils'
import {
  processRetryChoiceOf,
  processRetryPickStart,
  processRetrySpendPick,
  processRetrySpendView,
  type ProcessRetryPick,
} from 'thefactory-ui/headless'
// Not on the package's public surface: the pipeline draws its stop and its head chips itself. The
// showcase reaches into the source for them, as the playground renders the library from source.
import { ParkBlock } from '../../src/web/compound/process/ProcessPipeline'
import RetryChoiceOptions from '../../src/web/compound/process/RetryChoiceOptions'
import RunStepSpendChip from '../../src/web/compound/process/RunStepSpendChip'
import RunTurnLimitChip from '../../src/web/compound/process/RunTurnLimitChip'
import {
  fakeSpendLimitRun,
  type FakeSpendLimitState,
} from '../../src/fakeBackend/fixtures/spendLimitRun'
import type { Scene } from '../showcase/types'

const noop = () => {}
const resolved = async () => {}

const frame = (node: ReactNode) => (
  <MemoryRouter>
    <div className="max-w-[720px] p-4">{node}</div>
  </MemoryRouter>
)

const park = (state: FakeSpendLimitState) =>
  frame(
    <ParkBlock
      run={fakeSpendLimitRun(state)}
      managerLine={undefined}
      onChoose={noop}
      onChangeProof={noop}
      onAnswerRequest={noop}
      onDelegate={resolved}
      onDrill={noop}
    />,
  )

/** The run head's limits as the pipeline draws them: the turn limit, then spend per step. */
const head = (run: ProcessRun) =>
  frame(
    <div className="flex items-center gap-2">
      <RunTurnLimitChip run={run} />
      <RunStepSpendChip run={run} />
    </div>,
  )

/** The raise beside "Allow more and try again", with the amount typed as given. */
function Raise({ state, typed }: { state: FakeSpendLimitState; typed?: string }) {
  const run = fakeSpendLimitRun(state)
  const choice = processRetryChoiceOf(processRunParkChoices(run))!
  const offer = choice.spendCap!
  const start = processRetryPickStart(choice)
  const [pick, setPick] = useState<ProcessRetryPick>(
    typed === undefined ? start : processRetrySpendPick(start, run, offer, typed),
  )
  return (
    <RetryChoiceOptions
      {...(choice.retry ? { retry: choice.retry } : {})}
      spendView={processRetrySpendView(run, offer, pick.spendText ?? '')}
      onSpendChange={(text) => setPick(processRetrySpendPick(pick, run, offer, text))}
      pick={pick}
      onPick={setPick}
    />
  )
}

export const SPEND_LIMIT_SCENES: Scene[] = [
  {
    id: 'step-spend-limit',
    title: 'A step stopped at its spend limit',
    component: 'ParkBlock (ProcessPipeline) · RunStepSpendChip',
    group: 'Process',
    description:
      'A step attempt is held to the run’s “Spend per step” and its whole spend limit after every turn, never mid-tool. Once it reaches one it stops, keeps what it filed, and the run stops on it saying which limit and what was spent — with the turn limit’s choices: allow more and try again (carrying the agent on or starting fresh, with the amount it may spend, offered and changeable), carry on anyway, or stop. The run’s head shows the step limit beside the turn limit; a run launched without one shows nothing.',
    states: [
      {
        id: 'step-limit',
        title: 'The step’s own limit (base)',
        description:
          'The final review spent $2.31 of its $2.00 limit. Allowing more starts the amount at $4 for that attempt alone, which the person can change; later steps keep $2.00.',
        render: () => park('step'),
      },
      {
        id: 'own-amount',
        title: 'The person’s own amount',
        description: 'The attempt alone may spend up to $7.50, typed over the offered $4.',
        render: () => frame(<Raise state="step" typed="7.5" />),
      },
      {
        id: 'amount-too-low',
        title: 'An amount at or below what was spent',
        description:
          'An amount not above the $2.31 already spent says so, and holds "Allow more and try again" back.',
        render: () => frame(<Raise state="step" typed="2" />),
      },
      {
        id: 'run-limit',
        title: 'The run’s whole limit, reached mid-step',
        description:
          'The run reached its $10.00 limit while the final review worked. Allowing more starts the run’s new limit at $20, which the person can change, and runs the step again.',
        render: () => park('run'),
      },
      {
        id: 'run-own-amount',
        title: 'The run’s new limit, typed',
        description: 'The run’s limit raised to $15 instead of the offered $20.',
        render: () => frame(<Raise state="run" typed="15" />),
      },
      {
        id: 'run-head',
        title: 'In the run’s head',
        description: 'The step limit sits beside the turn limit.',
        render: () => head(fakeSpendLimitRun('step')),
      },
      {
        id: 'run-head-unset',
        title: 'In the run’s head, with no step limit',
        description: 'A run launched without one shows the turn limit alone.',
        render: () => head({ ...fakeSpendLimitRun('step'), budget: undefined }),
      },
    ],
  },
]
