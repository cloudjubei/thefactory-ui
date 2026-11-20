/** What finishing a run as already landed does, after where the work already is. */
export const PROCESS_ALREADY_LANDED_OFFER_DETAIL = (branch: string): string =>
  `Nothing is merged: its features are marked done, the work branch ${branch} is removed and the run moves to History.`

/** Heads the features finishing marks done. */
export const PROCESS_ALREADY_LANDED_FEATURES_HEAD = 'Its features'

/** How a feature finishing leaves as it is reads. */
export const PROCESS_ALREADY_LANDED_FEATURE_STAYS = 'stays as it is'

/** How a feature finishing makes done reads. */
export const PROCESS_ALREADY_LANDED_FEATURE_DONE = 'becomes done'

/** A sign-off with nothing to merge: it accepts a report. */
export const PROCESS_ACCEPT_REPORT_COPY = {
  approve: 'Accept report',
  /** Approving a run with no story, whose work still has to come in. */
  approveRun: 'Approve',
  approveRunDoes: 'Signs the run off and brings its work in.',
  does: 'Closes the run with this report.',
  notice: 'Nothing changed, so there is nothing to merge.',
  accepted: 'Report accepted. Nothing changed, so nothing merged.',
} as const

/** Finishing a run as merged by a pull request link or a commit the person names. */
export const PROCESS_NAMED_LANDING_COPY = {
  open: 'Merged another way?',
  field: 'Pull request link or commit',
  hint: 'The merged pull request, or the commit on the base that has the work.',
  finish: 'Finish as merged',
  finishing: 'Finishing…',
  confirmTitle: 'Finish as merged?',
  confirmByLink: (url: string) =>
    `The run is recorded as merged by ${url}. Nothing is merged or pushed.`,
  confirmByCommit: (sha: string) =>
    `The run is recorded as merged at ${sha}. Nothing is merged or pushed.`,
  keep: 'Keep it open',
  cancel: 'Cancel',
  notOne: 'Paste one pull request link or one commit.',
  failed: 'The run could not be finished as merged.',
} as const
