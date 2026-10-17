import type { RunModel, SignoffVerdict } from '../../../headless'
import type { CostSource } from '../../../headless/utils/costDetailsTypes'
import Tooltip from '../../primitives/Tooltip'
import { CostChip, RefChip } from '../chips'
import RunModelChip from './signoff/RunModelChip'

/**
 * The head's MARKER — a dot, not a text pill: the verdict's colour, or a
 * process step's quiet grey. Kept apart from the verdict badge because the
 * badge recipe owns a 20px height clamp and horizontal padding that a 16px
 * square cannot override, which drew the marker as an ellipse. Status tokens
 * directly, so the two surfaces still take their colour from the same place.
 */
const MARKER: Record<SignoffVerdict['key'] | 'stage', string> = {
  proven: 'bg-(--status-done-soft-bg) text-(--status-done-fg)',
  partly: 'bg-(--status-review-soft-bg) text-(--status-review-soft-fg)',
  failed: 'bg-(--status-stuck-soft-bg) text-(--status-stuck-fg)',
  'not-run': 'bg-(--status-review-soft-bg) text-(--status-review-soft-fg)',
  stage: 'bg-(--surface-sunken) text-(--text-muted)',
}

export type RunChangesHeadProps = {
  /** The verdict the head's marker takes the colour of, or `stage` for a process step's output. */
  marker: SignoffVerdict['key'] | 'stage'
  /** What the card is — whose changes, or the stage a run's step is. */
  title: string
  /** How many files, and where they wait. */
  meta?: string
  /** The branch the changes wait on, as a chip. */
  branch?: string
  model: RunModel | undefined
  durationLabel?: string
  costLabel?: string
  cost?: CostSource
}

/**
 * The head of a run's change card: what the card is, how many files and the
 * branch they wait on, the model that made them, and what the run took and
 * cost.
 */
export function RunChangesHead({
  marker,
  title,
  meta,
  branch,
  model,
  durationLabel,
  costLabel,
  cost,
}: RunChangesHeadProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-(--border-subtle) px-3 py-2">
      <span
        aria-hidden
        className={`inline-flex size-4 shrink-0 items-center justify-center rounded-full ${MARKER[marker]}`}
      >
        <span className="size-1.5 rounded-full bg-current" />
      </span>
      <span className="text-[13px] font-semibold text-(--text-primary)">{title}</span>
      {meta ? <span className="text-[12px] text-(--text-secondary)">{meta}</span> : null}
      {branch ? (
        <Tooltip
          placement="bottom"
          content={
            <div className="max-w-[260px] text-xs">
              <b className="mb-0.5 block font-semibold">Its own branch</b>
              <span>
                Every commit this agent made lives here. Your own branch is untouched until you
                approve.
              </span>
            </div>
          }
        >
          <span className="inline-flex">
            <RefChip kind="branch" value={branch} />
          </span>
        </Tooltip>
      ) : null}
      <RunModelChip model={model} />
      <span className="flex-1" />
      {durationLabel || costLabel ? (
        <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] tabular-nums">
          {durationLabel ? <span className="text-(--text-secondary)">{durationLabel}</span> : null}
          {durationLabel && costLabel ? (
            <span aria-hidden className="text-(--text-tertiary)">
              ·
            </span>
          ) : null}
          {costLabel ? (
            <span className="font-medium text-(--text-primary)">
              <CostChip label={costLabel} cost={cost} title="This run" appearance="text" />
            </span>
          ) : null}
        </span>
      ) : null}
    </div>
  )
}
