import type { RunReviewFacts } from '../../../../headless'
import CostChip from '../../chips/CostChip'
import { DURATION_CHIP_CLASS } from '../ToolCall/StatusIcon'

export type DurCostChipsProps = {
  facts: Partial<Pick<RunReviewFacts, 'costLabel' | 'durationLabel' | 'cost'>>
  /** What the cost is of, heading its details. */
  costTitle?: string
  /** The chips sit inside another control (a section's `<summary>`) — see `CostChip`. */
  nested?: boolean
}

/**
 * A run's time + spend as the product's own chips — the blue duration pill and a
 * neutral cost pill — never plain grey text. Reused in the sign-off panel head
 * and in every section header so each scope reads its own cost the same way.
 * The cost pill says the charge alone and opens the cost's details.
 */
export default function DurCostChips({ facts, costTitle, nested }: DurCostChipsProps) {
  if (!facts.durationLabel && !facts.costLabel) return null
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5">
      {facts.durationLabel ? (
        <span className={DURATION_CHIP_CLASS}>{facts.durationLabel}</span>
      ) : null}
      {facts.costLabel ? (
        <CostChip label={facts.costLabel} cost={facts.cost} title={costTitle} nested={nested} />
      ) : null}
    </span>
  )
}
