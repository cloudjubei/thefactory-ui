import type { KeyboardEvent, MouseEvent } from 'react'

import type { ProcessTimeDetailsView } from '../../../headless'
import Tooltip from '../../primitives/Tooltip'
import { DURATION_CHIP_CLASS } from '../chat/ToolCall/StatusIcon'
import TimeDetailsPanel from './TimeDetailsPanel'

export type DurationChipProps = {
  /** The total, as a duration: `22m 58s`. */
  label: string
  /** Where the time went. The chip opens it whenever there is one. */
  details?: ProcessTimeDetailsView
  /** What the time is of, heading its details. */
  title?: string
  /** `pill` — the blue duration chip; `text` — muted inline text, for a meta line. */
  appearance?: 'pill' | 'text'
  /** Set when the chip sits inside a control that acts on a click or a key — see `CostChip`. */
  nested?: boolean
}

const keepClickToChip = (e: MouseEvent) => {
  e.preventDefault()
  e.stopPropagation()
}

const keepActivationToChip = (e: KeyboardEvent) => {
  if (e.key !== 'Enter' && e.key !== ' ') return
  e.preventDefault()
  e.stopPropagation()
}

/**
 * A time worked, as a chip: the total, and the way into where it went. Hover
 * or focus shows the split — agent thinking, tools & commands, the rest — and
 * a click or Enter pins it. A tab stop whenever it has details, like
 * `CostChip`, so it is never put inside a `<button>`.
 */
export default function DurationChip({
  label,
  details,
  title,
  appearance = 'pill',
  nested = false,
}: DurationChipProps) {
  const face =
    appearance === 'pill' ? (
      <span className={DURATION_CHIP_CLASS}>{label}</span>
    ) : (
      <span className="tabular-nums">{label}</span>
    )
  if (!details) return face
  return (
    <span
      className="inline-flex"
      onClick={nested ? keepClickToChip : undefined}
      onKeyDown={nested ? keepActivationToChip : undefined}
    >
      <Tooltip
        content={<TimeDetailsPanel view={details} title={title} />}
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
