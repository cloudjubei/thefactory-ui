import { View } from 'react-native'

import type { RunReviewFacts } from '../../../../headless'
import CostChip from '../../chips/CostChip'
import DurationPill from './DurationPill'

export type DurCostChipsProps = {
  facts: Partial<Pick<RunReviewFacts, 'costLabel' | 'durationLabel' | 'cost'>>
  /** What the cost is of, heading its details sheet. */
  costTitle?: string
}

/**
 * A run's time + spend as the product's own chips — the blue duration pill and a
 * neutral cost pill — never plain grey text. The native peer of the web
 * `DurCostChips`, reused in the sign-off head and each section header. The cost
 * pill says the charge alone; a press opens the cost's details.
 */
export default function DurCostChips({ facts, costTitle }: DurCostChipsProps) {
  if (!facts.durationLabel && !facts.costLabel) return null
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {facts.durationLabel ? <DurationPill label={facts.durationLabel} /> : null}
      {facts.costLabel ? (
        <CostChip label={facts.costLabel} cost={facts.cost} title={costTitle} />
      ) : null}
    </View>
  )
}
