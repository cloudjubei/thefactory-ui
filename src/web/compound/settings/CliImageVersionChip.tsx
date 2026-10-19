import { cliImageChip } from '../../../headless/utils/cliImageView'
import type { CliImageChipTone, CliImageRow } from '../../../headless/utils/cliImageViewTypes'

const BADGE = 'text-[11px] px-1.5 py-0.5 rounded'

const TONE_CLASSES: Record<CliImageChipTone, string> = {
  muted: 'bg-(--surface-muted) text-(--text-secondary)',
  warning: 'bg-amber-500/10 text-amber-600',
  error: 'bg-red-500/10 text-red-500',
}

export type CliImageVersionChipProps = {
  version: CliImageRow | undefined
  loading: boolean
}

/** A CLI sandbox image's version: installed, update available, building, missing or unknown. */
export function CliImageVersionChip({ version, loading }: CliImageVersionChipProps) {
  const chip = cliImageChip(version, loading)
  return (
    <span className={`${BADGE} ${TONE_CLASSES[chip.tone]}`} title={chip.hint}>
      {chip.label}
    </span>
  )
}
