import type { ReviewTone } from '../../../../headless'

/**
 * The one place a headless `ReviewTone` becomes web classes — the peer of
 * native's `tones.ts`. Every sign-off surface reads the tone headless already
 * computed instead of re-deriving colour from a raw status, so the two clients
 * cannot drift on what "passed" or "absent" looks like.
 */
export const TONE_TEXT: Record<ReviewTone, string> = {
  positive: 'text-green-700 dark:text-green-400',
  warning: 'text-orange-700 dark:text-orange-400',
  danger: 'text-red-700 dark:text-red-400',
  neutral: 'text-(--text-secondary)',
  absent: 'text-(--text-secondary)',
}

export const TONE_CHIP: Record<ReviewTone, string> = {
  positive: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  warning: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  danger: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
  neutral: 'bg-(--surface-hover) text-(--text-secondary) border-(--border-subtle)',
  absent: 'bg-transparent text-(--text-secondary) border-dashed border-(--border-strong)',
}
