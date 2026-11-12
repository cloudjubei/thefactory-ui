import { processRunStepSpendChip, type ProcessRun } from '../../../headless'

export type RunStepSpendChipProps = {
  run: ProcessRun
}

/** The most one step of a run may spend, in its head beside the turn limit — nothing when unset. */
export function RunStepSpendChip({ run }: RunStepSpendChipProps) {
  const chip = processRunStepSpendChip(run)
  if (!chip) return null
  return (
    <span
      title={chip.title}
      className="inline-flex h-7 items-center rounded-md border border-(--border-subtle) px-2 text-[11px] text-(--text-secondary)"
    >
      {chip.label}
    </span>
  )
}

export default RunStepSpendChip
