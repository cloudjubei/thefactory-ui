import type { ReactNode } from 'react'
import type {
  DesignCellStatus,
  DesignCompareMark,
  DesignProposalStatus,
} from '../../../headless/api'

/** The Overseer's status hues: done green, sign-off gold, running sky, needs-you purple, neutral. */
export type DesignTone = 'done' | 'review' | 'running' | 'on_hold' | 'empty'

export const CELL_TONES: Record<DesignCellStatus, DesignTone> = {
  approved: 'done',
  changed: 'review',
  new: 'review',
  missing: 'empty',
}

export const PROPOSAL_TONES: Record<DesignProposalStatus, DesignTone> = {
  open: 'review',
  accepted: 'done',
  alternative: 'empty',
  'sent-back': 'on_hold',
}

export const MARK_TONES: Record<DesignCompareMark, DesignTone> = {
  changed: 'review',
  unchanged: 'empty',
  new: 'running',
  'new-screen': 'running',
  unfiled: 'on_hold',
}

/** A small rounded label in one of the status hues. */
export default function DesignPill({ tone, children }: { tone: DesignTone; children: ReactNode }) {
  return (
    <span
      className="inline-flex shrink-0 items-center self-start rounded-full border px-2 text-[11px] font-semibold leading-[18px] whitespace-nowrap"
      style={{
        background: `var(--status-${tone}-soft-bg)`,
        color: `var(--status-${tone}-soft-fg)`,
        borderColor: `var(--status-${tone}-soft-border)`,
      }}
    >
      {children}
    </span>
  )
}
