import type { ProcessCleanupItemKind, ProcessCleanupOutcomeStatus } from 'thefactory-tools/types'

export const PROCESS_CLEANUP_KIND_LABELS: Record<ProcessCleanupItemKind, string> = {
  'project-note': 'Project note',
  'story-note': 'Story note',
  path: 'File',
  branch: 'Branch',
}

export const PROCESS_CLEANUP_BY_LABELS = {
  agent: 'Registered by an agent',
  host: 'Found by the run',
} as const

export const PROCESS_CLEANUP_OUTCOME_LABELS: Record<ProcessCleanupOutcomeStatus, string> = {
  removed: 'Removed',
  'not-found': 'Already gone',
  refused: 'Kept — not allowed',
  failed: 'Could not remove',
}

/** The words of the cleanup card, shared by web and native. */
export const PROCESS_CLEANUP_COPY = {
  title: 'Cleanup after sign-off',
  hint: 'Removed once you approve this sign-off, before the work is brought in. Untick anything to keep it.',
  switchLabel: 'Clean up after sign-off',
  off: 'Cleanup is switched off for this run — nothing will be removed.',
  empty: 'Nothing is registered for cleanup.',
  noStep: 'This run’s process has no cleanup step, so nothing on this list is removed.',
  willRemove: (selected: number, total: number) =>
    `${selected} of ${total} item${total === 1 ? '' : 's'} will be removed once you approve.`,
  keepLabel: (label: string) => `Remove ${label} once you approve`,
  loadError: 'The cleanup list could not be loaded.',
} as const
