import { View } from 'react-native'

import type { RunReviewFacts } from '../../../../headless'
import CostChip from '../../chips/CostChip'
import DurationChip from '../../chips/DurationChip'

export type DurCostChipsProps = {
  facts: Partial<Pick<RunReviewFacts, 'costLabel' | 'durationLabel' | 'cost' | 'timeDetails'>>
  /** What the cost is of, heading its details sheet. */
  costTitle?: string
  /** What the time is of, heading where it went. */
  timeTitle?: string
}

/**
 * A run's time + spend as the product's own chips — the blue duration pill and a
 * neutral cost pill — never plain grey text. The native peer of the web
 * `DurCostChips`, reused in the sign-off head and each section header. The
 * duration pill says the total and a long press opens where it went; the cost
 * pill says the charge alone and a press opens the cost's details.
 */
export default function DurCostChips({ facts, costTitle, timeTitle }: DurCostChipsProps) {
  if (!facts.durationLabel && !facts.costLabel) return null
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {facts.durationLabel ? (
        <DurationChip label={facts.durationLabel} details={facts.timeDetails} title={timeTitle} />
      ) : null}
      {facts.costLabel ? (
        <CostChip label={facts.costLabel} cost={facts.cost} title={costTitle} />
      ) : null}
    </View>
  )
}
