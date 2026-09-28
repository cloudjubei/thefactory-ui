import { useMemo, type KeyboardEvent, type MouseEvent } from 'react'

import { costDetailsView, type CostSource } from '../../../headless'
import Tooltip from '../../primitives/Tooltip'
import CostDetailsPanel from './CostDetailsPanel'
import { CHIP_PILL_NEUTRAL } from './pillStyles'

export type CostChipProps = {
  /** The chip's words: the charge in dollars (`$1.25`, `$0.00`, `$1.50 of $5.00`) — never tokens. */
  label: string
  /** The cost behind the label. The chip opens its details whenever there are any. */
  cost?: CostSource
  /** What the cost is of, heading its details — "Spent against the cap". */
  title?: string
  /** `pill` — the neutral cost chip; `text` — muted inline text, for a meta line. */
  appearance?: 'pill' | 'text'
  /**
   * Set when the chip sits inside a control that acts on a click or a key — a
   * section's `<summary>`: a click, Enter or Space opens the details instead of
   * working the control. Never put the chip inside a `<button>`: interactive
   * content there is invalid and unreachable by keyboard; lay the chip beside a
   * stretched button instead.
   */
  nested?: boolean
}

const keepClickToChip = (e: MouseEvent) => {
  e.preventDefault()
  e.stopPropagation()
}

/** Only the keys that open the details: Tab and the rest must still move on. */
const keepActivationToChip = (e: KeyboardEvent) => {
  if (e.key !== 'Enter' && e.key !== ' ') return
  e.preventDefault()
  e.stopPropagation()
}

/**
 * A cost, as a chip: the charge in dollars, and the way into everything else.
 * Hover or focus shows the details, a click or Enter pins them — the one
 * details view every cost surface shares, so a token count never has to ride
 * on the chip itself. Always a tab stop, like its native peer's button.
 */
export default function CostChip({
  label,
  cost,
  title,
  appearance = 'pill',
  nested = false,
}: CostChipProps) {
  const view = useMemo(() => costDetailsView(cost), [cost])
  const face =
    appearance === 'pill' ? (
      <span className={`inline-flex items-center gap-1 ${CHIP_PILL_NEUTRAL}`}>
        <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
        {label}
      </span>
    ) : (
      <span className="tabular-nums">{label}</span>
    )
  if (!view) return face
  return (
    <span
      className="inline-flex"
      onClick={nested ? keepClickToChip : undefined}
      onKeyDown={nested ? keepActivationToChip : undefined}
    >
      <Tooltip
        content={<CostDetailsPanel view={view} title={title} />}
        placement="bottom"
        allowedPlacements={['bottom', 'top']}
        sideAlign="end"
        anchorTabIndex={0}
        anchorClassName="inline-flex cursor-pointer rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-(--accent-primary)"
      >
        {face}
      </Tooltip>
    </span>
  )
}
