import { IconExclamation } from '../../icons'

export type WarningChipProps = {
  title: string
  tooltip: string
}

/**
 * Small triangle-icon badge surfaced as an inline warning marker (e.g. on
 * a feature card with an attached file that isn't referenced in the
 * text). Purely presentational — the host's content explains the warning.
 */
export default function WarningChip({ title, tooltip }: WarningChipProps) {
  return (
    <span
      className="inline-flex items-center justify-center w-4 h-4 rounded-full text-(--color-amber-600) bg-(--color-amber-50) dark:bg-(--color-amber-900)/30"
      aria-label={tooltip}
      title={title}
    >
      <IconExclamation className="w-3 h-3" />
    </span>
  )
}
