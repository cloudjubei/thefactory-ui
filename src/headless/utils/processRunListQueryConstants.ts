import { PROCESS_RUN_PERSON_ENDING_VIEW, PROCESS_RUN_WORDS } from './processViewConstants'

/** The select value that means the filter is not applied. */
export const PROCESS_RUN_LIST_ANY = 'any'

/** Scope select: the project the Processes tab was opened on. */
export const PROCESS_RUN_SCOPE_PROJECT = 'project'

/** Scope select: every project the person can see. */
export const PROCESS_RUN_SCOPE_ALL = 'all'

/** Prefix of a scope select value that names a group (`group:<id>`). */
export const PROCESS_RUN_SCOPE_GROUP_PREFIX = 'group:'

/** Statuses the runs list can filter by, in the order the picker offers them. */
export const PROCESS_RUN_LIST_STATUSES = [
  'pending',
  'running',
  'parked',
  'succeeded',
  'failed',
  'cancelled',
] as const

/**
 * What the Processes list's filters say, on web and native. An ending uses the
 * words the rest of the run already uses: work not brought in, and a run a
 * person abandoned.
 */
export const PROCESS_RUN_LIST_COPY = {
  scope: 'Which projects',
  thisProject: 'This project',
  allProjects: 'All projects',
  story: 'Story',
  anyStory: 'Any story',
  status: 'Status',
  anyStatus: 'Any status',
  ending: 'Ending',
  anyEnding: 'Any ending',
  unmerged: PROCESS_RUN_WORDS.notMerged,
  abandoned: PROCESS_RUN_PERSON_ENDING_VIEW.abandon.label,
  noMatch: 'No runs match these filters.',
  emptyCurrent: 'No processes are running. Start work on a story from its chat.',
  emptyHistory: 'No finished processes yet.',
} as const
