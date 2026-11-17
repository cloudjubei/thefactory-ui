import type { ProcessGroupLegStatus, ProcessRunPublicationStatus } from 'thefactory-tools/types'
import type { ProcessMergePhase } from './processDeliveryTypes'
import type { ProcessStatusTone } from './processView'

/** How often a merge on its way is read again. */
export const PROCESS_DELIVERY_POLL_MS = 4000

/** Where a leg may have published work or a merge to show: its group run reads its delivery. */
export const PROCESS_DELIVERY_LEG_STATUSES: readonly ProcessGroupLegStatus[] = [
  'at-publish',
  'at-sign-off',
  'integrating',
  'integration-failed',
  'integrated',
]

/** The phases a merge is still on its way in. */
export const PROCESS_MERGE_ACTIVE_PHASES: readonly ProcessMergePhase[] = [
  'bringing-in-base',
  'waiting-for-checks',
  'merging',
]

export const PROCESS_PUBLISH_COPY = {
  title: 'Publish for review',
  line: (repos: number) =>
    repos === 1
      ? 'One commit and a pull request, before sign-off.'
      : `${repos} repos, one commit and pull request each, before sign-off.`,
  shortField: 'Branch',
  shortHint: '2–4 words',
  titleField: 'PR title',
  account: 'As',
  noAccount: 'No account to push with. Add one in the project’s settings.',
  onto: (base: string) => `onto ${base}`,
  noChanges: 'No changes here. Nothing to publish.',
  publish: 'Publish',
  publishing: 'Publishing…',
  stop: 'Stop',
  stopTitle: 'Stop here?',
  stopBody: 'The run ends here and nothing is published.',
  stopKeep: 'Keep it',
  loading: 'Reading the repos…',
  readFailed: 'The repos to publish could not be read.',
  publishFailed: 'The work could not be published.',
  noTitle: 'Give it a title.',
} as const

export const PROCESS_PUBLICATION_BADGES: Record<
  ProcessRunPublicationStatus,
  { label: string; tone: ProcessStatusTone }
> = {
  open: { label: 'In review', tone: 'review' },
  merged: { label: 'Merged', tone: 'done' },
  closed: { label: 'PR closed', tone: 'empty' },
}

export const PROCESS_PUBLICATION_LINK = (number: number) => `PR #${number}`

export const PROCESS_MERGE_CHECKS_LINK = 'Checks'

export const PROCESS_MERGE_HEADING = 'Merging'

export const PROCESS_MERGE_PHASE_VIEW: Record<
  ProcessMergePhase,
  { label: string; tone: ProcessStatusTone; line?: string }
> = {
  'bringing-in-base': {
    label: 'Bringing in base',
    tone: 'working',
    line: 'Bringing the latest base into the pull request.',
  },
  'waiting-for-checks': {
    label: 'Waiting for checks',
    tone: 'working',
    line: 'Waits for the pull request’s required checks.',
  },
  merging: { label: 'Merging', tone: 'working' },
  merged: { label: 'Merged', tone: 'done' },
  'already-merged': {
    label: 'Already merged',
    tone: 'done',
    line: 'Someone merged the pull request on its host.',
  },
  conflict: {
    label: 'Conflict',
    tone: 'stuck',
    line: 'The base changed the same lines. Resolve it on its run.',
  },
  'checks-failed': {
    label: 'Checks failed',
    tone: 'stuck',
    line: 'A required check failed.',
  },
  failed: { label: 'Merge failed', tone: 'stuck' },
}

/** What opening a repo's run is for, by where its merge stands. */
export const PROCESS_MERGE_OPEN_LABELS: Partial<Record<ProcessMergePhase, string>> = {
  conflict: 'Resolve it',
  'checks-failed': 'Answer it',
  failed: 'Answer it',
}

/** What a failed-checks line names. */
export const PROCESS_MERGE_FAILED_CHECKS = (names: readonly string[]) =>
  `Failed: ${names.join(', ')}.`
