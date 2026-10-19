import type { ComponentType } from 'react'

import { checkChipFace, type CheckMethodId, type CheckMethodRow } from '../../../headless'
import {
  IconBuild,
  IconClipboardCheck,
  IconCode,
  IconDiff,
  IconDocument,
  IconGlobe,
  IconList,
  IconMobile,
  IconMonitor,
  IconPlay,
  IconTests,
} from '../../icons'

const GLYPH: Record<CheckMethodId, ComponentType<{ className?: string }>> = {
  tests: IconTests,
  uitests: IconGlobe,
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

export type CheckChipProps = {
  row: Pick<CheckMethodRow, 'id' | 'label' | 'state' | 'available'>
  onClick?: () => void
  /** Renders the chip inert — for a block heading that is not a control. */
  inert?: boolean
  className?: string
  /** The chip is a tab, and the tab it opens is showing. */
  selected?: boolean
  role?: 'tab'
}

/**
 * One verification method as a chip: its glyph, its name, and a mark for its
 * state. The glyph never changes — a reader learns "this is lint" once — and
 * colour says only pass / fail / amber / absent; a check that did not finish
 * says so in words instead of a mark.
 */
export default function CheckChip({
  row,
  onClick,
  inert,
  className,
  selected,
  role,
}: CheckChipProps) {
  const Glyph = GLYPH[row.id]
  const face = checkChipFace(row)
  return (
    <button
      type="button"
      className={['check-chip', className ?? ''].filter(Boolean).join(' ')}
      data-state={row.state}
      data-method={row.id}
      role={role}
      aria-selected={role ? selected === true : undefined}
      aria-label={`${row.label}: ${face.stateLabel}`}
      onClick={onClick}
      disabled={inert}
      tabIndex={inert ? -1 : undefined}
    >
      <Glyph className="check-chip__glyph" />
      {row.label}
      {face.words ? (
        <span className="check-chip__words" aria-hidden>
          · {face.words}
        </span>
      ) : null}
      {face.mark ? (
        <span className="check-chip__mark" aria-hidden>
          {face.mark}
        </span>
      ) : null}
    </button>
  )
}
