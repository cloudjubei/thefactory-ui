import type { ComponentType } from 'react'

import {
  CHECK_STATE_LABELS,
  type CheckMethodId,
  type CheckMethodRow,
  type CheckMethodState,
} from '../../../headless'
import {
  IconBuild,
  IconClipboardCheck,
  IconCode,
  IconDiff,
  IconDocument,
  IconList,
  IconMobile,
  IconMonitor,
  IconPlay,
  IconTests,
} from '../../icons'

const GLYPH: Record<CheckMethodId, ComponentType<{ className?: string }>> = {
  tests: IconTests,
  types: IconCode,
  lint: IconList,
  format: IconClipboardCheck,
  build: IconBuild,
  device: IconMobile,
  screens: IconMonitor,
  walkthrough: IconPlay,
  report: IconDocument,
  diff: IconDiff,
}

const MARK: Record<CheckMethodState, string> = {
  passed: '✓',
  failed: '✕',
  unchecked: '?',
  unconfigured: '+',
}

export type CheckChipProps = {
  row: Pick<CheckMethodRow, 'id' | 'label' | 'state'>
  onClick?: () => void
  /** Renders the chip inert — for a block heading that is not a control. */
  inert?: boolean
  className?: string
}

/**
 * One verification method as a chip: its glyph, its name, and a mark for its
 * state. The glyph never changes — a reader learns "this is lint" once — and
 * colour says only pass / fail / absent.
 */
export default function CheckChip({ row, onClick, inert, className }: CheckChipProps) {
  const Glyph = GLYPH[row.id]
  return (
    <button
      type="button"
      className={['check-chip', className ?? ''].filter(Boolean).join(' ')}
      data-state={row.state}
      data-method={row.id}
      aria-label={`${row.label}: ${CHECK_STATE_LABELS[row.state]}`}
      onClick={onClick}
      disabled={inert}
      tabIndex={inert ? -1 : undefined}
    >
      <Glyph className="check-chip__glyph" />
      {row.label}
      <span className="check-chip__mark" aria-hidden>
        {MARK[row.state]}
      </span>
    </button>
  )
}
