import { useState } from 'react'
import { View } from 'react-native'
import { processRunParkChoices } from 'thefactory-tools/utils'
import {
  processRetryChoiceOf,
  processRetryPickStart,
  processRetrySpendPick,
  processRetrySpendView,
  type ProcessRetryPick,
} from 'thefactory-ui/headless'
import ProcessPipeline from '../../src/native/compound/process/ProcessPipeline'
import RetryChoiceOptions from '../../src/native/compound/process/RetryChoiceOptions'
import {
  FAKE_SPEND_LIMIT_RUN_ID,
  fakeSpendLimitRun,
  type FakeSpendLimitState,
} from '../../src/fakeBackend/fixtures/spendLimitRun'
import { OnFixtures } from '../scenes/onFixtures'
import type { NativeView } from './views'

const STATES: readonly FakeSpendLimitState[] = ['step', 'run']

function SpendLimitRun({ state }: { state: FakeSpendLimitState }) {
  return (
    <OnFixtures routes={{ '/api/v1/process-runs/{runId}': () => fakeSpendLimitRun(state) }}>
      <View style={{ flex: 1, width: 390, maxWidth: '100%' }}>
        <ProcessPipeline runId={FAKE_SPEND_LIMIT_RUN_ID} />
      </View>
    </OnFixtures>
  )
}

/** The raise beside "Allow more and try again", with the amount typed as given. */
function Raise({ state, typed }: { state: FakeSpendLimitState; typed: string }) {
  const run = fakeSpendLimitRun(state)
  const choice = processRetryChoiceOf(processRunParkChoices(run))!
  const offer = choice.spendCap!
  const [pick, setPick] = useState<ProcessRetryPick>(
    processRetrySpendPick(processRetryPickStart(choice), run, offer, typed),
  )
  return (
    <View style={{ width: 390, maxWidth: '100%', padding: 12 }}>
      <RetryChoiceOptions
        {...(choice.retry ? { retry: choice.retry } : {})}
        spendView={processRetrySpendView(run, offer, pick.spendText ?? '')}
        onSpendChange={(text) => setPick(processRetrySpendPick(pick, run, offer, text))}
        pick={pick}
        onPick={setPick}
      />
    </View>
  )
}

/** The raise with an amount typed: the person's own (`own-amount`) or one too low (`amount-too-low`). */
const RAISES: Record<string, { state: FakeSpendLimitState; typed: string }> = {
  'own-amount': { state: 'step', typed: '7.5' },
  'amount-too-low': { state: 'step', typed: '2' },
  'run-own-amount': { state: 'run', typed: '15' },
}

/**
 * A run stopped on a step that reached a spend limit, on a phone: the step's own
 * (`?state=step`) or the run's whole budget (`?state=run`) — the stop's words and
 * choices with the offered amount, and the run head's step limit beside its turn
 * limit — and the raise with an amount typed (`?state=own-amount`,
 * `amount-too-low` or `run-own-amount`).
 */
export const SPEND_LIMIT_VIEWS: NativeView[] = [
  {
    id: 'step-spend-limit',
    title: 'A step stopped at its spend limit',
    render: (address) => {
      const raise = RAISES[address.get('state') ?? '']
      return raise ? (
        <Raise {...raise} />
      ) : (
        <SpendLimitRun state={STATES.find((s) => s === address.get('state')) ?? 'step'} />
      )
    },
  },
]
