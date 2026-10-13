import { PROCESS_RUN_WORDS } from './processViewConstants'

/** What pressing a story's process chip does, by the state it shows. */
export const PROCESS_STATUS_OVERLAY_TITLES = {
  review: 'Ready for sign-off — open the pipeline to review and approve',
  working: 'The process is running — open the pipeline',
  stuck: 'The process is stuck — open the pipeline to unblock it',
  changesRequested: 'You requested changes — open the pipeline to send the work back to be fixed',
  notLanded: 'Approved, but its work was not brought in — open the pipeline to bring it in',
  landing: 'Its approved work is being brought in — open the pipeline',
} as const

/** The chip on approved work that has not landed: with git words, and without them. */
export const PROCESS_STATUS_OVERLAY_NOT_LANDED = {
  git: PROCESS_RUN_WORDS.notMerged,
  shadow: PROCESS_RUN_WORDS.notBroughtIn,
} as const

/** The chip on approved work being brought in: with git words, and without them. */
export const PROCESS_STATUS_OVERLAY_BRINGING_IN = {
  git: PROCESS_RUN_WORDS.merging,
  shadow: PROCESS_RUN_WORDS.bringingIn,
} as const
