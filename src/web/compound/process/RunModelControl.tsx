import type { ReactNode } from 'react'

import { RUN_MODEL_PENDING_SUFFIX, type RunModelChipView } from '../../../headless'
import RunModelChip from '../chat/signoff/RunModelChip'

export type RunModelControlProps = {
  view: Pick<RunModelChipView, 'model' | 'editable' | 'pending'>
  /** The host's chooser chip for the run's model; without one the chip is read-only. */
  chip?: ReactNode
}

/**
 * The run's model in its header: the host's chooser chip while the run can
 * still change model — with the change waiting for the step at work spelled
 * out around it ("Opus 5.5 → [Sonnet 5.5] from the next step") — and the
 * read-only chip once it has ended.
 */
export default function RunModelControl({ view, chip }: RunModelControlProps) {
  if (!view.editable || !chip) return view.model ? <RunModelChip model={view.model} /> : null
  const pending = view.pending
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {pending ? (
        <span className="whitespace-nowrap text-[11.5px] text-(--text-muted)">
          {pending.from} →
        </span>
      ) : null}
      {chip}
      {pending ? (
        <span className="whitespace-nowrap text-[11.5px] text-(--text-muted)">
          {RUN_MODEL_PENDING_SUFFIX}
        </span>
      ) : null}
    </span>
  )
}
