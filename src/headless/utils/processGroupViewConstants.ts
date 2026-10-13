import type { ProcessGroupLegStatus, ProcessIntegrationMode } from 'thefactory-tools/types'
import type { ProcessStatusTone } from './processView'
import { PROCESS_RUN_WORDS } from './processViewConstants'

/** How a leg reads in one word, and the tone it carries. */
export const PROCESS_GROUP_LEG_STATUS_VIEW: Record<
  ProcessGroupLegStatus,
  { label: string; tone: ProcessStatusTone }
> = {
  blocked: { label: 'Waiting on another project', tone: 'queued' },
  starting: { label: PROCESS_RUN_WORDS.starting, tone: 'queued' },
  'start-failed': { label: 'Could not start', tone: 'stuck' },
  running: { label: PROCESS_RUN_WORDS.running, tone: 'done' },
  'needs-you': { label: PROCESS_RUN_WORDS.needsYou, tone: 'on_hold' },
  'at-sign-off': { label: PROCESS_RUN_WORDS.signOff, tone: 'review' },
  integrating: { label: PROCESS_RUN_WORDS.merging, tone: 'done' },
  integrated: { label: 'Merged', tone: 'done' },
  rebuilding: { label: 'Merged · building', tone: 'done' },
  'rebuild-failed': { label: 'Merged · build failed', tone: 'stuck' },
  'integration-failed': { label: 'Merge failed', tone: 'stuck' },
  failed: { label: PROCESS_RUN_WORDS.failed, tone: 'stuck' },
  cancelled: { label: PROCESS_RUN_WORDS.cancelled, tone: 'empty' },
  rejected: { label: 'Rejected', tone: 'empty' },
  skipped: { label: 'Skipped', tone: 'empty' },
}

/** What opening a leg's own run is for, by where the leg stands; anything else just opens it. */
export const PROCESS_GROUP_LEG_OPEN_LABELS: Partial<Record<ProcessGroupLegStatus, string>> = {
  'at-sign-off': 'Sign it off',
  'needs-you': 'Answer it',
}

/** The label for opening a leg's own run when it waits on nothing of yours. */
export const PROCESS_GROUP_LEG_OPEN_LABEL = 'Open its pipeline'

/** The one action a group run's chat card offers. */
export const PROCESS_GROUP_CARD_CTA = 'Open the group run'

/** A merge mode in the fewest words — the per-project picker's labels. */
export const PROCESS_GROUP_MODE_LABELS: Record<ProcessIntegrationMode, string> = {
  merge: 'Merge',
  squash: 'One commit',
  'pull-request': 'Pull request',
}

/** How a group run that ended with some of its legs merged reads in one word. */
export const PROCESS_GROUP_PARTLY_DONE_BADGE = { label: 'Partly done', tone: 'stuck' } as const

/** The leg action that records its work landed on its base branch outside its run. */
export const PROCESS_GROUP_MARK_LANDED_LABEL = 'Mark as merged'

/** The group action that resumes an ended run whose skipped legs can now start. */
export const PROCESS_GROUP_RESUME_LABEL = 'Resume'

/** What stopping a group run asks first: Stop ends every project's run. */
export const PROCESS_GROUP_STOP_CONFIRM_COPY = {
  title: 'Stop this group run?',
  body: 'Every project’s run in this group stops now, with everything it launched.',
  confirm: 'Stop group run',
  cancel: 'Keep it running',
} as const

/** What a landing check says once every feature of the leg's story is done. */
export const PROCESS_GROUP_LANDING_FEATURES_DONE = 'Every feature of its story is done'

/** Who the legs a resumed group run starts run on, as its Resume confirm names it. */
export const PROCESS_GROUP_RESUME_AGENT = 'the group run’s agent'

/** What marking a leg of an ended group run as landed leads to for the legs that need it. */
export const PROCESS_GROUP_LANDED_RESUME_NEXT = (names: string): string =>
  `The group run has ended — resume it to start ${names}.`
