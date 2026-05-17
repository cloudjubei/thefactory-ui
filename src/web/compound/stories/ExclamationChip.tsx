import { IconExclamation } from '../../icons'

export type ExclamationChipProps = {
  title: string
  tooltip: string
}

/**
 * Slightly larger sibling of `WarningChip` used for story-level "rejection"
 * markers. Same pattern: icon-only inline badge.
 */
export default function ExclamationChip({ title, tooltip }: ExclamationChipProps) {
  return (
    <span
      className="inline-flex items-center justify-center w-5 h-5 rounded-full text-(--color-red-600) bg-(--color-red-50) dark:bg-(--color-red-900)/30"
      aria-label={tooltip}
      title={title}
    >
      <IconExclamation className="w-4 h-4" />
    </span>
  )
}
