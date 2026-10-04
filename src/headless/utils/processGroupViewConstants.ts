import type { ProcessGroupLegStatus, ProcessIntegrationMode } from 'thefactory-tools/types'
import type { ProcessStatusTone } from './processView'

/** How a leg reads in one word, and the tone it carries. */
export const PROCESS_GROUP_LEG_STATUS_VIEW: Record<
  ProcessGroupLegStatus,
  { label: string; tone: ProcessStatusTone }
> = {
  blocked: { label: 'Waiting on another project', tone: 'queued' },
  starting: { label: 'Starting', tone: 'queued' },
  'start-failed': { label: 'Could not start', tone: 'stuck' },
  running: { label: 'Running', tone: 'done' },
  'needs-you': { label: 'Waiting for you', tone: 'on_hold' },
  'at-sign-off': { label: 'Ready for sign-off', tone: 'review' },
  integrating: { label: 'Merging', tone: 'done' },
  integrated: { label: 'Merged', tone: 'done' },
  rebuilding: { label: 'Merged · building', tone: 'done' },
  'rebuild-failed': { label: 'Merged · build failed', tone: 'stuck' },
  'integration-failed': { label: 'Merge failed', tone: 'stuck' },
  failed: { label: 'Stopped', tone: 'stuck' },
  cancelled: { label: 'Cancelled', tone: 'empty' },
  skipped: { label: 'Skipped', tone: 'empty' },
}

/** The one action a group run's chat card offers. */
export const PROCESS_GROUP_CARD_CTA = 'Open the group run'

/** A merge mode in the fewest words — the per-project picker's labels. */
export const PROCESS_GROUP_MODE_LABELS: Record<ProcessIntegrationMode, string> = {
  merge: 'Merge',
  squash: 'One commit',
  'pull-request': 'Pull request',
}

/** What a leg's own pipeline says where its sign-off would be. */
export const PROCESS_GROUP_HELD_SIGN_OFF =
  'This project is part of a group run, which is signed off as a whole.'
