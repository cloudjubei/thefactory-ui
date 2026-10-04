import type { RunReviewFacts } from '../../../../headless'
import CostChip from '../../chips/CostChip'
import DurationChip from '../../chips/DurationChip'

export type DurCostChipsProps = {
  facts: Partial<Pick<RunReviewFacts, 'costLabel' | 'durationLabel' | 'cost' | 'timeDetails'>>
  /** What the cost is of, heading its details. */
  costTitle?: string
  /** What the time is of, heading where it went. */
  timeTitle?: string
  /** The chips sit inside another control (a section's `<summary>`) — see `CostChip`. */
  nested?: boolean
}

/**
 * A run's time + spend as the product's own chips — the blue duration pill and a
 * neutral cost pill — never plain grey text. Reused in the sign-off panel head
 * and in every section header so each scope reads its own cost the same way.
 * The duration pill says the total and opens where it went; the cost pill says
 * the charge alone and opens the cost's details.
 */
export default function DurCostChips({ facts, costTitle, timeTitle, nested }: DurCostChipsProps) {
  if (!facts.durationLabel && !facts.costLabel) return null
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5">
      {facts.durationLabel ? (
        <DurationChip
          label={facts.durationLabel}
          details={facts.timeDetails}
          title={timeTitle}
          nested={nested}
        />
      ) : null}
      {facts.costLabel ? (
        <CostChip label={facts.costLabel} cost={facts.cost} title={costTitle} nested={nested} />
      ) : null}
    </span>
  )
}
