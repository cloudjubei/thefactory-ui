import type { RunReviewFacts } from '../../../../headless'
import { CHIP_PILL_NEUTRAL } from '../../chips/pillStyles'
import { DURATION_CHIP_CLASS } from '../ToolCall/StatusIcon'

export type DurCostChipsProps = {
  facts: Partial<Pick<RunReviewFacts, 'costLabel' | 'durationLabel'>>
}

/**
 * A run's time + spend as the product's own chips — the blue duration pill and a
 * neutral cost pill — never plain grey text. Reused in the sign-off panel head
 * and in every section header so each scope reads its own cost the same way.
 */
export default function DurCostChips({ facts }: DurCostChipsProps) {
  if (!facts.durationLabel && !facts.costLabel) return null
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5">
      {facts.durationLabel ? (
        <span className={DURATION_CHIP_CLASS}>{facts.durationLabel}</span>
      ) : null}
      {facts.costLabel ? (
        <span className={`inline-flex items-center gap-1 ${CHIP_PILL_NEUTRAL}`}>
          <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
          {facts.costLabel}
        </span>
      ) : null}
    </span>
  )
}
