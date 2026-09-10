import type { ReactNode } from 'react'

import Tooltip from '../../primitives/Tooltip'

export type HelpChipProps = {
  /** Accessible name — what the explanation is about. */
  label: string
  children: ReactNode
}

/** A `?` that explains where something came from. Never how to use the screen. */
export default function HelpChip({ label, children }: HelpChipProps) {
  return (
    <Tooltip
      content={<div className="max-w-[280px] text-xs text-(--text-primary)">{children}</div>}
      placement="top"
      delayMs={150}
    >
      <button type="button" className="help-chip" aria-label={label}>
        ?
      </button>
    </Tooltip>
  )
}
