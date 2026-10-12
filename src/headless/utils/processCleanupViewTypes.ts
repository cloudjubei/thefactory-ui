import type { ProcessCleanupOutcomeStatus } from 'thefactory-tools/types'

/** One line of a run's cleanup list, ready to show. */
export type ProcessCleanupRow = {
  id: string
  label: string
  /** What kind of thing it is, in words. */
  kindLabel: string
  reason: string
  /** Who put it on the list, in words. */
  byLabel: string
  /** Whether it is removed once the sign-off is approved. */
  selected: boolean
  /** What the cleanup step did with it, once it ran. */
  outcome?: { status: ProcessCleanupOutcomeStatus; label: string; detail?: string }
}
