import { latestLedgerEntry } from 'thefactory-tools/utils'
import type { ProcessParkChoice, ProcessRun, ProcessSpendCapOffer } from 'thefactory-tools/types'

import { formatCostUSD } from './costDetails'
import {
  PROCESS_RETRY_SPEND_HINT,
  PROCESS_RETRY_SPEND_LABEL,
  PROCESS_RETRY_SPEND_TOO_LOW,
} from './processRetrySpendViewConstants'
import type { ProcessRetrySpendView } from './processRetrySpendViewTypes'
import type { ProcessRetryPick } from './processTurnLimitViewTypes'

const usd = (amount: number): string => formatCostUSD(amount) ?? `$${amount}`

/**
 * What was spent against the limit a park's raise lifts: the stopped attempt's
 * spend for a step's limit, the run's for its whole limit — else the limit
 * itself, when the stop was not kept. Pure.
 */
function spentOf(run: Pick<ProcessRun, 'park' | 'ledger'>, offer: ProcessSpendCapOffer): number {
  const stepId = run.park?.stepId
  const stop = stepId ? latestLedgerEntry(run.ledger, stepId)?.spendStop : undefined
  const spent = offer.cap === 'step' ? stop?.attemptUsd : (stop?.runUsd ?? stop?.attemptUsd)
  return spent ?? offer.currentUsd
}

/** The offered raise as the field starts with it, in plain dollars. Pure. */
export function processRetrySpendStart(offer: ProcessSpendCapOffer): string {
  return String(Number(offer.suggestedUsd.toFixed(2)))
}

/** The amount `text` comes to when it can be the raise — above what was spent — else nothing. Pure. */
export function processRetrySpendAmount(text: string, spentUsd: number): number | undefined {
  const typed = text.trim()
  if (typed === '') return undefined
  const amount = Number(typed)
  return Number.isFinite(amount) && amount > spentUsd ? amount : undefined
}

/** The field a spend raise is typed in: what it raises, what was spent, and why an amount cannot be used. Pure. */
export function processRetrySpendView(
  run: Pick<ProcessRun, 'park' | 'ledger'>,
  offer: ProcessSpendCapOffer,
  text: string,
): ProcessRetrySpendView {
  const spent = spentOf(run, offer)
  return {
    label: PROCESS_RETRY_SPEND_LABEL[offer.cap],
    hint: PROCESS_RETRY_SPEND_HINT[offer.cap](usd(spent), usd(offer.currentUsd)),
    unit: '$',
    text,
    ...(processRetrySpendAmount(text, spent) === undefined
      ? { error: PROCESS_RETRY_SPEND_TOO_LOW(usd(spent)) }
      : {}),
  }
}

/** The retry's pick with `text` typed as its spend raise, and the amount it comes to when it can be used. Pure. */
export function processRetrySpendPick(
  pick: ProcessRetryPick,
  run: Pick<ProcessRun, 'park' | 'ledger'>,
  offer: ProcessSpendCapOffer,
  text: string,
): ProcessRetryPick {
  const { spendUsd: _previous, ...rest } = pick
  const amount = processRetrySpendAmount(text, spentOf(run, offer))
  return { ...rest, spendText: text, ...(amount !== undefined ? { spendUsd: amount } : {}) }
}

/** Whether a retry can be sent: one that raises a spend limit only with an amount that can be used. Pure. */
export function processRetrySpendReady(choice: ProcessParkChoice, pick: ProcessRetryPick): boolean {
  return !choice.spendCap || pick.spendUsd !== undefined
}
